// ميعاد — الملف الطبي للمريض.
//
// Everything about one patient on one screen: their details, the standing medical
// history, a merged timeline, and the full record of visits, prescriptions, labs,
// radiology and files. Opened from سجل المرضى (or from العملاء), and it reads
// whatever was recorded during a كشف — nothing is entered twice.
//
// Two permissions shape it: medical_records_view opens the file at all, while
// medical_records_clinical decides whether anything clinical inside it is shown.
import { useState, useEffect, useCallback } from 'react';
import { useAuth, toLocalPhone } from '../../lib/auth/AuthContext.jsx';
import { formatArabicTime } from '../../lib/time.js';
import {
  getPatientRecord, getPatientBasics, buildTimeline, timelineMeta,
  deleteVisit, deletePrescription, deleteLabRequest, deleteRadiology, deletePatient,
  attachmentCategoryMeta,
} from '../../lib/api/medical.js';
import VisitModal, { FileLink } from './VisitModal.jsx';
import PatientEditModal from './PatientEditModal.jsx';
import PatientAttachments from './PatientAttachments.jsx';
import MedicalHistoryModal, { HISTORY_SECTIONS } from './MedicalHistoryModal.jsx';
import {
  ds, font, Card2, Ring2, Btn, IconBtn, Loading, ErrorNote, EmptyState,
  ConfirmBox, ModalShell, fmtDate,
} from './ui.jsx';

const { Icon, Avatar, Alert } = ds;

const TABS = [
  ['timeline', 'الخط الزمني', 'list-tree'],
  ['history', 'التاريخ الطبي', 'heart-pulse'],
  ['visits', 'الزيارات والكشوف', 'stethoscope'],
  ['prescriptions', 'الأدوية والروشتات', 'pill'],
  ['labs', 'التحاليل', 'flask-conical'],
  ['radiology', 'الأشعة', 'scan-line'],
  ['attachments', 'المرفقات الطبية', 'paperclip'],
];

function ageFrom(birthDate) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) years -= 1;
  return years >= 0 ? years : null;
}

function InfoLine({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: 'var(--text-body)' }}>
      <Icon name={icon} size={15} color="var(--text-muted)" />
      <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
      <span style={{ fontFamily: font, fontWeight: 700, color: 'var(--text-strong)' }}>{value}</span>
    </div>
  );
}

function RecordCard({ icon, tone, title, meta, children, onDelete, canManage, deleteLabel = 'حذف السجل', extra }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Card2 pad={16} style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Ring2 icon={icon} tone={tone} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: font, fontWeight: 800, fontSize: 15, color: 'var(--text-strong)' }}>{title}</div>
          {meta && <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>{meta}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {extra}
          {canManage && onDelete && !confirming && (
            <IconBtn icon="trash-2" size={32} tone="var(--red-500)" title={deleteLabel} onClick={() => setConfirming(true)} />
          )}
        </div>
      </div>
      {children && <div style={{ marginTop: 12 }}>{children}</div>}
      {confirming && (
        <div style={{ marginTop: 12 }}>
          <ConfirmBox
            message="سيتم حذف هذا السجل نهائياً من الملف الطبي. متأكد؟"
            confirmLabel="حذف نهائي"
            busy={busy}
            onCancel={() => setConfirming(false)}
            onConfirm={async () => { setBusy(true); await onDelete(); setBusy(false); setConfirming(false); }}
          />
        </div>
      )}
    </Card2>
  );
}

