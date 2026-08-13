import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';

const AuthContext = createContext(null);

// Egypt mobile numbers: 01[0125]xxxxxxxx locally, or already in +20/20 form.
// Normalizes to the E.164 form Supabase Auth expects, e.g. +201001234567.
export function normalizeEgyptPhone(input) {
  const digits = (input || '').replace(/[^\d]/g, '');
  let local = digits;
  if (local.startsWith('20')) local = local.slice(2);
  if (local.startsWith('0')) local = local.slice(1);
  if (!/^1[0125]\d{8}$/.test(local)) return null;
  return '+20' + local;
}

// For display only: Supabase Auth always stores phones as "20xxxxxxxxxx" (country
// code, no leading 0) — convert back to the local "01xxxxxxxxx" form people expect
// to see, e.g. in the customers/staff tables and profile fields.
export function toLocalPhone(stored) {
  const digits = (stored || '').replace(/[^\d]/g, '');
  if (/^20\d{10}$/.test(digits)) return '0' + digits.slice(2);
  return stored || '';
}

// Reverse of toLocalPhone — for saving an edited local-format phone back to the
// "20xxxxxxxxxx" form the rest of the app (and Supabase Auth) expects.
export function toStoredPhone(input) {
  const normalized = normalizeEgyptPhone(input);
  return normalized ? normalized.slice(1) : null;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still loading
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!supabase) { setSession(null); return; }

    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user) { setProfile(null); return; }
    let cancelled = false;
    supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => {
      if (!cancelled) setProfile(data ?? null);
    });
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  // Derived from data identity (not a separate flag that can lag a render behind):
  // whenever a session has a user, we're still "loading" until the fetched profile
  // actually matches that user's id. This closes the race where a staffOnly route
  // would see isStaff=false (profile stale/null) for one render right after login.
  const loading = session === undefined || (!!session?.user && profile?.id !== session.user.id);

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    isStaff: (!loading && profile) ? profile.role !== 'customer' : false,

    async signInWithPassword(rawPhone, password) {
      if (!supabase) throw new Error('Supabase غير مهيأ — أضف VITE_SUPABASE_ANON_KEY في .env');
      const phone = normalizeEgyptPhone(rawPhone);
      if (!phone) throw new Error('رقم الهاتف غير صحيح. استخدم صيغة مصرية مثل 01xxxxxxxxx.');
      const { data, error } = await supabase.auth.signInWithPassword({ phone, password });
      if (error) throw error;
      setSession(data.session);
      const { data: row } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
      setProfile(row);
      return { session: data.session, profile: row };
    },

    // `name`: saved directly here (using the userId this function already has) rather than
    // through completeProfile() afterwards — that would read the `session` context value
    // from the calling component's *stale* render closure, which hasn't picked up this
    // sign-up's session yet.
    async signUpWithPassword(rawPhone, password, { name } = {}) {
      if (!supabase) throw new Error('Supabase غير مهيأ — أضف VITE_SUPABASE_ANON_KEY في .env');
      const phone = normalizeEgyptPhone(rawPhone);
      if (!phone) throw new Error('رقم الهاتف غير صحيح. استخدم صيغة مصرية مثل 01xxxxxxxxx.');
      const { data, error } = await supabase.auth.signUp({ phone, password });
      if (error) throw error;
      if (!data.session) throw new Error('تعذّر إنشاء الحساب — حاول مرة أخرى.');
      setSession(data.session);
      const userId = data.session.user.id;
      let row = null;
      for (let attempt = 0; attempt < 5 && !row; attempt++) {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        row = p;
        if (!row) await new Promise(r => setTimeout(r, 200));
      }
      if (name && row) {
        const { data: updated, error: updateError } = await supabase.from('profiles').update({ name }).eq('id', userId).select().single();
        if (!updateError) row = updated;
      }
      setProfile(row);
      return { session: data.session, profile: row };
    },

    async updatePassword(newPassword) {
      if (!supabase) throw new Error('Supabase غير مهيأ');
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },

    // Still used by the "forgot password" flow: an SMS code proves phone ownership,
    // then updatePassword() sets a new password while that verified session is active.
    async requestOtp(rawPhone) {
      if (!supabase) throw new Error('Supabase غير مهيأ — أضف VITE_SUPABASE_ANON_KEY في .env');
      const phone = normalizeEgyptPhone(rawPhone);
      if (!phone) throw new Error('رقم الهاتف غير صحيح. استخدم صيغة مصرية مثل 01xxxxxxxxx.');
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      return phone;
    },

    async verifyOtp(phone, token, { name } = {}) {
      if (!supabase) throw new Error('Supabase غير مهيأ');
      const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
      if (error) throw error;
      setSession(data.session);
      // Fetch (or wait for the trigger to create) the profile row right away rather than
      // relying on the separate onAuthStateChange effect's timing.
      const userId = data.session.user.id;
      let row = null;
      for (let attempt = 0; attempt < 5 && !row; attempt++) {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        row = p;
        if (!row) await new Promise(r => setTimeout(r, 200));
      }
      if (name && row && !row.name) {
        const { data: updated, error: updateError } = await supabase.from('profiles').update({ name }).eq('id', userId).select().single();
        if (!updateError) row = updated;
      }
      setProfile(row);
      return { session: data.session, profile: row };
    },

    async completeProfile({ name }) {
      if (!supabase || !session?.user) throw new Error('لا توجد جلسة نشطة');
      const { data, error } = await supabase
        .from('profiles')
        .update({ name })
        .eq('id', session.user.id)
        .select()
        .single();
      if (error) throw error;
      setProfile(data);
      return data;
    },

    async signOut() {
      if (!supabase) return;
      await supabase.auth.signOut();
    },

    async signInWithGoogle(redirectPath = '/account') {
      if (!supabase) throw new Error('Supabase غير مهيأ — أضف VITE_SUPABASE_ANON_KEY في .env');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + redirectPath },
      });
      if (error) throw error;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
