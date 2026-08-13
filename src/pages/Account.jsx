import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, toLocalPhone } from '../lib/auth/AuthContext.jsx';
import { listMyAppointments, updateAppointment, updateAppointmentStatus, listTakenTimes } from '../lib/api/appointments.js';
import { listMyFeedback, submitFeedback } from '../lib/api/feedback.js';
import { getDoctorSchedule, computeSlotsForDay } from '../lib/api/availability.js';
import { formatArabicTime } from '../lib/time.js';
import Countdown from '../components/Countdown.jsx';

const { Icon, Button, Card, Field, Input, StatusPill, Avatar, Switch, Alert } = window.MeaadDesignSystem_54b82a;
const font = 'var(--font-display)';

const STYLE = `
  body{background:var(--surface-page)}
  .wrap{max-width:1160px;margin:0 auto;padding:0 28px 70px}
  .layout{display:grid;grid-template-columns:280px 1fr;gap:24px;align-items:start}
  .stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .nav-links{display:flex;align-items:center;gap:4px}
  @media (max-width:900px){
    .layout{grid-template-columns:1fr}
    .stats-row{grid-template-columns:1fr}
  }
  @media (max-width:640px){
    .nav-links{display:none}
    .wrap{padding:0 16px 50px}
  }
`;

// Notifications aren't wired to a live feed yet (no read API for the `reminders` table
// built in this pass) — shown as illustrative examples only.
const NOTIFICATIONS = [
  { id: 'n1', kind: 'تأكيد الحجز', channel: 'WhatsApp', icon: 'message-circle', color: 'var(--whatsapp)', time: 'قبل دقائق', status: 'delivered' },
  { id: 'n2', kind: 'تذكير قبل 24 ساعة', channel: 'WhatsApp', icon: 'message-circle', color: 'var(--whatsapp)', time: 'أمس 5:00 مساءً', status: 'delivered' },
];

function StarRating({ value, onChange, size = 22, readOnly }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} disabled={readOnly} onClick={() => onChange?.(n)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: readOnly ? 'default' : 'pointer', display: 'flex' }}>
          <Icon name="star" size={size} color="var(--amber-500)" fill={n <= value ? 'var(--amber-500)' : 'none'} />
        </button>
      ))}
    </div>
  );
}

function groupOf(a) {
  if (a.status === 'cancelled') return 'cancelled';
  const today = new Date().toISOString().slice(0, 10);
  return a.date >= today ? 'upcoming' : 'past';
}

function TopNav({ tab, setTab }) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const links = [['نظرة عامة', 'overview'], ['مواعيدي', 'appointments'], ['الإشعارات', 'notifications'], ['الملف الشخصي', 'profile']];
  const handleLogout = async () => { await signOut(); navigate('/login'); };
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, zIndex: 30 }}>
      <div className="wrap" style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '16px 28px' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, fontWeight: 900, fontSize: 17, boxShadow: 'var(--shadow-brand)' }}>م</div>
          <span style={{ fontFamily: font, fontWeight: 900, fontSize: 18, color: 'var(--text-strong)' }}>ميعاد</span>
        </Link>
        <nav className="nav-links" style={{ marginInlineStart: 12 }}>
          {links.map(([label, id]) => (
            <button key={id} onClick={() => setTab(id)} style={{ background: tab === id ? 'var(--brand-subtle)' : 'transparent', color: tab === id ? 'var(--teal-700)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 13.5, padding: '9px 15px', borderRadius: 999 }}>{label}</button>
          ))}
        </nav>
        <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid var(--border-subtle)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Icon name="bell" size={18} color="var(--text-body)" />
            <span style={{ position: 'absolute', top: 8, insetInlineEnd: 9, width: 7, height: 7, borderRadius: '50%', background: 'var(--amber-500)', border: '2px solid #fff' }} />
          </button>
          <Button variant="ghost" size="sm" iconStart="log-out" onClick={handleLogout}>تسجيل الخروج</Button>
        </div>
      </div>
    </div>
  );
}

