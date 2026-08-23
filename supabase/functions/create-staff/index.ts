// ميعاد — إنشاء حساب موظف بكلمة مرور يحددها المدير.
//
// Why this can't be done from the dashboard directly:
//
//   • supabase.auth.signUp() from the browser would create the account but also
//     REPLACE the admin's own session with the new employee's — the admin would
//     find themselves logged in as the person they just hired.
//   • auth.admin.createUser() is the right call, but it needs the service_role key,
//     which must never reach the browser: it bypasses Row Level Security entirely.
//
// So the privileged half runs here. The caller's own JWT is verified first, and the
// account is only created if that caller is an active owner/admin — the function is
// not a way for anyone with the anon key to mint staff accounts.
//
// Deploy:  npx supabase functions deploy create-staff
//
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY are injected by the
// platform; nothing secret is written in this file.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// The dashboard is served from the site itself; keep this in step if that changes.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** The roles allowed to hire. Deliberately not driven by role_permissions: creating
 *  a login is an account-level action, not one of the app's feature modules. */
const CAN_CREATE_STAFF = ['owner', 'admin'];

const MIN_PASSWORD = 8;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** '01xxxxxxxxx' / '+201xxxxxxxxx' → '+201xxxxxxxxx'. Mirrors toStoredPhone() in the app. */
function normalisePhone(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (/^01\d{9}$/.test(digits)) return `+2${digits}`;
  if (/^201\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST فقط' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'غير مصرح.' }, 401);

  // ---- 1. who is asking? ----
  // A client bound to the caller's JWT, so this read is the caller's own identity —
  // it can't be spoofed by anything in the request body.
  const asCaller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await asCaller.auth.getUser();
  if (userError || !user) return json({ error: 'الجلسة غير صالحة — سجّل الدخول من جديد.' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: caller } = await admin
    .from('profiles').select('role, status').eq('id', user.id).single();

  if (!caller || caller.status !== 'active' || !CAN_CREATE_STAFF.includes(caller.role)) {
    return json({ error: 'هذه العملية متاحة لمدير العيادة فقط.' }, 403);
  }

  // ---- 2. validate the request ----
  let body: Record<string, string>;
  try { body = await req.json(); } catch { return json({ error: 'طلب غير صالح.' }, 400); }

  const { name, phone, email, password, role, branchId } = body;

  if (!name?.trim()) return json({ error: 'اسم الموظف مطلوب.' }, 400);

  const storedPhone = normalisePhone(phone);
  if (!storedPhone) return json({ error: 'رقم الهاتف غير صحيح — استخدم صيغة مثل 01xxxxxxxxx.' }, 400);

  if (!password || password.length < MIN_PASSWORD) {
    return json({ error: `كلمة المرور يجب ألا تقل عن ${MIN_PASSWORD} أحرف.` }, 400);
  }
  if (!role || role === 'customer') return json({ error: 'حدد دور الموظف.' }, 400);

  // A role the clinic actually has — otherwise a typo would create an account whose
  // permissions resolve to nothing.
  const { data: roleRow } = await admin.from('roles').select('id').eq('id', role).maybeSingle();
  if (!roleRow) return json({ error: 'الدور المحدد غير موجود.' }, 400);

  // Phone is the login, and profiles.phone is unique — catch the clash before
  // creating an auth user that would then be left without a profile.
  const { data: clash } = await admin
    .from('profiles').select('id, name').eq('phone', storedPhone).maybeSingle();
  if (clash) return json({ error: `الرقم مسجّل بالفعل باسم ${clash.name ?? 'مستخدم آخر'}.` }, 409);

  // ---- 3. create the login ----
  // phone_confirm: the clinic vouches for the number, so no SMS round-trip — which
  // also means this works without an SMS provider configured.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    phone: storedPhone,
    password,
    phone_confirm: true,
    email: email?.trim() || undefined,
    email_confirm: email?.trim() ? true : undefined,
    user_metadata: { name: name.trim() },
  });

  if (createError || !created?.user) {
    return json({ error: createError?.message || 'تعذّر إنشاء الحساب.' }, 400);
  }

  // ---- 4. the profile that makes them staff ----
  // A trigger on auth.users may already have inserted a bare profile row, so this is
  // an upsert rather than an insert.
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .upsert({
      id: created.user.id,
      name: name.trim(),
      phone: storedPhone,
      email: email?.trim() || null,
      role,
      branch_id: branchId || null,
      status: 'active',
    }, { onConflict: 'id' })
    .select('id, name, email, phone, role, status, branch:branches(name)')
    .single();

  if (profileError) {
    // Never leave a login that can sign in but has no staff profile: it would be an
    // account with customer-level access and no way to see it in الموظفون.
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: profileError.message || 'تعذّر حفظ بيانات الموظف.' }, 400);
  }

  return json({ staff: { ...profile, branch: (profile as any).branch?.name ?? '' } }, 201);
});
