// ميعاد — العملاء والمرضى.
//
// The evolution of the old العملاء table: same columns, same filters, same edit
// action — but the rows now come from `patients`, which also covers walk-ins booked
// by name+phone (they have no account, so they never appeared here before), and each
// row opens the person's full medical file.
import { useState, useEffect, useCallback } from 'react';
import { useAuth, toLocalPhone } from '../../lib/auth/AuthContext.jsx';
import { listPatients } from '../../lib/api/medical.js';
import PatientFile from './PatientFile.jsx';
import PatientEditModal from './PatientEditModal.jsx';
import {
  ds, font, Card2, Btn, IconBtn, Loading, ErrorNote, EmptyState,
  Pager, SearchBox, FilterChips, fmtDate,
} from './ui.jsx';

const { Icon, Avatar, Alert } = ds;

const PAGE_SIZE = 15;

const FILTERS = [
  ['all', 'الكل'],
  ['booked', 'لديهم حجوزات'],
  ['leads', 'عملاء محتملون'],
  ['walkins', 'بدون حساب'],
];

export default function PatientsTab({ appointments = [], onRefreshAppointments }) {
  const { can } = useAuth();
  const canViewRecords = can('medical_records_view');
  const canManageRecords = can('medical_records_manage');

  const [data, setData] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);

  const [openFileId, setOpenFileId] = useState(null);
  const [editing, setEditing] = useState(null);   // patient | 'new'

  const load = useCallback(() => {
    setError('');
    return listPatients({ search, page, pageSize: PAGE_SIZE })
      .then(setData)
      .catch(e => setError(e.message || 'تعذّر تحميل قائمة المرضى.'));
  }, [search, page]);

  useEffect(() => { setPage(0); }, [search]);

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

  // The status filters run over the current page: they depend on appointment stats
  // that only exist client-side, so they narrow what's shown rather than re-query.
  const rows = data.rows.filter(p => {
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

  return (
    <div style={{ position: 'relative' }}>
      <ErrorNote>{error}</ErrorNote>
      {flash && <div style={{ marginBottom: 14 }}><Alert tone="success">{flash}</Alert></div>}

      <Card2 pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: font, fontWeight: 800, fontSize: 17, color: 'var(--text-strong)' }}>كل العملاء والمرضى</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              {data.total} مسجّل{leadsCount > 0 ? ` · ${leadsCount} في هذه الصفحة لم يحجز بعد` : ''}
            </div>
          </div>
          <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
          <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <SearchBox value={search} onChange={setSearch} placeholder="بحث بالاسم أو رقم الهاتف…" />
            {canManageRecords && <Btn icon="user-plus" onClick={() => setEditing('new')}>إضافة مريض</Btn>}
          </div>
        </div>

        {loading && <Loading />}

        {!loading && rows.length === 0 && (
          <EmptyState
            icon="users"
            title={search || filter !== 'all' ? 'لا توجد نتائج مطابقة' : 'لا يوجد عملاء بعد'}
            sub={search || filter !== 'all' ? 'جرّب تغيير البحث أو الفلتر.' : 'سيظهر هنا كل من يسجّل في التطبيق أو يُحجز له موعد.'}
          />
        )}

        {!loading && rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 900 }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {['العميل', 'رقم الهاتف', 'عميل منذ', 'الخدمات', 'إجمالي الحجوزات', 'قادمة', 'الفرع الأساسي', 'الحالة', ''].map(h => (
                    <th key={h} style={{ textAlign: 'start', fontWeight: 600, padding: '10px 22px', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(p => {
                  const s = statsByPatient[p.id];
                  const services = servicesTaken(p.id);
                  const suspended = p.accountStatus === 'suspended';
                  return (
                    <tr key={p.id}>
                      <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)' }}>
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
                      <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-body)' }} dir="ltr">{toLocalPhone(p.phone) || '—'}</td>
                      <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(p.joinedAt)}</td>
                      <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)', maxWidth: 220 }}>
                        {services.length ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {services.map(name => (
                              <span key={name} style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal-700)', background: 'var(--brand-subtle)', padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>{name}</span>
                            ))}
                          </div>
                        ) : <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber-700)', background: 'var(--accent-subtle)', padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>عميل محتمل</span>}
                      </td>
                      <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)', fontFamily: font, fontWeight: 800, color: 'var(--text-strong)' }}>{s?.total ?? 0}</td>
                      <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-body)' }}>{s?.upcoming ?? 0}</td>
                      <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-body)' }}>{mainBranch(p.id)}</td>
                      <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)' }}>
                        {p.hasAccount ? (
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: suspended ? 'var(--gray-500)' : 'var(--green-600)', background: suspended ? 'var(--surface-sunken)' : 'var(--green-50)', padding: '5px 12px', borderRadius: 999 }}>{suspended ? 'موقوف' : 'نشط'}</span>
                        ) : (
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--surface-sunken)', padding: '5px 12px', borderRadius: 999 }}>زائر</span>
                        )}
                      </td>
                      <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)' }}>
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
