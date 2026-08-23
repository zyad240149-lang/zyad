-- ميعاد — بيانات تجريبية لقسمي المخزون وسجل المرضى.
--
-- الغرض: تشوف الشاشتين وهما مليانتين — التنبيهات، الفلاتر، الخط الزمني، الروشتات —
-- من غير ما تدخّل بيانات بإيدك.
--
--   node scripts/apply-migration.mjs supabase/seed/demo_data.sql
--
-- كل صف يكتبه هذا الملف ينتهي بالعلامة ⟦تجريبي⟧، ويُحذف كله بأمر واحد:
--
--   node scripts/apply-migration.mjs supabase/seed/remove_demo_data.sql
--
-- آمن للتكرار: يتحقق من العلامة أولاً، فتشغيله مرتين لا يضاعف البيانات.
-- لا يلمس المواعيد ولا الحسابات ولا أي بيانات حقيقية موجودة.

do $seed$
declare
  MARK constant text := ' ⟦تجريبي⟧';
  v_branch  uuid;
  v_doctor  uuid;
  v_patient uuid;
  v_visit   uuid;
  v_rx      uuid;
  v_product uuid;
  v_round   int;
  p         record;
  i         int := 0;
begin
  if exists (select 1 from inventory_products where notes like '%⟦تجريبي⟧%') then
    raise notice 'البيانات التجريبية موجودة بالفعل — لم يتم تكرارها.';
    return;
  end if;

  select id into v_branch from branches order by created_at limit 1;
  select id into v_doctor from doctors  order by created_at limit 1;

  -- ============================================================
  -- المخزون
  --
  -- الكميات مختارة عمداً لتغطي كل حالة تعرضها الشاشة: صنف نافد، أصناف تحت
  -- الحد الأدنى، صنف انتهت صلاحيته وآخر يوشك، وأصناف سليمة.
  -- ============================================================
  for p in
    select * from (values
      -- الاسم، التصنيف، الوحدة، الكمية، الحد الأدنى، أيام حتى الانتهاء (null = بلا صلاحية)، السعر، المورد
      ('قفازات لاتكس مقاس M',      'مستهلكات',      'علبة',  48,  15,  420,   85.00,  'شركة النيل للمستلزمات الطبية'),
      ('كمامات جراحية ٣ طبقات',    'مستهلكات',      'علبة',  12,  20,  300,   45.50,  'شركة النيل للمستلزمات الطبية'),
      ('قطن طبي معقّم',            'مستهلكات',      'كيس',   30,  10,  null,  22.00,  'الدلتا التجارية'),
      ('شاش معقّم ١٠×١٠',          'مستهلكات',      'كيس',   6,   12,  180,   18.75,  'الدلتا التجارية'),
      ('محلول تعقيم كلورهيكسيدين', 'مطهرات',        'زجاجة', 9,   6,   45,    120.00, 'فارما إيجيبت'),
      ('كحول إيثيلي ٧٠٪',          'مطهرات',        'زجاجة', 24,  8,   200,   65.00,  'فارما إيجيبت'),
      ('بنج موضعي ليدوكايين ٢٪',   'أدوية وتخدير',  'أمبولة', 40, 15,  90,    38.00,  'الشركة العربية للأدوية'),
      ('أمبولات مضاد حيوي',        'أدوية وتخدير',  'أمبولة', 0,  10,  25,    92.50,  'الشركة العربية للأدوية'),
      ('مسكن ديكلوفيناك حقن',      'أدوية وتخدير',  'أمبولة', 18, 10,  -12,   47.00,  'الشركة العربية للأدوية'),
      ('حشو ضوئي كومبوزيت A2',     'مواد أسنان',    'أنبوبة', 14, 5,   365,   310.00, 'دنتال سبلاي مصر'),
      ('إبر تخدير أسنان',          'مواد أسنان',    'علبة',  4,   6,   150,   140.00, 'دنتال سبلاي مصر'),
      ('أكواب بلاستيك للمرضى',     'مستلزمات عامة', 'كيس',   55,  20,  null,  15.00,  'الدلتا التجارية'),
      ('مرايل استعمال واحد',       'مستلزمات عامة', 'علبة',  27,  10,  null,  60.00,  'الدلتا التجارية'),
      ('أفلام أشعة أسنان',         'أشعة',          'علبة',  8,   4,   240,   275.00, 'راي ميد')
    ) as t(name, category, unit, qty, min_qty, expiry_days, price, supplier)
  loop
    insert into inventory_products (name, category, unit, quantity, min_quantity, expiry_date, purchase_price, supplier, branch_id, notes)
    values (
      p.name, p.category, p.unit, p.qty, p.min_qty,
      case when p.expiry_days is null then null else current_date + p.expiry_days end,
      p.price, p.supplier, v_branch, 'صنف للعرض' || MARK
    )
    returning id into v_product;

    -- سجل حركة مطابق للرصيد، حتى لا يظهر مخزون بلا تاريخ يفسّره.
    -- يُكتب مباشرة لأن هذا سياق إداري (service_role) لا يمر على RLS.
    if p.qty > 0 then
      insert into inventory_transactions (product_id, type, quantity_before, quantity_change, quantity_after, user_name, notes, created_at)
      values (v_product, 'add', 0, p.qty, p.qty, 'النظام', 'رصيد افتتاحي' || MARK, now() - (i || ' days')::interval);
    else
      -- الصنف النافد: وصل ثم استُهلك بالكامل — قصة أوضح من رصيد صفر بلا سبب.
      insert into inventory_transactions (product_id, type, quantity_before, quantity_change, quantity_after, user_name, notes, created_at)
      values (v_product, 'add', 0, 20, 20, 'النظام', 'رصيد افتتاحي' || MARK, now() - interval '30 days');
      insert into inventory_transactions (product_id, type, quantity_before, quantity_change, quantity_after, user_name, notes, created_at)
      values (v_product, 'use', 20, -20, 0, 'النظام', 'استُهلك بالكامل' || MARK, now() - interval '3 days');
    end if;
    i := i + 1;
  end loop;

  -- ============================================================
  -- سجل المرضى
  --
  -- يُعلَّق على أقدم ٦ مرضى موجودين فعلاً بدل إنشاء مرضى وهميين، حتى تبقى
  -- قائمة المرضى هي نفسها ويظهر الفرق داخل الملفات.
  -- ============================================================
  i := 0;
  for p in select id, name from patients order by created_at, id limit 6 loop
    v_patient := p.id;
    i := i + 1;

    insert into patient_medical_history (patient_id, blood_type, allergies, chronic_conditions, current_medications, past_surgeries, notes)
    values (
      v_patient,
      (array['A+','O+','B+','AB+','O-','A-'])[i],
      (array['حساسية من البنسلين','لا توجد حساسية معروفة','حساسية من الأسبرين','حساسية موسمية من الأتربة','لا توجد حساسية معروفة','حساسية من اليود'])[i],
      (array['ضغط مرتفع منذ ٢٠٢١','—','سكري من النوع الثاني','ربو خفيف','—','قولون عصبي'])[i],
      (array['كونكور ٥ مجم يومياً','—','ميتفورمين ٥٠٠ مجم مرتين يومياً','بخاخ فنتولين عند اللزوم','—','—'])[i],
      (array['استئصال زائدة دودية ٢٠١٨','—','—','لوز ٢٠٠٩','عملية رباط صليبي ٢٠٢٢','—'])[i],
      'ملف للعرض' || MARK
    )
    on conflict (patient_id) do nothing;

    -- زيارتان لكل مريض: واحدة قديمة وواحدة قريبة، ليظهر الخط الزمني بترتيب.
    for v_round in 1..2 loop
      insert into visits (patient_id, doctor_id, branch_id, visit_date, visit_time, reason, symptoms, diagnosis, notes, follow_up)
      values (
        v_patient, v_doctor, v_branch,
        current_date - (v_round * 21 + i)::int,
        (array['10:30','12:00','16:30','18:00'])[((i + v_round) % 4) + 1]::time,
        (array['ألم في الضرس','متابعة بعد الحشو','كشف دوري','تنظيف جير','ألم عند المضغ','استشارة تقويم'])[((i + v_round) % 6) + 1],
        (array['ألم متقطع يزداد مع البارد','تورّم خفيف في اللثة','لا توجد شكوى','رائحة فم ونزيف عند التفريش','ألم عند الضغط على الضرس','ازدحام في الأسنان الأمامية'])[((i + v_round) % 6) + 1],
        (array['تسوس في الضرس السفلي الأيمن','التهاب لثة بسيط','الحالة مستقرة','تراكم جير','كسر في حشو قديم','حاجة لتقويم ثابت'])[((i + v_round) % 6) + 1],
        'تم شرح الحالة للمريض' || MARK,
        (array['متابعة بعد أسبوعين','مراجعة عند استمرار الألم','كشف دوري بعد ٦ أشهر','تنظيف كل ٦ أشهر','متابعة بعد شهر','بدء التقويم الشهر القادم'])[((i + v_round) % 6) + 1]
      )
      returning id into v_visit;

      -- روشتة على الزيارة الأحدث فقط.
      if v_round = 2 then
        insert into prescriptions (patient_id, visit_id, doctor_id, notes)
        values (v_patient, v_visit, v_doctor, 'تُؤخذ بعد الأكل' || MARK)
        returning id into v_rx;

        insert into prescription_items (prescription_id, drug_name, dose, frequency, duration, instructions, sort_order) values
          (v_rx, 'أوجمنتين ١ جم', '١ قرص', '٣ مرات يومياً', '٥ أيام', 'بعد الأكل', 0),
          (v_rx, 'بروفين ٤٠٠ مجم', '١ قرص', 'عند اللزوم', '٣ أيام', 'لا يزيد عن ٣ أقراص يومياً', 1);

        insert into lab_requests (patient_id, visit_id, doctor_id, test_name, status, result, requested_at, result_date, notes)
        values (
          v_patient, v_visit, v_doctor,
          (array['صورة دم كاملة CBC','سكر صائم','وظائف كبد','نسبة فيتامين D','سرعة ترسيب ESR','وظائف كلى'])[i],
          case when i % 3 = 0 then 'requested' else 'completed' end,
          case when i % 3 = 0 then null else (array['ضمن المعدل الطبيعي','١١٠ ملجم/دل — مقبول','ضمن المعدل الطبيعي','٢٢ نانوجرام — منخفض قليلاً','١٨ مم/ساعة','ضمن المعدل الطبيعي'])[i] end,
          current_date - (v_round * 21 + i)::int,
          case when i % 3 = 0 then null else current_date - (v_round * 21 + i - 2)::int end,
          'تحليل للعرض' || MARK
        );

        if i % 2 = 1 then
          insert into radiology_records (patient_id, visit_id, doctor_id, exam_type, status, report, performed_at, notes)
          values (
            v_patient, v_visit, v_doctor,
            (array['أشعة بانوراما للفكين','أشعة على الضرس السفلي','أشعة سيفالومترك'])[((i - 1) / 2) + 1],
            'completed',
            (array['لا توجد كسور — تسوس واضح في الضرس السفلي الأيمن','التهاب في قمة الجذر','ازدحام أمامي واضح'])[((i - 1) / 2) + 1],
            current_date - (v_round * 21 + i)::int,
            'أشعة للعرض' || MARK
          );
        end if;
      end if;
    end loop;
  end loop;

  raise notice 'تمت إضافة البيانات التجريبية: ١٤ صنف مخزون و٦ ملفات طبية.';
end
$seed$;
