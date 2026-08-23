// ميعاد — Admin "مركز التحكم" (command center) concept. Desktop dashboard, RTL.
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MeaadStory as AS } from '../data.js';
import { useAuth, toLocalPhone } from '../lib/auth/AuthContext.jsx';
import { listAllAppointments, updateAppointmentStatus, updateAppointment, createAppointment, deleteAppointment, isSlotTaken, listTakenTimes } from '../lib/api/appointments.js';
import { listRolesWithPermissions, setRolePermission, listStaff, setStaffStatus, createStaff, listRoles, addPermissionModule, deletePermissionModule, addRole, deleteRole } from '../lib/api/staff.js';
import { listBranches, listDoctors, listCustomers, addBranch, addService, updateService } from '../lib/api/reference.js';
import { getDoctorSchedule, setDayActive, addSchedulePeriod, deleteSchedulePeriod, listDoctorServices, setDoctorService, updateDoctorSettings, getBranchSchedule, setBranchDayActive, addBranchSchedulePeriod, deleteBranchSchedulePeriod } from '../lib/api/availability.js';
import { formatArabicTime } from '../lib/time.js';
// Shared primitives (Ring2/Toggle/Card2/SectionTitle) used to live here; they moved
// to admin/ui.jsx so the newer sections are built from the same pieces.
import { Ring2, Toggle, Card2, SectionTitle, Btn, IconBtn, ModalShell, font, body } from './admin/ui.jsx';
import InventoryTab from './admin/InventoryTab.jsx';
import PatientsTab from './admin/PatientsTab.jsx';
import VisitModal from './admin/VisitModal.jsx';

const { Icon, Avatar, StatusPill, Field, Select, Alert, Input } = window.MeaadDesignSystem_54b82a;

// Mobile shell (<768px): the fixed-width rail becomes an off-canvas drawer so the
// content can use the full viewport. Desktop keeps the original side-by-side layout —
// every rule below lives inside the media query, and the rail's desktop width/flex sit
// in .admin-rail (not inline) so the drawer rules can override them without !important.
const MOBILE = 768;
const ADMIN_STYLE = `
  .admin-rail { width: 232px; flex: 0 0 auto; }
  .admin-overlay, .admin-menu-btn, .admin-drawer-close { display: none; }

  @media (max-width: ${MOBILE - 1}px) {
    .admin-rail {
      position: fixed;
      top: 0; bottom: 0; right: 0;      /* RTL: drawer slides in from the right */
      box-sizing: border-box;           /* keep 280px the total width, padding included */
      width: 280px;
      max-width: 86vw;
      z-index: 80;
      transform: translateX(100%);
      transition: transform .26s ease;
      box-shadow: -14px 0 34px -14px rgba(0,0,0,.5);
    }
    .admin-rail.is-open { transform: translateX(0); }

    .admin-overlay {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 75;
      background: rgba(6,60,60,.42);
      backdrop-filter: blur(2px);
      opacity: 0;
      pointer-events: none;
      transition: opacity .26s ease;
      border: none;
      padding: 0;
    }
    .admin-overlay.is-open { opacity: 1; pointer-events: auto; }

    .admin-menu-btn, .admin-drawer-close { display: flex; }

    /* !important is required on these: the components set the same properties as
       inline styles, which otherwise win over any stylesheet rule. */
    .admin-topbar { padding: 12px 14px !important; gap: 10px !important; }
    .admin-topbar-title { font-size: 17px !important; }
    .admin-topbar-sub { display: none; }
    .admin-search { display: none !important; }
    .admin-bell { display: none !important; }
    .admin-add-label { display: none; }
    .admin-add-btn { padding: 11px 13px !important; }

    .admin-content { padding: 16px 14px 28px !important; }
    .admin-kpi { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }

    /* Stack the "main list + side panel" layouts and the paired form fields —
       side by side they collapse to unreadable slivers at phone widths. */
    .admin-split { grid-template-columns: 1fr !important; gap: 16px !important; }
    .admin-pair { grid-template-columns: 1fr !important; }

    /* Appointment rows: name/service and the status+confirm controls sat on one
       line, pushing the confirm button off the (RTL) left edge where it couldn't
       be reached. Wrap the controls onto their own full-width line instead. */
    .admin-row-card { flex-wrap: wrap !important; gap: 10px !important; padding: 12px !important; }
    .admin-row-main { flex: 1 1 auto; min-width: 0; }
    .admin-row-actions {
      margin-inline-start: 0 !important;
      flex: 1 0 100%;
      justify-content: space-between;
      border-top: 1px solid var(--border-subtle);
      padding-top: 10px;
    }
    /* Smaller avatar so the name and service line get the width they need. */
    .admin-row-avatar > * { width: 34px !important; height: 34px !important; font-size: 12.5px !important; }

    .admin-modal-backdrop { padding: 12px !important; }
    .admin-modal { width: 100% !important; max-width: 100% !important; }
  }

  @media (prefers-reduced-motion: reduce) {
    .admin-rail, .admin-overlay { transition: none; }
  }
`;

