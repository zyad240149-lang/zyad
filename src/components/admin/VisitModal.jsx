// ميعاد — الكشف (clinical encounter).
//
// One screen for everything recorded during a visit: the encounter itself, the
// prescription, lab and radiology orders, and the supplies it consumed. Each part
// is written against the same visit_id, so it all shows up in the patient's file
// (and the supplies show up in the inventory ledger) without re-typing anything.
import { useState, useEffect, useCallback } from 'react';
import { listDoctors, listBranches } from '../../lib/api/reference.js';
import { listProductsForPicker, recordUsage } from '../../lib/api/inventory.js';
import {
  getVisit, createVisit, updateVisit, openVisitForAppointment,
  listPrescriptions, createPrescription, deletePrescription,
  listLabRequests, createLabRequest, updateLabRequest, deleteLabRequest,
  listRadiology, createRadiology, updateRadiology, deleteRadiology,
  listVisitSupplies, uploadMedicalFile, getMedicalFileUrl,
} from '../../lib/api/medical.js';
import {
  ds, font, Btn, IconBtn, Loading, ModalShell, TextArea, DateInput,
  fmtQty, fmtDate, EmptyState,
} from './ui.jsx';

const { Icon, Field, Select, Input, Alert } = ds;

const today = () => new Date().toISOString().slice(0, 10);

const SECTION = { marginTop: 22, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' };

function SubHead({ icon, children, sub, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
      <Icon name={icon} size={17} color="var(--brand)" />
      <div style={{ flex: 1, minWidth: 120 }}>
        <div style={{ fontFamily: font, fontWeight: 800, fontSize: 15, color: 'var(--text-strong)' }}>{children}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>}
      </div>
      {action}
    </div>
  );
}

