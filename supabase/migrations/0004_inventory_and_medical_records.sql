-- ميعاد — 0004: إدارة المخزون + السجل الطبي الكامل للمريض.
--
-- Additive only: no existing table, column, policy or row is dropped or rewritten.
-- Everything here is `if not exists` / `on conflict do nothing`, so the file is safe
-- to re-run. Run it in the Supabase SQL Editor, or `supabase db push`.
--
-- Two features land together because they meet in one place: recording an encounter
-- (كشف) writes the clinical record AND deducts the supplies it consumed, in one
-- transaction.

-- ============================================================
-- 1. Permission helper — makes the existing role_permissions
--    matrix actually enforceable from RLS.
--
--    Until now `role_permissions` drove the admin UI only; RLS used the blunt
--    is_staff(). This adds a checker so the *new* tables can be gated per-module
--    without touching any existing policy (nothing about the current behaviour of
--    appointments/profiles/etc. changes).
-- ============================================================

create or replace function has_permission(p_module text) returns boolean as $$
  select exists (
    select 1
    from profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.role <> 'customer'
      and (
        -- The owner's access is unconditional (same rule the الصلاحيات matrix uses:
        -- owner isn't listed there because they can't be toggled).
        p.role = 'owner'
        or exists (
          select 1 from role_permissions rp
          where rp.role_id = p.role
            and rp.module = p_module
            and rp.level <> 'none'
        )
      )
  );
$$ language sql stable security definer set search_path = public;

grant execute on function has_permission(text) to authenticated;

-- The four new modules, seeded across every existing role. Custom roles an admin
-- created earlier get 'none' (the same default addPermissionModule() uses).
insert into role_permissions (role_id, module, level)
select r.id, m.module,
  case
    when r.id in ('owner', 'admin', 'doctor') then 'full'
    when r.id = 'reception' then
      case m.module when 'medical_records_manage' then 'none' else 'full' end
    when r.id in ('viewer', 'accountant') then
      case m.module when 'inventory_view' then 'full' else 'none' end
    else 'none'
  end
from roles r
cross join (values
  ('inventory_view'), ('inventory_manage'),
  ('medical_records_view'), ('medical_records_manage')
) as m(module)
on conflict (role_id, module) do nothing;

-- ============================================================
-- 2. Inventory: products + an append-only movement ledger
-- ============================================================

