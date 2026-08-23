// Edits one person's details.
//
// Replaces the old customer-only edit modal: a patient row always exists, and when
// it's linked to an app account (patients.profile_id) the same save also writes the
// account fields — so staff edit one form instead of two records that can drift.
import { useState } from 'react';
import { useAuth, toLocalPhone, toStoredPhone } from '../../lib/auth/AuthContext.jsx';
import { updatePatient, createPatient, createPrescription } from '../../lib/api/medical.js';
import { updateCustomer } from '../../lib/api/reference.js';
import StagedFiles, { uploadStaged } from './StagedFiles.jsx';
import { ds, font, Btn, IconBtn, ModalShell, TextArea, DateInput } from './ui.jsx';

const { Field, Input, Alert, Icon } = ds;

const EMPTY_DRUG = { drugName: '', dose: '' };

/** Heading for one of the three optional clinical sections. */
function OptionalSection({ icon, title, hint, children }) {
  return (
    <div style={{ marginTop: 4, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
        <Icon name={icon} size={16} color="var(--brand)" />
        <span style={{ fontFamily: font, fontWeight: 800, fontSize: 14.5, color: 'var(--text-strong)' }}>{title}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--surface-sunken)', padding: '2px 9px', borderRadius: 999 }}>اختياري</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.7 }}>{hint}</div>
      {children}
    </div>
  );
}

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

  // ---- الأدوية / التحاليل / الأشعة — all optional, all staged until save ----
  const { can } = useAuth();
  const canRecordClinical = can('medical_records_manage');
  const [drugs, setDrugs] = useState([{ ...EMPTY_DRUG }]);
  const [drugFiles, setDrugFiles] = useState([]);
  const [labFiles, setLabFiles] = useState([]);
  const [radFiles, setRadFiles] = useState([]);
  // What the save managed and what it didn't — shown after the patient is written,
  // since by then the record exists and only the extras can still fail.
  const [progress, setProgress] = useState('');

  const setDrug = (i, key, value) => setDrugs(list => list.map((d, idx) => idx === i ? { ...d, [key]: value } : d));
  const namedDrugs = drugs.filter(d => d.drugName.trim());

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

      // ---- the optional extras ----
      // Deliberately after the patient is written and never inside the same try
      // that could roll it back: the person is now on file, and a failed photo
      // upload must not lose them. Failures are reported, not thrown.
      const extras = await saveExtras(saved.id);

      onSaved(saved, [
        creating ? 'تمت إضافة المريض.' : 'تم حفظ البيانات.',
        extras.summary,
      ].filter(Boolean).join(' '));

      if (extras.failed.length) setError(`حُفظ المريض، لكن تعذّر رفع: ${extras.failed.join(' · ')}`);
    } catch (e) {
      setError(e.message || 'تعذّر حفظ البيانات.');
    } finally {
      setSaving(false);
      setProgress('');
    }
  };

  /** Writes the prescription and uploads the three file groups. Never throws. */
  const saveExtras = async patientId => {
    const failed = [];
    const done = [];

    if (namedDrugs.length) {
      setProgress('جارِ حفظ الأدوية…');
      try {
        await createPrescription({ patientId, items: namedDrugs.map(d => ({ drugName: d.drugName, instructions: d.dose })) });
        done.push(`${namedDrugs.length} دواء`);
      } catch (e) {
        failed.push(`الأدوية (${e.message || 'خطأ'})`);
      }
    }

    const groups = [
      ['prescription', drugFiles, 'صور الأدوية'],
      ['lab', labFiles, 'صور التحاليل'],
      ['radiology', radFiles, 'صور الأشعة'],
    ];
    for (const [category, items, label] of groups) {
      if (!items.length) continue;
      setProgress(`جارِ رفع ${label}…`);
      const res = await uploadStaged(items, patientId, { category });
      if (res.uploaded) done.push(`${res.uploaded} من ${label}`);
      failed.push(...res.failed);
    }

    return { failed, summary: done.length ? `تم حفظ ${done.join(' و')}.` : '' };
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

        {/* The three clinical sections. Writing them needs the same permission that
            gates the rest of the medical record, so a role that may only edit
            contact details simply doesn't see them. */}
        {canRecordClinical && (
          <>
            <OptionalSection icon="pill" title="💊 الأدوية" hint="اكتب الأدوية، وارفق صورة الروشتة أو علبة الدواء. تُحفظ كروشتة في الملف الطبي.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {drugs.map((d, i) => (
                  <div key={i} className="admin-pair" style={{ display: 'grid', gridTemplateColumns: drugs.length > 1 ? '1fr 1fr auto' : '1fr 1fr', gap: 10, alignItems: 'end' }}>
                    <Field label={i === 0 ? 'اسم الدواء' : undefined}>
                      <Input iconStart="pill" value={d.drugName} onChange={e => setDrug(i, 'drugName', e.target.value)} placeholder="مثال: أوجمنتين ١ جم" />
                    </Field>
                    <Field label={i === 0 ? 'الجرعة / الملاحظات' : undefined}>
                      <Input value={d.dose} onChange={e => setDrug(i, 'dose', e.target.value)} placeholder="مثال: قرص كل ١٢ ساعة بعد الأكل" />
                    </Field>
                    {drugs.length > 1 && (
                      <IconBtn icon="trash-2" size={40} tone="var(--red-500)" title="حذف الدواء"
                        onClick={() => setDrugs(list => list.filter((_, idx) => idx !== i))} />
                    )}
                  </div>
                ))}
                <div>
                  <Btn size="sm" variant="ghost" icon="plus" onClick={() => setDrugs(list => [...list, { ...EMPTY_DRUG }])}>إضافة دواء</Btn>
                </div>
                <StagedFiles items={drugFiles} onChange={setDrugFiles} disabled={saving} fileLabel="رفع صورة الروشتة" />
              </div>
            </OptionalSection>

            <OptionalSection icon="flask-conical" title="🧪 التحاليل" hint="صور نتائج التحاليل أو ملفات PDF — يمكنك إضافة أكثر من ملف.">
              <StagedFiles items={labFiles} onChange={setLabFiles} disabled={saving} />
            </OptionalSection>

            <OptionalSection icon="scan-line" title="🩻 الأشعة" hint="صور الأشعة أو تقاريرها بصيغة JPG / PNG / PDF.">
              <StagedFiles items={radFiles} onChange={setRadFiles} disabled={saving} />
            </OptionalSection>
          </>
        )}
      </div>

      {error && <div style={{ marginTop: 14 }}><Alert tone="danger">{error}</Alert></div>}

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <Btn variant="ghost" size="lg" disabled={saving} onClick={onClose}>إلغاء</Btn>
        {/* Only the name gates the save — every section added above is optional. */}
        <Btn size="lg" disabled={!name.trim() || saving} onClick={handleSave} style={{ flex: 1 }}>
          {saving ? (progress || 'جارِ الحفظ…') : creating ? 'إضافة المريض' : 'حفظ التعديلات'}
        </Btn>
      </div>
    </ModalShell>
  );
}
