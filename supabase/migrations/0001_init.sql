-- ميعاد — initial schema: branches, services, doctors, staff/roles, appointments, reminders.
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → paste → Run),
-- or via `supabase db push` if the project is linked with the CLI.

-- ============================================================
-- 1. Reference tables
-- ============================================================

create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  hours text,
  created_at timestamptz not null default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_minutes int not null default 30,
  price numeric(10,2) not null default 0,
  icon text,
  created_at timestamptz not null default now()
);

create table if not exists doctors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  specialty text,
  branch_id uuid references branches(id) on delete set null,
  rating numeric(2,1) default 5.0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists doctor_periods (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references doctors(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  days text not null,          -- e.g. 'السبت – الأربعاء' (kept as display text to match the existing UI)
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. People: profiles (1:1 with auth.users), roles, permissions
-- ============================================================

-- One row per auth.users row. Created automatically by the trigger below
-- the first time someone signs in via phone OTP.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique,
  name text,
  email text,
  role text not null default 'customer',   -- 'customer' | matches roles.name for staff
  branch_id uuid references branches(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

create table if not exists roles (
  id text primary key,          -- 'owner' | 'reception' | 'accountant' | 'doctor'
  name text not null,           -- 'مدير العيادة' etc — display label
  color text
);

create table if not exists role_permissions (
  role_id text not null references roles(id) on delete cascade,
  module text not null,         -- 'appointments' | 'accounting' | 'staff' | 'settings'
  level text not null default 'none' check (level in ('none', 'view', 'edit', 'full')),
  primary key (role_id, module)
);

-- ============================================================
-- 3. Appointments + reminders
-- ============================================================

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references profiles(id) on delete set null,
  -- Guest booking: admin can type a name+phone directly for a walk-in/phone customer
  -- who hasn't signed in via OTP yet. Either customer_id or these should be set.
  customer_name text,
  customer_phone text,
  branch_id uuid references branches(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  -- Custom/one-off service typed by admin, when it isn't one of the predefined services.
  service_name text,
  doctor_id uuid references doctors(id) on delete set null,
  appointment_date date not null,
  appointment_time time not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  notes text,
  -- Defaults to the service's price at booking time but can be overridden per appointment
  -- (discounts, custom pricing, etc.) — see src/components/Admin.jsx AddAppointmentModal.
  price numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointments_customer_idx on appointments(customer_id);
create index if not exists appointments_doctor_date_idx on appointments(doctor_id, appointment_date);

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  kind text not null check (kind in ('24h', '1h')),
  channel text not null check (channel in ('whatsapp', 'sms', 'email')),
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'sent', 'delivered', 'failed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists reminders_appointment_idx on reminders(appointment_id);

-- Keep updated_at current on appointment edits.
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists appointments_set_updated_at on appointments;
create trigger appointments_set_updated_at
  before update on appointments
  for each row execute function set_updated_at();

-- Cancelling an appointment auto-cancels its pending reminders (PRD section 9).
create or replace function cancel_reminders_on_cancel() returns trigger as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update reminders
      set status = 'cancelled'
      where appointment_id = new.id and status = 'scheduled';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists appointments_cancel_reminders on appointments;
create trigger appointments_cancel_reminders
  after update on appointments
  for each row execute function cancel_reminders_on_cancel();

-- Auto-create a profile row the first time a user signs in — phone/password, or an
-- OAuth provider like Google (which supplies email + name instead of a phone).
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, phone, email, name)
  values (
    new.id,
    new.phone,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- 4. Seed reference data (safe to re-run: ON CONFLICT DO NOTHING)
-- ============================================================

insert into roles (id, name, color) values
  ('owner', 'مدير العيادة', 'var(--teal-700)'),
  ('admin', 'أدمن', 'var(--blue-600)'),
  ('reception', 'موظف استقبال', 'var(--blue-500)'),
  ('viewer', 'مشاهد', 'var(--gray-500)'),
  ('accountant', 'محاسب', 'var(--amber-600)'),
  ('doctor', 'طبيب', 'var(--green-600)')
on conflict (id) do nothing;

-- Granular feature permissions shown in the admin "الصلاحيات" matrix. Owner is
-- seeded here too (always full) but the matrix UI deliberately excludes them —
-- their access is unconditional and isn't something staff toggle.
insert into role_permissions (role_id, module, level) values
  ('owner', 'view_bookings', 'full'), ('owner', 'manage_bookings', 'full'), ('owner', 'manage_availability', 'full'), ('owner', 'leads_access', 'full'), ('owner', 'manage_services_pricing', 'full'), ('owner', 'reports_analytics', 'full'), ('owner', 'manage_payments', 'full'),
  ('admin', 'view_bookings', 'full'), ('admin', 'manage_bookings', 'full'), ('admin', 'manage_availability', 'full'), ('admin', 'leads_access', 'full'), ('admin', 'manage_services_pricing', 'full'), ('admin', 'reports_analytics', 'full'), ('admin', 'manage_payments', 'none'),
  ('reception', 'view_bookings', 'full'), ('reception', 'manage_bookings', 'full'), ('reception', 'manage_availability', 'none'), ('reception', 'leads_access', 'full'), ('reception', 'manage_services_pricing', 'none'), ('reception', 'reports_analytics', 'none'), ('reception', 'manage_payments', 'none'),
  ('viewer', 'view_bookings', 'full'), ('viewer', 'manage_bookings', 'none'), ('viewer', 'manage_availability', 'none'), ('viewer', 'leads_access', 'none'), ('viewer', 'manage_services_pricing', 'none'), ('viewer', 'reports_analytics', 'none'), ('viewer', 'manage_payments', 'none')
on conflict (role_id, module) do nothing;

insert into branches (name, address, hours) values
  ('فرع أكتوبر', '٦ أكتوبر · المحور المركزي', '10 ص – 10 م'),
  ('فرع المعادي', 'المعادي · شارع ٩', '11 ص – 9 م'),
  ('فرع مدينة نصر', 'مدينة نصر · عباس العقاد', '10 ص – 11 م')
on conflict do nothing;

insert into services (name, duration_minutes, price, icon) values
  ('تنظيف أسنان', 45, 600, 'sparkles'),
  ('استشارة', 30, 450, 'clipboard-list'),
  ('متابعة', 20, 300, 'repeat'),
  ('أشعة', 15, 350, 'scan-line')
on conflict do nothing;

-- ============================================================
-- 5. Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table branches enable row level security;
alter table services enable row level security;
alter table doctors enable row level security;
alter table doctor_periods enable row level security;
alter table roles enable row level security;
alter table role_permissions enable row level security;
alter table appointments enable row level security;
alter table reminders enable row level security;

-- Helper: is the current user a staff member (any non-customer role)?
create or replace function is_staff() returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role <> 'customer' and status = 'active'
  );
$$ language sql stable security definer;

-- profiles: everyone can read their own row; staff can read/update all.
create policy "profiles_select_own" on profiles for select using (id = auth.uid() or is_staff());
create policy "profiles_update_own" on profiles for update using (id = auth.uid() or is_staff());
create policy "profiles_insert_staff" on profiles for insert with check (is_staff());

-- Reference data: public read (branch/service/doctor lists are shown pre-login on booking screens),
-- writes restricted to staff.
create policy "branches_read_all" on branches for select using (true);
create policy "branches_write_staff" on branches for insert with check (is_staff());
create policy "branches_update_staff" on branches for update using (is_staff());

create policy "services_read_all" on services for select using (true);
create policy "services_write_staff" on services for insert with check (is_staff());
create policy "services_update_staff" on services for update using (is_staff());

create policy "doctors_read_all" on doctors for select using (true);
create policy "doctors_write_staff" on doctors for insert with check (is_staff());
create policy "doctors_update_staff" on doctors for update using (is_staff());

create policy "doctor_periods_read_all" on doctor_periods for select using (true);
create policy "doctor_periods_write_staff" on doctor_periods for insert with check (is_staff());
create policy "doctor_periods_update_staff" on doctor_periods for update using (is_staff());

create policy "roles_read_all" on roles for select using (true);
-- Lets staff create/delete custom roles (e.g. "سكرتيرة") from the الصلاحيات matrix.
create policy "roles_write_staff" on roles for insert with check (is_staff());
create policy "roles_delete_staff" on roles for delete using (is_staff());
create policy "role_permissions_read_all" on role_permissions for select using (true);
create policy "role_permissions_write_staff" on role_permissions for update using (is_staff());
-- setRolePermission() upserts (INSERT ... ON CONFLICT DO UPDATE), which needs INSERT
-- privilege evaluated even when the row already exists and the conflict resolves to
-- an update — the UPDATE policy above alone isn't enough.
create policy "role_permissions_insert_staff" on role_permissions for insert with check (is_staff());
create policy "role_permissions_delete_staff" on role_permissions for delete using (is_staff());

-- appointments: customers see/manage only their own; staff see/manage everyone's.
create policy "appointments_select" on appointments for select using (customer_id = auth.uid() or is_staff());
create policy "appointments_insert" on appointments for insert with check (customer_id = auth.uid() or is_staff());
create policy "appointments_update" on appointments for update using (customer_id = auth.uid() or is_staff());
create policy "appointments_delete_staff" on appointments for delete using (is_staff());

-- reminders: visible to the owning customer (via their appointment) and staff.
create policy "reminders_select" on reminders for select using (
  is_staff() or exists (
    select 1 from appointments a where a.id = reminders.appointment_id and a.customer_id = auth.uid()
  )
);
create policy "reminders_write_staff" on reminders for insert with check (is_staff());
create policy "reminders_update_staff" on reminders for update using (is_staff());

-- ============================================================
-- 6. Availability check functions (security definer) — let any
--    authenticated user (not just staff) check whether a doctor's
--    slot is taken, without exposing other customers' appointment
--    rows to them (RLS on `appointments` otherwise hides those rows).
-- ============================================================

create or replace function is_doctor_slot_taken(
  p_doctor_id uuid, p_date date, p_time time, p_exclude_id uuid default null
) returns boolean as $$
  select exists (
    select 1 from appointments
    where doctor_id = p_doctor_id
      and appointment_date = p_date
      and appointment_time = p_time
      and status <> 'cancelled'
      and (p_exclude_id is null or id <> p_exclude_id)
  );
$$ language sql stable security definer set search_path = public;

grant execute on function is_doctor_slot_taken(uuid, date, time, uuid) to authenticated;

create or replace function get_doctor_taken_times(
  p_doctor_id uuid, p_date date, p_exclude_id uuid default null
) returns table(appointment_time time) as $$
  select appointment_time from appointments
  where doctor_id = p_doctor_id
    and appointment_date = p_date
    and status <> 'cancelled'
    and (p_exclude_id is null or id <> p_exclude_id);
$$ language sql stable security definer set search_path = public;

grant execute on function get_doctor_taken_times(uuid, date, uuid) to authenticated;

-- ============================================================
-- 7. Appointment feedback (customer rates a completed session)
-- ============================================================

create table if not exists appointment_feedback (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references appointments(id) on delete cascade,
  customer_id uuid not null references profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists appointment_feedback_customer_idx on appointment_feedback(customer_id);

alter table appointment_feedback enable row level security;

-- Customers can read/write feedback only for their own appointments; staff can read all.
create policy "feedback_select" on appointment_feedback for select using (
  customer_id = auth.uid() or is_staff()
);
create policy "feedback_insert" on appointment_feedback for insert with check (
  customer_id = auth.uid()
  and exists (select 1 from appointments a where a.id = appointment_id and a.customer_id = auth.uid())
);
create policy "feedback_update" on appointment_feedback for update using (
  customer_id = auth.uid()
);

-- ============================================================
-- 8. Doctor availability / booking settings ("المواعيد المتاحة")
-- ============================================================

alter table doctors add column if not exists profile_id uuid references profiles(id) on delete set null;
alter table doctors add column if not exists buffer_minutes int not null default 0;
alter table doctors add column if not exists max_advance_days int not null default 30;
alter table doctors add column if not exists reschedule_cutoff_hours int not null default 4;

-- One row per doctor per weekday (0=Sunday..6=Saturday) — whether that day is a
-- working day at all. Actual time ranges live in doctor_schedule_periods below
-- (a day can have more than one period, e.g. morning + evening).
create table if not exists doctor_schedule_days (
  doctor_id uuid not null references doctors(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  active boolean not null default true,
  primary key (doctor_id, weekday)
);

create table if not exists doctor_schedule_periods (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references doctors(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now()
);

create index if not exists doctor_schedule_periods_doctor_idx on doctor_schedule_periods(doctor_id, weekday);

-- Which of the clinic's services a given doctor actually offers.
create table if not exists doctor_services (
  doctor_id uuid not null references doctors(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  enabled boolean not null default true,
  primary key (doctor_id, service_id)
);

alter table doctor_schedule_days enable row level security;
alter table doctor_schedule_periods enable row level security;
alter table doctor_services enable row level security;

create policy "doctor_schedule_days_read_all" on doctor_schedule_days for select using (true);
create policy "doctor_schedule_days_write_staff" on doctor_schedule_days for insert with check (is_staff());
create policy "doctor_schedule_days_update_staff" on doctor_schedule_days for update using (is_staff());

create policy "doctor_schedule_periods_read_all" on doctor_schedule_periods for select using (true);
create policy "doctor_schedule_periods_write_staff" on doctor_schedule_periods for insert with check (is_staff());
create policy "doctor_schedule_periods_delete_staff" on doctor_schedule_periods for delete using (is_staff());

create policy "doctor_services_read_all" on doctor_services for select using (true);
create policy "doctor_services_write_staff" on doctor_services for insert with check (is_staff());
create policy "doctor_services_update_staff" on doctor_services for update using (is_staff());

-- Seed: every doctor works Sat–Thu 10:00–17:00, Friday off, offers all services.
insert into doctor_schedule_days (doctor_id, weekday, active)
select d.id, w.weekday, (w.weekday <> 5)
from doctors d cross join (select generate_series(0,6) as weekday) w
on conflict (doctor_id, weekday) do nothing;

insert into doctor_schedule_periods (doctor_id, weekday, start_time, end_time)
select d.id, w.weekday, '10:00', '17:00'
from doctors d cross join (select generate_series(0,6) as weekday) w
where w.weekday <> 5;

-- ============================================================
-- Branch working hours — same shape as the doctor schedule tables,
-- but for when a whole branch is open (independent of any one doctor's hours).
-- ============================================================

create table if not exists branch_schedule_days (
  branch_id uuid not null references branches(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  active boolean not null default true,
  primary key (branch_id, weekday)
);

create table if not exists branch_schedule_periods (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now()
);

create index if not exists branch_schedule_periods_branch_idx on branch_schedule_periods(branch_id, weekday);

alter table branch_schedule_days enable row level security;
alter table branch_schedule_periods enable row level security;

create policy "branch_schedule_days_read_all" on branch_schedule_days for select using (true);
create policy "branch_schedule_days_write_staff" on branch_schedule_days for insert with check (is_staff());
create policy "branch_schedule_days_update_staff" on branch_schedule_days for update using (is_staff());

create policy "branch_schedule_periods_read_all" on branch_schedule_periods for select using (true);
create policy "branch_schedule_periods_write_staff" on branch_schedule_periods for insert with check (is_staff());
create policy "branch_schedule_periods_delete_staff" on branch_schedule_periods for delete using (is_staff());

insert into doctor_services (doctor_id, service_id, enabled)
select d.id, s.id, true from doctors d cross join services s
on conflict (doctor_id, service_id) do nothing;
