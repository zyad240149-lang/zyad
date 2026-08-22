// ميعاد — التاريخ الطبي للمريض.
//
// The standing clinical summary that isn't tied to any one visit: allergies,
// chronic conditions, what they're taking now, what they took before, surgeries
// and procedures. Stored in patient_medical_history (one row per patient) rather
// than on the patient row itself, so a receptionist who can look someone up in the
// directory still can't read it — see the 0005 migration.
import { useState } from 'react';
import { saveMedicalHistory } from '../../lib/api/medical.js';
import { ds, font, Btn, ModalShell, TextArea } from './ui.jsx';

const { Field, Input, Alert } = ds;

// [column, label, placeholder] — also the order they're shown in, on both the
// form and the read-only card in the patient file.
export const HISTORY_SECTIONS = [
  ['allergies', 'الحساسية', 'مثال: حساسية من البنسلين'],
  ['chronic_conditions', 'الأمراض السابقة والمزمنة', 'مثال: ضغط مرتفع منذ 2019'],
  ['current_medications', 'الأدوية الحالية', 'الأدوية التي يتناولها المريض الآن'],
  ['past_medications', 'الأدوية السابقة', 'أدوية سابقة خارج روشتات العيادة'],
  ['past_surgeries', 'العمليات السابقة', 'مثال: استئصال زائدة — 2021'],
  ['past_procedures', 'الإجراءات الطبية السابقة', 'مثال: قسطرة تشخيصية — 2023'],
  ['notes', 'ملاحظات طبية عامة', 'أي ملاحظة مهمة قبل الكشف'],
];

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function MedicalHistoryModal({ patientId, history, onClose, onSaved }) {
  const [form, setForm] = useState(() => {
    const initial = { blood_type: history?.blood_type ?? '' };
    for (const [key] of HISTORY_SECTIONS) initial[key] = history?.[key] ?? '';
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const saved = await saveMedicalHistory(patientId, form);
      onSaved(saved, 'تم حفظ التاريخ الطبي.');
    } catch (e) {
      setError(e.message || 'تعذّر حفظ التاريخ الطبي.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="التاريخ الطبي"
      sub="بيانات ثابتة تظهر لأي طبيب يفتح الملف — اتركها فارغة إن لم تكن معروفة"
      onClose={onClose}
      width={620}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="فصيلة الدم (اختياري)">
          <Input
            list="blood-types"
            iconStart="droplet"
            value={form.blood_type}
            onChange={e => set('blood_type', e.target.value)}
            placeholder="مثال: O+"
          />
          <datalist id="blood-types">
            {BLOOD_TYPES.map(t => <option key={t} value={t} />)}
          </datalist>
        </Field>

        {HISTORY_SECTIONS.map(([key, label, placeholder]) => (
          <Field key={key} label={label}>
            <TextArea rows={2} value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} />
          </Field>
        ))}
      </div>

      {error && <div style={{ marginTop: 14 }}><Alert tone="danger">{error}</Alert></div>}

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <Btn variant="ghost" size="lg" onClick={onClose}>إلغاء</Btn>
        <Btn size="lg" disabled={saving} onClick={save} style={{ flex: 1, fontFamily: font }}>
          {saving ? 'جارِ الحفظ…' : 'حفظ التاريخ الطبي'}
        </Btn>
      </div>
    </ModalShell>
  );
}