// ---------- sidebar rail ----------
// Fourth entry is the permission module that gates the section; the pre-existing
// sections have none, so they keep behaving exactly as before.
const NAV = [
  ['calendar-days', 'المواعيد', 'agenda'],
  ['calendar-clock', 'المواعيد المتاحة', 'availability'],
  ['users', 'العملاء', 'customers'],
  // سجل المرضى is deliberately its own section, not a tab inside العملاء: the
  // customer account (حجوزات، مدفوعات) and the medical file are separate records
  // with separate permissions, and only the second one is gated here.
  ['folder-heart', 'سجل المرضى', 'patients', 'medical_records_view'],
  ['package', 'المخزون', 'inventory', 'inventory_view'],
  ['wallet', 'الحسابات', 'accounting'],
  ['users-round', 'الموظفون', 'staff'],
  ['shield-check', 'الصلاحيات', 'permissions'],
];
function Rail({ tab, setTab, open, onClose, todayCount = 0 }) {
  const { profile, signOut, can } = useAuth();
  const navigate = useNavigate();
  const initial = (profile?.name || 'م').trim()[0];
  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };
  // On mobile the rail is an overlay drawer, so picking a tab should dismiss it —
  // on desktop onClose is a no-op since the rail is always visible.
  const pick = id => { setTab(id); onClose(); };
  return (
    <nav
      className={`admin-rail${open ? ' is-open' : ''}`}
      aria-label="أقسام مركز التحكم"
      style={{ background: 'linear-gradient(180deg,var(--teal-800),var(--teal-900))', display: 'flex', flexDirection: 'column', padding: '22px 16px', color: '#fff' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 6px 22px' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, fontWeight: 900, fontSize: 20, boxShadow: 'var(--shadow-brand)' }}>م</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: font, fontWeight: 900, fontSize: 20, lineHeight: 1 }}>ميعاد</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 3 }}>مركز التحكم</div>
        </div>
        <button className="admin-drawer-close" onClick={onClose} aria-label="إغلاق القائمة" style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,.12)', color: '#fff', cursor: 'pointer', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
          <Icon name="x" size={17} color="#fff" />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV.filter(([, , , module]) => !module || can(module)).map(([ic, lb, id]) => {
          const on = tab === id;
          return (
            <button key={id} onClick={() => pick(id)} aria-current={on ? 'page' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 13, cursor: 'pointer', border: 'none', textAlign: 'start', fontFamily: font, fontWeight: 700, fontSize: 14.5, transition: 'all .15s', background: on ? 'rgba(255,255,255,.14)' : 'transparent', color: on ? '#fff' : 'rgba(255,255,255,.62)' }}>
              <Icon name={ic} size={20} color={on ? '#fff' : 'rgba(255,255,255,.62)'} />{lb}
              {id === 'agenda' && todayCount > 0 && <span style={{ marginInlineStart: 'auto', fontSize: 11, background: 'var(--amber-500)', color: 'var(--teal-900)', fontWeight: 800, padding: '2px 8px', borderRadius: 999 }}>{todayCount}</span>}
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
    </nav>
  );
}

const TAB_META = {
  // The agenda subtitle is built from today's real date at render time — it used to
  // be a fixed string that read '12 أغسطس 2026' forever.
  agenda: { title: 'مواعيد اليوم', sub: null },
  availability: { title: 'المواعيد المتاحة', sub: 'جدول كل طبيب، خدماته، وإعدادات الحجز' },
  customers: { title: 'العملاء', sub: 'بيانات العملاء وحساباتهم وحجوزاتهم' },
  patients: { title: 'سجل المرضى', sub: 'الملف الطبي لكل مريض — زيارات، أدوية، تحاليل، ومرفقات' },
  inventory: { title: 'إدارة المخزون', sub: 'الأصناف، الكميات، الصلاحيات، وسجل الحركة' },
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

function Topbar({ tab, onAdd, onMenu, branches, selectedBranchId, onSelectBranch, onBranchAdded }) {
  const m = TAB_META[tab];
  const branchName = branches.find(b => b.id === selectedBranchId)?.name;
  const sub = m.sub ?? [
    new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    branchName ?? 'كل الفروع',
  ].join(' · ');
  return (
    <div className="admin-topbar" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 26px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--white)', flex: '0 0 auto' }}>
      <button className="admin-menu-btn" onClick={onMenu} aria-label="فتح القائمة" style={{ width: 42, height: 42, borderRadius: 13, border: '1px solid var(--border-subtle)', background: 'var(--white)', cursor: 'pointer', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
        <Icon name="menu" size={20} color="var(--text-body)" />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="admin-topbar-title" style={{ fontFamily: font, fontWeight: 800, fontSize: 21, color: 'var(--text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
        <div className="admin-topbar-sub" style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{sub}</div>
      </div>
      <div className="admin-search" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-page)', border: '1px solid var(--border-subtle)', borderRadius: 999, padding: '9px 16px', width: 240 }}>
        <Icon name="search" size={17} color="var(--text-muted)" />
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>بحث عن عميل أو موعد…</span>
      </div>
      <button className="admin-bell" style={{ width: 42, height: 42, borderRadius: 13, border: '1px solid var(--border-subtle)', background: 'var(--white)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flex: '0 0 auto' }}>
        <Icon name="bell" size={19} color="var(--text-body)" />
        <span style={{ position: 'absolute', top: 9, insetInlineEnd: 10, width: 8, height: 8, borderRadius: '50%', background: 'var(--amber-500)', border: '2px solid #fff' }} />
      </button>
      <button className="admin-add-btn" onClick={onAdd} aria-label="إضافة موعد" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--brand)', color: '#fff', fontFamily: font, fontWeight: 800, fontSize: 14.5, boxShadow: 'var(--shadow-brand)', flex: '0 0 auto' }}>
        <Icon name="plus" size={19} color="#fff" stroke={2.5} /><span className="admin-add-label">إضافة موعد</span>
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
    <div className="admin-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
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
function AgendaTab({ appointments, loading, error, onEdit, onOpenVisit }) {
  const [filter, setFilter] = useState('all');
  const FILTERS = [['all', 'الكل'], ['confirmed', 'مؤكد'], ['pending', 'قيد الانتظار']];
  const list = filter === 'all' ? appointments : appointments.filter(a => a.status === filter);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <KpiRow appointments={appointments} />
      <div className="admin-split" style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 20, alignItems: 'start' }}>
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
            {!loading && !error && list.map((a, i) => <AgendaRow key={a.id} a={a} last={i === list.length - 1} onEdit={onEdit} onOpenVisit={onOpenVisit} />)}
          </div>
        </Card2>
        <SidePanel appointments={appointments} onEdit={onEdit} />
      </div>
    </div>
  );
}

function AgendaRow({ a, last, onEdit, onOpenVisit }) {
  const cancelled = a.status === 'cancelled';
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 18, width: 66, flex: '0 0 auto' }}>
        <div style={{ fontFamily: font, fontWeight: 800, fontSize: 12.5, color: 'var(--text-body)', whiteSpace: 'nowrap', textAlign: 'center', lineHeight: 1.3 }}>{formatArabicTime(a.time)}</div>
        <div style={{ width: 11, height: 11, borderRadius: '50%', marginTop: 8, background: a.isNew ? 'var(--amber-500)' : cancelled ? 'var(--red-500)' : 'var(--brand)', border: '2px solid #fff', boxShadow: '0 0 0 3px ' + (a.isNew ? 'var(--amber-100)' : 'var(--gray-100)') }} />
        {!last && <div style={{ flex: 1, width: 2, background: 'var(--border-subtle)', marginTop: 4 }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0, margin: '8px 0' }}>
        <div className="admin-row-card" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 14, borderRadius: 16, background: a.isNew ? 'var(--amber-50)' : 'var(--surface-page)', border: a.isNew ? '1.5px solid var(--amber-200)' : '1px solid var(--border-subtle)', opacity: cancelled ? 0.6 : 1 }}>
          <span className="admin-row-avatar"><Avatar name={a.customer} /></span>
          <div className="admin-row-main" style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: font, fontWeight: 800, color: 'var(--text-strong)', fontSize: 15, textDecoration: cancelled ? 'line-through' : 'none' }}>{a.customer}</span>
              {a.isNew && <span style={{ fontSize: 10.5, fontWeight: 800, background: 'var(--amber-500)', color: 'var(--teal-900)', padding: '2px 8px', borderRadius: 999 }}>حجز جديد</span>}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{a.service} · {a.doctor}{a.price != null ? ` · ${a.price} ج` : ''}</div>
            <div style={{ marginTop: 4 }}><CountdownBadge date={a.date} time={a.time} status={a.status} /></div>
          </div>
          <div className="admin-row-actions" style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusPill status={a.status} />
            {/* Opens (or creates) the encounter behind this booking — diagnosis,
                روشتة, تحاليل, أشعة and the supplies it consumed, all against the
                same patient file. */}
            {onOpenVisit && !cancelled && a.patientId && (
              <button onClick={() => onOpenVisit(a)} title="فتح الكشف" aria-label="فتح الكشف" style={{ width: 36, height: 36, borderRadius: 11, border: '1px solid var(--brand-border)', background: 'var(--brand-subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <Icon name="stethoscope" size={16} color="var(--teal-700)" />
              </button>
            )}
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
    <div className="admin-modal-backdrop" style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(6,60,60,.34)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
      <div className="admin-modal" style={{ width: 560, maxHeight: '100%', overflowY: 'auto', background: '#fff', borderRadius: 22, boxShadow: '0 40px 80px -20px rgba(0,0,0,.4)' }}>
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
            <div className="admin-pair" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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

            <div className="admin-pair" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
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
    <div className="admin-modal-backdrop" style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(6,60,60,.34)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
      <div className="admin-modal" style={{ width: 560, maxHeight: '100%', overflowY: 'auto', background: '#fff', borderRadius: 22, boxShadow: '0 40px 80px -20px rgba(0,0,0,.4)' }}>
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
              <div className="admin-pair" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="اسم العميل">
                  <Input iconStart="user-round" placeholder="مثال: أحمد سامي" value={newName} onChange={e => setNewName(e.target.value)} />
                </Field>
                <Field label="رقم الهاتف">
                  <Input iconStart="phone" placeholder="01xx xxx xxxx" value={newPhone} onChange={e => setNewPhone(e.target.value)} dir="ltr" />
                </Field>
              </div>
            )}

            <div className="admin-pair" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
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

            <div className="admin-pair" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
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
        <div className="admin-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 20, alignItems: 'start' }}>
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

        <div className="admin-pair" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
        <div className="admin-pair" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
      <div className="admin-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        {cards.map(([l, v, ic, tone]) => (
          <Card2 key={l} pad={18}>
            <Ring2 icon={ic} tone={tone} size={40} />
            <div style={{ fontFamily: font, fontWeight: 900, fontSize: 24, color: 'var(--text-strong)', marginTop: 12 }}>{v}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{l}</div>
          </Card2>
        ))}
      </div>
      <div className="admin-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 20, alignItems: 'start' }}>
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
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 520 }}>
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
          </div>
        </Card2>
      </div>
    </div>
  );
}