create table if not exists inventory_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  -- 'قطعة' | 'علبة' | 'زجاجة' | 'شريط' | anything else typed by the user
  unit text not null default 'قطعة',
  -- numeric (not int) so units like زجاجة can be tracked in fractions if needed.
  quantity numeric(12,2) not null default 0 check (quantity >= 0),
  min_quantity numeric(12,2) not null default 0 check (min_quantity >= 0),
  notes text,
  -- Optional: a product can belong to one branch, or be clinic-wide (null).
  branch_id uuid references branches(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_products_branch_idx on inventory_products(branch_id);
create index if not exists inventory_products_active_idx on inventory_products(active);

-- Derived status, stored so it can be filtered and indexed straight from the client
-- (PostgREST cannot compare two columns of the same row inside a filter).
--   'out'  نافد    — quantity = 0
--   'low'  منخفض  — quantity <= min_quantity
--   'ok'   متوفر
alter table inventory_products
  add column if not exists status text
  generated always as (
    case when quantity <= 0 then 'out'
         when quantity <= min_quantity then 'low'
         else 'ok' end
  ) stored;

create index if not exists inventory_products_status_idx on inventory_products(status);

drop trigger if exists inventory_products_set_updated_at on inventory_products;
create trigger inventory_products_set_updated_at
  before update on inventory_products
  for each row execute function set_updated_at();

-- Every quantity change, ever. Written only by record_inventory_movement() below —
-- there is deliberately no INSERT/UPDATE/DELETE policy, so a client cannot forge or
-- erase history even with a valid session.
create table if not exists inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references inventory_products(id) on delete cascade,
  -- 'add' وصلت كمية | 'use' استُهلكت | 'adjust' جرد/تصحيح يدوي
  type text not null check (type in ('add', 'use', 'adjust')),
  quantity_before numeric(12,2) not null,
  quantity_change numeric(12,2) not null,   -- signed: +50 / -5
  quantity_after numeric(12,2) not null,
  user_id uuid references profiles(id) on delete set null,
  -- Name snapshotted at write time so the ledger still reads correctly after a
  -- staff account is renamed or removed.
  user_name text,
  appointment_id uuid references appointments(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists inventory_transactions_product_idx on inventory_transactions(product_id, created_at desc);
create index if not exists inventory_transactions_created_idx on inventory_transactions(created_at desc);

-- Guard: quantity may only move through record_inventory_movement(), which sets the
-- app.inventory_movement flag for its transaction. A direct UPDATE from the client
-- (which RLS otherwise allows, for renaming a product or changing its min level)
-- cannot silently change stock and skip the ledger.
create or replace function guard_inventory_quantity() returns trigger as $$
begin
  if new.quantity is distinct from old.quantity
     and coalesce(current_setting('app.inventory_movement', true), '') <> '1' then
    raise exception 'لا يمكن تعديل الكمية مباشرة — استخدم إضافة أو خصم كمية'
      using errcode = '42501';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists inventory_products_guard_quantity on inventory_products;
create trigger inventory_products_guard_quantity
  before update on inventory_products
  for each row execute function guard_inventory_quantity();

-- ============================================================
-- 3. Patients — the clinical identity.
--
--    Not merged into `profiles` because profiles.id references auth.users: a
--    walk-in patient who never signed in cannot have a profile row at all, and the
--    app already books such people as guests (appointments.customer_name/phone).
--    profile_id links the two whenever the patient does have an account.
-- ============================================================

create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references profiles(id) on delete set null,
  name text not null,
  phone text,
  birth_date date,
  gender text check (gender in ('male', 'female')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists patients_phone_idx on patients(phone);
create index if not exists patients_created_idx on patients(created_at desc);

drop trigger if exists patients_set_updated_at on patients;
create trigger patients_set_updated_at
  before update on patients
  for each row execute function set_updated_at();

-- Find-or-create, matching first on the linked account, then on a digits-only phone
-- comparison (the app stores '20100…' for accounts but admins type '0100…' for guests).
create or replace function ensure_patient(p_profile_id uuid, p_name text, p_phone text)
returns uuid as $$
declare
  v_id uuid;
  v_digits text;
  v_name text;
begin
  v_digits := nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), '');
  v_name := nullif(btrim(coalesce(p_name, '')), '');

  if p_profile_id is not null then
    select id into v_id from patients where profile_id = p_profile_id;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  if v_digits is not null then
    select id into v_id
      from patients
     where regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = v_digits
       -- Never steal a patient row that already belongs to a different account.
       and (p_profile_id is null or profile_id is null)
     order by created_at
     limit 1;
    if v_id is not null then
      if p_profile_id is not null then
        update patients
           set profile_id = p_profile_id,
               name = coalesce(nullif(btrim(name), ''), v_name, name)
         where id = v_id;
      end if;
      return v_id;
    end if;
  end if;

  insert into patients (profile_id, name, phone)
  values (p_profile_id, coalesce(v_name, 'مريض'), p_phone)
  returning id into v_id;
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================================
-- 4. Visits (الكشف) — the clinical encounter.
--
--    A visit normally *is* an appointment (appointment_id, unique), so nothing is
--    typed twice: date/doctor/branch/reason are copied across on creation. A
--    walk-in encounter with no booking is allowed too (appointment_id null).
-- ============================================================

alter table appointments add column if not exists patient_id uuid references patients(id) on delete set null;
create index if not exists appointments_patient_idx on appointments(patient_id);

create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  appointment_id uuid unique references appointments(id) on delete set null,
  doctor_id uuid references doctors(id) on delete set null,
  branch_id uuid references branches(id) on delete set null,
  visit_date date not null default current_date,
  visit_time time,
  reason text,        -- سبب الزيارة (defaults to the booked service name)
  diagnosis text,     -- التشخيص
  notes text,         -- ملاحظات الطبيب
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists visits_patient_idx on visits(patient_id, visit_date desc);
create index if not exists visits_doctor_idx on visits(doctor_id, visit_date desc);

drop trigger if exists visits_set_updated_at on visits;
create trigger visits_set_updated_at
  before update on visits
  for each row execute function set_updated_at();

-- Now that visits exists, let a movement point at the encounter that consumed it.
alter table inventory_transactions add column if not exists visit_id uuid references visits(id) on delete set null;
create index if not exists inventory_transactions_visit_idx on inventory_transactions(visit_id);

-- ============================================================
-- 5. Prescriptions, labs, radiology
-- ============================================================

create table if not exists prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  visit_id uuid references visits(id) on delete cascade,
  doctor_id uuid references doctors(id) on delete set null,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists prescriptions_patient_idx on prescriptions(patient_id, created_at desc);
create index if not exists prescriptions_visit_idx on prescriptions(visit_id);

create table if not exists prescription_items (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references prescriptions(id) on delete cascade,
  drug_name text not null,
  dose text,           -- الجرعة، مثال: 500 مجم
  frequency text,      -- عدد المرات، مثال: 3 مرات يومياً
  duration text,       -- مدة الاستخدام، مثال: 7 أيام
  instructions text,   -- التعليمات، مثال: بعد الأكل
  sort_order int not null default 0
);

create index if not exists prescription_items_prescription_idx on prescription_items(prescription_id, sort_order);

create table if not exists lab_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  visit_id uuid references visits(id) on delete set null,
  doctor_id uuid references doctors(id) on delete set null,
  test_name text not null,
  status text not null default 'requested' check (status in ('requested', 'completed', 'cancelled')),
  result text,
  notes text,
  -- Object path inside the private `medical-files` storage bucket (section 9).
  file_path text,
  requested_at date not null default current_date,
  result_date date,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists lab_requests_patient_idx on lab_requests(patient_id, requested_at desc);
create index if not exists lab_requests_visit_idx on lab_requests(visit_id);

create table if not exists radiology_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  visit_id uuid references visits(id) on delete set null,
  doctor_id uuid references doctors(id) on delete set null,
  exam_type text not null,   -- نوع الأشعة، مثال: أشعة سينية على الصدر
  status text not null default 'requested' check (status in ('requested', 'completed', 'cancelled')),
  report text,               -- التقرير / الملاحظات
  notes text,
  file_path text,
  performed_at date not null default current_date,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists radiology_patient_idx on radiology_records(patient_id, performed_at desc);
create index if not exists radiology_visit_idx on radiology_records(visit_id);

-- ============================================================
-- 6. Linking appointments to patients (so nothing is typed twice)
-- ============================================================

create or replace function appointments_link_patient() returns trigger as $$
declare
  v_name text;
  v_phone text;
begin
  if new.patient_id is not null then
    return new;
  end if;

  if new.customer_id is not null then
    select coalesce(nullif(btrim(p.name), ''), new.customer_name),
           coalesce(p.phone, new.customer_phone)
      into v_name, v_phone
      from profiles p
     where p.id = new.customer_id;
  else
    v_name := new.customer_name;
    v_phone := new.customer_phone;
  end if;

  new.patient_id := ensure_patient(new.customer_id, v_name, v_phone);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists appointments_link_patient on appointments;
create trigger appointments_link_patient
  before insert or update of customer_id, customer_name, customer_phone on appointments
  for each row execute function appointments_link_patient();

-- Backfill: one patient per existing registered customer…
insert into patients (profile_id, name, phone)
select p.id, coalesce(nullif(btrim(p.name), ''), 'مريض'), p.phone
  from profiles p
 where p.role = 'customer'
   and not exists (select 1 from patients pt where pt.profile_id = p.id);

-- …and one per distinct guest phone that has ever been booked.
insert into patients (name, phone)
select distinct on (regexp_replace(a.customer_phone, '[^0-9]', '', 'g'))
       coalesce(nullif(btrim(a.customer_name), ''), 'مريض'),
       a.customer_phone
  from appointments a
 where a.customer_id is null
   and nullif(regexp_replace(coalesce(a.customer_phone, ''), '[^0-9]', '', 'g'), '') is not null
   and not exists (
     select 1 from patients pt
      where regexp_replace(coalesce(pt.phone, ''), '[^0-9]', '', 'g')
          = regexp_replace(a.customer_phone, '[^0-9]', '', 'g')
   )
 order by regexp_replace(a.customer_phone, '[^0-9]', '', 'g'), a.created_at;

-- Point every existing appointment at its patient (touches only patient_id, so the
-- link trigger above does not fire and set_updated_at's bump is the only side effect).
update appointments a
   set patient_id = ensure_patient(
         a.customer_id,
         coalesce((select nullif(btrim(p.name), '') from profiles p where p.id = a.customer_id), a.customer_name),
         coalesce((select p.phone from profiles p where p.id = a.customer_id), a.customer_phone)
       )
 where a.patient_id is null;

-- Open (or create) the encounter behind an appointment, copying its context over.
create or replace function ensure_visit_for_appointment(p_appointment_id uuid)
returns uuid as $$
declare
  v_id uuid;
  a record;
begin
  if not has_permission('medical_records_manage') then
    raise exception 'ليس لديك صلاحية إدارة السجلات الطبية' using errcode = '42501';
  end if;

  select id into v_id from visits where appointment_id = p_appointment_id;
  if v_id is not null then
    return v_id;
  end if;

  select ap.id, ap.patient_id, ap.doctor_id, ap.branch_id,
         ap.appointment_date, ap.appointment_time,
         coalesce(s.name, ap.service_name) as resolved_service
    into a
    from appointments ap
    left join services s on s.id = ap.service_id
   where ap.id = p_appointment_id;

  if not found then
    raise exception 'الموعد غير موجود';
  end if;

  if a.patient_id is null then
    raise exception 'هذا الموعد غير مرتبط بمريض';
  end if;

  insert into visits (patient_id, appointment_id, doctor_id, branch_id, visit_date, visit_time, reason, created_by)
  values (a.patient_id, a.id, a.doctor_id, a.branch_id, a.appointment_date, a.appointment_time, a.resolved_service, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function ensure_visit_for_appointment(uuid) to authenticated;

-- ============================================================
-- 7. Stock movement — the only sanctioned way to change a quantity.
--
--    Locks the product row, refuses to go below zero, writes the ledger entry with
--    the acting user, and does it all inside one transaction so a concurrent
--    deduction cannot over-draw the same stock.
-- ============================================================

create or replace function record_inventory_movement(
  p_product_id uuid,
  p_type text,
  p_quantity numeric,
  p_notes text default null,
  p_visit_id uuid default null,
  p_appointment_id uuid default null
) returns inventory_transactions as $$
declare
  v_before numeric;
  v_after numeric;
  v_name text;
  v_user_name text;
  v_row inventory_transactions;
begin
  if not has_permission('inventory_manage') then
    raise exception 'ليس لديك صلاحية تعديل المخزون' using errcode = '42501';
  end if;

  if p_type not in ('add', 'use', 'adjust') then
    raise exception 'نوع الحركة غير صحيح';
  end if;

  if p_quantity is null or p_quantity < 0 then
    raise exception 'الكمية يجب أن تكون رقماً موجباً';
  end if;

  if p_type <> 'adjust' and p_quantity = 0 then
    raise exception 'الكمية يجب أن تكون أكبر من صفر';
  end if;

  select quantity, name into v_before, v_name
    from inventory_products where id = p_product_id for update;

  if not found then
    raise exception 'المنتج غير موجود';
  end if;

  if p_type = 'add' then
    v_after := v_before + p_quantity;
  elsif p_type = 'use' then
    v_after := v_before - p_quantity;
  else
    v_after := p_quantity;   -- adjust: p_quantity is the new absolute count
  end if;

  if v_after < 0 then
    raise exception 'الكمية المطلوبة (%) أكبر من المتاح من %: % فقط', p_quantity, v_name, v_before
      using errcode = '22003';
  end if;

  select name into v_user_name from profiles where id = auth.uid();

  -- Unlock the quantity guard for this statement only.
  perform set_config('app.inventory_movement', '1', true);
  update inventory_products set quantity = v_after where id = p_product_id;
  perform set_config('app.inventory_movement', '0', true);

  insert into inventory_transactions (
    product_id, type, quantity_before, quantity_change, quantity_after,
    user_id, user_name, visit_id, appointment_id, notes
  ) values (
    p_product_id, p_type, v_before, v_after - v_before, v_after,
    auth.uid(), v_user_name, p_visit_id, p_appointment_id, nullif(btrim(coalesce(p_notes, '')), '')
  ) returning * into v_row;

  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function record_inventory_movement(uuid, text, numeric, text, uuid, uuid) to authenticated;

-- Consume several supplies at once during an encounter. All-or-nothing: if any one
-- line is short, the whole call raises and nothing is deducted.
-- p_items: [{"product_id": "…", "quantity": 2}, …]
create or replace function record_inventory_usage(
  p_items jsonb,
  p_visit_id uuid default null,
  p_appointment_id uuid default null,
  p_notes text default null
) returns int as $$
declare
  item jsonb;
  v_count int := 0;
begin
  for item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    perform record_inventory_movement(
      (item->>'product_id')::uuid,
      'use',
      (item->>'quantity')::numeric,
      p_notes,
      p_visit_id,
      p_appointment_id
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function record_inventory_usage(jsonb, uuid, uuid, text) to authenticated;

-- ============================================================
-- 8. Row Level Security
-- ============================================================

alter table inventory_products enable row level security;
alter table inventory_transactions enable row level security;
alter table patients enable row level security;
alter table visits enable row level security;
alter table prescriptions enable row level security;
alter table prescription_items enable row level security;
alter table lab_requests enable row level security;
alter table radiology_records enable row level security;

-- Policies are created idempotently so re-running the file is safe on any Postgres
-- version (CREATE POLICY IF NOT EXISTS only landed in PG 16).
do $policies$
declare
  p record;
begin
  for p in
    select * from (values
      -- Inventory ------------------------------------------------------------
      ('inventory_products', 'inventory_products_select',  'select', 'has_permission(''inventory_view'')'),
      ('inventory_products', 'inventory_products_insert',  'insert', 'has_permission(''inventory_manage'')'),
      ('inventory_products', 'inventory_products_update',  'update', 'has_permission(''inventory_manage'')'),
      ('inventory_products', 'inventory_products_delete',  'delete', 'has_permission(''inventory_manage'')'),
      -- Ledger is read-only to clients: writes happen only inside
      -- record_inventory_movement(), which is security definer.
      ('inventory_transactions', 'inventory_transactions_select', 'select', 'has_permission(''inventory_view'')'),

      -- Medical records ------------------------------------------------------
      ('patients', 'patients_select', 'select', 'has_permission(''medical_records_view'')'),
      ('patients', 'patients_insert', 'insert', 'has_permission(''medical_records_manage'')'),
      ('patients', 'patients_update', 'update', 'has_permission(''medical_records_manage'')'),

      ('visits', 'visits_select', 'select', 'has_permission(''medical_records_view'')'),
      ('visits', 'visits_insert', 'insert', 'has_permission(''medical_records_manage'')'),
      ('visits', 'visits_update', 'update', 'has_permission(''medical_records_manage'')'),
      ('visits', 'visits_delete', 'delete', 'has_permission(''medical_records_manage'')'),

      ('prescriptions', 'prescriptions_select', 'select', 'has_permission(''medical_records_view'')'),
      ('prescriptions', 'prescriptions_insert', 'insert', 'has_permission(''medical_records_manage'')'),
      ('prescriptions', 'prescriptions_update', 'update', 'has_permission(''medical_records_manage'')'),
      ('prescriptions', 'prescriptions_delete', 'delete', 'has_permission(''medical_records_manage'')'),

      ('prescription_items', 'prescription_items_select', 'select', 'has_permission(''medical_records_view'')'),
      ('prescription_items', 'prescription_items_insert', 'insert', 'has_permission(''medical_records_manage'')'),
      ('prescription_items', 'prescription_items_update', 'update', 'has_permission(''medical_records_manage'')'),
      ('prescription_items', 'prescription_items_delete', 'delete', 'has_permission(''medical_records_manage'')'),

      ('lab_requests', 'lab_requests_select', 'select', 'has_permission(''medical_records_view'')'),
      ('lab_requests', 'lab_requests_insert', 'insert', 'has_permission(''medical_records_manage'')'),
      ('lab_requests', 'lab_requests_update', 'update', 'has_permission(''medical_records_manage'')'),
      ('lab_requests', 'lab_requests_delete', 'delete', 'has_permission(''medical_records_manage'')'),

      ('radiology_records', 'radiology_records_select', 'select', 'has_permission(''medical_records_view'')'),
      ('radiology_records', 'radiology_records_insert', 'insert', 'has_permission(''medical_records_manage'')'),
      ('radiology_records', 'radiology_records_update', 'update', 'has_permission(''medical_records_manage'')'),
      ('radiology_records', 'radiology_records_delete', 'delete', 'has_permission(''medical_records_manage'')')
    ) as t(tbl, pol, action, expr)
  loop
    if not exists (
      select 1 from pg_policies
       where schemaname = 'public' and tablename = p.tbl and policyname = p.pol
    ) then
      if p.action = 'insert' then
        execute format('create policy %I on public.%I for insert with check (%s)', p.pol, p.tbl, p.expr);
      else
        execute format('create policy %I on public.%I for %s using (%s)', p.pol, p.tbl, p.action, p.expr);
      end if;
    end if;
  end loop;
end
$policies$;

-- ============================================================
-- 9. Private storage bucket for lab / radiology attachments.
--
--    Wrapped in exception handlers: on a hosted Supabase project the SQL editor runs
--    as an owner that can do this, but if the role lacks privileges the rest of the
--    migration must still succeed — the app then degrades to records without files
--    and says so in the UI.
-- ============================================================

do $bucket$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'medical-files', 'medical-files', false, 10485760,
    array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'application/pdf']
  )
  on conflict (id) do nothing;
exception when others then
  raise notice 'تخطّي إنشاء bucket التخزين: %', sqlerrm;
end
$bucket$;

do $storagepolicies$
declare
  p record;
begin
  for p in
    select * from (values
      ('medical_files_select', 'select', 'has_permission(''medical_records_view'')'),
      ('medical_files_insert', 'insert', 'has_permission(''medical_records_manage'')'),
      ('medical_files_update', 'update', 'has_permission(''medical_records_manage'')'),
      ('medical_files_delete', 'delete', 'has_permission(''medical_records_manage'')')
    ) as t(pol, action, expr)
  loop
    if not exists (
      select 1 from pg_policies
       where schemaname = 'storage' and tablename = 'objects' and policyname = p.pol
    ) then
      if p.action = 'insert' then
        execute format(
          'create policy %I on storage.objects for insert to authenticated with check (bucket_id = ''medical-files'' and public.%s)',
          p.pol, p.expr);
      else
        execute format(
          'create policy %I on storage.objects for %s to authenticated using (bucket_id = ''medical-files'' and public.%s)',
          p.pol, p.action, p.expr);
      end if;
    end if;
  end loop;
exception when others then
  raise notice 'تخطّي سياسات bucket التخزين: %', sqlerrm;
end
$storagepolicies$;