function ProfileCard({ tab, setTab }) {
  const { profile } = useAuth();
  const links = [
    ['layout-grid', 'نظرة عامة', 'overview'],
    ['calendar-days', 'مواعيدي', 'appointments'],
    ['bell', 'الإشعارات', 'notifications'],
    ['user-round', 'الملف الشخصي', 'profile'],
  ];
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
    : '';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 90 }}>
      <Card padding={22} style={{ textAlign: 'center' }}>
        <Avatar name={profile?.name || 'عميل'} size="lg" style={{ margin: '0 auto', width: 66, height: 66, fontSize: 24 }} />
        <div style={{ fontFamily: font, fontWeight: 800, fontSize: 17, color: 'var(--text-strong)', marginTop: 12 }}>{profile?.name || '—'}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }} dir="ltr">{toLocalPhone(profile?.phone)}</div>
        {memberSince && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--teal-700)', background: 'var(--brand-subtle)', padding: '5px 12px', borderRadius: 999, marginTop: 12 }}>
            <Icon name="badge-check" size={13} />عميل منذ {memberSince}
          </div>
        )}
      </Card>
      <Card padding={10}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {links.map(([ic, label, id]) => {
            const on = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 12, border: 'none', cursor: 'pointer', textAlign: 'start', fontFamily: font, fontWeight: 700, fontSize: 14, background: on ? 'var(--brand-subtle)' : 'transparent', color: on ? 'var(--teal-700)' : 'var(--text-body)' }}>
                <Icon name={ic} size={18} color={on ? 'var(--brand)' : 'var(--text-muted)'} />{label}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function AppointmentDetailModal({ appointment, feedback, initialMode = 'view', onClose, onChanged, onFeedbackSaved }) {
  const [mode, setMode] = useState(initialMode); // view | edit | cancel | rate
  const [date, setDate] = useState(appointment.date);
  const [time, setTime] = useState(appointment.time);
  const [checkingTimes, setCheckingTimes] = useState(false);
  const [takenTimes, setTakenTimes] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [rating, setRating] = useState(feedback?.rating || 0);
  const [comment, setComment] = useState(feedback?.comment || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode !== 'edit' || !appointment.doctorId) return;
    getDoctorSchedule(appointment.doctorId).then(setSchedule).catch(() => setSchedule(null));
  }, [mode, appointment.doctorId]);

  useEffect(() => {
    if (mode !== 'edit' || !appointment.doctorId || !date) { setTakenTimes([]); return; }
    setCheckingTimes(true);
    listTakenTimes({ doctorId: appointment.doctorId, date, excludeAppointmentId: appointment.id })
      .then(list => { setTakenTimes(list); setTime(t => (t && list.includes(t) ? '' : t)); })
      .catch(() => setTakenTimes([]))
      .finally(() => setCheckingTimes(false));
  }, [mode, date]);

  const daySlots = schedule ? computeSlotsForDay(schedule, date, 30) : [];

  const saveEdit = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await updateAppointment(appointment.id, {
        branchId: appointment.branchId, serviceId: appointment.serviceId, doctorId: appointment.doctorId,
        date, time, notes: appointment.notes, status: appointment.status,
      });
      onChanged(updated);
      onClose();
    } catch (e) {
      setError(e.message || 'تعذّر حفظ التعديل.');
    } finally {
      setSaving(false);
    }
  };

  const confirmCancel = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await updateAppointmentStatus(appointment.id, 'cancelled');
      onChanged(updated);
      onClose();
    } catch (e) {
      setError(e.message || 'تعذّر إلغاء الموعد.');
    } finally {
      setSaving(false);
    }
  };

  const saveRating = async () => {
    setSaving(true);
    setError('');
    try {
      const saved = await submitFeedback({ appointmentId: appointment.id, rating, comment: comment.trim() });
      onFeedbackSaved(saved);
      onClose();
    } catch (e) {
      setError(e.message || 'تعذّر حفظ التقييم.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(6,60,60,.34)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ width: 440, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 22, boxShadow: '0 40px 80px -20px rgba(0,0,0,.4)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: font, fontWeight: 800, fontSize: 18, color: 'var(--text-strong)' }}>{appointment.service}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{appointment.doctor}</div>
          </div>
          <button onClick={onClose} style={{ marginInlineStart: 'auto', width: 36, height: 36, borderRadius: 11, border: '1px solid var(--border-subtle)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={18} color="var(--text-body)" /></button>
        </div>

        <div style={{ padding: 24 }}>
          {error && <div style={{ marginBottom: 14 }}><Alert tone="danger">{error}</Alert></div>}

          {mode === 'view' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{appointment.branch}</div>
                <div style={{ fontFamily: font, fontWeight: 800, fontSize: 16, color: 'var(--text-strong)' }}>{appointment.date} · {formatArabicTime(appointment.time)}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '14px 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', marginBottom: 18 }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 6 }}>الوقت المتبقي حتى الموعد</div>
                <Countdown date={appointment.date} time={appointment.time} cancelled={appointment.status === 'cancelled'} size="lg" style={{ justifyContent: 'center' }} />
              </div>
              {appointment.status !== 'cancelled' && groupOf(appointment) === 'upcoming' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="secondary" size="sm" iconStart="pencil" style={{ flex: 1 }} onClick={() => setMode('edit')}>تعديل الموعد</Button>
                  <Button variant="ghost" size="sm" iconStart="x" style={{ flex: 1, color: 'var(--red-500)' }} onClick={() => setMode('cancel')}>إلغاء الموعد</Button>
                </div>
              )}
              {appointment.status !== 'cancelled' && groupOf(appointment) === 'past' && (
                feedback ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', padding: 14, borderRadius: 14, background: 'var(--surface-page)' }}>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>تقييمك لهذه الزيارة</div>
                    <StarRating value={feedback.rating} readOnly />
                    {feedback.comment && <div style={{ fontSize: 13, color: 'var(--text-body)', textAlign: 'center' }}>{feedback.comment}</div>}
                    <button onClick={() => setMode('rate')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-link)', fontFamily: font, fontWeight: 700, fontSize: 12.5 }}>تعديل التقييم</button>
                  </div>
                ) : (
                  <Button size="sm" block iconStart="star" onClick={() => setMode('rate')}>قيّم هذه الزيارة</Button>
                )
              )}
            </>
          )}

          {mode === 'edit' && (
            <>
              <Field label="التاريخ">
                <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={e => { setDate(e.target.value); setTime(''); }}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--border-subtle)', fontFamily: font, fontWeight: 700, fontSize: 14, color: 'var(--text-strong)' }} />
              </Field>
              <div style={{ marginTop: 16 }}>
                <div style={{ fontFamily: font, fontWeight: 800, fontSize: 13.5, color: 'var(--text-strong)', marginBottom: 10 }}>الوقت</div>
                {daySlots.length === 0 ? (
                  <div style={{ padding: '14px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>لا توجد مواعيد متاحة في هذا اليوم.</div>
                ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {daySlots.map(t => {
                    const on = time === t;
                    const isTaken = takenTimes.includes(t);
                    return (
                      <button key={t} disabled={isTaken} onClick={() => setTime(t)} style={{ padding: '11px 0', borderRadius: 12, fontFamily: font, fontWeight: 700, fontSize: 12, cursor: isTaken ? 'not-allowed' : 'pointer', opacity: isTaken ? .4 : 1, textDecoration: isTaken ? 'line-through' : 'none', background: on ? 'var(--brand)' : '#fff', border: on ? '2px solid var(--brand)' : '1.5px solid var(--border-subtle)', color: on ? '#fff' : 'var(--text-body)' }}>{formatArabicTime(t)}</button>
                    );
                  })}
                </div>
                )}
                {checkingTimes && <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-muted)' }}>جارِ التحقق من التوفّر…</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <Button variant="ghost" size="sm" style={{ flex: 1 }} onClick={() => setMode('view')}>رجوع</Button>
                <Button size="sm" style={{ flex: 1 }} disabled={!date || !time || checkingTimes || saving} onClick={saveEdit}>{saving ? 'جارِ الحفظ…' : 'حفظ التعديل'}</Button>
              </div>
            </>
          )}

          {mode === 'cancel' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, background: 'var(--red-50)', color: 'var(--red-600)', fontSize: 13.5 }}>
                <Icon name="alert-triangle" size={18} color="var(--red-500)" />هل أنت متأكد من إلغاء هذا الموعد؟ لا يمكن التراجع عن هذا الإجراء.
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                <Button variant="ghost" size="sm" style={{ flex: 1 }} onClick={() => setMode('view')}>تراجع</Button>
                <Button size="sm" style={{ flex: 1, background: 'var(--red-500)' }} disabled={saving} onClick={confirmCancel}>{saving ? 'جارِ الإلغاء…' : 'تأكيد الإلغاء'}</Button>
              </div>
            </>
          )}

          {mode === 'rate' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 18 }}>
                <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 12 }}>كيف كانت زيارتك؟</div>
                <div style={{ display: 'flex', justifyContent: 'center' }}><StarRating value={rating} onChange={setRating} size={30} /></div>
              </div>
              <Field label="تعليق (اختياري)">
                <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="شاركنا رأيك في الزيارة…"
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--border-subtle)', fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--text-strong)', resize: 'vertical' }} />
              </Field>
              <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                <Button variant="ghost" size="sm" style={{ flex: 1 }} onClick={() => setMode('view')}>رجوع</Button>
                <Button size="sm" style={{ flex: 1 }} disabled={!rating || saving} onClick={saveRating}>{saving ? 'جارِ الحفظ…' : 'إرسال التقييم'}</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function NextAppointment({ next, onOpen }) {
  if (!next) {
    return (
      <Card padding={24} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>
        لا يوجد لديك موعد قادم بعد.
      </Card>
    );
  }
  return (
    <Card padding={0} style={{ overflow: 'hidden' }}>
      <div style={{ background: 'linear-gradient(120deg,var(--teal-700),var(--teal-600))', padding: '20px 24px', color: '#fff' }}>
        <div style={{ fontSize: 12.5, opacity: .85 }}>موعدك القادم</div>
        <div style={{ fontFamily: font, fontWeight: 900, fontSize: 20, marginTop: 4 }}>{next.service} · {formatArabicTime(next.time)}</div>
        <div style={{ marginTop: 10 }}>
          <Countdown date={next.date} time={next.time} cancelled={next.status === 'cancelled'} size="lg" style={{ color: '#fff' }} />
        </div>
      </div>
      <div style={{ padding: 22, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 48, height: 48, borderRadius: 15, background: 'var(--brand-subtle)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><Icon name="sparkles" size={23} /></div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontFamily: font, fontWeight: 800, fontSize: 15, color: 'var(--text-strong)' }}>{next.doctor}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{next.date} · {next.branch}</div>
        </div>
        <StatusPill status={next.status} />
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <Button variant="secondary" size="sm" iconStart="pencil" style={{ flex: 1 }} onClick={() => onOpen(next, 'edit')}>تعديل الموعد</Button>
          <Button variant="ghost" size="sm" iconStart="x" style={{ flex: 1, color: 'var(--red-500)' }} onClick={() => onOpen(next, 'cancel')}>إلغاء الموعد</Button>
        </div>
      </div>
    </Card>
  );
}

function Overview({ appointments, loading, error, goTo, onOpen }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const grouped = appointments.map(a => ({ ...a, group: groupOf(a) }));
  const next = grouped.find(a => a.group === 'upcoming');
  const stats = [
    [String(appointments.length), 'إجمالي الحجوزات', 'calendar-days', 'var(--brand)'],
    [String(grouped.filter(a => a.group === 'upcoming').length), 'موعد قادم', 'clock', 'var(--amber-600)'],
    [String(grouped.filter(a => a.group === 'past' && a.status !== 'cancelled').length), 'مواعيد مكتملة', 'check-circle', 'var(--green-500)'],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: font, fontWeight: 900, fontSize: 24, color: 'var(--text-strong)', margin: 0 }}>مرحباً، {profile?.name || 'بك'} 👋</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>هذه نظرة سريعة على حجوزاتك وتذكيراتك.</p>
        </div>
        <Button iconStart="plus" onClick={() => navigate('/book')}>حجز موعد جديد</Button>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <div className="stats-row">
        {stats.map(([v, l, ic, tone]) => (
          <Card key={l} padding={18}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: `color-mix(in srgb, ${tone} 14%, white)`, color: tone, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={ic} size={20} /></div>
            <div style={{ fontFamily: font, fontWeight: 900, fontSize: 26, color: 'var(--text-strong)', marginTop: 12 }}>{loading ? '…' : v}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{l}</div>
          </Card>
        ))}
      </div>

      {!loading && <NextAppointment next={next} onOpen={onOpen} />}

      <Card padding={22}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: font, fontWeight: 800, fontSize: 16.5, color: 'var(--text-strong)' }}>آخر الإشعارات</div>
          <button onClick={() => goTo('notifications')} style={{ marginInlineStart: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-link)', fontFamily: font, fontWeight: 700, fontSize: 13 }}>عرض الكل</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {NOTIFICATIONS.map(n => (
            <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 13, background: 'var(--surface-page)' }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, flex: '0 0 auto', background: `color-mix(in srgb, ${n.color} 14%, white)`, color: n.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={n.icon} size={16} /></span>
              <span style={{ fontSize: 13.5, color: 'var(--text-body)', flex: 1 }}>{n.kind}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

