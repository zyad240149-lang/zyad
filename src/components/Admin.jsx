// ميعاد — Admin "مركز التحكم" (command center) concept. Desktop dashboard, RTL.
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MeaadStory as AS } from '../data.js';
import { useAuth, toLocalPhone, toStoredPhone } from '../lib/auth/AuthContext.jsx';
import { listAllAppointments, updateAppointmentStatus, updateAppointment, createAppointment, deleteAppointment, isSlotTaken, listTakenTimes } from '../lib/api/appointments.js';
import { listRolesWithPermissions, setRolePermission, listStaff, addPermissionModule, deletePermissionModule, addRole, deleteRole } from '../lib/api/staff.js';
import { listBranches, listDoctors, listCustomers, listCustomersDetailed, updateCustomer, addBranch, addService, updateService } from '../lib/api/reference.js';
import { getDoctorSchedule, setDayActive, addSchedulePeriod, deleteSchedulePeriod, listDoctorServices, setDoctorService, updateDoctorSettings, getBranchSchedule, setBranchDayActive, addBranchSchedulePeriod, deleteBranchSchedulePeriod } from '../lib/api/availability.js';
import { formatArabicTime } from '../lib/time.js';

const { Icon, Avatar, StatusPill, Field, Select, Alert, Input } = window.MeaadDesignSystem_54b82a;

const font = 'var(--font-display)';
const body = 'var(--font-body)';