/** Chip row summarising what one visit produced: أدوية، تحاليل، أشعة، مرفقات. */
function VisitOutputs({ prescriptions = [], labs = [], radiology = [], attachments = [] }) {
  const drugs = prescriptions.flatMap(rx => rx.items.map(i => i.drug_name));
  const chips = [
    ...drugs.map(name => ({ key: `d${name}`, icon: 'pill', tone: 'var(--green-600)', label: name })),
    ...labs.map(l => ({ key: `l${l.id}`, icon: 'flask-conical', tone: 'var(--blue-600)', label: l.test_name })),
    ...radiology.map(r => ({ key: `r${r.id}`, icon: 'scan-line', tone: 'var(--amber-600)', label: r.exam_type })),
  ];
  if (!chips.length && !attachments.length) return null;

  return (
    <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
      {chips.map(c => (
        <span key={c.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: c.tone, background: `color-mix(in srgb, ${c.tone} 11%, white)`, padding: '4px 10px', borderRadius: 999 }}>
          <Icon name={c.icon} size={12} color={c.tone} />{c.label}
        </span>
      ))}
      {attachments.map(a => {
        const meta = attachmentCategoryMeta(a.category);
        return (
          <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: meta.tone, background: `color-mix(in srgb, ${meta.tone} 11%, white)`, padding: '4px 10px', borderRadius: 999 }}>
            <Icon name={meta.icon} size={12} color={meta.tone} />
            <FileLink path={a.storage_path} label={a.file_name} />
          </span>
        );
      })}
    </div>
  );
}

function StatusChip({ status }) {
  const map = {
    requested: ['مطلوب', 'var(--amber-700)', 'var(--accent-subtle)'],
    completed: ['مكتمل', 'var(--green-600)', 'var(--green-50)'],
    cancelled: ['ملغي', 'var(--gray-500)', 'var(--surface-sunken)'],
  };
  const [label, color, bg] = map[status] ?? map.requested;
  return <span style={{ fontSize: 11.5, fontWeight: 700, color, background: bg, padding: '4px 11px', borderRadius: 999 }}>{label}</span>;
}

