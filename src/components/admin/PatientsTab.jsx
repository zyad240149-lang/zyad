// ميعاد — العملاء / سجل المرضى.
//
// One table, two readings of the same people, chosen with `mode`:
//
//   mode="customers"  قسم العملاء — الحساب والحجوزات: هاتف، خدمات، عدد الحجوزات،
//                     الفرع، حالة الحساب. لا تشخيص ولا بيانات طبية.
//   mode="records"    سجل المرضى — الملف الطبي: رقم الملف، العمر والنوع، عدد
//                     الزيارات، آخر زيارة، وزر فتح الملف الطبي الكامل.
//
// Deliberately not two components: it's the same directory, the same search and
// the same pager — only the columns and the actions differ. Splitting it would
// mean two copies of the row/pagination logic drifting apart.
import { useState, useEffect, useCallback } from 'react';
import { useAuth, toLocalPhone } from '../../lib/auth/AuthContext.jsx';
import { listPatients, listVisitStats } from '../../lib/api/medical.js';
import PatientFile from './PatientFile.jsx';
import PatientEditModal from './PatientEditModal.jsx';
import {
  ds, font, Card2, Btn, IconBtn, Loading, ErrorNote, EmptyState,
  Pager, SearchBox, FilterChips, fmtDate,
} from './ui.jsx';

const { Icon, Avatar, Alert } = ds;

const PAGE_SIZE = 15;

const CUSTOMER_FILTERS = [
  ['all', 'الكل'],
  ['booked', 'لديهم حجوزات'],
  ['leads', 'عملاء محتملون'],
  ['walkins', 'بدون حساب'],
];