// ---------- small primitives ----------
function Ring2({ icon, tone = 'var(--brand)', size = 44 }) {
  return <div style={{ width: size, height: size, borderRadius: 14, flex: '0 0 auto', background: `color-mix(in srgb, ${tone} 14%, white)`, color: tone, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={size * 0.5} /></div>;
}

function Toggle({ on, onClick }) {
  return (
    <button onClick={onClick} style={{ width: 46, height: 27, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 3, background: on ? 'var(--brand)' : 'var(--gray-300)', display: 'flex', justifyContent: on ? 'flex-start' : 'flex-end', transition: 'all .18s' }}>
      <span style={{ width: 21, height: 21, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
    </button>
  );
}

function Card2({ children, style, pad = 22 }) {
  return <div style={{ background: 'var(--white)', borderRadius: 20, border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)', padding: pad, ...style }}>{children}</div>;
}

function SectionTitle({ children, sub }) {
  return <div style={{ marginBottom: 14 }}>
    <div style={{ fontFamily: font, fontWeight: 800, fontSize: 18, color: 'var(--text-strong)' }}>{children}</div>
    {sub && <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{sub}</div>}
  </div>;
}

// ---------- sidebar rail ----------
const NAV = [
  ['calendar-days', 'المواعيد', 'agenda'],
  ['calendar-clock', 'المواعيد المتاحة', 'availability'],
  ['users', 'العملاء', 'customers'],
  ['bell', 'التذكيرات', 'reminders'],
  ['wallet', 'الحسابات', 'accounting'],
  ['users-round', 'الموظفون', 'staff'],
  ['shield-check', 'الصلاحيات', 'permissions'],
];
function Rail({ tab, setTab }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const initial = (profile?.name || 'م').trim()[0];
  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };
  return (
    <div style={{ width: 232, flex: '0 0 auto', background: 'linear-gradient(180deg,var(--teal-800),var(--teal-900))', display: 'flex', flexDirection: 'column', padding: '22px 16px', color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 6px 22px' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, fontWeight: 900, fontSize: 20, boxShadow: 'var(--shadow-brand)' }}>م</div>
        <div>
          <div style={{ fontFamily: font, fontWeight: 900, fontSize: 20, lineHeight: 1 }}>ميعاد</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 3 }}>مركز التحكم</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV.map(([ic, lb, id]) => {
          const on = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 13, cursor: 'pointer', border: 'none', textAlign: 'start', fontFamily: font, fontWeight: 700, fontSize: 14.5, transition: 'all .15s', background: on ? 'rgba(255,255,255,.14)' : 'transparent', color: on ? '#fff' : 'rgba(255,255,255,.62)' }}>
              <Icon name={ic} size={20} color={on ? '#fff' : 'rgba(255,255,255,.62)'} />{lb}
              {id === 'agenda' && <span style={{ marginInlineStart: 'auto', fontSize: 11, background: 'var(--amber-500)', color: 'var(--teal-900)', fontWeight: 800, padding: '2px 8px', borderRadius: 999 }}>24</span>}
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 11, padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,.12)' }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, fontWeight: 800 }}>{initial}</div>
        <div style={{ lineHeight: 1.3, flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: font, fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.name || 'مستخدم'}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>{profile?.role === 'owner' ? 'مدير العيادة' : 'فريق العيادة'}</div>
        </div>
        <button onClick={handleLogout} title="تسجيل الخروج" style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
          <Icon name="log-out" size={15} />
        </button>
      </div>
    </div>
  );
}

const TAB_META = {
  agenda: { title: 'مواعيد اليوم', sub: 'الثلاثاء · 12 أغسطس 2026 · فرع أكتوبر' },
  availability: { title: 'المواعيد المتاحة', sub: 'جدول كل طبيب، خدماته، وإعدادات الحجز' },
  customers: { title: 'العملاء', sub: 'كل العملاء المسجّلين وتفاصيلهم' },
  reminders: { title: 'التذكيرات والإشعارات', sub: 'إعداد قنوات الإرسال ومتابعة حالة كل إشعار' },
  accounting: { title: 'الحسابات', sub: 'الإيرادات والفواتير — 12 أغسطس' },
  staff: { title: 'الموظفون', sub: 'إدارة فريق العمل عبر كل الفروع' },
  permissions: { title: 'الصلاحيات', sub: 'تحديد ما يستطيع كل دور الوصول إليه' },
};

function AddBranchForm({ onClose, onSaved }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [hours, setHours] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const branch = await addBranch({ name: name.trim(), address: address.trim(), hours: hours.trim() });
      onSaved(branch);
    } catch (e) {
      setError(e.message || 'تعذّر إضافة الفرع.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 16, width: 260 }} onClick={e => e.stopPropagation()}>
      <div style={{ fontFamily: font, fontWeight: 800, fontSize: 14.5, color: 'var(--text-strong)', marginBottom: 12 }}>إضافة فرع جديد</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Field label="اسم الفرع"><Input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: فرع الشيخ زايد" /></Field>
        <Field label="العنوان"><Input value={address} onChange={e => setAddress(e.target.value)} placeholder="اختياري" /></Field>
        <Field label="ساعات العمل"><Input value={hours} onChange={e => setHours(e.target.value)} placeholder="مثال: 10 ص – 10 م" /></Field>
      </div>
      {error && <div style={{ marginTop: 10 }}><Alert tone="danger">{error}</Alert></div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={onClose} style={{ flex: 1, padding: '9px 0', borderRadius: 999, border: '1.5px solid var(--border-default)', background: '#fff', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 13, color: 'var(--text-body)' }}>إلغاء</button>
        <button disabled={!name.trim() || saving} onClick={handleSave} style={{ flex: 1, padding: '9px 0', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--brand)', color: '#fff', fontFamily: font, fontWeight: 800, fontSize: 13, opacity: (!name.trim() || saving) ? 0.5 : 1 }}>{saving ? 'جارِ الحفظ…' : 'حفظ الفرع'}</button>
      </div>
    </div>
  );
}

function BranchSwitcher({ branches, selectedBranchId, onSelect, onBranchAdded }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const selected = branches.find(b => b.id === selectedBranchId);

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => { setOpen(o => !o); setAdding(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 999, border: '1px solid var(--border-subtle)', background: 'var(--white)', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 13.5, color: 'var(--text-strong)' }}>
        <Icon name="map-pin" size={16} color="var(--brand)" />
        {selected ? selected.name : 'كل الفروع'}
        <Icon name="chevron-down" size={14} color="var(--text-muted)" />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 69 }} />
          <div style={{ position: 'absolute', top: '110%', insetInlineStart: 0, zIndex: 70, background: '#fff', borderRadius: 16, border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-lg)', minWidth: 220, overflow: 'hidden' }}>
            {adding ? (
              <AddBranchForm onClose={() => setAdding(false)} onSaved={b => { onBranchAdded(b); setAdding(false); setOpen(false); }} />
            ) : (
              <>
                <button onClick={() => { onSelect(null); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', border: 'none', background: !selectedBranchId ? 'var(--brand-subtle)' : 'transparent', cursor: 'pointer', textAlign: 'start', fontFamily: font, fontWeight: 700, fontSize: 13.5, color: !selectedBranchId ? 'var(--teal-700)' : 'var(--text-body)' }}>
                  <Icon name="layout-grid" size={15} />كل الفروع
                </button>
                {branches.map(b => (
                  <button key={b.id} onClick={() => { onSelect(b.id); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', border: 'none', background: selectedBranchId === b.id ? 'var(--brand-subtle)' : 'transparent', cursor: 'pointer', textAlign: 'start', fontFamily: font, fontWeight: 700, fontSize: 13.5, color: selectedBranchId === b.id ? 'var(--teal-700)' : 'var(--text-body)' }}>
                    <Icon name="map-pin" size={15} />{b.name}
                  </button>
                ))}
                <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <button onClick={() => setAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'start', fontFamily: font, fontWeight: 700, fontSize: 13.5, color: 'var(--brand)' }}>
                    <Icon name="plus" size={15} />إضافة فرع
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Topbar({ tab, onAdd, branches, selectedBranchId, onSelectBranch, onBranchAdded }) {
  const m = TAB_META[tab];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 26px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--white)', flex: '0 0 auto' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: font, fontWeight: 800, fontSize: 21, color: 'var(--text-strong)' }}>{m.title}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{m.sub}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-page)', border: '1px solid var(--border-subtle)', borderRadius: 999, padding: '9px 16px', width: 240 }}>
        <Icon name="search" size={17} color="var(--text-muted)" />
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>بحث عن عميل أو موعد…</span>
      </div>
      <button style={{ width: 42, height: 42, borderRadius: 13, border: '1px solid var(--border-subtle)', background: 'var(--white)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <Icon name="bell" size={19} color="var(--text-body)" />
        <span style={{ position: 'absolute', top: 9, insetInlineEnd: 10, width: 8, height: 8, borderRadius: '50%', background: 'var(--amber-500)', border: '2px solid #fff' }} />
      </button>
      <button onClick={onAdd} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--brand)', color: '#fff', fontFamily: font, fontWeight: 800, fontSize: 14.5, boxShadow: 'var(--shadow-brand)' }}>
        <Icon name="plus" size={19} color="#fff" stroke={2.5} />إضافة موعد
      </button>
      <BranchSwitcher branches={branches} selectedBranchId={selectedBranchId} onSelect={onSelectBranch} onBranchAdded={onBranchAdded} />
    </div>
  );
}

// ---------- KPI ----------
const TONE = { brand: 'var(--brand)', success: 'var(--green-500)', warning: 'var(--amber-600)', info: 'var(--blue-500)' };
function KpiRow({ appointments }) {
  const total = appointments.length;
  const confirmed = appointments.filter(a => a.status === 'confirmed').length;
  const pending = appointments.filter(a => a.status === 'pending').length;
  const cancelled = appointments.filter(a => a.status === 'cancelled').length;
  const occupancy = total > cancelled ? Math.round((confirmed / (total - cancelled)) * 100) : 0;
  const kpis = [
    { label: 'مواعيد', value: String(total), icon: 'calendar-days', tone: 'brand' },
    { label: 'مؤكدة', value: String(confirmed), icon: 'check-circle', tone: 'success' },
    { label: 'قيد الانتظار', value: String(pending), icon: 'clock', tone: 'warning' },
    { label: 'نسبة التأكيد', value: `${occupancy}%`, icon: 'activity', tone: 'info' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
      {kpis.map(k => { const t = TONE[k.tone]; return (
        <Card2 key={k.label} pad={18}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Ring2 icon={k.icon} tone={t} size={42} />
          </div>
          <div style={{ fontFamily: font, fontWeight: 900, fontSize: 30, color: 'var(--text-strong)', marginTop: 12 }}>{k.value}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 1 }}>{k.label}</div>
        </Card2>
      ); })}
    </div>
  );
}

// ---------- Countdown to appointment ----------
// Ticks every second; used across the admin agenda so staff can see at a glance
// how much time is left before each booking (or how long ago it passed).
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatCountdown(diffMs) {
  const past = diffMs < 0;
  const totalSeconds = Math.floor(Math.abs(diffMs) / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (days) parts.push(`${days}ي`);
  parts.push(`${hours}س`, `${minutes}د`, `${seconds}ث`);
  return (past ? 'فات بـ ' : 'باقي ') + parts.join(' ');
}

function CountdownBadge({ date, time, status }) {
  const now = useNow();
  const target = useMemo(() => new Date(`${date}T${time}:00`).getTime(), [date, time]);
  if (status === 'cancelled' || Number.isNaN(target)) return null;
  const diff = target - now;
  const due = diff <= 0 && diff > -60000; // within a minute of the slot
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: due ? 'var(--amber-600)' : diff < 0 ? 'var(--text-muted)' : 'var(--teal-700)' }}>
      <Icon name="clock" size={12.5} color="currentColor" />
      {due ? 'الموعد الآن' : formatCountdown(diff)}
    </span>
  );
}

// ---------- Agenda timeline ----------
function AgendaTab({ appointments, loading, error, onEdit }) {
  const [filter, setFilter] = useState('all');
  const FILTERS = [['all', 'الكل'], ['confirmed', 'مؤكد'], ['pending', 'قيد الانتظار']];
  const list = filter === 'all' ? appointments : appointments.filter(a => a.status === filter);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <KpiRow appointments={appointments} />
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 20, alignItems: 'start' }}>
        <Card2 pad={0} style={{ overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center' }}>
            <div style={{ fontFamily: font, fontWeight: 800, fontSize: 17, color: 'var(--text-strong)' }}>جدول اليوم</div>
            <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8 }}>
              {FILTERS.map(([id, label]) => (
                <span key={id} onClick={() => setFilter(id)} style={{ fontSize: 12.5, fontWeight: 700, padding: '6px 13px', borderRadius: 999, background: filter === id ? 'var(--brand-subtle)' : 'transparent', color: filter === id ? 'var(--teal-700)' : 'var(--text-muted)', border: filter === id ? '1px solid var(--brand-border)' : '1px solid transparent', cursor: 'pointer' }}>{label}</span>
              ))}
            </div>
          </div>
          <div style={{ padding: '8px 22px 18px' }}>
            {loading && <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>جارِ تحميل المواعيد…</div>}
            {!loading && error && <Alert tone="danger">{error}</Alert>}
            {!loading && !error && list.length === 0 && (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>لا توجد مواعيد بعد.</div>
            )}
            {!loading && !error && list.map((a, i) => <AgendaRow key={a.id} a={a} last={i === list.length - 1} onEdit={onEdit} />)}
          </div>
        </Card2>
        <SidePanel appointments={appointments} onEdit={onEdit} />
      </div>
    </div>
  );
}

function AgendaRow({ a, last, onEdit }) {
  const cancelled = a.status === 'cancelled';
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 18, width: 66, flex: '0 0 auto' }}>
        <div style={{ fontFamily: font, fontWeight: 800, fontSize: 12.5, color: 'var(--text-body)', whiteSpace: 'nowrap', textAlign: 'center', lineHeight: 1.3 }}>{formatArabicTime(a.time)}</div>
        <div style={{ width: 11, height: 11, borderRadius: '50%', marginTop: 8, background: a.isNew ? 'var(--amber-500)' : cancelled ? 'var(--red-500)' : 'var(--brand)', border: '2px solid #fff', boxShadow: '0 0 0 3px ' + (a.isNew ? 'var(--amber-100)' : 'var(--gray-100)') }} />
        {!last && <div style={{ flex: 1, width: 2, background: 'var(--border-subtle)', marginTop: 4 }} />}
      </div>
      <div style={{ flex: 1, margin: '8px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 14, borderRadius: 16, background: a.isNew ? 'var(--amber-50)' : 'var(--surface-page)', border: a.isNew ? '1.5px solid var(--amber-200)' : '1px solid var(--border-subtle)', opacity: cancelled ? 0.6 : 1 }}>
          <Avatar name={a.customer} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: font, fontWeight: 800, color: 'var(--text-strong)', fontSize: 15, textDecoration: cancelled ? 'line-through' : 'none' }}>{a.customer}</span>
              {a.isNew && <span style={{ fontSize: 10.5, fontWeight: 800, background: 'var(--amber-500)', color: 'var(--teal-900)', padding: '2px 8px', borderRadius: 999 }}>حجز جديد</span>}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{a.service} · {a.doctor}{a.price != null ? ` · ${a.price} ج` : ''}</div>
            <div style={{ marginTop: 4 }}><CountdownBadge date={a.date} time={a.time} status={a.status} /></div>
          </div>
          <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusPill status={a.status} />
            {a.isNew
              ? <button onClick={() => onEdit(a)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--brand)', color: '#fff', fontFamily: font, fontWeight: 700, fontSize: 13 }}><Icon name="check" size={15} color="#fff" stroke={2.5} />تأكيد</button>
              : <button onClick={() => onEdit(a)} style={{ width: 36, height: 36, borderRadius: 11, border: '1px solid var(--border-default)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="pencil" size={16} color="var(--text-body)" /></button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidePanel({ appointments, onEdit }) {
  const next = appointments.find(a => a.isNew);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card2>
        <SectionTitle sub="بانتظار تأكيدك">أحدث حجز</SectionTitle>
        {next ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={next.customer} size="lg" />
              <div>
                <div style={{ fontFamily: font, fontWeight: 800, fontSize: 16, color: 'var(--text-strong)' }}>{next.customer}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }} dir="ltr">{toLocalPhone(next.phone)}</div>
              </div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[['sparkles', next.service], ['stethoscope', next.doctor], ['clock', next.date + ' · ' + formatArabicTime(next.time)]].map(([ic, v]) => (
                <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: 'var(--text-body)' }}><Icon name={ic} size={16} color="var(--text-muted)" />{v}</div>
              ))}
            </div>
            <div style={{ marginTop: 10 }}><CountdownBadge date={next.date} time={next.time} status={next.status} /></div>
            <button onClick={() => onEdit(next)} style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 13, border: 'none', cursor: 'pointer', background: 'var(--brand)', color: '#fff', fontFamily: font, fontWeight: 800, fontSize: 14, boxShadow: 'var(--shadow-brand)' }}>مراجعة وتأكيد</button>
          </>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: 13.5, textAlign: 'center', padding: '10px 0' }}>لا توجد حجوزات بانتظار التأكيد.</div>
        )}
      </Card2>
      <Card2>
        <SectionTitle sub="من المواعيد المعروضة حالياً">إشغال الأطباء</SectionTitle>
        {(() => {
          const byDoctor = {};
          appointments.filter(a => a.status !== 'cancelled').forEach(a => {
            const name = a.doctor || 'بدون طبيب';
            byDoctor[name] = (byDoctor[name] || 0) + 1;
          });
          const rows = Object.entries(byDoctor).sort((a, b) => b[1] - a[1]);
          const max = Math.max(1, ...rows.map(([, n]) => n));
          if (!rows.length) return <div style={{ color: 'var(--text-muted)', fontSize: 13.5, textAlign: 'center', padding: '10px 0' }}>لا توجد مواعيد لعرضها.</div>;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {rows.map(([name, count]) => (
                <div key={name}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6 }}>
                    <span style={{ fontFamily: font, fontWeight: 700, color: 'var(--text-strong)' }}>{name}</span>
                    <span style={{ marginInlineStart: 'auto', color: 'var(--text-muted)' }}>{count} مواعيد</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: 'var(--surface-sunken)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: (count / max * 100) + '%', background: 'var(--brand)', borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </Card2>
    </div>
  );
}

// ---------- Edit / confirm modal (availability + double-booking) ----------
function AppointmentModal({ appt, onClose, onSaved }) {
  const [branches, setBranches] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);

  const [branchId, setBranchId] = useState(appt.branchId || '');
  const [serviceMode, setServiceMode] = useState(appt.serviceId ? 'existing' : 'custom');
  const [serviceId, setServiceId] = useState(appt.serviceId || '');
  const [customServiceName, setCustomServiceName] = useState(appt.serviceId ? '' : (appt.service || ''));
  const [doctorId, setDoctorId] = useState(appt.doctorId || '');
  const [date, setDate] = useState(appt.date || new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(appt.time || '');
  const [notes, setNotes] = useState(appt.notes || '');
  const [status, setStatus] = useState(appt.status || 'pending');
  const [price, setPrice] = useState(appt.price != null ? String(appt.price) : '');

  const [checking, setChecking] = useState(false);
  const [taken, setTaken] = useState(false);
  const [takenTimes, setTakenTimes] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const [doctorServices, setDoctorServices] = useState([]);

  useEffect(() => {
    Promise.all([listBranches(), listDoctors()])
      .then(([b, d]) => { setBranches(b); setDoctors(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoadingLists(false));
  }, []);

  // Scope the service dropdown to what this doctor actually offers (specialty-correct).
  useEffect(() => {
    if (!doctorId) { setDoctorServices([]); return; }
    listDoctorServices(doctorId).then(list => setDoctorServices(list.filter(s => s.enabled))).catch(() => setDoctorServices([]));
  }, [doctorId]);

  // Fetch every taken slot for this doctor/date so the picker can mark them (محجوز)
  // rather than just silently blocking the currently-selected one.
  useEffect(() => {
    if (!doctorId || !date) { setTakenTimes([]); return; }
    listTakenTimes({ doctorId, date, excludeAppointmentId: appt.id }).then(setTakenTimes).catch(() => setTakenTimes([]));
  }, [doctorId, date]);

  useEffect(() => {
    if (!doctorId || !date || !time) { setTaken(false); return; }
    setChecking(true);
    isSlotTaken({ doctorId, date, time, excludeAppointmentId: appt.id })
      .then(setTaken)
      .catch(() => setTaken(false))
      .finally(() => setChecking(false));
  }, [doctorId, date, time]);

  const serviceOk = serviceMode === 'existing' ? !!serviceId : !!customServiceName.trim();
  const canSave = branchId && serviceOk && doctorId && date && time && !taken && !checking;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await updateAppointment(appt.id, {
        branchId,
        serviceId: serviceMode === 'existing' ? serviceId : null,
        serviceName: serviceMode === 'custom' ? customServiceName.trim() : undefined,
        doctorId, date, time, notes, status,
        price: price === '' ? null : Number(price),
      });
      setSaved(true);
      onSaved?.();
    } catch (e) {
      setError(e.message || 'تعذّر حفظ الموعد.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await deleteAppointment(appt.id);
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message || 'تعذّر حذف الموعد.');
      setDeleting(false);
    }
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(6,60,60,.34)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
      <div style={{ width: 560, maxHeight: '100%', overflowY: 'auto', background: '#fff', borderRadius: 22, boxShadow: '0 40px 80px -20px rgba(0,0,0,.4)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: font, fontWeight: 800, fontSize: 19, color: 'var(--text-strong)' }}>{saved ? 'تم حفظ الموعد' : 'تعديل الموعد'}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{appt.customer} · <span dir="ltr">{toLocalPhone(appt.phone)}</span></div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{appt.service}{appt.doctor ? ` · ${appt.doctor}` : ''}</div>
          </div>
          <button onClick={onClose} style={{ marginInlineStart: 'auto', width: 38, height: 38, borderRadius: 11, border: '1px solid var(--border-subtle)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={19} color="var(--text-body)" /></button>
        </div>

        {saved ? (
          <div style={{ padding: 28, textAlign: 'center' }}>
            <div style={{ width: 66, height: 66, borderRadius: '50%', background: 'var(--green-50)', color: 'var(--green-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}><Icon name="check-check" size={34} /></div>
            <div style={{ fontFamily: font, fontWeight: 800, fontSize: 18, color: 'var(--text-strong)', marginTop: 14 }}>تم حفظ التعديلات</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13.5, marginTop: 4, lineHeight: 1.7 }}>تم تحديث موعد {appt.customer}.</div>
            <button onClick={onClose} style={{ marginTop: 20, padding: '12px 28px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--brand)', color: '#fff', fontFamily: font, fontWeight: 800, fontSize: 14.5 }}>تمام</button>
          </div>
        ) : loadingLists ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>جارِ التحميل…</div>
        ) : (
          <div style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="الفرع">
                <Select value={branchId} onChange={e => {
                  const nextBranchId = e.target.value;
                  setBranchId(nextBranchId);
                  const currentDoctor = doctors.find(d => d.id === doctorId);
                  if (currentDoctor && currentDoctor.branch_id && currentDoctor.branch_id !== nextBranchId) setDoctorId('');
                }}>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
              <Field label="الطبيب">
                <Select value={doctorId} onChange={e => { setDoctorId(e.target.value); if (serviceMode === 'existing') setServiceId(''); }} disabled={!branchId} placeholder={branchId ? undefined : 'اختر الفرع أولاً'}>
                  {doctors.filter(d => !d.branch_id || d.branch_id === branchId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Select>
              </Field>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {[['existing', 'من قائمة الخدمات'], ['custom', 'خدمة أخرى — اكتب يدوي']].map(([id, label]) => (
                  <button key={id} onClick={() => setServiceMode(id)} style={{ flex: 1, padding: '9px 0', borderRadius: 999, fontFamily: font, fontWeight: 700, fontSize: 12.5, cursor: 'pointer', background: serviceMode === id ? 'var(--brand)' : '#fff', border: serviceMode === id ? '1.5px solid var(--brand)' : '1.5px solid var(--border-subtle)', color: serviceMode === id ? '#fff' : 'var(--text-body)' }}>{label}</button>
                ))}
              </div>
              {serviceMode === 'existing' ? (
                <Field label="الخدمة" hint={!doctorId ? undefined : (doctorServices.length === 0 ? 'هذا الطبيب لا يقدّم أي خدمة حالياً' : undefined)}>
                  <Select value={serviceId} onChange={e => setServiceId(e.target.value)} disabled={!doctorId} placeholder={doctorId ? 'اختر الخدمة' : 'اختر الطبيب أولاً'}>
                    {doctorServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </Field>
              ) : (
                <Field label="اسم الخدمة">
                  <Input iconStart="sparkles" placeholder="مثال: زراعة أسنان" value={customServiceName} onChange={e => setCustomServiceName(e.target.value)} />
                </Field>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
              <Field label="السعر (ج.م)">
                <Input type="number" min="0" step="0.01" iconStart="coins" placeholder="اكتب السعر" value={price} onChange={e => setPrice(e.target.value)} />
              </Field>
              <Field label="التاريخ">
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  style={{ width: '100%', height: 46, boxSizing: 'border-box', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'var(--text-strong)', background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '0 14px', outline: 'none' }} />
              </Field>
              <Field label="الوقت" style={{ gridColumn: '1 / -1' }}>
                <Select value={time} onChange={e => setTime(e.target.value)}>
                  {TIME_OPTIONS.map(t => (
                    <option key={t} value={t} disabled={takenTimes.includes(t) && t !== appt.time}>
                      {formatArabicTime(t)}{takenTimes.includes(t) && t !== appt.time ? ' (محجوز)' : ''}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {checking && <div style={{ marginTop: 14, fontSize: 13, color: 'var(--text-muted)' }}>جارِ التحقق من التوفّر…</div>}
            {!checking && (
              taken ? (
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 14, background: 'var(--red-50)', color: 'var(--red-600)', fontSize: 13.5, lineHeight: 1.6 }}>
                  <Icon name="circle-alert" size={19} color="var(--red-500)" />
                  <div><b>هذا الموعد غير متاح، يرجى اختيار موعد آخر.</b><br />الطبيب محجوز بالفعل في هذا الوقت — منع تعارض الحجوزات.</div>
                </div>
              ) : (
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, background: 'var(--green-50)', color: 'var(--green-600)', fontSize: 13.5 }}>
                  <Icon name="check-circle" size={19} color="var(--green-500)" />الوقت متاح.
                </div>
              )
            )}

            <div style={{ marginTop: 16 }}>
              <Field label="ملاحظات (اختياري)">
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'var(--text-strong)', background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '10px 14px', outline: 'none', resize: 'vertical' }} />
              </Field>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontFamily: font, fontWeight: 700, fontSize: 13.5, color: 'var(--text-strong)', marginBottom: 9 }}>حالة الحجز</div>
              <div style={{ display: 'flex', gap: 9 }}>
                {[['pending', 'قيد الانتظار'], ['confirmed', 'مؤكد'], ['cancelled', 'ملغي']].map(([id, label]) => (
                  <button key={id} onClick={() => setStatus(id)} style={{ flex: 1, padding: '11px 0', borderRadius: 12, fontFamily: font, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', background: status === id ? 'var(--brand)' : 'var(--white)', border: status === id ? '2px solid var(--brand)' : '1.5px solid var(--border-subtle)', color: status === id ? '#fff' : 'var(--text-body)' }}>{label}</button>
                ))}
              </div>
            </div>

            {error && <div style={{ marginTop: 14 }}><Alert tone="danger">{error}</Alert></div>}

            {confirmDelete ? (
              <div style={{ marginTop: 20, padding: 14, borderRadius: 14, background: 'var(--red-50)', border: '1px solid var(--red-100)' }}>
                <div style={{ color: 'var(--red-600)', fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>متأكد إنك عايز تحذف الموعد ده نهائياً؟</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '11px', borderRadius: 999, border: '1.5px solid var(--border-default)', background: '#fff', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 13.5, color: 'var(--text-body)' }}>تراجع</button>
                  <button disabled={deleting} onClick={handleDelete} style={{ flex: 1, padding: '11px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--red-500)', color: '#fff', fontFamily: font, fontWeight: 800, fontSize: 13.5 }}>{deleting ? 'جارِ الحذف…' : 'حذف نهائي'}</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button onClick={() => setConfirmDelete(true)} title="حذف الموعد" style={{ width: 46, flex: '0 0 auto', borderRadius: 999, border: '1.5px solid var(--red-200)', background: '#fff', cursor: 'pointer', color: 'var(--red-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="trash-2" size={18} /></button>
                <button onClick={onClose} style={{ flex: '0 0 auto', padding: '13px 22px', borderRadius: 999, border: '1.5px solid var(--border-default)', background: '#fff', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 14, color: 'var(--text-body)' }}>إلغاء</button>
                <button disabled={!canSave || saving} onClick={handleSave} style={{ flex: 1, padding: '13px', borderRadius: 999, border: 'none', cursor: (!canSave || saving) ? 'not-allowed' : 'pointer', opacity: (!canSave || saving) ? 0.45 : 1, background: 'var(--brand)', color: '#fff', fontFamily: font, fontWeight: 800, fontSize: 15, boxShadow: (!canSave || saving) ? 'none' : 'var(--shadow-brand)' }}>{saving ? 'جارِ الحفظ…' : 'حفظ التعديلات'}</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Add appointment (real PRD flow: pick customer, branch, doctor, service, date/time) ----------
const TIME_OPTIONS = ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'];

function AddAppointmentModal({ onClose, onCreated }) {
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);

  const [customerMode, setCustomerMode] = useState('existing'); // 'existing' | 'new'
  const [customerId, setCustomerId] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [branchId, setBranchId] = useState('');
  const [serviceMode, setServiceMode] = useState('existing'); // 'existing' | 'custom'
  const [serviceId, setServiceId] = useState('');
  const [customServiceName, setCustomServiceName] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('confirmed');
  const [price, setPrice] = useState(''); // always typed manually — no auto-fill from service price

  const [checking, setChecking] = useState(false);
  const [taken, setTaken] = useState(false);
  const [takenTimes, setTakenTimes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [doctorServices, setDoctorServices] = useState([]);

  useEffect(() => {
    Promise.all([listCustomers(), listBranches(), listDoctors()])
      .then(([c, b, d]) => { setCustomers(c); setBranches(b); setDoctors(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoadingLists(false));
  }, []);

  // Fetch every taken slot for this doctor/date so the picker can mark them (محجوز)
  // rather than just silently blocking the currently-selected one.
  useEffect(() => {
    if (!doctorId || !date) { setTakenTimes([]); return; }
    listTakenTimes({ doctorId, date }).then(setTakenTimes).catch(() => setTakenTimes([]));
  }, [doctorId, date]);

  // Scope the service dropdown to what this doctor actually offers (specialty-correct).
  useEffect(() => {
    if (!doctorId) { setDoctorServices([]); return; }
    listDoctorServices(doctorId).then(list => setDoctorServices(list.filter(s => s.enabled))).catch(() => setDoctorServices([]));
  }, [doctorId]);

  useEffect(() => {
    if (!doctorId || !date || !time) { setTaken(false); return; }
    setChecking(true);
    isSlotTaken({ doctorId, date, time })
      .then(setTaken)
      .catch(() => setTaken(false))
      .finally(() => setChecking(false));
  }, [doctorId, date, time]);

  const customerOk = customerMode === 'existing' ? !!customerId : (newName.trim() && newPhone.trim());
  const serviceOk = serviceMode === 'existing' ? !!serviceId : !!customServiceName.trim();
  const canSave = customerOk && branchId && serviceOk && doctorId && date && time && !taken && !checking;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await createAppointment({
        customerId: customerMode === 'existing' ? customerId : null,
        customerName: customerMode === 'new' ? newName.trim() : undefined,
        customerPhone: customerMode === 'new' ? newPhone.trim() : undefined,
        branchId,
        serviceId: serviceMode === 'existing' ? serviceId : null,
        serviceName: serviceMode === 'custom' ? customServiceName.trim() : undefined,
        doctorId, date, time, notes, status,
        price: price === '' ? null : Number(price),
      });
      onCreated();
    } catch (e) {
      setError(e.message || 'تعذّر إنشاء الموعد.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(6,60,60,.34)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
      <div style={{ width: 560, maxHeight: '100%', overflowY: 'auto', background: '#fff', borderRadius: 22, boxShadow: '0 40px 80px -20px rgba(0,0,0,.4)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: font, fontWeight: 800, fontSize: 19, color: 'var(--text-strong)' }}>إضافة موعد</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>أنشئ حجزاً نيابةً عن العميل</div>
          </div>
          <button onClick={onClose} style={{ marginInlineStart: 'auto', width: 38, height: 38, borderRadius: 11, border: '1px solid var(--border-subtle)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={19} color="var(--text-body)" /></button>
        </div>

        {loadingLists ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>جارِ التحميل…</div>
        ) : (
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {[['existing', 'عميل موجود'], ['new', 'عميل جديد']].map(([id, label]) => (
                <button key={id} onClick={() => setCustomerMode(id)} style={{ flex: 1, padding: '10px 0', borderRadius: 999, fontFamily: font, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', background: customerMode === id ? 'var(--brand)' : '#fff', border: customerMode === id ? '1.5px solid var(--brand)' : '1.5px solid var(--border-subtle)', color: customerMode === id ? '#fff' : 'var(--text-body)' }}>{label}</button>
              ))}
            </div>

            {customerMode === 'existing' ? (
              <Field label="العميل">
                <Select value={customerId} onChange={e => setCustomerId(e.target.value)} placeholder="اختر عميلاً موجوداً">
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name || toLocalPhone(c.phone)}</option>)}
                </Select>
              </Field>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="اسم العميل">
                  <Input iconStart="user-round" placeholder="مثال: أحمد سامي" value={newName} onChange={e => setNewName(e.target.value)} />
                </Field>
                <Field label="رقم الهاتف">
                  <Input iconStart="phone" placeholder="01xx xxx xxxx" value={newPhone} onChange={e => setNewPhone(e.target.value)} dir="ltr" />
                </Field>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
              <Field label="الفرع">
                <Select value={branchId} onChange={e => {
                  const nextBranchId = e.target.value;
                  setBranchId(nextBranchId);
                  const currentDoctor = doctors.find(d => d.id === doctorId);
                  if (currentDoctor && currentDoctor.branch_id && currentDoctor.branch_id !== nextBranchId) setDoctorId('');
                }} placeholder="اختر الفرع">
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
              <Field label="الطبيب">
                <Select value={doctorId} onChange={e => { setDoctorId(e.target.value); if (serviceMode === 'existing') setServiceId(''); }} disabled={!branchId} placeholder={branchId ? 'اختر الطبيب' : 'اختر الفرع أولاً'}>
                  {doctors.filter(d => !d.branch_id || d.branch_id === branchId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Select>
              </Field>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {[['existing', 'من قائمة الخدمات'], ['custom', 'خدمة أخرى — اكتب يدوي']].map(([id, label]) => (
                  <button key={id} onClick={() => setServiceMode(id)} style={{ flex: 1, padding: '9px 0', borderRadius: 999, fontFamily: font, fontWeight: 700, fontSize: 12.5, cursor: 'pointer', background: serviceMode === id ? 'var(--brand)' : '#fff', border: serviceMode === id ? '1.5px solid var(--brand)' : '1.5px solid var(--border-subtle)', color: serviceMode === id ? '#fff' : 'var(--text-body)' }}>{label}</button>
                ))}
              </div>
              {serviceMode === 'existing' ? (
                <Field label="الخدمة" hint={doctorId && doctorServices.length === 0 ? 'هذا الطبيب لا يقدّم أي خدمة حالياً' : undefined}>
                  <Select value={serviceId} onChange={e => setServiceId(e.target.value)} disabled={!doctorId} placeholder={doctorId ? 'اختر الخدمة' : 'اختر الطبيب أولاً'}>
                    {doctorServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </Field>
              ) : (
                <Field label="اسم الخدمة">
                  <Input iconStart="sparkles" placeholder="مثال: زراعة أسنان" value={customServiceName} onChange={e => setCustomServiceName(e.target.value)} />
                </Field>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
              <Field label="السعر (ج.م)">
                <Input type="number" min="0" step="0.01" iconStart="coins" placeholder="اكتب السعر" value={price} onChange={e => setPrice(e.target.value)} />
              </Field>
              <Field label="التاريخ">
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  style={{ width: '100%', height: 46, boxSizing: 'border-box', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'var(--text-strong)', background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '0 14px', outline: 'none' }} />
              </Field>
              <Field label="الوقت" style={{ gridColumn: '1 / -1' }}>
                <Select value={time} onChange={e => setTime(e.target.value)} placeholder="اختر الوقت">
                  {TIME_OPTIONS.map(t => (
                    <option key={t} value={t} disabled={takenTimes.includes(t)}>
                      {formatArabicTime(t)}{takenTimes.includes(t) ? ' (محجوز)' : ''}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {checking && <div style={{ marginTop: 14, fontSize: 13, color: 'var(--text-muted)' }}>جارِ التحقق من التوفّر…</div>}
            {!checking && doctorId && date && time && (
              taken ? (
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 14, background: 'var(--red-50)', color: 'var(--red-600)', fontSize: 13.5, lineHeight: 1.6 }}>
                  <Icon name="circle-alert" size={19} color="var(--red-500)" />
                  <div><b>هذا الموعد غير متاح، يرجى اختيار موعد آخر.</b><br />الطبيب محجوز بالفعل في هذا الوقت — منع تعارض الحجوزات.</div>
                </div>
              ) : (
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, background: 'var(--green-50)', color: 'var(--green-600)', fontSize: 13.5 }}>
                  <Icon name="check-circle" size={19} color="var(--green-500)" />الوقت متاح.
                </div>
              )
            )}

            <div style={{ marginTop: 16 }}>
              <Field label="ملاحظات (اختياري)">
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'var(--text-strong)', background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '10px 14px', outline: 'none', resize: 'vertical' }} />
              </Field>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontFamily: font, fontWeight: 700, fontSize: 13.5, color: 'var(--text-strong)', marginBottom: 9 }}>حالة الحجز</div>
              <div style={{ display: 'flex', gap: 9 }}>
                {[['pending', 'قيد الانتظار'], ['confirmed', 'مؤكد']].map(([id, label]) => (
                  <button key={id} onClick={() => setStatus(id)} style={{ flex: 1, padding: '11px 0', borderRadius: 12, fontFamily: font, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', background: status === id ? 'var(--brand)' : 'var(--white)', border: status === id ? '2px solid var(--brand)' : '1.5px solid var(--border-subtle)', color: status === id ? '#fff' : 'var(--text-body)' }}>{label}</button>
                ))}
              </div>
            </div>

            {error && <div style={{ marginTop: 16 }}><Alert tone="danger">{error}</Alert></div>}

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button onClick={onClose} style={{ flex: '0 0 auto', padding: '13px 22px', borderRadius: 999, border: '1.5px solid var(--border-default)', background: '#fff', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 14, color: 'var(--text-body)' }}>إلغاء</button>
              <button disabled={!canSave || saving} onClick={handleSave} style={{ flex: 1, padding: '13px', borderRadius: 999, border: 'none', cursor: (!canSave || saving) ? 'not-allowed' : 'pointer', opacity: (!canSave || saving) ? 0.45 : 1, background: 'var(--brand)', color: '#fff', fontFamily: font, fontWeight: 800, fontSize: 15, boxShadow: (!canSave || saving) ? 'none' : 'var(--shadow-brand)' }}>{saving ? 'جارِ الحفظ…' : 'تأكيد حجز الموعد'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Reminders + notifications ----------
function RemindersTab() {
  const [rem, setRem] = useState(AS.reminders);
  const [ch, setCh] = useState(AS.channels);
  const toggleRem = id => setRem(rem.map(r => r.id === id ? { ...r, on: !r.on } : r));
  const toggleCh = id => setCh(ch.map(c => c.id === id ? { ...c, on: !c.on } : c));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 20, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card2>
          <SectionTitle sub="يُرسَل تلقائياً لكل موعد مؤكد">جدولة التذكيرات</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rem.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 15, borderRadius: 15, background: r.on ? 'var(--brand-subtle)' : 'var(--surface-page)', border: '1px solid ' + (r.on ? 'var(--brand-border)' : 'var(--border-subtle)') }}>
                <Ring2 icon="bell" tone={r.on ? 'var(--brand)' : 'var(--gray-400)'} size={40} />
                <div><div style={{ fontFamily: font, fontWeight: 800, color: 'var(--text-strong)', fontSize: 15 }}>{r.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{r.timing}</div></div>
                <div style={{ marginInlineStart: 'auto' }}><Toggle on={r.on} onClick={() => toggleRem(r.id)} /></div>
              </div>
            ))}
          </div>
        </Card2>
        <Card2>
          <SectionTitle sub="اختر كيف يصل الإشعار للعميل">قنوات الإرسال</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ch.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, border: '1px solid var(--border-subtle)' }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: `color-mix(in srgb, ${c.color} 14%, white)`, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={c.icon} size={20} /></div>
                <span style={{ fontFamily: font, fontWeight: 700, color: 'var(--text-strong)', fontSize: 14.5 }}>{c.label}</span>
                <div style={{ marginInlineStart: 'auto' }}><Toggle on={c.on} onClick={() => toggleCh(c.id)} /></div>
              </div>
            ))}
          </div>
        </Card2>
        <MessagePreview />
      </div>
      <NotificationsBoard />
    </div>
  );
}

function MessagePreview() {
  const c = AS.chosen;
  return (
    <Card2>
      <SectionTitle sub="نص التذكير كما يصل العميل">معاينة الرسالة</SectionTitle>
      <div style={{ background: '#dcf8c6', color: '#0b2e13', borderRadius: '4px 16px 16px 16px', padding: '14px 16px', fontSize: 13.5, lineHeight: 1.8, fontFamily: body }}>
        <div style={{ fontFamily: font, fontWeight: 800, marginBottom: 6 }}>تذكير بموعدك</div>
        مرحباً {AS.patient.name}، نذكّرك بأن لديك موعداً غداً.<br />
        الخدمة: {c.service}<br />الطبيب: {c.doctor}<br />التاريخ: {c.date}<br />الوقت: {c.time}<br />الفرع: {c.branch}
        <div style={{ marginTop: 6 }}>نتمنى لك السلامة.</div>
        <div style={{ textAlign: 'start', fontSize: 11, color: '#5a7a52', marginTop: 6 }}>✓✓ 4:00 مساءً</div>
      </div>
    </Card2>
  );
}

const N_COLS = [
  ['scheduled', 'مجدول'],
  ['sent', 'تم الإرسال'],
  ['delivered', 'تم الاستلام'],
  ['failed', 'فشل'],
];
function NotificationsBoard() {
  return (
    <Card2 style={{ height: '100%' }}>
      <SectionTitle sub="متابعة كل إشعار: مجدول ← مُرسل ← مُستلَم">لوحة حالة الإشعارات</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {N_COLS.map(([st, lb]) => {
          const items = AS.notifications.filter(n => n.status === st);
          const col = `var(--status-${st})`;
          return (
            <div key={st} style={{ background: 'var(--surface-page)', borderRadius: 14, padding: 10, minHeight: 260 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 6px 10px' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: col }} />
                <span style={{ fontFamily: font, fontWeight: 800, fontSize: 12.5, color: 'var(--text-strong)' }}>{lb}</span>
                <span style={{ marginInlineStart: 'auto', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>{items.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(n => (
                  <div key={n.id} style={{ background: '#fff', borderRadius: 11, border: '1px solid var(--border-subtle)', borderInlineStart: '3px solid ' + col, padding: 10 }}>
                    <div style={{ fontFamily: font, fontWeight: 700, fontSize: 12.5, color: 'var(--text-strong)' }}>{n.customer}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{n.kind}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 7, fontSize: 10.5, color: 'var(--text-muted)' }}>
                      <Icon name={n.channel === 'WhatsApp' ? 'message-circle' : 'message-square'} size={12} color={n.channel === 'WhatsApp' ? 'var(--whatsapp)' : 'var(--blue-500)'} />{n.channel} · {n.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card2>
  );
}

// ---------- Doctors ----------

function AddPeriodInline({ onAdd, onCancel }) {
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('14:00');
  const valid = start && end && start < end;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <input type="time" value={start} onChange={e => setStart(e.target.value)}
        style={{ width: 110, height: 36, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-strong)', background: '#fff', border: '1px solid var(--border-default)', borderRadius: 10, padding: '0 10px' }} />
      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>إلى</span>
      <input type="time" value={end} onChange={e => setEnd(e.target.value)}
        style={{ width: 110, height: 36, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-strong)', background: '#fff', border: '1px solid var(--border-default)', borderRadius: 10, padding: '0 10px' }} />
      <button disabled={!valid} onClick={() => onAdd(start, end)} style={{ padding: '7px 14px', borderRadius: 999, border: 'none', cursor: valid ? 'pointer' : 'not-allowed', opacity: valid ? 1 : 0.5, background: 'var(--brand)', color: '#fff', fontFamily: font, fontWeight: 700, fontSize: 12.5 }}>إضافة</button>
      <button onClick={onCancel} style={{ padding: '7px 14px', borderRadius: 999, border: '1px solid var(--border-default)', background: '#fff', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 12.5, color: 'var(--text-body)' }}>إلغاء</button>
    </div>
  );
}

function DoctorAvailabilityPanel({ doctor, appointments = [], onBack }) {
  const [schedule, setSchedule] = useState([]);
  const [services, setServices] = useState([]);
  const [bufferMinutes, setBufferMinutes] = useState(doctor.buffer_minutes ?? 0);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(doctor.max_advance_days ?? 30);
  const [rescheduleCutoffHours, setRescheduleCutoffHours] = useState(doctor.reschedule_cutoff_hours ?? 4);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [addingFor, setAddingFor] = useState(null); // weekday index
  const [addingService, setAddingService] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState(30);
  const [newServicePrice, setNewServicePrice] = useState('');
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editServiceName, setEditServiceName] = useState('');
  const [editServiceDuration, setEditServiceDuration] = useState('');
  const [editServicePrice, setEditServicePrice] = useState('');

  useEffect(() => {
    Promise.all([getDoctorSchedule(doctor.id), listDoctorServices(doctor.id)])
      .then(([s, sv]) => { setSchedule(s); setServices(sv); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [doctor.id]);

  const toggleDay = (weekday, active) => {
    setSchedule(sch => sch.map(d => d.weekday === weekday ? { ...d, active } : d));
    setError('');
    setDayActive(doctor.id, weekday, active).catch(e => setError(e.message || 'تعذّر الحفظ.'));
  };

  const removePeriod = (periodId, weekday) => {
    setSchedule(sch => sch.map(d => d.weekday === weekday ? { ...d, periods: d.periods.filter(p => p.id !== periodId) } : d));
    setError('');
    deleteSchedulePeriod(periodId).catch(e => setError(e.message || 'تعذّر الحذف.'));
  };

  const handleAddPeriod = async (weekday, start, end) => {
    setError('');
    try {
      const p = await addSchedulePeriod(doctor.id, weekday, start, end);
      setSchedule(sch => sch.map(d => d.weekday === weekday ? { ...d, periods: [...d.periods, { id: p.id, start, end }].sort((a, b) => a.start.localeCompare(b.start)) } : d));
      setAddingFor(null);
    } catch (e) {
      setError(e.message || 'تعذّر إضافة الفترة.');
    }
  };

  const toggleService = (serviceId, enabled) => {
    setServices(list => list.map(s => s.id === serviceId ? { ...s, enabled } : s));
    setError('');
    setDoctorService(doctor.id, serviceId, enabled).catch(e => setError(e.message || 'تعذّر الحفظ.'));
  };

  const handleAddService = async () => {
    const name = newServiceName.trim();
    if (!name) return;
    setError('');
    try {
      const created = await addService({ name, durationMinutes: Number(newServiceDuration) || 30, price: Number(newServicePrice) || 0, icon: 'sparkles' });
      await setDoctorService(doctor.id, created.id, true);
      setServices(list => [...list, { ...created, enabled: true }]);
      setAddingService(false);
      setNewServiceName(''); setNewServiceDuration(30); setNewServicePrice('');
    } catch (e) {
      setError(e.message || 'تعذّر إضافة الخدمة.');
    }
  };

  const startEditService = s => {
    setEditingServiceId(s.id);
    setEditServiceName(s.name);
    setEditServiceDuration(s.duration_minutes);
    setEditServicePrice(s.price);
  };

  const handleUpdateService = async serviceId => {
    setError('');
    try {
      const updated = await updateService(serviceId, { name: editServiceName.trim(), durationMinutes: Number(editServiceDuration) || 0, price: Number(editServicePrice) || 0 });
      setServices(list => list.map(s => s.id === serviceId ? { ...s, ...updated } : s));
      setEditingServiceId(null);
    } catch (e) {
      setError(e.message || 'تعذّر تحديث الخدمة.');
    }
  };

  const saveSettings = async () => {
    setError('');
    setSaved(false);
    try {
      await updateDoctorSettings(doctor.id, { bufferMinutes: Number(bufferMinutes), maxAdvanceDays: Number(maxAdvanceDays), rescheduleCutoffHours: Number(rescheduleCutoffHours) });
      setSaved(true);
    } catch (e) {
      setError(e.message || 'تعذّر حفظ الإعدادات.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 11, border: '1px solid var(--border-subtle)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="chevron-right" size={18} color="var(--text-body)" /></button>
        <Avatar name={doctor.name} />
        <div>
          <div style={{ fontFamily: font, fontWeight: 800, fontSize: 17, color: 'var(--text-strong)' }}>المواعيد المتاحة · {doctor.name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{doctor.specialty}{doctor.branch?.name ? ` · ${doctor.branch.name}` : ''}</div>
        </div>
      </div>

      {error && <div style={{ marginBottom: 16 }}><Alert tone="danger">{error}</Alert></div>}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>جارِ التحميل…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 20, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Card2>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: font, fontWeight: 800, fontSize: 18, color: 'var(--text-strong)' }}>الخدمات ومدتها</div>
                </div>
                {!addingService && (
                  <button onClick={() => setAddingService(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 999, border: '1.5px solid var(--brand-border)', background: 'var(--brand-subtle)', color: 'var(--teal-700)', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 12 }}>
                    <Icon name="plus" size={13} />خدمة
                  </button>
                )}
              </div>

              {addingService && (
                <div style={{ padding: 12, borderRadius: 14, background: 'var(--surface-page)', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input value={newServiceName} onChange={e => setNewServiceName(e.target.value)} placeholder="اسم الخدمة" autoFocus
                    style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-subtle)', fontFamily: font, fontSize: 13 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="number" min="5" value={newServiceDuration} onChange={e => setNewServiceDuration(e.target.value)} placeholder="الدقائق"
                      style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-subtle)', fontFamily: font, fontSize: 13 }} />
                    <input type="number" min="0" value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)} placeholder="السعر"
                      style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-subtle)', fontFamily: font, fontSize: 13 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button disabled={!newServiceName.trim()} onClick={handleAddService} style={{ flex: 1, padding: '9px 0', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--brand)', color: '#fff', fontFamily: font, fontWeight: 700, fontSize: 12.5, opacity: newServiceName.trim() ? 1 : 0.5 }}>إضافة</button>
                    <button onClick={() => setAddingService(false)} style={{ flex: 1, padding: '9px 0', borderRadius: 999, border: '1px solid var(--border-default)', background: '#fff', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 12.5, color: 'var(--text-body)' }}>إلغاء</button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {services.map(s => (
                  editingServiceId === s.id ? (
                    <div key={s.id} style={{ padding: 12, borderRadius: 14, background: 'var(--surface-page)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input value={editServiceName} onChange={e => setEditServiceName(e.target.value)} style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-subtle)', fontFamily: font, fontSize: 13 }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input type="number" value={editServiceDuration} onChange={e => setEditServiceDuration(e.target.value)} placeholder="الدقائق" style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-subtle)', fontFamily: font, fontSize: 13 }} />
                        <input type="number" value={editServicePrice} onChange={e => setEditServicePrice(e.target.value)} placeholder="السعر" style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-subtle)', fontFamily: font, fontSize: 13 }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleUpdateService(s.id)} style={{ flex: 1, padding: '9px 0', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--brand)', color: '#fff', fontFamily: font, fontWeight: 700, fontSize: 12.5 }}>حفظ</button>
                        <button onClick={() => setEditingServiceId(null)} style={{ flex: 1, padding: '9px 0', borderRadius: 999, border: '1px solid var(--border-default)', background: '#fff', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 12.5, color: 'var(--text-body)' }}>إلغاء</button>
                      </div>
                    </div>
                  ) : (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Toggle on={s.enabled} onClick={() => toggleService(s.id, !s.enabled)} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: font, fontWeight: 700, fontSize: 13.5, color: 'var(--text-strong)' }}>{s.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{s.duration_minutes} دقيقة · {s.price} ج</div>
                      </div>
                      <button onClick={() => startEditService(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-link)', fontFamily: font, fontWeight: 700, fontSize: 12 }}>تعديل</button>
                    </div>
                  )
                ))}
                {services.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>لا توجد خدمات بعد.</div>}
              </div>
            </Card2>

            <Card2>
              <SectionTitle>إعدادات الحجز</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label="فاصل بين الجلسات (دقائق)">
                  <Input type="number" min="0" step="5" value={bufferMinutes} onChange={e => setBufferMinutes(e.target.value)} />
                </Field>
                <Field label="أقصى مدى للحجز المسبق (يوم)">
                  <Input type="number" min="1" value={maxAdvanceDays} onChange={e => setMaxAdvanceDays(e.target.value)} />
                </Field>
                <Field label="السماح بإعادة الجدولة قبل (ساعة)">
                  <Input type="number" min="0" value={rescheduleCutoffHours} onChange={e => setRescheduleCutoffHours(e.target.value)} />
                </Field>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={saveSettings} style={{ padding: '11px 20px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--brand)', color: '#fff', fontFamily: font, fontWeight: 800, fontSize: 13.5, boxShadow: 'var(--shadow-brand)' }}>حفظ الإعدادات</button>
                  {saved && <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--green-600)', fontSize: 13 }}><Icon name="check-circle" size={15} />تم الحفظ</span>}
                </div>
              </div>
            </Card2>
          </div>

          <Card2>
            <SectionTitle>جدول الأسبوع</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {schedule.map(day => (
                <div key={day.weekday} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ width: 70, flex: '0 0 auto', fontFamily: font, fontWeight: 700, fontSize: 13.5, color: 'var(--text-strong)', paddingTop: 6 }}>{day.label}</div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {day.active ? (
                      <>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {day.periods.map(p => (
                            <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-body)', background: 'var(--surface-page)', border: '1px solid var(--border-subtle)', padding: '6px 10px', borderRadius: 999 }}>
                              {formatArabicTime(p.start)} – {formatArabicTime(p.end)}
                              <button onClick={() => removePeriod(p.id, day.weekday)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)', padding: 0 }}><Icon name="x" size={13} /></button>
                            </span>
                          ))}
                          {addingFor !== day.weekday && (
                            <button onClick={() => setAddingFor(day.weekday)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: 'var(--teal-700)', background: 'var(--brand-subtle)', border: '1px dashed var(--brand-border)', padding: '6px 10px', borderRadius: 999, cursor: 'pointer' }}>
                              <Icon name="plus" size={12} />فترة
                            </button>
                          )}
                        </div>
                        {addingFor === day.weekday && (
                          <AddPeriodInline onAdd={(start, end) => handleAddPeriod(day.weekday, start, end)} onCancel={() => setAddingFor(null)} />
                        )}
                        {day.periods.length === 0 && addingFor !== day.weekday && <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>لا توجد فترات — أضف فترة.</span>}
                      </>
                    ) : (
                      <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>يوم إجازة</span>
                    )}
                  </div>
                  <div style={{ flex: '0 0 auto', paddingTop: 3 }}><Toggle on={day.active} onClick={() => toggleDay(day.weekday, !day.active)} /></div>
                </div>
              ))}
            </div>
          </Card2>
        </div>
      )}

      {!loading && (
        <Card2 style={{ marginTop: 20 }}>
          <SectionTitle sub={`${appointments.length} كشف إجمالاً`}>سجل الكشوفات</SectionTitle>
          {appointments.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>لا توجد كشوفات لهذا الطبيب بعد.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                <thead>
                  <tr>
                    {['العميل', 'الخدمة', 'التاريخ', 'الوقت', 'السعر', 'الحالة'].map(h => (
                      <th key={h} style={{ textAlign: 'start', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...appointments].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).map(a => (
                    <tr key={a.id}>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--border-subtle)', fontFamily: font, fontWeight: 700, fontSize: 13, color: 'var(--text-strong)' }}>{a.customer}</td>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--border-subtle)', fontSize: 13, color: 'var(--text-body)' }}>{a.service || '—'}</td>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--border-subtle)', fontSize: 13, color: 'var(--text-body)' }}>{a.date}</td>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--border-subtle)', fontSize: 13, color: 'var(--text-body)' }}>{formatArabicTime(a.time)}</td>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--border-subtle)', fontSize: 13, color: 'var(--text-body)' }}>{a.price != null ? `${a.price} ج` : '—'}</td>
                      <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--border-subtle)' }}><StatusPill status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card2>
      )}
    </div>
  );
}

function BranchAvailabilityPanel({ branch, onBack }) {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingFor, setAddingFor] = useState(null); // weekday index

  useEffect(() => {
    getBranchSchedule(branch.id)
      .then(setSchedule)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [branch.id]);

  const toggleDay = (weekday, active) => {
    setSchedule(sch => sch.map(d => d.weekday === weekday ? { ...d, active } : d));
    setError('');
    setBranchDayActive(branch.id, weekday, active).catch(e => setError(e.message || 'تعذّر الحفظ.'));
  };

  const removePeriod = (periodId, weekday) => {
    setSchedule(sch => sch.map(d => d.weekday === weekday ? { ...d, periods: d.periods.filter(p => p.id !== periodId) } : d));
    setError('');
    deleteBranchSchedulePeriod(periodId).catch(e => setError(e.message || 'تعذّر الحذف.'));
  };

  const handleAddPeriod = async (weekday, start, end) => {
    setError('');
    try {
      const p = await addBranchSchedulePeriod(branch.id, weekday, start, end);
      setSchedule(sch => sch.map(d => d.weekday === weekday ? { ...d, periods: [...d.periods, { id: p.id, start, end }].sort((a, b) => a.start.localeCompare(b.start)) } : d));
      setAddingFor(null);
    } catch (e) {
      setError(e.message || 'تعذّر إضافة الفترة.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 11, border: '1px solid var(--border-subtle)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="chevron-right" size={18} color="var(--text-body)" /></button>
        <Ring2 icon="map-pin" />
        <div>
          <div style={{ fontFamily: font, fontWeight: 800, fontSize: 17, color: 'var(--text-strong)' }}>أوقات عمل الفرع · {branch.name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{branch.address}</div>
        </div>
      </div>

      {error && <div style={{ marginBottom: 16 }}><Alert tone="danger">{error}</Alert></div>}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>جارِ التحميل…</div>
      ) : (
        <Card2>
          <SectionTitle sub="حدد الأيام والساعات التي يفتح فيها هذا الفرع">جدول الأسبوع</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {schedule.map(day => (
              <div key={day.weekday} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ width: 70, flex: '0 0 auto', fontFamily: font, fontWeight: 700, fontSize: 13.5, color: 'var(--text-strong)', paddingTop: 6 }}>{day.label}</div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {day.active ? (
                    <>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {day.periods.map(p => (
                          <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-body)', background: 'var(--surface-page)', border: '1px solid var(--border-subtle)', padding: '6px 10px', borderRadius: 999 }}>
                            {formatArabicTime(p.start)} – {formatArabicTime(p.end)}
                            <button onClick={() => removePeriod(p.id, day.weekday)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)', padding: 0 }}><Icon name="x" size={13} /></button>
                          </span>
                        ))}
                        {addingFor !== day.weekday && (
                          <button onClick={() => setAddingFor(day.weekday)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: 'var(--teal-700)', background: 'var(--brand-subtle)', border: '1px dashed var(--brand-border)', padding: '6px 10px', borderRadius: 999, cursor: 'pointer' }}>
                            <Icon name="plus" size={12} />فترة
                          </button>
                        )}
                      </div>
                      {addingFor === day.weekday && (
                        <AddPeriodInline onAdd={(start, end) => handleAddPeriod(day.weekday, start, end)} onCancel={() => setAddingFor(null)} />
                      )}
                      {day.periods.length === 0 && addingFor !== day.weekday && <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>لا توجد فترات — أضف فترة.</span>}
                    </>
                  ) : (
                    <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>يوم إجازة</span>
                  )}
                </div>
                <div style={{ flex: '0 0 auto', paddingTop: 3 }}><Toggle on={day.active} onClick={() => toggleDay(day.weekday, !day.active)} /></div>
              </div>
            ))}
          </div>
        </Card2>
      )}
    </div>
  );
}

function DoctorsTab() {
  const [doctors, setDoctors] = useState([]);
  const [branches, setBranches] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedBranchId, setSelectedBranchId] = useState(null);

  useEffect(() => {
    Promise.all([listDoctors(), listAllAppointments(), listBranches()])
      .then(([d, a, b]) => { setDoctors(d); setAppointments(a); setBranches(b); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const selected = doctors.find(d => d.id === selectedId);
  if (selectedId && selected) {
    return <DoctorAvailabilityPanel doctor={selected} appointments={appointments.filter(a => a.doctorId === selectedId)} onBack={() => setSelectedId(null)} />;
  }

  const selectedBranch = branches.find(b => b.id === selectedBranchId);
  if (selectedBranchId && selectedBranch) {
    return <BranchAvailabilityPanel branch={selectedBranch} onBack={() => setSelectedBranchId(null)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: font, fontWeight: 800, fontSize: 17, color: 'var(--text-strong)' }}>فريق الأطباء</div>
        </div>

        {error && <div style={{ marginBottom: 16 }}><Alert tone="danger">{error}</Alert></div>}
        {loading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>جارِ التحميل…</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {doctors.map(d => {
            const doctorAppointments = appointments.filter(a => a.doctorId === d.id && a.status !== 'cancelled');
            return (
            <Card2 key={d.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Avatar name={d.name} size="lg" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: font, fontWeight: 800, fontSize: 16, color: 'var(--text-strong)' }}>{d.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{d.specialty}{d.branch?.name ? ` · ${d.branch.name}` : ''}</div>
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: d.active ? 'var(--green-600)' : 'var(--gray-500)', background: d.active ? 'var(--green-50)' : 'var(--surface-sunken)', padding: '5px 12px', borderRadius: 999 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.active ? 'var(--green-500)' : 'var(--gray-400)' }} />{d.active ? 'نشط' : 'موقوف'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, fontSize: 12.5, fontWeight: 700, color: 'var(--teal-700)', background: 'var(--brand-subtle)', padding: '7px 12px', borderRadius: 12, width: 'fit-content' }}>
                <Icon name="stethoscope" size={13} color="var(--brand)" />{doctorAppointments.length} كشف
              </div>
              <button onClick={() => setSelectedId(d.id)} style={{ marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 0', borderRadius: 999, border: '1.5px solid var(--brand-border)', background: 'var(--brand-subtle)', color: 'var(--teal-700)', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 13.5 }}>
                <Icon name="calendar-clock" size={16} />إدارة المواعيد المتاحة
              </button>
            </Card2>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: font, fontWeight: 800, fontSize: 17, color: 'var(--text-strong)' }}>الفروع</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginInlineStart: 10 }}>حدد أوقات عمل كل فرع</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {branches.map(b => (
            <Card2 key={b.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Ring2 icon="map-pin" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: font, fontWeight: 800, fontSize: 16, color: 'var(--text-strong)' }}>{b.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{b.address}</div>
                </div>
              </div>
              <button onClick={() => setSelectedBranchId(b.id)} style={{ marginTop: 14, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 0', borderRadius: 999, border: '1.5px solid var(--brand-border)', background: 'var(--brand-subtle)', color: 'var(--teal-700)', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 13.5 }}>
                <Icon name="calendar-clock" size={16} />إدارة أوقات العمل
              </button>
            </Card2>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Accounting ----------
function AccountingTab() {
  const t = AS.accTotals;
  const cards = [['إيراد اليوم', t.today + ' ج', 'coins', 'var(--brand)'], ['إيراد الشهر', t.month + ' ج', 'trending-up', 'var(--green-500)'], ['فواتير مدفوعة', t.paidCount, 'check-circle', 'var(--blue-500)'], ['قيد التحصيل', t.pendingCount, 'clock', 'var(--amber-600)']];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        {cards.map(([l, v, ic, tone]) => (
          <Card2 key={l} pad={18}>
            <Ring2 icon={ic} tone={tone} size={40} />
            <div style={{ fontFamily: font, fontWeight: 900, fontSize: 24, color: 'var(--text-strong)', marginTop: 12 }}>{v}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{l}</div>
          </Card2>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 20, alignItems: 'start' }}>
        <Card2>
          <SectionTitle sub="حسب الخدمة">توزيع الإيراد</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            {AS.revenueByService.map(r => (
              <div key={r.name}>
                <div style={{ display: 'flex', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ fontFamily: font, fontWeight: 700, color: 'var(--text-strong)' }}>{r.name}</span>
                  <span style={{ marginInlineStart: 'auto', color: 'var(--text-muted)' }}>{r.amount} ج</span>
                </div>
                <div style={{ height: 10, borderRadius: 999, background: 'var(--surface-sunken)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: r.value + '%', background: 'linear-gradient(90deg,var(--teal-500),var(--teal-400))', borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </Card2>
        <Card2 pad={0} style={{ overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px 12px', fontFamily: font, fontWeight: 800, fontSize: 17, color: 'var(--text-strong)' }}>أحدث الفواتير</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead><tr style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'start' }}>
              {['رقم', 'العميل', 'الخدمة', 'الطريقة', 'المبلغ', 'الحالة'].map(h => <th key={h} style={{ textAlign: 'start', fontWeight: 600, padding: '10px 22px', borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {AS.invoices.map(inv => (
                <tr key={inv.id}>
                  <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)', fontFamily: font, fontWeight: 700, color: 'var(--text-muted)' }}>{inv.id}</td>
                  <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)', fontFamily: font, fontWeight: 700, color: 'var(--text-strong)' }}>{inv.customer}</td>
                  <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-body)' }}>{inv.service}</td>
                  <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-body)' }}>{inv.method}</td>
                  <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)', fontFamily: font, fontWeight: 800, color: 'var(--text-strong)' }}>{inv.amount} ج</td>
                  <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)' }}><StatusPill status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card2>
      </div>
    </div>
  );
}

// ---------- Customers ----------
function CustomerEditModal({ customer, onClose, onSaved }) {
  const [name, setName] = useState(customer.name || '');
  const [phone, setPhone] = useState(toLocalPhone(customer.phone));
  const [email, setEmail] = useState(customer.email || '');
  const [status, setStatus] = useState(customer.status || 'active');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const storedPhone = toStoredPhone(phone);
    if (!storedPhone) { setError('رقم الهاتف غير صحيح. استخدم صيغة مصرية مثل 01xxxxxxxxx.'); return; }
    setSaving(true);
    setError('');
    try {
      const updated = await updateCustomer(customer.id, { name: name.trim(), phone: storedPhone, email: email.trim() || null, status });
      onSaved(updated);
    } catch (e) {
      setError(e.message || 'تعذّر حفظ التعديلات.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(6,60,60,.34)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
      <div style={{ width: 480, maxHeight: '100%', overflowY: 'auto', background: '#fff', borderRadius: 22, boxShadow: '0 40px 80px -20px rgba(0,0,0,.4)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center' }}>
          <div style={{ fontFamily: font, fontWeight: 800, fontSize: 19, color: 'var(--text-strong)' }}>تعديل بيانات العميل</div>
          <button onClick={onClose} style={{ marginInlineStart: 'auto', width: 38, height: 38, borderRadius: 11, border: '1px solid var(--border-subtle)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={19} color="var(--text-body)" /></button>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="الاسم"><Input iconStart="user-round" value={name} onChange={e => setName(e.target.value)} /></Field>
            <Field label="رقم الهاتف"><Input iconStart="phone" value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" /></Field>
            <Field label="البريد الإلكتروني (اختياري)"><Input iconStart="mail" value={email} onChange={e => setEmail(e.target.value)} /></Field>
            <div>
              <div style={{ fontFamily: font, fontWeight: 700, fontSize: 13.5, color: 'var(--text-strong)', marginBottom: 9 }}>الحالة</div>
              <div style={{ display: 'flex', gap: 9 }}>
                {[['active', 'نشط'], ['suspended', 'موقوف']].map(([id, label]) => (
                  <button key={id} onClick={() => setStatus(id)} style={{ flex: 1, padding: '11px 0', borderRadius: 12, fontFamily: font, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', background: status === id ? 'var(--brand)' : 'var(--white)', border: status === id ? '2px solid var(--brand)' : '1.5px solid var(--border-subtle)', color: status === id ? '#fff' : 'var(--text-body)' }}>{label}</button>
                ))}
              </div>
            </div>
          </div>
          {error && <div style={{ marginTop: 14 }}><Alert tone="danger">{error}</Alert></div>}
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button onClick={onClose} style={{ flex: '0 0 auto', padding: '13px 22px', borderRadius: 999, border: '1.5px solid var(--border-default)', background: '#fff', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 14, color: 'var(--text-body)' }}>إلغاء</button>
            <button disabled={!name.trim() || !phone.trim() || saving} onClick={handleSave} style={{ flex: 1, padding: '13px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--brand)', color: '#fff', fontFamily: font, fontWeight: 800, fontSize: 15, boxShadow: 'var(--shadow-brand)', opacity: (!name.trim() || !phone.trim() || saving) ? 0.5 : 1 }}>{saving ? 'جارِ الحفظ…' : 'حفظ التعديلات'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const CUSTOMER_FILTERS = [['all', 'الكل'], ['booked', 'لديهم حجوزات'], ['leads', 'عملاء محتملون']];

function CustomersTab({ appointments }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [custFilter, setCustFilter] = useState('all');
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    listCustomersDetailed()
      .then(setCustomers)
      .catch(e => setError(e.message || 'تعذّر تحميل العملاء.'))
      .finally(() => setLoading(false));
  }, []);

  // Per-customer stats derived from the appointments already loaded for the dashboard.
  const statsByCustomer = {};
  appointments.forEach(a => {
    if (!a.customerId) return; // guest bookings (no linked account) aren't in the customers directory
    const s = statsByCustomer[a.customerId] || { total: 0, upcoming: 0, cancelled: 0, branches: {}, services: {} };
    s.total += 1;
    if (a.status !== 'cancelled') {
      const today = new Date().toISOString().slice(0, 10);
      if (a.date >= today) s.upcoming += 1;
    } else {
      s.cancelled += 1;
    }
    if (a.branch) s.branches[a.branch] = (s.branches[a.branch] || 0) + 1;
    if (a.service) s.services[a.service] = (s.services[a.service] || 0) + 1;
    statsByCustomer[a.customerId] = s;
  });

  const mainBranch = id => {
    const s = statsByCustomer[id];
    if (!s) return '—';
    const sorted = Object.entries(s.branches).sort((a, b) => b[1] - a[1]);
    return sorted.length ? sorted[0][0] : '—';
  };

  const servicesTaken = id => Object.keys(statsByCustomer[id]?.services || {});
  const isLead = id => !statsByCustomer[id]?.total;
  const leadsCount = customers.filter(c => isLead(c.id)).length;

  const filtered = customers
    .filter(c => {
      if (!search.trim()) return true;
      const q = search.trim();
      return (c.name || '').includes(q) || (c.phone || '').includes(q);
    })
    .filter(c => {
      if (custFilter === 'booked') return !isLead(c.id);
      if (custFilter === 'leads') return isLead(c.id);
      return true;
    });

  return (
    <div style={{ position: 'relative' }}>
      <Card2 pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: font, fontWeight: 800, fontSize: 17, color: 'var(--text-strong)' }}>كل العملاء</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{customers.length} عميل مسجّل{leadsCount > 0 ? ` · ${leadsCount} عميل محتمل لم يحجز بعد` : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {CUSTOMER_FILTERS.map(([id, label]) => (
              <span key={id} onClick={() => setCustFilter(id)} style={{ fontSize: 12.5, fontWeight: 700, padding: '6px 13px', borderRadius: 999, cursor: 'pointer', background: custFilter === id ? 'var(--brand-subtle)' : 'transparent', color: custFilter === id ? 'var(--teal-700)' : 'var(--text-muted)', border: custFilter === id ? '1px solid var(--brand-border)' : '1px solid transparent', whiteSpace: 'nowrap' }}>{label}</span>
            ))}
          </div>
          <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-page)', border: '1px solid var(--border-subtle)', borderRadius: 999, padding: '9px 16px', width: 240 }}>
            <Icon name="search" size={16} color="var(--text-muted)" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الهاتف…"
              style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-body)', width: '100%' }} />
          </div>
        </div>

        {error && <div style={{ padding: '14px 22px 0' }}><Alert tone="danger">{error}</Alert></div>}
        {loading && <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>جارِ التحميل…</div>}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>لا يوجد عملاء بعد.</div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'start' }}>
                {['العميل', 'رقم الهاتف', 'عميل منذ', 'الخدمات', 'إجمالي الحجوزات', 'قادمة', 'الفرع الأساسي', 'الحالة', ''].map(h => (
                  <th key={h} style={{ textAlign: 'start', fontWeight: 600, padding: '10px 22px', borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const s = statsByCustomer[c.id];
                const services = servicesTaken(c.id);
                return (
                  <tr key={c.id}>
                    <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={c.name || 'عميل'} />
                        <span style={{ fontFamily: font, fontWeight: 700, color: 'var(--text-strong)' }}>{c.name || 'بدون اسم'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-body)' }} dir="ltr">{toLocalPhone(c.phone)}</td>
                    <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }) : '—'}
                    </td>
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
                    <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-body)' }}>{mainBranch(c.id)}</td>
                    <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: c.status === 'active' ? 'var(--green-600)' : 'var(--gray-500)', background: c.status === 'active' ? 'var(--green-50)' : 'var(--surface-sunken)', padding: '5px 12px', borderRadius: 999 }}>{c.status === 'active' ? 'نشط' : 'موقوف'}</span>
                    </td>
                    <td style={{ padding: '13px 22px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <button onClick={() => setEditing(c)} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border-default)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="pencil" size={15} color="var(--text-body)" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card2>
      {editing && (
        <CustomerEditModal
          customer={editing}
          onClose={() => setEditing(null)}
          onSaved={updated => {
            setCustomers(list => list.map(c => c.id === updated.id ? updated : c));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

// ---------- Staff ----------
function RoleBadge({ roleName }) {
  // Accepts either a role id ('reception', from real DB rows) or a display name
  // ('موظف استقبال', from the local-only add-staff form).
  const role = AS.roles.find(r => r.id === roleName || r.name === roleName);
  const color = role ? role.color : 'var(--gray-500)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800, color, background: `color-mix(in srgb, ${color} 12%, white)`, padding: '4px 11px', borderRadius: 999 }}>
      <Icon name="shield" size={11} />{role ? role.name : roleName}
    </span>
  );
}

function AddStaffModal({ branches, roleNames, onClose, onSave }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [branch, setBranch] = useState(branches[0]);
  const [role, setRole] = useState(roleNames[0]);
  const canSave = name && email && phone;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(6,60,60,.34)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
      <div style={{ width: 540, maxHeight: '100%', overflowY: 'auto', background: '#fff', borderRadius: 22, boxShadow: '0 40px 80px -20px rgba(0,0,0,.4)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: font, fontWeight: 800, fontSize: 19, color: 'var(--text-strong)' }}>إضافة موظف</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>أضف عضو فريق جديد وحدد دوره وصلاحياته</div>
          </div>
          <button onClick={onClose} style={{ marginInlineStart: 'auto', width: 38, height: 38, borderRadius: 11, border: '1px solid var(--border-subtle)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={19} color="var(--text-body)" /></button>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="الاسم الكامل"><Input iconStart="user-round" value={name} onChange={e => setName(e.target.value)} placeholder="مثال: مريم فتحي" /></Field>
            <Field label="الدور / الصلاحية">
              <Select value={role} onChange={e => setRole(e.target.value)}>
                {roleNames.map(r => <option key={r} value={r}>{r}</option>)}
              </Select>
            </Field>
            <Field label="البريد الإلكتروني"><Input iconStart="mail" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@meaad.sa" /></Field>
            <Field label="رقم الهاتف"><Input iconStart="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+20 1xx xxx xxxx" /></Field>
            <Field label="الفرع" style={{ gridColumn: '1 / -1' }}>
              <Select value={branch} onChange={e => setBranch(e.target.value)}>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </Select>
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button onClick={onClose} style={{ flex: '0 0 auto', padding: '13px 22px', borderRadius: 999, border: '1.5px solid var(--border-default)', background: '#fff', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 14, color: 'var(--text-body)' }}>إلغاء</button>
            <button disabled={!canSave} onClick={() => onSave({ id: 's-' + Date.now(), name, email, phone, branch, role, status: 'active' })} style={{ flex: 1, padding: '13px', borderRadius: 999, border: 'none', cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.45, background: 'var(--brand)', color: '#fff', fontFamily: font, fontWeight: 800, fontSize: 15, boxShadow: canSave ? 'var(--shadow-brand)' : 'none' }}>إضافة الموظف</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StaffTab() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const branches = AS.branches.map(b => b.name);
  const roleNames = AS.roles.map(r => r.name);

  useEffect(() => {
    listStaff()
      .then(rows => setStaff(rows.length ? rows : AS.staff))
      .catch(e => { setError(e.message); setStaff(AS.staff); })
      .finally(() => setLoading(false));
  }, []);

  const toggleStatus = async (s) => {
    const next = s.status === 'active' ? 'suspended' : 'active';
    setStaff(list => list.map(x => x.id === s.id ? { ...x, status: next } : x));
    try {
      // Real DB rows have a uuid id; locally-added demo rows (id starts with 's') aren't persisted.
      if (!String(s.id).startsWith('s')) await setStaffStatus(s.id, next);
    } catch (e) {
      setError(e.message || 'تعذّر تحديث حالة الموظف.');
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <Card2 pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: font, fontWeight: 800, fontSize: 17, color: 'var(--text-strong)' }}>فريق العمل</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{staff.length} أعضاء عبر كل الفروع</div>
          </div>
          <button onClick={() => setShowAdd(true)} style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--brand)', color: '#fff', fontFamily: font, fontWeight: 800, fontSize: 13.5, boxShadow: 'var(--shadow-brand)' }}>
            <Icon name="user-plus" size={17} color="#fff" stroke={2.5} />إضافة موظف
          </button>
        </div>
        {error && <div style={{ padding: '12px 22px 0' }}><Alert tone="danger">{error}</Alert></div>}
        <div style={{ padding: '8px 22px 18px' }}>
          {loading && <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>جارِ التحميل…</div>}
          {!loading && staff.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', opacity: s.status === 'suspended' ? 0.55 : 1 }}>
              <Avatar name={s.name} />
              <div style={{ flex: 1, minWidth: 170 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: font, fontWeight: 800, fontSize: 14.5, color: 'var(--text-strong)' }}>{s.name}</span>
                  <RoleBadge roleName={s.role} />
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>{s.email ? `${s.email} · ` : ''}{toLocalPhone(s.phone)}</div>
              </div>
              <span style={{ fontSize: 12.5, color: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="map-pin" size={13} color="var(--text-muted)" />{s.branch}</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: s.status === 'active' ? 'var(--green-600)' : 'var(--gray-500)', background: s.status === 'active' ? 'var(--green-50)' : 'var(--surface-sunken)', padding: '5px 12px', borderRadius: 999 }}>{s.status === 'active' ? 'نشط' : 'موقوف'}</span>
              <button onClick={() => toggleStatus(s)} style={{ width: 36, height: 36, borderRadius: 11, border: '1px solid var(--border-default)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={s.status === 'active' ? 'user-x' : 'user-check'} size={16} color="var(--text-body)" />
              </button>
            </div>
          ))}
        </div>
      </Card2>
      {showAdd && (
        <AddStaffModal branches={branches} roleNames={roleNames} onClose={() => setShowAdd(false)} onSave={s => { setStaff(list => [...list, s]); setShowAdd(false); }} />
      )}
    </div>
  );
}

// ---------- Permissions ----------
// Owner is deliberately excluded — they have full, unconditional access and
// aren't a role you toggle permissions for.
const FIXED_ROLE_ORDER = ['admin', 'reception', 'viewer'];

function PermissionsTab() {
  const [roles, setRoles] = useState(AS.roles);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [busyModule, setBusyModule] = useState('');
  const [addingRole, setAddingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [busyRole, setBusyRole] = useState('');

  const refetch = () => listRolesWithPermissions().then(rows => { if (rows.length) setRoles(rows); }).catch(e => setError(e.message));

  useEffect(() => { refetch(); }, []);

  // Known roles keep their fixed left-to-right order; any custom roles an admin
  // added (e.g. "سكرتيرة") are appended after them, in the order they came back.
  const orderedRoles = [
    ...FIXED_ROLE_ORDER.map(id => roles.find(r => r.id === id)).filter(Boolean),
    ...roles.filter(r => r.id !== 'owner' && !FIXED_ROLE_ORDER.includes(r.id)),
  ];

  const handleAddRole = async () => {
    const name = newRoleName.trim();
    if (!name || roles.some(r => r.name === name)) return;
    setBusyRole('new');
    setError('');
    try {
      await addRole(name);
      await refetch();
      setNewRoleName('');
      setAddingRole(false);
    } catch (e) {
      setError(e.message || 'تعذّر إضافة الدور.');
    } finally {
      setBusyRole('');
    }
  };

  const handleDeleteRole = async roleId => {
    setBusyRole(roleId);
    setError('');
    try {
      await deleteRole(roleId);
      await refetch();
    } catch (e) {
      setError(e.message || 'تعذّر حذف الدور.');
    } finally {
      setBusyRole('');
    }
  };

  // Known permissions keep their fixed order/labels from AS.permissionModules; any
  // custom ones an admin added on top (module id doubles as its own label) are appended.
  const knownIds = AS.permissionModules.map(([id]) => id);
  const presentIds = orderedRoles[0] ? Object.keys(orderedRoles[0].permissions) : knownIds;
  const moduleIds = [...knownIds.filter(id => presentIds.includes(id)), ...presentIds.filter(id => !knownIds.includes(id))];
  const moduleLabel = id => AS.permissionModules.find(([mid]) => mid === id)?.[1] || id;

  const toggle = (roleId, moduleId, current) => {
    const next = current === 'full' ? 'none' : 'full';
    setRoles(rs => rs.map(r => r.id === roleId ? { ...r, permissions: { ...r.permissions, [moduleId]: next } } : r));
    setSaved(false);
    setError('');
    setRolePermission(roleId, moduleId, next)
      .then(() => setSaved(true))
      .catch(e => setError(e.message || 'تعذّر حفظ التغيير.'));
  };

  const handleAdd = async () => {
    const label = newLabel.trim();
    if (!label || moduleIds.includes(label)) return;
    setBusyModule(label);
    setError('');
    try {
      await addPermissionModule(label);
      await refetch();
      setNewLabel('');
      setAdding(false);
    } catch (e) {
      setError(e.message || 'تعذّر إضافة الصلاحية.');
    } finally {
      setBusyModule('');
    }
  };

  const handleDelete = async moduleId => {
    setBusyModule(moduleId);
    setError('');
    try {
      await deletePermissionModule(moduleId);
      await refetch();
    } catch (e) {
      setError(e.message || 'تعذّر حذف الصلاحية.');
    } finally {
      setBusyModule('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card2 pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: font, fontWeight: 800, fontSize: 17, color: 'var(--text-strong)' }}>مصفوفة الصلاحيات</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>فعّل أو ألغِ وصول كل دور لكل صلاحية — المالك غير مدرج هنا لأن صلاحياته كاملة دائماً</div>
          </div>
          {!addingRole && (
            <button onClick={() => setAddingRole(true)} style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 999, border: '1.5px solid var(--border-default)', background: '#fff', color: 'var(--text-body)', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 13 }}>
              <Icon name="user-plus" size={15} />إضافة دور
            </button>
          )}
          {!adding && (
            <button onClick={() => setAdding(true)} style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 999, border: '1.5px solid var(--brand-border)', background: 'var(--brand-subtle)', color: 'var(--teal-700)', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 13 }}>
              <Icon name="plus" size={15} />إضافة صلاحية
            </button>
          )}
        </div>
        {addingRole && (
          <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface-page)' }}>
            <input autoFocus value={newRoleName} onChange={e => setNewRoleName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddRole()}
              placeholder="اسم الدور الجديد — مثال: سكرتيرة" style={{ flex: 1, padding: '10px 14px', borderRadius: 11, border: '1.5px solid var(--border-subtle)', fontFamily: font, fontSize: 13.5, color: 'var(--text-strong)' }} />
            <button onClick={handleAddRole} disabled={!newRoleName.trim() || busyRole === 'new'} style={{ padding: '10px 18px', borderRadius: 999, border: 'none', background: 'var(--brand)', color: '#fff', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 13, opacity: !newRoleName.trim() ? 0.5 : 1 }}>إضافة</button>
            <button onClick={() => { setAddingRole(false); setNewRoleName(''); }} style={{ padding: '10px 16px', borderRadius: 999, border: '1.5px solid var(--border-default)', background: '#fff', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 13, color: 'var(--text-body)' }}>إلغاء</button>
          </div>
        )}
        {adding && (
          <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface-page)' }}>
            <input autoFocus value={newLabel} onChange={e => setNewLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="اسم الصلاحية الجديدة" style={{ flex: 1, padding: '10px 14px', borderRadius: 11, border: '1.5px solid var(--border-subtle)', fontFamily: font, fontSize: 13.5, color: 'var(--text-strong)' }} />
            <button onClick={handleAdd} disabled={!newLabel.trim() || busyModule === newLabel.trim()} style={{ padding: '10px 18px', borderRadius: 999, border: 'none', background: 'var(--brand)', color: '#fff', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 13, opacity: !newLabel.trim() ? 0.5 : 1 }}>إضافة</button>
            <button onClick={() => { setAdding(false); setNewLabel(''); }} style={{ padding: '10px 16px', borderRadius: 999, border: '1.5px solid var(--border-default)', background: '#fff', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 13, color: 'var(--text-body)' }}>إلغاء</button>
          </div>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 660 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'start', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', padding: '10px 22px', borderBottom: '1px solid var(--border-subtle)' }}>الصلاحية</th>
                {orderedRoles.map(r => (
                  <th key={r.id} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.color }} />{r.name}
                      {!FIXED_ROLE_ORDER.includes(r.id) && (
                        <button onClick={() => handleDeleteRole(r.id)} disabled={busyRole === r.id} title="حذف الدور" style={{ width: 20, height: 20, borderRadius: 7, border: 'none', background: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: busyRole === r.id ? 0.4 : 1 }}>
                          <Icon name="x" size={12} color="var(--red-500)" />
                        </button>
                      )}
                    </span>
                  </th>
                ))}
                <th style={{ width: 44, borderBottom: '1px solid var(--border-subtle)' }} />
              </tr>
            </thead>
            <tbody>
              {moduleIds.map(moduleId => (
                <tr key={moduleId}>
                  <td style={{ padding: '12px 22px', borderBottom: '1px solid var(--border-subtle)', fontFamily: font, fontWeight: 700, fontSize: 13.5, color: 'var(--text-strong)' }}>{moduleLabel(moduleId)}</td>
                  {orderedRoles.map(r => (
                    <td key={r.id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                      <Toggle on={r.permissions[moduleId] === 'full'} onClick={() => toggle(r.id, moduleId, r.permissions[moduleId])} />
                    </td>
                  ))}
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                    <button onClick={() => handleDelete(moduleId)} disabled={busyModule === moduleId} title="حذف الصلاحية" style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid var(--border-subtle)', background: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: busyModule === moduleId ? 0.5 : 1 }}>
                      <Icon name="trash-2" size={14} color="var(--red-500)" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>يُحفَظ كل تغيير تلقائياً فور اختياره.</span>
          {saved && <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--green-600)', fontSize: 13 }}><Icon name="check-circle" size={15} />تم الحفظ</span>}
          {error && <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red-600)', fontSize: 13 }}><Icon name="circle-alert" size={15} />{error}</span>}
        </div>
      </Card2>
    </div>
  );
}

// ---------- shell ----------
function AdminDashboard({ initialTab = 'agenda' }) {
  const [tab, setTab] = useState(initialTab);
  const [modal, setModal] = useState(null);
  const [showAddAppt, setShowAddAppt] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [apptsLoading, setApptsLoading] = useState(true);
  const [apptsError, setApptsError] = useState('');
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(null);

  const refetchAppointments = () => {
    setApptsLoading(true);
    listAllAppointments()
      .then(rows => { setAppointments(rows); setApptsError(''); })
      .catch(e => setApptsError(e.message || 'تعذّر تحميل المواعيد.'))
      .finally(() => setApptsLoading(false));
  };

  useEffect(() => {
    refetchAppointments();
    listBranches().then(setBranches).catch(() => {});
  }, []);

  const visibleAppointments = selectedBranchId ? appointments.filter(a => a.branchId === selectedBranchId) : appointments;

  return (
    <div style={{ position: 'relative', display: 'flex', height: '100%', background: 'var(--surface-page)', fontFamily: body, direction: 'rtl', overflow: 'hidden' }}>
      <Rail tab={tab} setTab={setTab} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar
          tab={tab}
          onAdd={() => setShowAddAppt(true)}
          branches={branches}
          selectedBranchId={selectedBranchId}
          onSelectBranch={setSelectedBranchId}
          onBranchAdded={b => setBranches(bs => [...bs, b].sort((x, y) => x.name.localeCompare(y.name, 'ar')))}
        />
        <div style={{ flex: 1, overflowY: 'auto', padding: 26 }}>
          {tab === 'agenda' && <AgendaTab appointments={visibleAppointments} loading={apptsLoading} error={apptsError} onEdit={setModal} />}
          {tab === 'availability' && <DoctorsTab />}
          {tab === 'customers' && <CustomersTab appointments={appointments} />}
          {tab === 'reminders' && <RemindersTab />}
          {tab === 'accounting' && <AccountingTab />}
          {tab === 'staff' && <StaffTab />}
          {tab === 'permissions' && <PermissionsTab />}
        </div>
      </div>
      {modal && <AppointmentModal appt={modal} onClose={() => setModal(null)} onSaved={refetchAppointments} />}
      {showAddAppt && (
        <AddAppointmentModal
          onClose={() => setShowAddAppt(false)}
          onCreated={() => { setShowAddAppt(false); refetchAppointments(); }}
        />
      )}
    </div>
  );
}

export default AdminDashboard;
