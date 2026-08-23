-- ميعاد — حذف البيانات التجريبية التي أضافها demo_data.sql.
--
--   node scripts/apply-migration.mjs supabase/seed/remove_demo_data.sql
--
-- يحذف فقط الصفوف التي تحمل العلامة ⟦تجريبي⟧. أي بيانات حقيقية أدخلتها بنفسك
-- لا تحمل العلامة، فلا يمسّها هذا الملف.

do $cleanup$
declare
  n_products int;
  n_visits   int;
  n_files    int;
begin
  -- الملفات المرفوعة على زيارة تجريبية: تُحذف صفوفها هنا. الكائن نفسه في
  -- bucket التخزين لا يُحذف من SQL — لكن البذرة لا ترفع ملفات أصلاً، فهذا
  -- يشمل فقط ما أرفقته أنت أثناء التجربة.
  delete from patient_attachments
   where visit_id in (select id from visits where notes like '%⟦تجريبي⟧%');
  get diagnostics n_files = row_count;

  -- الروشتات والتحاليل والأشعة تسقط مع زياراتها (on delete cascade)، لكن
  -- lab_requests وradiology_records مربوطة بـ set null، فتُحذف بعلامتها.
  delete from lab_requests      where notes like '%⟦تجريبي⟧%';
  delete from radiology_records where notes like '%⟦تجريبي⟧%';
  delete from prescriptions     where notes like '%⟦تجريبي⟧%';

  delete from visits where notes like '%⟦تجريبي⟧%';
  get diagnostics n_visits = row_count;

  delete from patient_medical_history where notes like '%⟦تجريبي⟧%';

  -- حركات المخزون تسقط مع الصنف (on delete cascade).
  delete from inventory_products where notes like '%⟦تجريبي⟧%';
  get diagnostics n_products = row_count;

  raise notice 'تم الحذف: % صنف مخزون، % زيارة، % مرفق.', n_products, n_visits, n_files;
end
$cleanup$;
