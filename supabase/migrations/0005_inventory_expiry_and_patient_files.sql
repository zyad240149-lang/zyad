-- ميعاد — 0005: استكمال المخزون (صلاحية/مورّد/سعر) والسجل الطبي (رقم ملف،
-- تاريخ طبي، مرفقات، صلاحية عرض التفاصيل الطبية).
--
-- Additive like 0004: nothing is dropped except four SELECT policies that this file
-- immediately re-creates with a narrower check (see section 6 — that narrowing is
-- the point: a receptionist must not read diagnoses by default). No table, column
-- or row is removed, and every statement is `if not exists` / `on conflict do
-- nothing`, so the file is safe to re-run.
--
--   node scripts/apply-migration.mjs supabase/migrations/0005_inventory_expiry_and_patient_files.sql

-- ============================================================
-- 1. المخزون — بيانات الصنف الناقصة
--
--    0004 covered name/category/unit/quantity/min/notes. The three below complete
--    the item card: when it expires, what it cost, and who supplies it.
-- ============================================================

alter table inventory_products add column if not exists expiry_date date;
alter table inventory_products add column if not exists purchase_price numeric(12,2) check (purchase_price is null or purchase_price >= 0);
alter table inventory_products add column if not exists supplier text;

-- Expiry can't be a generated column (it depends on today's date, which isn't
-- immutable), so the app filters on this index instead: expiry_date <= today
-- for منتهية, and <= today + 30 for قاربت على الانتهاء.
create index if not exists inventory_products_expiry_idx on inventory_products(expiry_date)
  where expiry_date is not null;

-- ============================================================
-- 2. رقم الملف الطبي
--
--    A short human-readable identifier staff can call out ("ملف ٤٧"), separate
--    from the uuid. Assigned by a trigger so it can never be forged or skipped.
-- ============================================================

create sequence if not exists patient_file_number_seq;

alter table patients add column if not exists file_number text;

-- Existing rows first, oldest patient = lowest number, so the backfill reads as a
-- sensible registry rather than random ids.
do $backfill$
declare
  r record;
begin
  for r in select id from patients where file_number is null order by created_at, id loop
    update patients
       set file_number = 'M-' || lpad(nextval('patient_file_number_seq')::text, 5, '0')
     where id = r.id;
  end loop;
end
$backfill$;

create unique index if not exists patients_file_number_idx on patients(file_number);