// ---------- Customers & patients ----------
// The العملاء table now lives in admin/PatientsTab.jsx: same columns and filters,
// but sourced from `patients` (which also covers walk-ins) and with each row
// opening the person's full medical file.

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

const MIN_STAFF_PASSWORD = 8;

/** Suggests a password the admin can hand over, rather than making them invent one. */
function suggestPassword() {
  // No lookalike characters (0/O, 1/l) — this gets read aloud or written on paper.
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(10));
  return [...bytes].map(b => alphabet[b % alphabet.length]).join('');
}

function AddStaffModal({ branches, roles, onClose, onSave }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [branchId, setBranchId] = useState('');
  const [role, setRole] = useState(roles[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const passwordTooShort = !!password && password.length < MIN_STAFF_PASSWORD;
  const canSave = !!name.trim() && !!phone.trim() && password.length >= MIN_STAFF_PASSWORD && !!role;

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const staff = await createStaff({ name, phone, email, password, role, branchId });
      onSave(staff, password);
    } catch (e) {
      setError(e.message || 'تعذّر إضافة الموظف.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-modal-backdrop" style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(6,60,60,.34)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
      <div className="admin-modal" style={{ width: 540, maxHeight: '100%', overflowY: 'auto', background: '#fff', borderRadius: 22, boxShadow: '0 40px 80px -20px rgba(0,0,0,.4)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: font, fontWeight: 800, fontSize: 19, color: 'var(--text-strong)' }}>إضافة موظف</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>أنشئ له حساباً بكلمة مرور — يسجّل الدخول برقم هاتفه</div>
          </div>
          <button onClick={onClose} style={{ marginInlineStart: 'auto', width: 38, height: 38, borderRadius: 11, border: '1px solid var(--border-subtle)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={19} color="var(--text-body)" /></button>
        </div>
        <div style={{ padding: 24 }}>
          <div className="admin-pair" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="الاسم الكامل"><Input iconStart="user-round" value={name} onChange={e => setName(e.target.value)} placeholder="مثال: مريم فتحي" /></Field>
            <Field label="الدور / الصلاحية">
              <Select value={role} onChange={e => setRole(e.target.value)}>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </Field>
            <Field label="رقم الهاتف" hint="هذا هو اسم الدخول">
              <Input iconStart="phone" value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" placeholder="01xx xxx xxxx" />
            </Field>
            <Field label="البريد الإلكتروني (اختياري)"><Input iconStart="mail" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" placeholder="example@meaad.sa" /></Field>

            {/* The password the admin hands over. Shown in clear on request — it has
                to be readable to be passed on, and it's about to be told to the
                employee anyway. */}
            <Field
              label="كلمة المرور"
              hint={passwordTooShort ? `${MIN_STAFF_PASSWORD} أحرف على الأقل` : 'سلّمها للموظف — يمكنه تغييرها لاحقاً'}
              style={{ gridColumn: '1 / -1' }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <Input
                  iconStart="lock"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  dir="ltr"
                  placeholder="٨ أحرف على الأقل"
                  style={{ flex: 1, minWidth: 160 }}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} title={showPassword ? 'إخفاء' : 'إظهار'}
                  style={{ width: 44, height: 46, borderRadius: 12, border: '1.5px solid var(--border-default)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={17} color="var(--text-body)" />
                </button>
                <button type="button" onClick={() => { setPassword(suggestPassword()); setShowPassword(true); }}
                  style={{ padding: '0 14px', height: 46, borderRadius: 12, border: '1.5px solid var(--border-default)', background: '#fff', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 12.5, color: 'var(--text-body)', flex: '0 0 auto' }}>
                  توليد
                </button>
              </div>
            </Field>

            <Field label="الفرع (اختياري)" style={{ gridColumn: '1 / -1' }}>
              <Select value={branchId} onChange={e => setBranchId(e.target.value)} placeholder="كل الفروع">
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
          </div>

          {error && <div style={{ marginTop: 14 }}><Alert tone="danger">{error}</Alert></div>}

          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button onClick={onClose} disabled={saving} style={{ flex: '0 0 auto', padding: '13px 22px', borderRadius: 999, border: '1.5px solid var(--border-default)', background: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: font, fontWeight: 700, fontSize: 14, color: 'var(--text-body)' }}>إلغاء</button>
            <button disabled={!canSave || saving} onClick={save} style={{ flex: 1, padding: '13px', borderRadius: 999, border: 'none', cursor: canSave && !saving ? 'pointer' : 'not-allowed', opacity: canSave && !saving ? 1 : 0.45, background: 'var(--brand)', color: '#fff', fontFamily: font, fontWeight: 800, fontSize: 15, boxShadow: canSave && !saving ? 'var(--shadow-brand)' : 'none' }}>
              {saving ? 'جارِ إنشاء الحساب…' : 'إضافة الموظف'}
            </button>
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
  // Real rows now, not the demo lists: a role id and a branch id have to exist in the
  // database for the new account to resolve to anything.
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  // Shown once, right after creation, so the admin can pass the login on.
  const [created, setCreated] = useState(null);   // { staff, password }

  useEffect(() => {
    // No demo fallback: an empty team must read as empty, not as four invented
    // colleagues that vanish on the next reload.
    listStaff()
      .then(setStaff)
      .catch(e => setError(e.message || 'تعذّر تحميل فريق العمل.'))
      .finally(() => setLoading(false));
    listBranches().then(setBranches).catch(() => {});
    listRoles().then(setRoles).catch(() => {});
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
        <AddStaffModal
          branches={branches}
          roles={roles.length ? roles : AS.roles}
          onClose={() => setShowAdd(false)}
          onSave={(s, password) => { setStaff(list => [...list, s]); setShowAdd(false); setCreated({ staff: s, password }); }}
        />
      )}

      {created && (
        <ModalShell
          title="تم إنشاء الحساب"
          sub={`${created.staff.name} يستطيع تسجيل الدخول الآن`}
          onClose={() => setCreated(null)}
          width={440}
        >
          <Alert tone="success">سلّم هذه البيانات للموظف. كلمة المرور لن تظهر مرة أخرى بعد إغلاق هذه النافذة.</Alert>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[['رقم الدخول', toLocalPhone(created.staff.phone)], ['كلمة المرور', created.password]].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, background: 'var(--surface-page)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)', minWidth: 84 }}>{label}</span>
                <code dir="ltr" style={{ flex: 1, fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: 'var(--text-strong)', wordBreak: 'break-all' }}>{value}</code>
                <IconBtn icon="copy" size={34} title={`نسخ ${label}`} onClick={() => navigator.clipboard?.writeText(value)} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 18 }}>
            <Btn size="lg" block onClick={() => setCreated(null)}>تم</Btn>
          </div>
        </ModalShell>
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
// Shown if someone lands on a gated tab their role can't use (deep link, or a
// permission revoked while the dashboard was open). The tables enforce the same
// rule in RLS — this is only the friendly version of the refusal.
function NoAccess() {
  return (
    <Card2>
      <div style={{ padding: '30px 20px', textAlign: 'center' }}>
        <div style={{ width: 54, height: 54, borderRadius: 16, background: 'var(--surface-sunken)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
          <Icon name="lock" size={24} />
        </div>
        <div style={{ fontFamily: font, fontWeight: 800, fontSize: 16, color: 'var(--text-strong)', marginTop: 12 }}>لا تملك صلاحية الوصول لهذا القسم</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13.5, marginTop: 5, lineHeight: 1.7 }}>تواصل مع مدير العيادة لتفعيل الصلاحية من تبويب «الصلاحيات».</div>
      </div>
    </Card2>
  );
}

function AdminDashboard({ initialTab = 'agenda' }) {
  const { can } = useAuth();
  const [tab, setTab] = useState(initialTab);
  const [modal, setModal] = useState(null);
  const [showAddAppt, setShowAddAppt] = useState(false);
  const [visitAppt, setVisitAppt] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [apptsLoading, setApptsLoading] = useState(true);
  const [apptsError, setApptsError] = useState('');
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [navOpen, setNavOpen] = useState(false);

  // Keep the drawer from staying "open" in state once the layout is back on desktop,
  // where the rail is permanently visible and the overlay would just block clicks.
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= MOBILE) setNavOpen(false); };
    const onKey = e => { if (e.key === 'Escape') setNavOpen(false); };
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('keydown', onKey); };
  }, []);

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

  // The badge on المواعيد used to read a hardcoded 24. It's the real count of today's
  // live bookings now, and it disappears when there are none.
  const todayISO = new Date().toISOString().slice(0, 10);
  const todayCount = visibleAppointments.filter(a => a.date === todayISO && a.status !== 'cancelled').length;

  return (
    <div style={{ position: 'relative', display: 'flex', height: '100%', background: 'var(--surface-page)', fontFamily: body, direction: 'rtl', overflow: 'hidden' }}>
      <style>{ADMIN_STYLE}</style>
      <Rail tab={tab} setTab={setTab} open={navOpen} onClose={() => setNavOpen(false)} todayCount={todayCount} />
      <button
        className={`admin-overlay${navOpen ? ' is-open' : ''}`}
        onClick={() => setNavOpen(false)}
        aria-label="إغلاق القائمة"
        tabIndex={navOpen ? 0 : -1}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar
          tab={tab}
          onAdd={() => setShowAddAppt(true)}
          onMenu={() => setNavOpen(true)}
          branches={branches}
          selectedBranchId={selectedBranchId}
          onSelectBranch={setSelectedBranchId}
          onBranchAdded={b => setBranches(bs => [...bs, b].sort((x, y) => x.name.localeCompare(y.name, 'ar')))}
        />
        <div className="admin-content" style={{ flex: 1, overflowY: 'auto', padding: 26 }}>
          {tab === 'agenda' && (
            <AgendaTab
              appointments={visibleAppointments}
              loading={apptsLoading}
              error={apptsError}
              onEdit={setModal}
              onOpenVisit={can('medical_records_manage') ? setVisitAppt : undefined}
            />
          )}
          {tab === 'availability' && <DoctorsTab />}
          {/* Same table, two readings of it: the customers view answers "who books
              and pays", the records view answers "who has a medical file". */}
          {tab === 'customers' && <PatientsTab mode="customers" appointments={appointments} onRefreshAppointments={refetchAppointments} />}
          {tab === 'patients' && (can('medical_records_view')
            ? <PatientsTab mode="records" appointments={appointments} onRefreshAppointments={refetchAppointments} />
            : <NoAccess />)}
          {tab === 'inventory' && (can('inventory_view')
            ? <InventoryTab branchId={selectedBranchId} />
            : <NoAccess />)}
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
      {visitAppt && (
        <VisitModal
          appointmentId={visitAppt.id}
          patient={{ id: visitAppt.patientId, name: visitAppt.customer }}
          defaults={{ doctorId: visitAppt.doctorId, branchId: visitAppt.branchId, date: visitAppt.date, reason: visitAppt.service }}
          onClose={() => setVisitAppt(null)}
        />
      )}
    </div>
  );
}

export default AdminDashboard;