const FILTERS = [['all', 'الكل'], ['upcoming', 'القادمة'], ['past', 'السابقة'], ['cancelled', 'ملغاة']];

function Appointments({ appointments, loading, error, onOpen, feedback }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const grouped = appointments.map(a => ({ ...a, group: groupOf(a) }));
  const list = filter === 'all' ? grouped : grouped.filter(a => a.group === filter);
  return (
    <Card padding={0} style={{ overflow: 'hidden' }}>
      <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontFamily: font, fontWeight: 800, fontSize: 17, color: 'var(--text-strong)' }}>مواعيدي</div>
        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 6 }}>
          {FILTERS.map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} style={{ fontSize: 12.5, fontWeight: 700, padding: '6px 13px', borderRadius: 999, background: filter === id ? 'var(--brand-subtle)' : 'transparent', color: filter === id ? 'var(--teal-700)' : 'var(--text-muted)', border: filter === id ? '1px solid var(--brand-border)' : '1px solid transparent', cursor: 'pointer' }}>{label}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: '6px 22px 18px' }}>
        {loading && <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>جارِ التحميل…</div>}
        {!loading && error && <Alert tone="danger">{error}</Alert>}
        {!loading && !error && list.map(a => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 0', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--brand-subtle)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><Icon name="sparkles" size={20} /></div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontFamily: font, fontWeight: 800, fontSize: 14.5, color: 'var(--text-strong)' }}>{a.service}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{a.doctor} · {a.branch}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
              <div style={{ fontSize: 13, color: 'var(--text-body)' }}>{a.date} · {formatArabicTime(a.time)}</div>
              {a.group === 'upcoming' && <Countdown date={a.date} time={a.time} />}
            </div>
            <StatusPill status={a.status} />
            {a.group === 'past' && a.status !== 'cancelled' && (
              feedback[a.id] ? (
                <div onClick={() => onOpen(a, 'view')} style={{ cursor: 'pointer' }}>
                  <StarRating value={feedback[a.id].rating} size={16} readOnly />
                </div>
              ) : (
                <Button variant="secondary" size="sm" iconStart="star" onClick={() => onOpen(a, 'rate')}>قيّم الزيارة</Button>
              )
            )}
            {a.group === 'upcoming' && <Button variant="secondary" size="sm" onClick={() => onOpen(a, 'view')}>التفاصيل</Button>}
            {a.group === 'past' && <Button variant="ghost" size="sm" onClick={() => navigate('/book')}>احجز مرة أخرى</Button>}
          </div>
        ))}
        {!loading && !error && list.length === 0 && <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>لا توجد مواعيد في هذا التصنيف.</div>}
      </div>
    </Card>
  );
}