/** Attach an image/PDF to a lab or radiology record. */
function FilePicker({ patientId, value, onChange, disabled }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      onChange(await uploadMedicalFile(patientId, file));
    } catch (err) {
      setError(err.message || 'تعذّر رفع الملف.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 999, border: '1.5px solid var(--border-default)', background: '#fff', cursor: disabled || busy ? 'not-allowed' : 'pointer', fontFamily: font, fontWeight: 700, fontSize: 12.5, color: 'var(--text-body)', opacity: disabled || busy ? 0.5 : 1 }}>
          <Icon name="paperclip" size={14} />
          {busy ? 'جارِ الرفع…' : value ? 'استبدال الملف' : 'إرفاق ملف / صورة'}
          <input type="file" accept="image/*,application/pdf" onChange={pick} disabled={disabled || busy} style={{ display: 'none' }} />
        </label>
        {value && (
          <>
            <span style={{ fontSize: 12, color: 'var(--green-600)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon name="check" size={13} color="var(--green-500)" />تم الإرفاق
            </span>
            <button onClick={() => onChange(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--red-500)', fontSize: 12, fontFamily: font, fontWeight: 700 }}>إزالة</button>
          </>
        )}
      </div>
      {error && <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--red-600)' }}>{error}</div>}
    </div>
  );
}

/** Opens a private attachment through a short-lived signed URL. */
export function FileLink({ path, label = 'فتح الملف' }) {
  const [busy, setBusy] = useState(false);
  if (!path) return null;
  const open = async () => {
    setBusy(true);
    try {
      const url = await getMedicalFileUrl(path);
      if (url) window.open(url, '_blank', 'noopener');
    } catch { /* the record is still readable without its attachment */ }
    setBusy(false);
  };
  return (
    <button onClick={open} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-link)', fontSize: 12.5, fontFamily: font, fontWeight: 700, padding: 0 }}>
      <Icon name="file-text" size={13} color="currentColor" />{busy ? 'جارِ الفتح…' : label}
    </button>
  );
}

const EMPTY_DRUG = { drugName: '', dose: '', frequency: '', duration: '', instructions: '' };

export default function VisitModal({ visitId: initialVisitId, appointmentId, patient, defaults, onClose, onSaved }) {
  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [dirty, setDirty] = useState(false);

  const [doctors, setDoctors] = useState([]);
  const [branches, setBranches] = useState([]);

  // ----- encounter fields -----
  const [doctorId, setDoctorId] = useState(defaults?.doctorId ?? '');
  const [branchId, setBranchId] = useState(defaults?.branchId ?? '');
  const [visitDate, setVisitDate] = useState(defaults?.date ?? today());
  const [reason, setReason] = useState(defaults?.reason ?? '');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [savingVisit, setSavingVisit] = useState(false);

  // ----- sub-records -----
  const [prescriptions, setPrescriptions] = useState([]);
  const [labs, setLabs] = useState([]);
  const [radiology, setRadiology] = useState([]);
  const [supplies, setSupplies] = useState([]);

  const [drugs, setDrugs] = useState([{ ...EMPTY_DRUG }]);
  const [rxNotes, setRxNotes] = useState('');
  const [savingRx, setSavingRx] = useState(false);

  const [labForm, setLabForm] = useState({ testName: '', status: 'requested', result: '', notes: '', filePath: null });
  const [savingLab, setSavingLab] = useState(false);

  const [radForm, setRadForm] = useState({ examType: '', status: 'requested', report: '', notes: '', filePath: null });
  const [savingRad, setSavingRad] = useState(false);

  const [products, setProducts] = useState([]);
  const [usage, setUsage] = useState([{ productId: '', quantity: '1' }]);
  const [savingUsage, setSavingUsage] = useState(false);

  const patientId = patient?.id ?? visit?.patient_id;

  // ----- load -----
  const loadSubRecords = useCallback(async (vid, pid) => {
    const [rx, lb, rd, sp] = await Promise.all([
      listPrescriptions(pid), listLabRequests(pid), listRadiology(pid), listVisitSupplies(vid),
    ]);
    setPrescriptions(rx.filter(r => r.visit_id === vid));
    setLabs(lb.filter(r => r.visit_id === vid));
    setRadiology(rd.filter(r => r.visit_id === vid));
    setSupplies(sp);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [d, b] = await Promise.all([listDoctors(), listBranches()]);
        if (cancelled) return;
        setDoctors(d); setBranches(b);

        let vid = initialVisitId;
        // Opening the encounter behind a booking creates it on first use, copying
        // the booking's doctor / branch / date / service across.
        if (!vid && appointmentId) vid = await openVisitForAppointment(appointmentId);

        if (vid) {
          const v = await getVisit(vid);
          if (cancelled) return;
          setVisit(v);
          setDoctorId(v.doctor_id ?? '');
          setBranchId(v.branch_id ?? '');
          setVisitDate(v.visit_date);
          setReason(v.reason ?? '');
          setDiagnosis(v.diagnosis ?? '');
          setNotes(v.notes ?? '');
          await loadSubRecords(v.id, v.patient_id);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'تعذّر فتح الكشف.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [initialVisitId, appointmentId, loadSubRecords]);

  useEffect(() => {
    if (!visit) return;
    listProductsForPicker({ branchId: visit.branch_id }).then(setProducts).catch(() => setProducts([]));
  }, [visit?.id, visit?.branch_id]);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(''), 3000);
    return () => clearTimeout(id);
  }, [flash]);

  const markSaved = msg => { setFlash(msg); setDirty(true); };

  // ----- encounter -----
  const saveVisit = async () => {
    setSavingVisit(true);
    setError('');
    try {
      const payload = { doctorId, branchId, visitDate, reason, diagnosis, notes };
      const saved = visit
        ? await updateVisit(visit.id, payload)
        : await createVisit({ patientId, ...payload });
      setVisit(saved);
      if (!visit) await loadSubRecords(saved.id, saved.patient_id);
      markSaved('تم حفظ بيانات الزيارة.');
    } catch (e) {
      setError(e.message || 'تعذّر حفظ الزيارة.');
    } finally {
      setSavingVisit(false);
    }
  };

  // ----- prescription -----
  const setDrug = (i, key, value) => setDrugs(list => list.map((d, idx) => idx === i ? { ...d, [key]: value } : d));
  const rxValid = drugs.some(d => d.drugName.trim());

  const saveRx = async () => {
    setSavingRx(true);
    setError('');
    try {
      const created = await createPrescription({
        patientId: visit.patient_id, visitId: visit.id, doctorId: doctorId || null,
        notes: rxNotes.trim(), items: drugs,
      });
      setPrescriptions(list => [created, ...list]);
      setDrugs([{ ...EMPTY_DRUG }]);
      setRxNotes('');
      markSaved('تم حفظ الروشتة.');
    } catch (e) {
      setError(e.message || 'تعذّر حفظ الروشتة.');
    } finally {
      setSavingRx(false);
    }
  };

  // ----- lab -----
  const saveLab = async () => {
    setSavingLab(true);
    setError('');
    try {
      const created = await createLabRequest({
        patientId: visit.patient_id, visitId: visit.id, doctorId: doctorId || null,
        testName: labForm.testName.trim(), status: labForm.status,
        result: labForm.result.trim(), notes: labForm.notes.trim(),
        filePath: labForm.filePath, requestedAt: visitDate,
        resultDate: labForm.status === 'completed' ? today() : null,
      });
      setLabs(list => [created, ...list]);
      setLabForm({ testName: '', status: 'requested', result: '', notes: '', filePath: null });
      markSaved('تم تسجيل التحليل.');
    } catch (e) {
      setError(e.message || 'تعذّر تسجيل التحليل.');
    } finally {
      setSavingLab(false);
    }
  };

  // ----- radiology -----
  const saveRad = async () => {
    setSavingRad(true);
    setError('');
    try {
      const created = await createRadiology({
        patientId: visit.patient_id, visitId: visit.id, doctorId: doctorId || null,
        examType: radForm.examType.trim(), status: radForm.status,
        report: radForm.report.trim(), notes: radForm.notes.trim(),
        filePath: radForm.filePath, performedAt: visitDate,
      });
      setRadiology(list => [created, ...list]);
      setRadForm({ examType: '', status: 'requested', report: '', notes: '', filePath: null });
      markSaved('تم تسجيل الأشعة.');
    } catch (e) {
      setError(e.message || 'تعذّر تسجيل الأشعة.');
    } finally {
      setSavingRad(false);
    }
  };

  // ----- supplies -----
  const setUsageRow = (i, key, value) => setUsage(list => list.map((r, idx) => idx === i ? { ...r, [key]: value } : r));
  const productById = id => products.find(p => p.id === id);

  const usageRows = usage.map(r => {
    const p = productById(r.productId);
    const want = Number(r.quantity);
    return { ...r, product: p, want, short: !!p && Number.isFinite(want) && want > p.quantity };
  });
  const usageFilled = usageRows.filter(r => r.product && r.want > 0);
  const usageShort = usageRows.filter(r => r.short);
  const usageValid = usageFilled.length > 0 && usageShort.length === 0;

  const saveUsage = async () => {
    setSavingUsage(true);
    setError('');
    try {
      await recordUsage({
        items: usageFilled.map(r => ({ productId: r.productId, quantity: r.want })),
        visitId: visit.id,
        appointmentId: visit.appointment_id,
        notes: `استخدام أثناء كشف ${patient?.name ?? ''}`.trim(),
      });
      setUsage([{ productId: '', quantity: '1' }]);
      const [sp, fresh] = await Promise.all([
        listVisitSupplies(visit.id),
        listProductsForPicker({ branchId: visit.branch_id }),
      ]);
      setSupplies(sp);
      setProducts(fresh);
      markSaved('تم خصم المستلزمات من المخزون.');
    } catch (e) {
      setError(e.message || 'تعذّر خصم المستلزمات.');
    } finally {
      setSavingUsage(false);
    }
  };

  const close = () => { onSaved?.(dirty); onClose(); };

  const locked = !visit;
  const lockHint = <div style={{ fontSize: 12.5, color: 'var(--text-muted)', padding: '10px 0' }}>احفظ بيانات الزيارة أولاً لتتمكن من التسجيل هنا.</div>;

  return (
    <ModalShell
      title={visit ? 'الكشف' : 'زيارة جديدة'}
      sub={[patient?.name, visit ? fmtDate(visit.visit_date) : null].filter(Boolean).join(' · ')}
      onClose={close}
      width={720}
    >
      {loading ? <Loading label="جارِ فتح الكشف…" /> : (
        <>
          {error && <div style={{ marginBottom: 14 }}><Alert tone="danger">{error}</Alert></div>}
          {flash && <div style={{ marginBottom: 14 }}><Alert tone="success">{flash}</Alert></div>}

          {/* ---- بيانات الزيارة ---- */}
          <SubHead icon="stethoscope" sub="تظهر مباشرةً في الملف الطبي للمريض">بيانات الزيارة</SubHead>
          <div className="admin-pair" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="الطبيب">
              <Select value={doctorId} onChange={e => setDoctorId(e.target.value)} placeholder="اختر الطبيب">
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
            <Field label="الفرع">
              <Select value={branchId} onChange={e => setBranchId(e.target.value)} placeholder="اختر الفرع">
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
            <Field label="تاريخ الزيارة">
              <DateInput value={visitDate} onChange={e => setVisitDate(e.target.value)} />
            </Field>
            <Field label="سبب الزيارة">
              <Input iconStart="clipboard-list" value={reason} onChange={e => setReason(e.target.value)} placeholder="مثال: ألم بالضرس" />
            </Field>
          </div>
          <div style={{ marginTop: 14 }}>
            <Field label="التشخيص">
              <TextArea rows={2} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="مثال: التهاب لثة" />
            </Field>
          </div>
          <div style={{ marginTop: 14 }}>
            <Field label="ملاحظات الطبيب">
              <TextArea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="تفاصيل الكشف والتعليمات" />
            </Field>
          </div>
          <div style={{ marginTop: 14 }}>
            <Btn icon="save" disabled={savingVisit || !visitDate} onClick={saveVisit}>
              {savingVisit ? 'جارِ الحفظ…' : visit ? 'حفظ بيانات الزيارة' : 'إنشاء الزيارة'}
            </Btn>
          </div>

          {/* ---- الروشتة ---- */}
          <div style={SECTION}>
            <SubHead icon="pill" sub="اكتب الأدوية ثم احفظ الروشتة كاملة">الروشتة</SubHead>
            {locked ? lockHint : (
              <>
                {prescriptions.length > 0 && (
                  <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {prescriptions.map(rx => (
                      <div key={rx.id} style={{ padding: 13, borderRadius: 14, background: 'var(--surface-page)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ fontFamily: font, fontWeight: 800, fontSize: 13.5, color: 'var(--text-strong)' }}>روشتة · {rx.items.length} دواء</span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(rx.created_at)}</span>
                          <span style={{ marginInlineStart: 'auto' }}>
                            <IconBtn icon="trash-2" size={30} tone="var(--red-500)" title="حذف الروشتة"
                              onClick={() => deletePrescription(rx.id).then(() => { setPrescriptions(l => l.filter(x => x.id !== rx.id)); markSaved('تم حذف الروشتة.'); }).catch(e => setError(e.message))} />
                          </span>
                        </div>
                        {rx.items.map(i => (
                          <div key={i.id} style={{ fontSize: 13, color: 'var(--text-body)', padding: '4px 0', lineHeight: 1.7 }}>
                            <b style={{ fontFamily: font, color: 'var(--text-strong)' }}>{i.drug_name}</b>
                            {[i.dose, i.frequency, i.duration, i.instructions].filter(Boolean).map(v => ` · ${v}`).join('')}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {drugs.map((d, i) => (
                  <div key={i} style={{ padding: 13, borderRadius: 14, border: '1px dashed var(--border-default)', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontFamily: font, fontWeight: 700, fontSize: 12.5, color: 'var(--text-muted)' }}>دواء {i + 1}</span>
                      {drugs.length > 1 && (
                        <span style={{ marginInlineStart: 'auto' }}>
                          <IconBtn icon="x" size={28} tone="var(--red-500)" title="إزالة" onClick={() => setDrugs(list => list.filter((_, idx) => idx !== i))} />
                        </span>
                      )}
                    </div>
                    <div className="admin-pair" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <Field label="اسم الدواء"><Input value={d.drugName} onChange={e => setDrug(i, 'drugName', e.target.value)} placeholder="مثال: أوجمنتين" /></Field>
                      <Field label="الجرعة"><Input value={d.dose} onChange={e => setDrug(i, 'dose', e.target.value)} placeholder="مثال: 1 جم" /></Field>
                      <Field label="عدد المرات"><Input value={d.frequency} onChange={e => setDrug(i, 'frequency', e.target.value)} placeholder="مثال: مرتين يومياً" /></Field>
                      <Field label="مدة الاستخدام"><Input value={d.duration} onChange={e => setDrug(i, 'duration', e.target.value)} placeholder="مثال: 7 أيام" /></Field>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <Field label="التعليمات"><Input value={d.instructions} onChange={e => setDrug(i, 'instructions', e.target.value)} placeholder="مثال: بعد الأكل" /></Field>
                    </div>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Btn variant="ghost" size="sm" icon="plus" onClick={() => setDrugs(list => [...list, { ...EMPTY_DRUG }])}>إضافة دواء</Btn>
                  <Btn size="sm" icon="save" disabled={!rxValid || savingRx} onClick={saveRx}>{savingRx ? 'جارِ الحفظ…' : 'حفظ الروشتة'}</Btn>
                </div>
              </>
            )}
          </div>

          {/* ---- التحاليل ---- */}
          <div style={SECTION}>
            <SubHead icon="flask-conical" sub="اسم التحليل والنتيجة، مع إمكانية إرفاق ملف">التحاليل</SubHead>
            {locked ? lockHint : (
              <>
                {labs.map(l => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderRadius: 12, background: 'var(--surface-page)', border: '1px solid var(--border-subtle)', marginBottom: 8, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontFamily: font, fontWeight: 700, fontSize: 13.5, color: 'var(--text-strong)' }}>{l.test_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{l.result || (l.status === 'completed' ? 'مكتمل' : 'بانتظار النتيجة')}</div>
                    </div>
                    <FileLink path={l.file_path} />
                    <IconBtn icon="trash-2" size={30} tone="var(--red-500)" title="حذف"
                      onClick={() => deleteLabRequest(l.id).then(() => { setLabs(x => x.filter(y => y.id !== l.id)); markSaved('تم حذف التحليل.'); }).catch(e => setError(e.message))} />
                  </div>
                ))}

                <div className="admin-pair" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginTop: 10 }}>
                  <Field label="اسم التحليل"><Input iconStart="flask-conical" value={labForm.testName} onChange={e => setLabForm(f => ({ ...f, testName: e.target.value }))} placeholder="مثال: صورة دم كاملة CBC" /></Field>
                  <Field label="الحالة">
                    <Select value={labForm.status} onChange={e => setLabForm(f => ({ ...f, status: e.target.value }))}>
                      <option value="requested">مطلوب</option>
                      <option value="completed">مكتمل</option>
                    </Select>
                  </Field>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Field label="النتيجة / الملاحظات"><TextArea rows={2} value={labForm.result} onChange={e => setLabForm(f => ({ ...f, result: e.target.value }))} placeholder="اكتب النتيجة إن كانت متاحة" /></Field>
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <FilePicker patientId={visit.patient_id} value={labForm.filePath} onChange={p => setLabForm(f => ({ ...f, filePath: p }))} />
                  <Btn size="sm" icon="plus" disabled={!labForm.testName.trim() || savingLab} onClick={saveLab}>{savingLab ? 'جارِ الحفظ…' : 'إضافة تحليل'}</Btn>
                </div>
              </>
            )}
          </div>

          {/* ---- الأشعة ---- */}
          <div style={SECTION}>
            <SubHead icon="scan-line" sub="نوع الأشعة والتقرير، مع إمكانية إرفاق صورة أو PDF">الأشعة</SubHead>
            {locked ? lockHint : (
              <>
                {radiology.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderRadius: 12, background: 'var(--surface-page)', border: '1px solid var(--border-subtle)', marginBottom: 8, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontFamily: font, fontWeight: 700, fontSize: 13.5, color: 'var(--text-strong)' }}>{r.exam_type}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{r.report || (r.status === 'completed' ? 'مكتمل' : 'بانتظار التقرير')}</div>
                    </div>
                    <FileLink path={r.file_path} />
                    <IconBtn icon="trash-2" size={30} tone="var(--red-500)" title="حذف"
                      onClick={() => deleteRadiology(r.id).then(() => { setRadiology(x => x.filter(y => y.id !== r.id)); markSaved('تم حذف الأشعة.'); }).catch(e => setError(e.message))} />
                  </div>
                ))}

                <div className="admin-pair" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginTop: 10 }}>
                  <Field label="نوع الأشعة"><Input iconStart="scan-line" value={radForm.examType} onChange={e => setRadForm(f => ({ ...f, examType: e.target.value }))} placeholder="مثال: أشعة سينية على الصدر" /></Field>
                  <Field label="الحالة">
                    <Select value={radForm.status} onChange={e => setRadForm(f => ({ ...f, status: e.target.value }))}>
                      <option value="requested">مطلوبة</option>
                      <option value="completed">مكتملة</option>
                    </Select>
                  </Field>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Field label="التقرير / الملاحظات"><TextArea rows={2} value={radForm.report} onChange={e => setRadForm(f => ({ ...f, report: e.target.value }))} placeholder="اكتب التقرير إن كان متاحاً" /></Field>
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <FilePicker patientId={visit.patient_id} value={radForm.filePath} onChange={p => setRadForm(f => ({ ...f, filePath: p }))} />
                  <Btn size="sm" icon="plus" disabled={!radForm.examType.trim() || savingRad} onClick={saveRad}>{savingRad ? 'جارِ الحفظ…' : 'إضافة أشعة'}</Btn>
                </div>
              </>
            )}
          </div>

          {/* ---- المستلزمات المستخدمة ---- */}
          <div style={SECTION}>
            <SubHead icon="package" sub="تُخصم من المخزون فوراً وتُسجَّل في سجل الحركة">المستلزمات المستخدمة</SubHead>
            {locked ? lockHint : (
              <>
                {supplies.length > 0 && (
                  <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {supplies.map(s => (
                      <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--teal-700)', background: 'var(--brand-subtle)', border: '1px solid var(--brand-border)', padding: '6px 12px', borderRadius: 999 }}>
                        <Icon name="check" size={13} color="var(--brand)" />{s.name} × {fmtQty(s.quantity)} {s.unit}
                      </span>
                    ))}
                  </div>
                )}

                {products.length === 0 ? (
                  <EmptyState icon="package" title="لا توجد منتجات في المخزون" sub="أضف منتجات من قسم «المخزون» أولاً." />
                ) : (
                  <>
                    {usageRows.map((row, i) => (
                      <div key={i} style={{ marginBottom: 10 }}>
                        <div className="admin-pair" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 10, alignItems: 'end' }}>
                          <Field label="المنتج">
                            <Select value={row.productId} onChange={e => setUsageRow(i, 'productId', e.target.value)} placeholder="اختر المنتج">
                              {products.map(p => (
                                <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                                  {p.name} — متاح {fmtQty(p.quantity)} {p.unit}{p.quantity <= 0 ? ' (نافد)' : ''}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <Field label="الكمية">
                            <Input type="number" min="1" step="1" value={row.quantity} onChange={e => setUsageRow(i, 'quantity', e.target.value)} />
                          </Field>
                          <div style={{ paddingBottom: 4 }}>
                            <IconBtn icon="x" size={34} tone="var(--red-500)" title="إزالة السطر"
                              disabled={usage.length === 1}
                              onClick={() => setUsage(list => list.filter((_, idx) => idx !== i))} />
                          </div>
                        </div>
                        {row.short && (
                          <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--red-600)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Icon name="circle-alert" size={14} color="var(--red-500)" />
                            الكمية المطلوبة ({fmtQty(row.want)}) أكبر من المتاح ({fmtQty(row.product.quantity)} {row.product.unit}).
                          </div>
                        )}
                      </div>
                    ))}

                    {usageShort.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <Alert tone="danger">لا يمكن خصم كمية أكبر من المتاح — صحّح الكميات المميزة بالأحمر قبل التأكيد.</Alert>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <Btn variant="ghost" size="sm" icon="plus" onClick={() => setUsage(list => [...list, { productId: '', quantity: '1' }])}>إضافة صنف</Btn>
                      <Btn size="sm" icon="minus" disabled={!usageValid || savingUsage} onClick={saveUsage}>
                        {savingUsage ? 'جارِ الخصم…' : 'خصم من المخزون'}
                      </Btn>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" size="lg" onClick={close}>إغلاق</Btn>
          </div>
        </>
      )}
    </ModalShell>
  );
}