export default function PatientFile({ patientId, appointments = [], onBack, onChanged }) {
  const { can } = useAuth();
  const canManage = can('medical_records_manage');
  // A role can be allowed to look someone up (reception) without being allowed to
  // read what was diagnosed. RLS enforces it; this only decides what to render.
  const canViewClinical = can('medical_records_clinical');

  const [tab, setTab] = useState(canViewClinical ? 'timeline' : 'history');
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visitModal, setVisitModal] = useState(null);   // { visitId } | { newVisit: true }
  const [openRx, setOpenRx] = useState(null);
  const [editingPatient, setEditingPatient] = useState(false);
  const [editingHistory, setEditingHistory] = useState(false);
  const [deletingPatient, setDeletingPatient] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(() => {
    setError('');
    return (canViewClinical ? getPatientRecord(patientId) : getPatientBasics(patientId))
      .then(setRecord)
      .catch(e => setError(e.message || 'تعذّر تحميل الملف الطبي.'));
  }, [patientId, canViewClinical]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  if (loading) return <Loading label="جارِ فتح الملف الطبي…" />;
  if (error && !record) return <><ErrorNote>{error}</ErrorNote><Btn variant="ghost" icon="arrow-right" onClick={onBack}>رجوع</Btn></>;
  if (!record) return null;

  const { patient, history, visits, prescriptions, labs, radiology, attachments } = record;
  const age = ageFrom(patient.birth_date);
  const timeline = buildTimeline({ visits, prescriptions, labs, radiology, attachments, appointments });

  const refresh = async () => { await load(); onChanged?.(); };

  const counts = {
    visits: visits.length,
    prescriptions: prescriptions.length,
    labs: labs.length,
    radiology: radiology.length,
    attachments: attachments.length,
  };

  const attachmentsForVisit = visitId => attachments.filter(a => a.visit_id === visitId);
  const historyFilled = HISTORY_SECTIONS.filter(([key]) => history?.[key]);

  const doctorFor = visitId => visits.find(v => v.id === visitId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ---- header ---- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Btn variant="ghost" size="sm" icon="arrow-right" onClick={onBack}>رجوع للقائمة</Btn>
        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {canManage && <Btn icon="pencil" variant="ghost" size="sm" onClick={() => setEditingPatient(true)}>تعديل البيانات</Btn>}
          {canManage && <Btn icon="trash-2" variant="dangerGhost" size="sm" onClick={() => setDeletingPatient(true)}>حذف الملف</Btn>}
          {canManage && <Btn icon="plus" size="sm" onClick={() => setVisitModal({ newVisit: true })}>زيارة جديدة</Btn>}
        </div>
      </div>

      <ErrorNote>{error}</ErrorNote>

      <Card2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Avatar name={patient.name} size="lg" />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: font, fontWeight: 900, fontSize: 21, color: 'var(--text-strong)' }}>{patient.name}</span>
              {patient.file_number && (
                <span dir="ltr" style={{ fontFamily: font, fontWeight: 800, fontSize: 12.5, color: 'var(--teal-700)', background: 'var(--brand-subtle)', border: '1px solid var(--brand-border)', padding: '3px 10px', borderRadius: 999 }}>
                  {patient.file_number}
                </span>
              )}
              {!patient.hasAccount && (
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber-700)', background: 'var(--accent-subtle)', padding: '3px 10px', borderRadius: 999 }}>بدون حساب — مريض زائر</span>
              )}
              {patient.accountStatus === 'suspended' && (
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', background: 'var(--surface-sunken)', padding: '3px 10px', borderRadius: 999 }}>حساب موقوف</span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 22px', marginTop: 10 }}>
              <InfoLine icon="phone" label="الهاتف" value={<span dir="ltr">{toLocalPhone(patient.phone) || '—'}</span>} />
              <InfoLine icon="cake" label="العمر" value={age != null ? `${age} سنة` : patient.birth_date ? fmtDate(patient.birth_date) : '—'} />
              <InfoLine icon="user-round" label="النوع" value={patient.gender === 'male' ? 'ذكر' : patient.gender === 'female' ? 'أنثى' : '—'} />
              {patient.email && <InfoLine icon="mail" label="البريد" value={patient.email} />}
              {patient.address && <InfoLine icon="map-pin" label="العنوان" value={patient.address} />}
              <InfoLine icon="folder-plus" label="الملف منذ" value={fmtDate(patient.created_at)} />
            </div>
            {/* Allergies are the one thing that must be visible without opening a
                tab — everything else about the history lives in التاريخ الطبي. */}
            {canViewClinical && history?.allergies && (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 13px', borderRadius: 12, background: 'var(--red-50)', border: '1px solid var(--red-500)', fontSize: 13, color: 'var(--red-600)', lineHeight: 1.7 }}>
                <Icon name="triangle-alert" size={16} color="var(--red-500)" />
                <div><b style={{ fontFamily: font }}>حساسية:</b> {history.allergies}</div>
              </div>
            )}
            {patient.notes && (
              <div style={{ marginTop: 12, padding: '10px 13px', borderRadius: 12, background: 'var(--accent-subtle)', fontSize: 13, color: 'var(--amber-700)', lineHeight: 1.7 }}>
                <b>ملاحظات:</b> {patient.notes}
              </div>
            )}
          </div>
        </div>

        {canViewClinical && (
        <div className="admin-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginTop: 18 }}>
          {[
            ['الزيارات', counts.visits, 'stethoscope', 'var(--brand)'],
            ['الروشتات', counts.prescriptions, 'pill', 'var(--green-500)'],
            ['التحاليل', counts.labs, 'flask-conical', 'var(--blue-500)'],
            ['الأشعة', counts.radiology, 'scan-line', 'var(--amber-600)'],
            ['المرفقات', counts.attachments, 'paperclip', 'var(--gray-600)'],
          ].map(([label, value, icon, tone]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, background: 'var(--surface-page)', border: '1px solid var(--border-subtle)' }}>
              <Ring2 icon={icon} tone={tone} size={34} />
              <div>
                <div style={{ fontFamily: font, fontWeight: 900, fontSize: 19, color: 'var(--text-strong)' }}>{value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
        )}
      </Card2>

      {!canViewClinical && (
        <Card2>
          <EmptyState
            icon="lock"
            title="البيانات الطبية غير متاحة لدورك الحالي"
            sub="تظهر لك البيانات الأساسية للمريض فقط. التشخيصات والزيارات والأدوية والمرفقات تحتاج صلاحية «عرض التفاصيل الطبية» — يفعّلها مدير العيادة من تبويب الصلاحيات."
          />
        </Card2>
      )}

      {/* ---- section tabs ---- */}
      {canViewClinical && (
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        {TABS.map(([id, label, icon]) => (
          <button key={id} onClick={() => setTab(id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: font, fontWeight: 700, fontSize: 13.5, background: tab === id ? 'var(--brand)' : 'var(--white)', border: tab === id ? '1.5px solid var(--brand)' : '1.5px solid var(--border-subtle)', color: tab === id ? '#fff' : 'var(--text-body)' }}>
            <Icon name={icon} size={15} color={tab === id ? '#fff' : 'var(--text-muted)'} />{label}
          </button>
        ))}
      </div>
      )}

      {/* ---- التاريخ الطبي ---- */}
      {canViewClinical && tab === 'history' && (
        <Card2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: font, fontWeight: 800, fontSize: 17, color: 'var(--text-strong)' }}>التاريخ الطبي</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                {history?.updated_at
                  ? `آخر تحديث ${fmtDate(history.updated_at)}${history.editorName ? ` · ${history.editorName}` : ''}`
                  : 'بيانات ثابتة تظهر لأي طبيب يفتح الملف'}
              </div>
            </div>
            {canManage && (
              <div style={{ marginInlineStart: 'auto' }}>
                <Btn icon={historyFilled.length || history?.blood_type ? 'pencil' : 'plus'} onClick={() => setEditingHistory(true)}>
                  {historyFilled.length || history?.blood_type ? 'تعديل التاريخ الطبي' : 'تسجيل التاريخ الطبي'}
                </Btn>
              </div>
            )}
          </div>

          {!history || (!historyFilled.length && !history.blood_type) ? (
            <EmptyState
              icon="heart-pulse"
              title="لم يُسجَّل تاريخ طبي بعد"
              sub="الحساسية، الأمراض السابقة، الأدوية الحالية، والعمليات — تُسجَّل مرة وتظهر في كل كشف."
              action={canManage ? <Btn icon="plus" onClick={() => setEditingHistory(true)}>تسجيل التاريخ الطبي</Btn> : null}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              {history.blood_type && (
                <div style={{ padding: 14, borderRadius: 14, background: 'var(--surface-page)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 6 }}>
                    <Icon name="droplet" size={14} color="var(--red-500)" />فصيلة الدم
                  </div>
                  <div dir="ltr" style={{ fontFamily: font, fontWeight: 900, fontSize: 20, color: 'var(--text-strong)', textAlign: 'start' }}>{history.blood_type}</div>
                </div>
              )}
              {historyFilled.map(([key, label]) => (
                <div key={key} style={{ padding: 14, borderRadius: 14, background: key === 'allergies' ? 'var(--red-50)' : 'var(--surface-page)', border: `1px solid ${key === 'allergies' ? 'var(--red-500)' : 'var(--border-subtle)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: key === 'allergies' ? 'var(--red-600)' : 'var(--text-muted)', marginBottom: 6 }}>
                    <Icon name={key === 'allergies' ? 'triangle-alert' : 'clipboard-list'} size={14} color={key === 'allergies' ? 'var(--red-500)' : 'var(--text-muted)'} />{label}
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--text-body)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{history[key]}</div>
                </div>
              ))}
            </div>
          )}
        </Card2>
      )}

      {/* ---- المرفقات الطبية ---- */}
      {canViewClinical && tab === 'attachments' && (
        <PatientAttachments
          patientId={patient.id}
          attachments={attachments}
          visits={visits}
          canManage={canManage}
          onChanged={refresh}
        />
      )}

      {/* ---- timeline ---- */}
      {canViewClinical && tab === 'timeline' && (
        timeline.length === 0
          ? <Card2><EmptyState icon="list-tree" title="لا يوجد تاريخ طبي بعد" sub="ابدأ بتسجيل زيارة — سيظهر كل ما يُسجَّل فيها هنا تلقائياً." action={canManage ? <Btn icon="plus" onClick={() => setVisitModal({ newVisit: true })}>زيارة جديدة</Btn> : null} /></Card2>
          : (
            <Card2>
              {timeline.map(({ date, items }, gi) => (
                <div key={date} style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14, flex: '0 0 auto', paddingTop: 8 }}>
                    <div style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--brand)', border: '2px solid #fff', boxShadow: '0 0 0 3px var(--brand-subtle)' }} />
                    {gi !== timeline.length - 1 && <div style={{ flex: 1, width: 2, background: 'var(--border-subtle)', marginTop: 4 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingBottom: gi === timeline.length - 1 ? 0 : 20 }}>
                    <div style={{ fontFamily: font, fontWeight: 800, fontSize: 14.5, color: 'var(--text-strong)' }}>{fmtDate(date)}</div>
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {items.map(ev => {
                        const meta = timelineMeta(ev.kind);
                        return (
                          <div key={ev.kind + ev.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 13px', borderRadius: 13, background: 'var(--surface-page)', border: '1px solid var(--border-subtle)' }}>
                            <Icon name={meta.icon} size={16} color={meta.tone} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: font, fontWeight: 700, fontSize: 13.5, color: 'var(--text-strong)' }}>{ev.title}</div>
                              {ev.sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{ev.sub}</div>}
                              {ev.detail && <div style={{ fontSize: 12.5, color: 'var(--text-body)', marginTop: 4, lineHeight: 1.7 }}>{ev.detail}</div>}
                            </div>
                            {ev.kind === 'visit' && (
                              <Btn size="sm" variant="soft" onClick={() => setVisitModal({ visitId: ev.id })}>فتح الكشف</Btn>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </Card2>
          )
      )}

      {/* ---- visits ---- */}
      {canViewClinical && tab === 'visits' && (
        visits.length === 0
          ? <Card2><EmptyState icon="stethoscope" title="لا توجد زيارات مسجّلة" sub="كل كشف تفتحه من جدول المواعيد سيظهر هنا." action={canManage ? <Btn icon="plus" onClick={() => setVisitModal({ newVisit: true })}>زيارة جديدة</Btn> : null} /></Card2>
          : visits.map(v => (
            <RecordCard
              key={v.id}
              icon="stethoscope"
              tone="var(--brand)"
              title={v.reason ? `زيارة — ${v.reason}` : 'زيارة'}
              meta={[fmtDate(v.visit_date), v.time ? formatArabicTime(v.time) : null, v.doctorName, v.branchName].filter(Boolean).join(' · ')}
              canManage={canManage}
              deleteLabel="حذف الزيارة"
              extra={<Btn size="sm" variant="soft" icon="folder-open" onClick={() => setVisitModal({ visitId: v.id })}>فتح الكشف</Btn>}
              onDelete={() => deleteVisit(v.id).then(refresh).catch(e => setError(e.message))}
            >
              {(v.symptoms || v.diagnosis || v.notes || v.follow_up) && (
                <div style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.8 }}>
                  {v.symptoms && <div><b style={{ fontFamily: font, color: 'var(--text-strong)' }}>الأعراض:</b> {v.symptoms}</div>}
                  {v.diagnosis && <div><b style={{ fontFamily: font, color: 'var(--text-strong)' }}>التشخيص:</b> {v.diagnosis}</div>}
                  {v.notes && <div><b style={{ fontFamily: font, color: 'var(--text-strong)' }}>ملاحظات الطبيب:</b> {v.notes}</div>}
                  {v.follow_up && <div><b style={{ fontFamily: font, color: 'var(--text-strong)' }}>خطة المتابعة:</b> {v.follow_up}</div>}
                </div>
              )}

              {/* What this encounter produced — the drugs, orders and files that
                  carry its visit_id, so the card answers "what happened that day"
                  without opening the كشف. */}
              <VisitOutputs
                visit={v}
                prescriptions={prescriptions.filter(rx => rx.visit_id === v.id)}
                labs={labs.filter(l => l.visit_id === v.id)}
                radiology={radiology.filter(r => r.visit_id === v.id)}
                attachments={attachmentsForVisit(v.id)}
              />
            </RecordCard>
          ))
      )}

      {/* ---- prescriptions ---- */}
      {canViewClinical && tab === 'prescriptions' && (
        prescriptions.length === 0
          ? <Card2><EmptyState icon="pill" title="لا توجد روشتات" sub="الأدوية التي توصف أثناء الكشف تظهر هنا." /></Card2>
          : prescriptions.map(rx => (
            <RecordCard
              key={rx.id}
              icon="pill"
              tone="var(--green-500)"
              title={`روشتة — ${rx.items.length} دواء`}
              meta={[fmtDate(rx.created_at), rx.doctorName, doctorFor(rx.visit_id)?.reason].filter(Boolean).join(' · ')}
              canManage={canManage}
              deleteLabel="حذف الروشتة"
              extra={<Btn size="sm" variant="ghost" icon="eye" onClick={() => setOpenRx(rx)}>التفاصيل</Btn>}
              onDelete={() => deletePrescription(rx.id).then(refresh).catch(e => setError(e.message))}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {rx.items.map(i => (
                  <span key={i.id} style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal-700)', background: 'var(--brand-subtle)', padding: '4px 11px', borderRadius: 999 }}>{i.drug_name}</span>
                ))}
              </div>
            </RecordCard>
          ))
      )}

      {/* ---- labs ---- */}
      {canViewClinical && tab === 'labs' && (
        labs.length === 0
          ? <Card2><EmptyState icon="flask-conical" title="لا توجد تحاليل" sub="التحاليل المطلوبة أثناء الكشف تظهر هنا، الأحدث أولاً." /></Card2>
          : labs.map(l => (
            <RecordCard
              key={l.id}
              icon="flask-conical"
              tone="var(--blue-500)"
              title={l.test_name}
              meta={[fmtDate(l.requested_at), l.doctorName, l.result_date ? `النتيجة ${fmtDate(l.result_date)}` : null].filter(Boolean).join(' · ')}
              canManage={canManage}
              deleteLabel="حذف التحليل"
              extra={<><StatusChip status={l.status} /><FileLink path={l.file_path} /></>}
              onDelete={() => deleteLabRequest(l.id).then(refresh).catch(e => setError(e.message))}
            >
              {(l.result || l.notes) && (
                <div style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.8 }}>
                  {l.result && <div><b style={{ fontFamily: font, color: 'var(--text-strong)' }}>النتيجة:</b> {l.result}</div>}
                  {l.notes && <div style={{ color: 'var(--text-muted)' }}>{l.notes}</div>}
                </div>
              )}
            </RecordCard>
          ))
      )}

      {/* ---- radiology ---- */}
      {canViewClinical && tab === 'radiology' && (
        radiology.length === 0
          ? <Card2><EmptyState icon="scan-line" title="لا توجد أشعة" sub="الأشعة المسجّلة أثناء الكشف تظهر هنا، الأحدث أولاً." /></Card2>
          : radiology.map(r => (
            <RecordCard
              key={r.id}
              icon="scan-line"
              tone="var(--amber-600)"
              title={r.exam_type}
              meta={[fmtDate(r.performed_at), r.doctorName].filter(Boolean).join(' · ')}
              canManage={canManage}
              deleteLabel="حذف الأشعة"
              extra={<><StatusChip status={r.status} /><FileLink path={r.file_path} label="فتح الصورة" /></>}
              onDelete={() => deleteRadiology(r.id).then(refresh).catch(e => setError(e.message))}
            >
              {(r.report || r.notes) && (
                <div style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.8 }}>
                  {r.report && <div><b style={{ fontFamily: font, color: 'var(--text-strong)' }}>التقرير:</b> {r.report}</div>}
                  {r.notes && <div style={{ color: 'var(--text-muted)' }}>{r.notes}</div>}
                </div>
              )}
            </RecordCard>
          ))
      )}

      {visitModal && (
        <VisitModal
          visitId={visitModal.visitId}
          patient={patient}
          onClose={() => setVisitModal(null)}
          onSaved={changed => { if (changed) refresh(); }}
        />
      )}

      {editingPatient && (
        <PatientEditModal
          patient={patient}
          onClose={() => setEditingPatient(false)}
          onSaved={() => { setEditingPatient(false); refresh(); }}
        />
      )}

      {deletingPatient && (
        <ModalShell
          title="حذف الملف الطبي"
          sub={[patient.name, patient.file_number].filter(Boolean).join(' · ')}
          onClose={() => { setDeletingPatient(false); setDeleteConfirmed(false); }}
          width={480}
        >
          <div style={{ fontSize: 13.5, color: 'var(--text-body)', lineHeight: 1.9, marginBottom: 14 }}>
            سيُحذف الملف نهائياً ومعه <b>كل الزيارات والروشتات والتحاليل والأشعة والمرفقات</b> ({counts.visits} زيارة · {counts.prescriptions} روشتة · {counts.attachments} مرفق).
            <div style={{ marginTop: 8, color: 'var(--text-muted)' }}>
              حساب العميل وحجوزاته ومدفوعاته لا تُحذف — تبقى كما هي في قسم العملاء.
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: 'var(--red-600)', cursor: 'pointer', marginBottom: 16 }}>
            <input type="checkbox" checked={deleteConfirmed} onChange={e => setDeleteConfirmed(e.target.checked)} />
            نعم، احذف الملف الطبي وكل محتوياته نهائياً
          </label>
          {deleteConfirmed && (
            <ConfirmBox
              message={`سيتم حذف الملف الطبي لـ${patient.name} نهائياً ولا يمكن التراجع. متأكد؟`}
              confirmLabel="حذف نهائي"
              busy={deleteBusy}
              onCancel={() => { setDeletingPatient(false); setDeleteConfirmed(false); }}
              onConfirm={async () => {
                setDeleteBusy(true);
                try {
                  await deletePatient(patient.id);
                  onChanged?.();
                  onBack();
                } catch (e) {
                  setError(e.message || 'تعذّر حذف الملف الطبي.');
                  setDeletingPatient(false);
                } finally {
                  setDeleteBusy(false);
                }
              }}
            />
          )}
        </ModalShell>
      )}

      {editingHistory && (
        <MedicalHistoryModal
          patientId={patient.id}
          history={history}
          onClose={() => setEditingHistory(false)}
          onSaved={() => { setEditingHistory(false); refresh(); }}
        />
      )}

      {openRx && (
        <ModalShell title="تفاصيل الروشتة" sub={[fmtDate(openRx.created_at), openRx.doctorName].filter(Boolean).join(' · ')} onClose={() => setOpenRx(null)} width={560}>
          {openRx.notes && <div style={{ marginBottom: 14 }}><Alert tone="info">{openRx.notes}</Alert></div>}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 480 }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {['الدواء', 'الجرعة', 'عدد المرات', 'المدة', 'التعليمات'].map(h => (
                    <th key={h} style={{ textAlign: 'start', fontWeight: 600, padding: '9px 10px', borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {openRx.items.map(i => (
                  <tr key={i.id}>
                    <td style={{ padding: '11px 10px', borderBottom: '1px solid var(--border-subtle)', fontFamily: font, fontWeight: 700, color: 'var(--text-strong)' }}>{i.drug_name}</td>
                    <td style={{ padding: '11px 10px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-body)' }}>{i.dose || '—'}</td>
                    <td style={{ padding: '11px 10px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-body)' }}>{i.frequency || '—'}</td>
                    <td style={{ padding: '11px 10px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-body)' }}>{i.duration || '—'}</td>
                    <td style={{ padding: '11px 10px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>{i.instructions || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
