// ميعاد — بيانات تجريبية للمخزون وسجل المرضى.
//
// For trying the two new sections on a clinic that hasn't entered real data yet.
// Everything written here is tagged, so it can all be removed again in one command:
//
//   node scripts/seed-demo-data.mjs          # يضيف البيانات
//   node scripts/seed-demo-data.mjs --clean  # يحذفها كلها
//
// Only rows carrying the DEMO_TAG are ever deleted — real data entered through the
// dashboard is never touched, even by --clean.
//
// Uses the service_role key from .env: seeding writes across tables that RLS gates
// on a logged-in staff session, and this script has no session. That key never
// leaves this machine.

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const DEMO_TAG = '[تجريبي]';

// ---------- config ----------
const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(l => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('✗ SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY مطلوبان في .env');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

// ---------- the data ----------
const today = new Date();
const daysFromNow = n => new Date(today.getTime() + n * 86400000).toISOString().slice(0, 10);

const PRODUCTS = [
  { name: 'قفازات لاتكس مقاس M', category: 'مستلزمات طبية', unit: 'علبة', quantity: 42, min_quantity: 10, purchase_price: 85, supplier: 'شركة النيل للمستلزمات', expiry_date: daysFromNow(400) },
  { name: 'كمامات جراحية', category: 'مستلزمات طبية', unit: 'علبة', quantity: 8, min_quantity: 15, purchase_price: 45, supplier: 'شركة النيل للمستلزمات', expiry_date: daysFromNow(300) },
  { name: 'سرنجات 5 مل', category: 'مستلزمات طبية', unit: 'قطعة', quantity: 0, min_quantity: 50, purchase_price: 2.5, supplier: 'الدلتا الطبية' },
  { name: 'مخدر موضعي ليدوكايين', category: 'أدوية', unit: 'زجاجة', quantity: 12, min_quantity: 4, purchase_price: 120, supplier: 'فارما إيجيبت', expiry_date: daysFromNow(18) },
  { name: 'شاش طبي معقّم', category: 'مستلزمات طبية', unit: 'كيس', quantity: 30, min_quantity: 8, purchase_price: 18, supplier: 'الدلتا الطبية', expiry_date: daysFromNow(-12) },
  { name: 'كحول طبي 70%', category: 'مطهرات', unit: 'زجاجة', quantity: 16, min_quantity: 6, purchase_price: 35, supplier: 'فارما إيجيبت', expiry_date: daysFromNow(120) },
  { name: 'معجون تلميع الأسنان', category: 'أسنان', unit: 'أنبوبة', quantity: 9, min_quantity: 3, purchase_price: 95, supplier: 'دنتال سنتر' },
  { name: 'إبر تخدير أسنان', category: 'أسنان', unit: 'علبة', quantity: 5, min_quantity: 5, purchase_price: 210, supplier: 'دنتال سنتر', expiry_date: daysFromNow(25) },
];

const PATIENTS = [
  {
    name: 'منى إبراهيم', phone: '01011122233', gender: 'female', birth_date: '1988-04-12',
    history: { blood_type: 'O+', allergies: 'حساسية من البنسلين', chronic_conditions: 'ضغط مرتفع', current_medications: 'كونكور 5 مجم يومياً' },
    visits: [
      { days: -21, reason: 'ألم في الضرس العلوي الأيمن', symptoms: 'ألم حاد عند المضغ وحساسية من البارد', diagnosis: 'تسوس عميق يحتاج حشو عصب', follow_up: 'متابعة بعد أسبوعين لإكمال الحشو', drugs: [['أوجمنتين 1 جم', 'قرص كل 12 ساعة لمدة 5 أيام'], ['بروفين 400', 'عند اللزوم بعد الأكل']] },
      { days: -7, reason: 'متابعة بعد حشو العصب', symptoms: 'تحسن ملحوظ، ألم خفيف عند الضغط', diagnosis: 'التئام طبيعي', follow_up: 'تركيب طربوش بعد شهر' },
    ],
  },
  {
    name: 'كريم عبد الحميد', phone: '01099988877', gender: 'male', birth_date: '1995-11-30',
    history: { blood_type: 'A+', allergies: 'لا يوجد', chronic_conditions: 'لا يوجد', past_surgeries: 'استئصال الزائدة الدودية 2019' },
    visits: [
      { days: -40, reason: 'تنظيف وتلميع', symptoms: 'جير على الأسنان الأمامية السفلية', diagnosis: 'التهاب لثة بسيط', follow_up: 'تنظيف كل 6 شهور', drugs: [['غسول كلورهيكسيدين', 'مضمضة مرتين يومياً لمدة أسبوع']] },
    ],
  },
  {
    name: 'هالة سمير', phone: '01233344455', gender: 'female', birth_date: '2001-07-19',
    history: { blood_type: 'B-', allergies: 'حساسية من الأسبرين', current_medications: 'فيتامين د أسبوعياً' },
    visits: [
      { days: -3, reason: 'كشف أول — تقويم', symptoms: 'ازدحام في الأسنان الأمامية', diagnosis: 'يحتاج تقويم ثابت', follow_up: 'أشعة بانوراما ثم بدء التقويم' },
    ],
  },
];

// ---------- helpers ----------
async function must(label, promise) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

// ---------- clean ----------
async function clean() {
  console.log(`حذف كل ما يحمل الوسم ${DEMO_TAG}…\n`);

  const patients = await must('قراءة المرضى', db.from('patients').select('id, name').like('notes', `%${DEMO_TAG}%`));
  for (const p of patients ?? []) {
    // visits / prescriptions / history cascade on patient delete.
    await must('حذف مريض', db.from('patients').delete().eq('id', p.id));
    console.log(`  ✓ حُذف المريض ${p.name}`);
  }

  const products = await must('قراءة المنتجات', db.from('inventory_products').select('id, name').like('notes', `%${DEMO_TAG}%`));
  for (const p of products ?? []) {
    await must('حذف منتج', db.from('inventory_products').delete().eq('id', p.id));
    console.log(`  ✓ حُذف الصنف ${p.name}`);
  }

  console.log(`\nتم: ${patients?.length ?? 0} مريض و ${products?.length ?? 0} صنف.`);
}

// ---------- seed ----------
async function seed() {
  console.log('إضافة بيانات تجريبية…\n');

  // --- inventory ---
  console.log('المخزون:');
  for (const p of PRODUCTS) {
    const existing = await must('بحث', db.from('inventory_products').select('id').eq('name', p.name).maybeSingle());
    if (existing) { console.log(`  – ${p.name} موجود بالفعل`); continue; }

    const { quantity, ...rest } = p;
    // The opening balance goes in on the INSERT: the guard trigger from 0004 only
    // fires on UPDATE, and record_inventory_movement() needs a logged-in staff
    // session to pass its permission check — this script has none.
    const row = await must('إضافة صنف', db.from('inventory_products')
      .insert({ ...rest, quantity, notes: DEMO_TAG }).select('id').single());

    // The ledger still has to explain every unit on the shelf, so write the matching
    // opening-balance entry by hand rather than leaving stock with no history.
    if (quantity > 0) {
      await must('تسجيل حركة', db.from('inventory_transactions').insert({
        product_id: row.id, type: 'add',
        quantity_before: 0, quantity_change: quantity, quantity_after: quantity,
        user_name: 'بيانات تجريبية', notes: `${DEMO_TAG} رصيد افتتاحي`,
      }));
    }
    console.log(`  ✓ ${p.name} — ${quantity} ${p.unit}`);
  }

  // --- patients ---
  console.log('\nسجل المرضى:');
  const doctor = await must('قراءة الأطباء', db.from('doctors').select('id').limit(1).maybeSingle());

  for (const p of PATIENTS) {
    const existing = await must('بحث', db.from('patients').select('id').eq('phone', p.phone).maybeSingle());
    if (existing) { console.log(`  – ${p.name} موجود بالفعل`); continue; }

    const patient = await must('إضافة مريض', db.from('patients').insert({
      name: p.name, phone: p.phone, gender: p.gender, birth_date: p.birth_date, notes: DEMO_TAG,
    }).select('id, file_number').single());

    await must('التاريخ الطبي', db.from('patient_medical_history')
      .upsert({ patient_id: patient.id, ...p.history }, { onConflict: 'patient_id' }));

    for (const v of p.visits) {
      const visit = await must('إضافة زيارة', db.from('visits').insert({
        patient_id: patient.id,
        doctor_id: doctor?.id ?? null,
        visit_date: daysFromNow(v.days),
        reason: v.reason, symptoms: v.symptoms, diagnosis: v.diagnosis,
        follow_up: v.follow_up, notes: DEMO_TAG,
      }).select('id').single());

      if (v.drugs?.length) {
        const rx = await must('إضافة روشتة', db.from('prescriptions').insert({
          patient_id: patient.id, visit_id: visit.id, doctor_id: doctor?.id ?? null, notes: DEMO_TAG,
        }).select('id').single());

        await must('أدوية الروشتة', db.from('prescription_items').insert(
          v.drugs.map(([drug_name, instructions], i) => ({
            prescription_id: rx.id, drug_name, instructions, sort_order: i,
          }))
        ));
      }
    }
    console.log(`  ✓ ${p.name} — ملف ${patient.file_number} · ${p.visits.length} زيارة`);
  }

  console.log('\nتم. افتح «المخزون» و«سجل المرضى» في لوحة التحكم.');
  console.log(`للحذف لاحقاً: node scripts/seed-demo-data.mjs --clean`);
}

const run = process.argv.includes('--clean') ? clean : seed;
run().catch(e => { console.error(`\n✗ ${e.message}`); process.exit(1); });