const RECORD_FILTERS = [
  ['all', 'الكل'],
  ['seen', 'لديهم زيارات'],
  ['new', 'ملفات جديدة'],
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

const genderLabel = g => (g === 'male' ? 'ذكر' : g === 'female' ? 'أنثى' : '—');

const TD = { padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)' };

export default function PatientsTab({ mode = 'customers', appointments = [], onRefreshAppointments }) {
  const { can } = useAuth();
  const records = mode === 'records';
  const canViewRecords = can('medical_records_view');
  const canViewClinical = can('medical_records_clinical');
  const canManageRecords = can('medical_records_manage');

  const [data, setData] = useState({ rows: [], total: 0 });
  const [visitStats, setVisitStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);

  const [openFileId, setOpenFileId] = useState(null);
  const [editing, setEditing] = useState(null);   // patient | 'new'

  const load = useCallback(async () => {
    setError('');
    try {
      const result = await listPatients({ search, page, pageSize: PAGE_SIZE });
      setData(result);
      // Only the medical view needs the visit counts, and only a role that can read
      // clinical data will get any — skip the query otherwise.
      if (records && canViewClinical) {
        setVisitStats(await listVisitStats(result.rows.map(r => r.id)));
      }
    } catch (e) {
      setError(e.message || 'تعذّر تحميل القائمة.');
    }
  }, [search, page, records, canViewClinical]);

  useEffect(() => { setPage(0); setFilter('all'); }, [search, mode]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(''), 3000);
    return () => clearTimeout(id);
  }, [flash]);

  // Per-person booking stats, derived from the appointments the dashboard already
  // has in memory. Keyed by patient_id so walk-in bookings count too.
  const statsByPatient = {};
  const today = new Date().toISOString().slice(0, 10);
  appointments.forEach(a => {
    if (!a.patientId) return;
    const s = statsByPatient[a.patientId] || { total: 0, upcoming: 0, cancelled: 0, branches: {}, services: {} };
    s.total += 1;
    if (a.status === 'cancelled') s.cancelled += 1;
    else if (a.date >= today) s.upcoming += 1;
    if (a.branch) s.branches[a.branch] = (s.branches[a.branch] || 0) + 1;
    if (a.service) s.services[a.service] = (s.services[a.service] || 0) + 1;
    statsByPatient[a.patientId] = s;
  });

  const mainBranch = id => {
    const s = statsByPatient[id];
    if (!s) return '—';
    const sorted = Object.entries(s.branches).sort((a, b) => b[1] - a[1]);
    return sorted.length ? sorted[0][0] : '—';
  };
  const servicesTaken = id => Object.keys(statsByPatient[id]?.services || {});
  const isLead = id => !statsByPatient[id]?.total;

  // The status filters run over the current page: they depend on stats that only
  // exist client-side, so they narrow what's shown rather than re-query.
  const rows = data.rows.filter(p => {
    if (records) {
      if (filter === 'seen') return (visitStats[p.id]?.count ?? 0) > 0;
      if (filter === 'new') return !(visitStats[p.id]?.count ?? 0);
      return true;
    }
    if (filter === 'booked') return !isLead(p.id);
    if (filter === 'leads') return isLead(p.id);
    if (filter === 'walkins') return !p.hasAccount;
    return true;
  });

  const leadsCount = data.rows.filter(p => isLead(p.id)).length;

  if (openFileId && canViewRecords) {
    return (
      <PatientFile
        patientId={openFileId}
        appointments={appointments.filter(a => a.patientId === openFileId)}
        onBack={() => setOpenFileId(null)}
        onChanged={() => { load(); onRefreshAppointments?.(); }}
      />
    );
  }

  const headers = records
    ? ['المريض', 'رقم الملف', 'رقم الهاتف', 'العمر', 'النوع', 'الزيارات', 'آخر زيارة', 'الملف منذ', '']
    : ['العميل', 'رقم الهاتف', 'عميل منذ', 'الخدمات', 'إجمالي الحجوزات', 'قادمة', 'الفرع الأساسي', 'الحالة', ''];

  return (
    <div style={{ position: 'relative' }}>
      <ErrorNote>{error}</ErrorNote>
      {flash && <div style={{ marginBottom: 14 }}><Alert tone="success">{flash}</Alert></div>}

      <Card2 pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: font, fontWeight: 800, fontSize: 17, color: 'var(--text-strong)' }}>
              {records ? 'ملفات المرضى' : 'كل العملاء'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              {records
                ? `${data.total} ملف طبي · لكل مريض ملف مستقل`
                : `${data.total} مسجّل${leadsCount > 0 ? ` · ${leadsCount} في هذه الصفحة لم يحجز بعد` : ''}`}
            </div>
          </div>
          <FilterChips options={records ? RECORD_FILTERS : CUSTOMER_FILTERS} value={filter} onChange={setFilter} />
          <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <SearchBox value={search} onChange={setSearch} placeholder={records ? 'بحث بالاسم أو الهاتف أو رقم الملف…' : 'بحث بالاسم أو رقم الهاتف…'} />
            {canManageRecords && (
              <Btn icon="user-plus" onClick={() => setEditing('new')}>{records ? 'ملف مريض جديد' : 'إضافة مريض'}</Btn>
            )}
          </div>
        </div>

        {loading && <Loading />}

        {!loading && rows.length === 0 && (
          <EmptyState
            icon={records ? 'folder-heart' : 'users'}
            title={search || filter !== 'all' ? 'لا توجد نتائج مطابقة' : records ? 'لا توجد ملفات مرضى بعد' : 'لا يوجد عملاء بعد'}
            sub={search || filter !== 'all'
              ? 'جرّب تغيير البحث أو الفلتر.'
              : records
                ? 'يُنشأ ملف تلقائياً لكل من يُحجز له موعد — أو أنشئ ملفاً يدوياً لمريض زائر.'
                : 'سيظهر هنا كل من يسجّل في التطبيق أو يُحجز له موعد.'}
          />
        )}

        {!loading && rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 900 }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {headers.map(h => (
                    <th key={h} style={{ textAlign: 'start', fontWeight: 600, padding: '10px 22px', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(p => {
                  const s = statsByPatient[p.id];
                  const services = servicesTaken(p.id);
                  const suspended = p.accountStatus === 'suspended';
                  const vs = visitStats[p.id];
                  const age = ageFrom(p.birth_date);
                  return (
                    <tr key={p.id}>
                      <td style={TD}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={p.name || 'مريض'} />
                          <div style={{ minWidth: 0 }}>
                            <span style={{ fontFamily: font, fontWeight: 700, color: 'var(--text-strong)' }}>{p.name || 'بدون اسم'}</span>
                            {!p.hasAccount && (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>مريض زائر — بدون حساب</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {records ? (
                        <>
                          <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                            <span dir="ltr" style={{ fontFamily: font, fontWeight: 800, fontSize: 12.5, color: 'var(--teal-700)', background: 'var(--brand-subtle)', padding: '4px 10px', borderRadius: 999 }}>
                              {p.file_number || '—'}
                            </span>
                          </td>
                          <td style={{ ...TD, color: 'var(--text-body)' }} dir="ltr">{toLocalPhone(p.phone) || '—'}</td>
                          <td style={{ ...TD, color: 'var(--text-body)', whiteSpace: 'nowrap' }}>{age != null ? `${age} سنة` : '—'}</td>
                          <td style={{ ...TD, color: 'var(--text-body)' }}>{genderLabel(p.gender)}</td>
                          <td style={{ ...TD, fontFamily: font, fontWeight: 800, color: 'var(--text-strong)' }}>
                            {canViewClinical ? (vs?.count ?? 0) : '—'}
                          </td>
                          <td style={{ ...TD, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {canViewClinical ? (vs?.last ? fmtDate(vs.last) : 'لا توجد زيارات') : '—'}
                          </td>
                          <td style={{ ...TD, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(p.created_at)}</td>
                        </>
                      ) : (
                        <>
                          <td style={{ ...TD, color: 'var(--text-body)' }} dir="ltr">{toLocalPhone(p.phone) || '—'}</td>
                          <td style={{ ...TD, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(p.joinedAt)}</td>
                          <td style={{ ...TD, maxWidth: 220 }}>
                            {services.length ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {services.map(name => (
                                  <span key={name} style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal-700)', background: 'var(--brand-subtle)', padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>{name}</span>
                                ))}
                              </div>
                            ) : <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber-700)', background: 'var(--accent-subtle)', padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>عميل محتمل</span>}
                          </td>
                          <td style={{ ...TD, fontFamily: font, fontWeight: 800, color: 'var(--text-strong)' }}>{s?.total ?? 0}</td>
                          <td style={{ ...TD, color: 'var(--text-body)' }}>{s?.upcoming ?? 0}</td>
                          <td style={{ ...TD, color: 'var(--text-body)' }}>{mainBranch(p.id)}</td>
                          <td style={TD}>
                            {p.hasAccount ? (
                              <span style={{ fontSize: 11.5, fontWeight: 700, color: suspended ? 'var(--gray-500)' : 'var(--green-600)', background: suspended ? 'var(--surface-sunken)' : 'var(--green-50)', padding: '5px 12px', borderRadius: 999 }}>{suspended ? 'موقوف' : 'نشط'}</span>
                            ) : (
                              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--surface-sunken)', padding: '5px 12px', borderRadius: 999 }}>زائر</span>
                            )}
                          </td>
                        </>
                      )}

                      <td style={TD}>
                        <div style={{ display: 'flex', gap: 7 }}>
                          {canViewRecords && (
                            <Btn size="sm" variant="soft" icon="folder-heart" onClick={() => setOpenFileId(p.id)}>الملف الطبي</Btn>
                          )}
                          {canManageRecords && <IconBtn icon="pencil" title="تعديل البيانات" size={34} onClick={() => setEditing(p)} />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pager page={page} pageSize={PAGE_SIZE} total={data.total} onPage={setPage} />
      </Card2>

      {records && !canViewClinical && (
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, color: 'var(--text-muted)' }}>
          <Icon name="lock" size={14} color="var(--text-muted)" />
          دورك الحالي يرى البيانات الأساسية فقط — التشخيصات والزيارات والمرفقات مخفية.
        </div>
      )}

      {!canViewRecords && (
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, color: 'var(--text-muted)' }}>
          <Icon name="lock" size={14} color="var(--text-muted)" />
          الملفات الطبية غير متاحة لدورك الحالي.
        </div>
      )}

      {editing && (
        <PatientEditModal
          patient={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(_, msg) => { setEditing(null); setFlash(msg); load(); }}
        />
      )}
    </div>
  );
}
