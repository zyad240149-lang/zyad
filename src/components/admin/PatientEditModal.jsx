// Edits one person's details.
//
// Replaces the old customer-only edit modal: a patient row always exists, and when
// it's linked to an app account (patients.profile_id) the same save also writes the
// account fields — so staff edit one form instead of two records that can drift.
import { useState } from 'react';
import { toLocalPhone, toStoredPhone } from '../../lib/auth/AuthContext.jsx';
import { updatePatient, createPatient } from '../../lib/api/medical.js';
import { updateCustomer } from '../../lib/api/reference.js';
import { ds, font, Btn, ModalShell, TextArea, DateInput } from './ui.jsx';

const { Field, Input, Alert } = ds;

export default function PatientEditModal({ patient, onClose, onSaved }) {
  const creating = !patient;
  const [name, setName] = useState(patient?.name ?? '');
  const [phone, setPhone] = useState(toLocalPhone(patient?.phone) || '');
  const [email, setEmail] = useState(patient?.email ?? '');
  const [address, setAddress] = useState(patient?.address ?? '');
  const [birthDate, setBirthDate] = useState(patient?.birth_date ?? '');
  const [gender, setGender] = useState(patient?.gender ?? '');
  const [notes, setNotes] = useState(patient?.notes ?? '');
  const [status, setStatus] = useState(patient?.accountStatus ?? 'active');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const hasAccount = !!patient?.profile_id;

  const handleSave = async () => {
    const trimmedPhone = phone.trim();
    // An account's phone is its login, so it must stay a valid Egyptian mobile.
    // A walk-in's phone is free text (it may be a landline or missing entirely).
    const stored = toStoredPhone(trimmedPhone);
    if (hasAccount && !stored) {
      setError('رقم الهاتف غير صحيح. استخدم صيغة مصرية مثل 01xxxxxxxxx.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const phoneToStore = stored || trimmedPhone || null;
      const payload = {
        name: name.trim(),
        phone: phoneToStore,
        // A linked account keeps its email on `profiles` (that row is the source of
        // truth, and it's what mapPatient reads first) — writing it here too would
        // give the same person two copies that can drift.
        email: hasAccount ? undefined : (email.trim() || null),
        address: address.trim() || null,
        birthDate: birthDate || null,
        gender: gender || null,
        notes: notes.trim(),
      };
      const saved = creating ? await createPatient(payload) : await updatePatient(patient.id, payload);

      if (hasAccount) {
        await updateCustomer(patient.profile_id, {
          name: name.trim(), phone: stored, email: email.trim() || null, status,
        });
      }
      onSaved(saved, creating ? 'تمت إضافة المريض.' : 'تم حفظ البيانات.');
    } catch (e) {
      setError(e.message || 'تعذّر حفظ البيانات.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={creating ? 'إضافة مريض' : 'تعديل بيانات المريض'}
      sub={[
        patient?.file_number ? `ملف رقم ${patient.file_number}` : null,
        creating ? 'مريض زائر بدون حساب على التطبيق' : (hasAccount ? 'مرتبط بحساب على التطبيق — يُحدَّث الحساب أيضاً' : 'مريض زائر بدون حساب'),
      ].filter(Boolean).join(' · ')}
      onClose={onClose}
      width={520}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="الاسم">
          <Input iconStart="user-round" value={name} onChange={e => setName(e.target.value)} placeholder="مثال: سارة عبدالله" />
        </Field>
        <Field label="رقم الهاتف" hint={hasAccount ? 'رقم تسجيل الدخول لهذا الحساب' : undefined}>
          <Input iconStart="phone" value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" placeholder="01xx xxx xxxx" />
        </Field>

        <div className="admin-pair" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="تاريخ الميلاد (اختياري)">
            <DateInput value={birthDate} onChange={e => setBirthDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
          </Field>
          <div>
            <div style={{ fontFamily: font, fontWeight: 700, fontSize: 13.5, color: 'var(--text-strong)', marginBottom: 9 }}>النوع</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['male', 'ذكر'], ['female', 'أنثى'], ['', 'غير محدد']].map(([id, label]) => (
                <button key={id || 'none'} onClick={() => setGender(id)} style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontFamily: font, fontWeight: 700, fontSize: 12.5, cursor: 'pointer', background: gender === id ? 'var(--brand)' : 'var(--white)', border: gender === id ? '2px solid var(--brand)' : '1.5px solid var(--border-subtle)', color: gender === id ? '#fff' : 'var(--text-body)' }}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        <Field label="البريد الإلكتروني (اختياري)" hint={hasAccount ? 'بريد الحساب على التطبيق' : undefined}>
          <Input iconStart="mail" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" />
        </Field>

        <Field label="العنوان (اختياري)">
          <Input iconStart="map-pin" value={address} onChange={e => setAddress(e.target.value)} placeholder="مثال: المعادي — شارع ٩" />
        </Field>

        {hasAccount && (
          <>
            <div>
              <div style={{ fontFamily: font, fontWeight: 700, fontSize: 13.5, color: 'var(--text-strong)', marginBottom: 9 }}>حالة الحساب</div>
              <div style={{ display: 'flex', gap: 9 }}>
                {[['active', 'نشط'], ['suspended', 'موقوف']].map(([id, label]) => (
                  <button key={id} onClick={() => setStatus(id)} style={{ flex: 1, padding: '11px 0', borderRadius: 12, fontFamily: font, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', background: status === id ? 'var(--brand)' : 'var(--white)', border: status === id ? '2px solid var(--brand)' : '1.5px solid var(--border-subtle)', color: status === id ? '#fff' : 'var(--text-body)' }}>{label}</button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Administrative note only. The clinical summary (الحساسية، الأمراض
            السابقة…) lives in التاريخ الطبي inside the file, where the
            medical_records_clinical permission gates it. */}
        <Field label="ملاحظات عامة (اختياري)" hint="ملاحظة إدارية — التاريخ الطبي يُسجَّل داخل الملف الطبي">
          <TextArea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="مثال: يفضّل مواعيد الصباح" />
        </Field>
      </div>

      {error && <div style={{ marginTop: 14 }}><Alert tone="danger">{error}</Alert></div>}

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <Btn variant="ghost" size="lg" onClick={onClose}>إلغاء</Btn>
        <Btn size="lg" disabled={!name.trim() || saving} onClick={handleSave} style={{ flex: 1 }}>
          {saving ? 'جارِ الحفظ…' : creating ? 'إضافة المريض' : 'حفظ التعديلات'}
        </Btn>
      </div>
    </ModalShell>
  );
}