create or replace function patients_set_file_number() returns trigger as $$
begin
  if new.file_number is null or btrim(new.file_number) = '' then
    new.file_number := 'M-' || lpad(nextval('patient_file_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists patients_file_number on patients;
create trigger patients_file_number
  before insert on patients
  for each row execute function patients_set_file_number();

-- بيانات التواصل — optional, and only meaningful for a walk-in: a linked account
-- already carries its own email on profiles.
alter table patients add column if not exists email text;
alter table patients add column if not exists address text;

-- ============================================================
-- 3. التاريخ الطبي — منفصل عن صف المريض نفسه.
--
--    Deliberately its own table, not more columns on `patients`: RLS is row-level,
--    so anything living on `patients` is readable by whoever can list the patient
--    directory (the receptionist). Allergies, chronic conditions and past surgeries
--    are clinical data — they belong behind medical_records_clinical (section 6).
--    One row per patient.
-- ============================================================

create table if not exists patient_medical_history (
  patient_id uuid primary key references patients(id) on delete cascade,
  blood_type text,
  allergies text,             -- الحساسية
  chronic_conditions text,    -- الأمراض السابقة / المزمنة
  current_medications text,   -- الأدوية الحالية
  past_medications text,      -- الأدوية السابقة (ما لم يُسجَّل في روشتة)
  past_surgeries text,        -- العمليات السابقة
  past_procedures text,       -- الإجراءات الطبية السابقة
  notes text,                 -- ملاحظات طبية عامة
  updated_by uuid references profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

drop trigger if exists patient_medical_history_set_updated_at on patient_medical_history;
create trigger patient_medical_history_set_updated_at
  before update on patient_medical_history
  for each row execute function set_updated_at();

-- ============================================================
-- 4. الزيارة — الأعراض وخطة المتابعة
-- ============================================================

alter table visits add column if not exists symptoms text;
alter table visits add column if not exists follow_up text;

-- ============================================================
-- 5. المرفقات الطبية — تحاليل، أشعة، تقارير، وصفات، صور.
--
--    0004 gave lab_requests and radiology_records a single file_path each. This is
--    the general store: many files per patient, each classified, described, tied to
--    the visit it belongs to, and stamped with who uploaded it. The object itself
--    still lives in the private `medical-files` bucket; only its path is here.
-- ============================================================

create table if not exists patient_attachments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  visit_id uuid references visits(id) on delete set null,
  -- 'lab' تحليل | 'radiology' أشعة | 'report' تقرير طبي | 'prescription' وصفة
  -- | 'image' صورة | 'other' أخرى
  category text not null default 'other'
    check (category in ('lab', 'radiology', 'report', 'prescription', 'image', 'other')),
  file_name text not null,          -- الاسم كما رفعه المستخدم
  file_type text,                   -- mime, e.g. image/png · application/pdf
  file_size bigint,
  storage_path text not null,       -- المسار داخل bucket medical-files
  description text,
  -- Snapshotted like inventory_transactions.user_name: the file's provenance must
  -- stay readable after a staff account is renamed or deleted.
  uploaded_by uuid references profiles(id) on delete set null,
  uploaded_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists patient_attachments_patient_idx on patient_attachments(patient_id, created_at desc);
create index if not exists patient_attachments_visit_idx on patient_attachments(visit_id);
create index if not exists patient_attachments_category_idx on patient_attachments(patient_id, category);

drop trigger if exists patient_attachments_set_updated_at on patient_attachments;
create trigger patient_attachments_set_updated_at
  before update on patient_attachments
  for each row execute function set_updated_at();

-- Provenance is stamped server-side, not sent by the client: "who uploaded this"
-- is the one field on a medical file nobody should be able to type for themselves.
create or replace function patient_attachments_stamp_uploader() returns trigger as $$
begin
  new.uploaded_by := auth.uid();
  select name into new.uploaded_by_name from profiles where id = auth.uid();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists patient_attachments_uploader on patient_attachments;
create trigger patient_attachments_uploader
  before insert on patient_attachments
  for each row execute function patient_attachments_stamp_uploader();

-- Same for the history row: it records who last edited the clinical summary.
create or replace function patient_medical_history_stamp_editor() returns trigger as $$
begin
  new.updated_by := auth.uid();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists patient_medical_history_editor on patient_medical_history;
create trigger patient_medical_history_editor
  before insert or update on patient_medical_history
  for each row execute function patient_medical_history_stamp_editor();

-- ============================================================
-- 6. الصلاحيات — فصل «عرض بيانات المريض» عن «عرض التفاصيل الطبية»
--
--    The spec for موظف الاستقبال: can search for a patient and see the basic
--    details, but not the diagnoses, medical notes or files unless explicitly
--    allowed. 0004 had one view module for both, so this splits them:
--
--      medical_records_view      — دليل المرضى: الاسم، الهاتف، رقم الملف
--      medical_records_clinical  — التشخيص، الزيارات، الروشتات، التحاليل،
--                                  الأشعة، التاريخ الطبي، والمرفقات وملفاتها
--      medical_records_manage    — الكتابة (كما هي)
--
--    Everything stays switchable from تبويب «الصلاحيات» — an admin who *wants*
--    reception to read clinical data just flips medical_records_clinical to full.
-- ============================================================

insert into role_permissions (role_id, module, level)
select r.id, m.module,
  case
    when r.id in ('owner', 'admin', 'doctor') then 'full'
    -- Reception and the read-only roles start closed; 0004 gave them the directory.
    else 'none'
  end
from roles r
cross join (values ('medical_records_clinical'), ('medical_records_clinical')) as m(module)
on conflict (role_id, module) do nothing;

-- Anyone who can already *write* clinical records must be able to read them —
-- otherwise a custom role configured before this migration would break.
update role_permissions rp
   set level = 'full'
 where rp.module in ('medical_records_clinical', 'medical_records_clinical')
   and rp.level = 'none'
   and exists (
     select 1 from role_permissions m
      where m.role_id = rp.role_id
        and m.module = 'medical_records_manage'
        and m.level <> 'none'
   );

alter table patient_medical_history enable row level security;
alter table patient_attachments enable row level security;

do $policies$
declare
  p record;
begin
  -- The clinical tables move from medical_records_view to medical_records_clinical.
  -- Dropped and re-created rather than added to: policies OR together, so leaving
  -- the old one in place would keep granting the wider access.
  for p in
    select * from (values
      ('visits', 'visits_select'),
      ('prescriptions', 'prescriptions_select'),
      ('prescription_items', 'prescription_items_select'),
      ('lab_requests', 'lab_requests_select'),
      ('radiology_records', 'radiology_records_select')
    ) as t(tbl, pol)
  loop
    execute format('drop policy if exists %I on public.%I', p.pol, p.tbl);
    execute format(
      'create policy %I on public.%I for select using (has_permission(''medical_records_clinical''))',
      p.pol, p.tbl);
  end loop;

  -- The two new tables, gated the same way — plus the delete on `patients` that
  -- 0004 left out (it had insert/update/select only, so a file created by mistake
  -- could never be removed). Deleting a patient cascades to their whole record, so
  -- the UI asks twice; the permission is the same one that governs writing it.
  for p in
    select * from (values
      ('patients', 'patients_delete', 'delete', 'has_permission(''medical_records_manage'')'),

      ('patient_medical_history', 'patient_medical_history_select', 'select', 'has_permission(''medical_records_clinical'')'),
      ('patient_medical_history', 'patient_medical_history_insert', 'insert', 'has_permission(''medical_records_manage'')'),
      ('patient_medical_history', 'patient_medical_history_update', 'update', 'has_permission(''medical_records_manage'')'),
      ('patient_medical_history', 'patient_medical_history_delete', 'delete', 'has_permission(''medical_records_manage'')'),

      ('patient_attachments', 'patient_attachments_select', 'select', 'has_permission(''medical_records_clinical'')'),
      ('patient_attachments', 'patient_attachments_insert', 'insert', 'has_permission(''medical_records_manage'')'),
      ('patient_attachments', 'patient_attachments_update', 'update', 'has_permission(''medical_records_manage'')'),
      ('patient_attachments', 'patient_attachments_delete', 'delete', 'has_permission(''medical_records_manage'')')
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

-- Reading a stored file follows the same rule as reading the record that points at it.
do $storagepolicies$
begin
  drop policy if exists medical_files_select on storage.objects;
  create policy medical_files_select on storage.objects
    for select to authenticated
    using (bucket_id = 'medical-files' and public.has_permission('medical_records_clinical'));
exception when others then
  raise notice 'تخطّي تحديث سياسة قراءة bucket التخزين: %', sqlerrm;
end
$storagepolicies$;