function Notifications() {
  const STATUS_LABEL = { scheduled: 'مجدول', sent: 'تم الإرسال', delivered: 'تم الاستلام', failed: 'فشل' };
  return (
    <Card padding={0} style={{ overflow: 'hidden' }}>
      <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ fontFamily: font, fontWeight: 800, fontSize: 17, color: 'var(--text-strong)' }}>الإشعارات</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>كل تذكير وتحديث يخص حجوزاتك</div>
      </div>
      <div style={{ padding: '8px 22px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {NOTIFICATIONS.map(n => (
          <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, borderRadius: 15, border: '1px solid var(--border-subtle)' }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, flex: '0 0 auto', background: `color-mix(in srgb, ${n.color} 14%, white)`, color: n.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={n.icon} size={19} /></span>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontFamily: font, fontWeight: 700, fontSize: 14, color: 'var(--text-strong)' }}>{n.kind}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{n.channel} · {n.time}</div>
            </div>
            <StatusPill status={n.status} label={STATUS_LABEL[n.status]} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function Profile() {
  const { profile, completeProfile } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [channels, setChannels] = useState({ wa: true, sms: true, email: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const toggle = k => setChannels(c => ({ ...c, [k]: !c[k] }));

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await completeProfile({ name });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card padding={24}>
        <div style={{ fontFamily: font, fontWeight: 800, fontSize: 17, color: 'var(--text-strong)', marginBottom: 18 }}>البيانات الأساسية</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="الاسم الكامل"><Input iconStart="user-round" value={name} onChange={e => setName(e.target.value)} /></Field>
          <Field label="رقم الهاتف" hint="رقم موثّق ولا يمكن تغييره من هنا">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Input iconStart="phone" value={toLocalPhone(profile?.phone)} disabled dir="ltr" />
              <span style={{ position: 'absolute', insetInlineEnd: 14, color: 'var(--green-500)', display: 'flex' }}><Icon name="badge-check" size={17} /></span>
            </div>
          </Field>
          <Field label="البريد الإلكتروني (اختياري)" style={{ gridColumn: '1 / -1' }}>
            <Input iconStart="mail" placeholder="example@email.com" value={email} onChange={e => setEmail(e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card padding={24}>
        <div style={{ fontFamily: font, fontWeight: 800, fontSize: 17, color: 'var(--text-strong)', marginBottom: 4 }}>قنوات التذكير المفضّلة</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginBottom: 16 }}>اختر من أين تحب تستلم تذكيرات مواعيدك.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[['wa', 'WhatsApp', 'message-circle', 'var(--whatsapp)'], ['sms', 'رسائل SMS', 'message-square', 'var(--blue-500)'], ['email', 'البريد الإلكتروني', 'mail', 'var(--gray-500)']].map(([k, label, ic, color]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, border: '1px solid var(--border-subtle)' }}>
              <span style={{ width: 36, height: 36, borderRadius: 11, background: `color-mix(in srgb, ${color} 14%, white)`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={ic} size={18} /></span>
              <span style={{ fontFamily: font, fontWeight: 700, fontSize: 14, color: 'var(--text-strong)' }}>{label}</span>
              <div style={{ marginInlineStart: 'auto' }}><Switch checked={channels[k]} onChange={() => toggle(k)} /></div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 14 }}>
        {saved && <span style={{ color: 'var(--green-600)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="check-circle" size={15} />تم الحفظ</span>}
        <Button size="lg" iconStart="check" disabled={saving} onClick={save}>{saving ? 'جارِ الحفظ…' : 'حفظ التغييرات'}</Button>
      </div>
    </div>
  );
}

export default function Account() {
  const [tab, setTab] = useState('overview');
  const [appointments, setAppointments] = useState([]);
  const [feedback, setFeedback] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null); // { appointment, mode }

  useEffect(() => {
    Promise.all([listMyAppointments(), listMyFeedback()])
      .then(([a, f]) => { setAppointments(a); setFeedback(f); })
      .catch(e => setError(e.message || 'تعذّر تحميل مواعيدك.'))
      .finally(() => setLoading(false));
  }, []);

  const openDetail = (appointment, mode) => setDetail({ appointment, mode });
  const handleChanged = updated => setAppointments(list => list.map(a => (a.id === updated.id ? updated : a)));
  const handleFeedbackSaved = saved => setFeedback(map => ({ ...map, [saved.appointment_id]: saved }));

  return (
    <>
      <style>{STYLE}</style>
      <TopNav tab={tab} setTab={setTab} />
      <div className="wrap" style={{ paddingTop: 26 }}>
        <div className="layout">
          <ProfileCard tab={tab} setTab={setTab} />
          <div>
            {tab === 'overview' && <Overview appointments={appointments} loading={loading} error={error} goTo={setTab} onOpen={openDetail} />}
            {tab === 'appointments' && <Appointments appointments={appointments} loading={loading} error={error} onOpen={openDetail} feedback={feedback} />}
            {tab === 'notifications' && <Notifications />}
            {tab === 'profile' && <Profile />}
          </div>
        </div>
      </div>
      {detail && (
        <AppointmentDetailModal
          appointment={detail.appointment}
          feedback={feedback[detail.appointment.id]}
          initialMode={detail.mode}
          onClose={() => setDetail(null)}
          onChanged={handleChanged}
          onFeedbackSaved={handleFeedbackSaved}
        />
      )}
    </>
  );
}
