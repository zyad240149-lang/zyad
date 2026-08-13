// ميعاد — Admin "مركز التحكم" (command center) concept. Desktop dashboard, RTL.
const { Icon, Avatar, StatusPill, Field, Select } = window.MeaadDesignSystem_54b82a;
const AS = window.MeaadStory;
const { useState } = React;

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
  ['bell', 'التذكيرات', 'reminders'],
  ['stethoscope', 'الأطباء', 'doctors'],
  ['wallet', 'الحسابات', 'accounting'],
  ['users-round', 'الموظفون', 'staff'],
  ['shield-check', 'الصلاحيات', 'permissions'],
];
function Rail({ tab, setTab }) {
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
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, fontWeight: 800 }}>ن</div>
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ fontFamily: font, fontWeight: 700, fontSize: 13.5 }}>نهى المصري</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>موظفة الاستقبال</div>
        </div>
      </div>
    </div>
  );
}

const TAB_META = {
  agenda: { title: 'مواعيد اليوم', sub: 'الثلاثاء · 12 أغسطس 2026 · فرع أكتوبر' },
  reminders: { title: 'التذكيرات والإشعارات', sub: 'إعداد قنوات الإرسال ومتابعة حالة كل إشعار' },
  doctors: { title: 'فريق الأطباء', sub: 'التوفّر والجداول عبر كل الفروع' },
  accounting: { title: 'الحسابات', sub: 'الإيرادات والفواتير — 12 أغسطس' },
  staff: { title: 'الموظفون', sub: 'إدارة فريق العمل عبر كل الفروع' },
  permissions: { title: 'الصلاحيات', sub: 'تحديد ما يستطيع كل دور الوصول إليه' },
};

function Topbar({ tab, onAdd }) {
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
    </div>
  );
}

// ---------- KPI ----------
const TONE = { brand: 'var(--brand)', success: 'var(--green-500)', warning: 'var(--amber-600)', info: 'var(--blue-500)' };
function KpiRow() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
      {AS.kpis.map(k => { const t = TONE[k.tone]; return (
        <Card2 key={k.label} pad={18}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Ring2 icon={k.icon} tone={t} size={42} />
            {k.delta && <span style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700, color: 'var(--green-600)', background: 'var(--green-50)', padding: '3px 9px', borderRadius: 999 }}><Icon name="trending-up" size={13} />{k.delta}</span>}
          </div>
          <div style={{ fontFamily: font, fontWeight: 900, fontSize: 30, color: 'var(--text-strong)', marginTop: 12 }}>{k.value}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 1 }}>{k.label}</div>
        </Card2>
      ); })}
    </div>
  );
}

// ---------- Agenda timeline ----------
function AgendaTab({ onEdit }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <KpiRow />
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 20, alignItems: 'start' }}>
        <Card2 pad={0} style={{ overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center' }}>
            <div style={{ fontFamily: font, fontWeight: 800, fontSize: 17, color: 'var(--text-strong)' }}>جدول اليوم</div>
            <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8 }}>
              {['الكل', 'مؤكد', 'قيد الانتظار'].map((f, i) => (
                <span key={f} style={{ fontSize: 12.5, fontWeight: 700, padding: '6px 13px', borderRadius: 999, background: i === 0 ? 'var(--brand-subtle)' : 'transparent', color: i === 0 ? 'var(--teal-700)' : 'var(--text-muted)', border: i === 0 ? '1px solid var(--brand-border)' : '1px solid transparent', cursor: 'pointer' }}>{f}</span>
              ))}
            </div>
          </div>
          <div style={{ padding: '8px 22px 18px' }}>
            {AS.agenda.map((a, i) => <AgendaRow key={a.id} a={a} last={i === AS.agenda.length - 1} onEdit={onEdit} />)}
          </div>
        </Card2>
        <SidePanel onEdit={onEdit} />
      </div>
    </div>
  );
}

function AgendaRow({ a, last, onEdit }) {
  const cancelled = a.status === 'cancelled';
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 18, width: 58, flex: '0 0 auto' }}>
        <div style={{ fontFamily: font, fontWeight: 800, fontSize: 13.5, color: 'var(--text-body)', whiteSpace: 'nowrap' }}>{a.time}</div>
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
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{a.service} · {a.doctor}</div>
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

function SidePanel({ onEdit }) {
  const next = AS.agenda.find(a => a.isNew);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card2>
        <SectionTitle sub="بانتظار تأكيدك">أحدث حجز</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar name={next.customer} size="lg" />
          <div>
            <div style={{ fontFamily: font, fontWeight: 800, fontSize: 16, color: 'var(--text-strong)' }}>{next.customer}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{next.phone}</div>
          </div>
        </div>
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
          {[['sparkles', next.service], ['stethoscope', next.doctor], ['clock', 'الثلاثاء 12 أغسطس · ' + next.time]].map(([ic, v]) => (
            <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: 'var(--text-body)' }}><Icon name={ic} size={16} color="var(--text-muted)" />{v}</div>
          ))}
        </div>
        <button onClick={() => onEdit(next)} style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 13, border: 'none', cursor: 'pointer', background: 'var(--brand)', color: '#fff', fontFamily: font, fontWeight: 800, fontSize: 14, boxShadow: 'var(--shadow-brand)' }}>مراجعة وتأكيد</button>
      </Card2>
      <Card2>
        <SectionTitle>إشغال الأطباء اليوم</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {AS.roster.filter(r => r.active).map(r => (
            <div key={r.name}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6 }}>
                <span style={{ fontFamily: font, fontWeight: 700, color: 'var(--text-strong)' }}>{r.name}</span>
                <span style={{ marginInlineStart: 'auto', color: 'var(--text-muted)' }}>{r.today} مواعيد</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: 'var(--surface-sunken)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: (r.today / 8 * 100) + '%', background: 'var(--brand)', borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>
      </Card2>
    </div>
  );
}

// ---------- Edit / confirm modal (availability + double-booking) ----------
function AppointmentModal({ appt, onClose }) {
  const [time, setTime] = useState(appt.time);
  const [saved, setSaved] = useState(false);
  const taken = time === AS.takenTime; // double-booking guard
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(6,60,60,.34)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
      <div style={{ width: 560, maxHeight: '100%', overflowY: 'auto', background: '#fff', borderRadius: 22, boxShadow: '0 40px 80px -20px rgba(0,0,0,.4)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: font, fontWeight: 800, fontSize: 19, color: 'var(--text-strong)' }}>{saved ? 'تم تأكيد الموعد' : 'مراجعة الموعد'}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{appt.customer} · {appt.phone}</div>
          </div>
          <button onClick={onClose} style={{ marginInlineStart: 'auto', width: 38, height: 38, borderRadius: 11, border: '1px solid var(--border-subtle)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={19} color="var(--text-body)" /></button>
        </div>

        {saved ? (
          <div style={{ padding: 28, textAlign: 'center' }}>
            <div style={{ width: 66, height: 66, borderRadius: '50%', background: 'var(--green-50)', color: 'var(--green-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}><Icon name="check-check" size={34} /></div>
            <div style={{ fontFamily: font, fontWeight: 800, fontSize: 18, color: 'var(--text-strong)', marginTop: 14 }}>تم الحفظ وإرسال التأكيد</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13.5, marginTop: 4, lineHeight: 1.7 }}>أُرسل تأكيد الحجز إلى {appt.customer} عبر WhatsApp،<br />وجُدولت التذكيرات تلقائياً قبل 24 ساعة وقبل ساعة.</div>
            <button onClick={onClose} style={{ marginTop: 20, padding: '12px 28px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--brand)', color: '#fff', fontFamily: font, fontWeight: 800, fontSize: 14.5 }}>تمام</button>
          </div>
        ) : (
          <div style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <ModalField label="الخدمة" icon="sparkles" value={appt.service} />
              <ModalField label="الطبيب" icon="stethoscope" value={appt.doctor} />
              <ModalField label="الفرع" icon="map-pin" value="فرع أكتوبر" />
              <ModalField label="التاريخ" icon="calendar" value="12 أغسطس" />
            </div>
            <div style={{ marginTop: 16, fontFamily: font, fontWeight: 700, fontSize: 13.5, color: 'var(--text-strong)', marginBottom: 9 }}>الوقت — أعد التحقق من التوفّر قبل الحفظ</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9 }}>
              {AS.times.map(t => { const isTaken = t === AS.takenTime; const on = time === t; return (
                <button key={t} onClick={() => setTime(t)} style={{ padding: '11px 0', borderRadius: 12, fontFamily: font, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', position: 'relative', background: on ? (isTaken ? 'var(--red-50)' : 'var(--brand)') : 'var(--white)', border: on ? (isTaken ? '2px solid var(--red-500)' : '2px solid var(--brand)') : '1.5px solid var(--border-subtle)', color: on ? (isTaken ? 'var(--red-600)' : '#fff') : (isTaken ? 'var(--gray-400)' : 'var(--text-body)') }}>
                  {t}{isTaken && <span style={{ position: 'absolute', top: 4, insetInlineEnd: 6, fontSize: 9, color: 'var(--red-500)' }}>محجوز</span>}
                </button>
              ); })}
            </div>
            {taken ? (
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 14, background: 'var(--red-50)', color: 'var(--red-600)', fontSize: 13.5, lineHeight: 1.6 }}>
                <Icon name="circle-alert" size={19} color="var(--red-500)" />
                <div><b>هذا الموعد غير متاح، يرجى اختيار موعد آخر.</b><br />الوقت 5:30 م محجوز بالفعل لنفس الطبيب — منع تعارض الحجوزات (Double Booking).</div>
              </div>
            ) : (
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, background: 'var(--green-50)', color: 'var(--green-600)', fontSize: 13.5 }}>
                <Icon name="check-circle" size={19} color="var(--green-500)" />الوقت {time} متاح لدى {appt.doctor}.
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button onClick={onClose} style={{ flex: '0 0 auto', padding: '13px 22px', borderRadius: 999, border: '1.5px solid var(--border-default)', background: '#fff', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 14, color: 'var(--text-body)' }}>إلغاء</button>
              <button disabled={taken} onClick={() => setSaved(true)} style={{ flex: 1, padding: '13px', borderRadius: 999, border: 'none', cursor: taken ? 'not-allowed' : 'pointer', opacity: taken ? 0.45 : 1, background: 'var(--brand)', color: '#fff', fontFamily: font, fontWeight: 800, fontSize: 15, boxShadow: taken ? 'none' : 'var(--shadow-brand)' }}>تأكيد الحجز وإرسال الإشعار</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function ModalField({ label, icon, value }) {
  return <div style={{ background: 'var(--surface-page)', border: '1px solid var(--border-subtle)', borderRadius: 13, padding: '11px 14px' }}>
    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 4 }}><Icon name={icon} size={15} color="var(--brand)" /><span style={{ fontFamily: font, fontWeight: 700, color: 'var(--text-strong)', fontSize: 14 }}>{value}</span></div>
  </div>;
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
        <div style={{ textAlign: 'start', fontSize: 11, color: '#5a7a52', marginTop: 6 }}>✓✓ 4:00 م</div>
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
const WEEK_DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

function seedPeriods() {
  const map = {};
  AS.roster.forEach(r => { map[r.name] = [{ id: r.name + '-seed', days: r.days, hours: r.hours }]; });
  return map;
}

function timeLabel(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'م' : 'ص';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function TimeField({ label, value, onChange }) {
  return (
    <Field label={label}>
      <input type="time" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', height: 46, boxSizing: 'border-box', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'var(--text-strong)', background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '0 14px', outline: 'none' }} />
    </Field>
  );
}

function AddPeriodModal({ doctors, branches, defaultDoctor, onClose, onSave }) {
  const [doctor, setDoctor] = useState(defaultDoctor);
  const [branch, setBranch] = useState(branches[0]);
  const [days, setDays] = useState([]);
  const [from, setFrom] = useState('10:00');
  const [to, setTo] = useState('14:00');
  const toggleDay = d => setDays(ds => ds.includes(d) ? ds.filter(x => x !== d) : [...ds, d]);
  const validRange = from && to && from < to;
  const canSave = doctor && branch && days.length > 0 && validRange;

  const daysLabel = () => {
    if (days.length === 0) return '';
    if (days.length === 7) return 'يومياً';
    const sorted = WEEK_DAYS.filter(d => days.includes(d));
    return sorted.length > 1 ? `${sorted[0]} – ${sorted[sorted.length - 1]}` : sorted[0];
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(6,60,60,.34)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
      <div style={{ width: 540, maxHeight: '100%', overflowY: 'auto', background: '#fff', borderRadius: 22, boxShadow: '0 40px 80px -20px rgba(0,0,0,.4)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: font, fontWeight: 800, fontSize: 19, color: 'var(--text-strong)' }}>إضافة فترة عمل</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>حدد الطبيب والفرع وأيام وساعات هذه الفترة</div>
          </div>
          <button onClick={onClose} style={{ marginInlineStart: 'auto', width: 38, height: 38, borderRadius: 11, border: '1px solid var(--border-subtle)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={19} color="var(--text-body)" /></button>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="الطبيب">
              <Select value={doctor} onChange={e => setDoctor(e.target.value)}>
                {doctors.map(d => <option key={d} value={d}>{d}</option>)}
              </Select>
            </Field>
            <Field label="الفرع">
              <Select value={branch} onChange={e => setBranch(e.target.value)}>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </Select>
            </Field>
          </div>

          <div style={{ marginTop: 16, fontFamily: font, fontWeight: 700, fontSize: 13.5, color: 'var(--text-strong)', marginBottom: 9 }}>أيام الأسبوع</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {WEEK_DAYS.map(d => { const on = days.includes(d); return (
              <button key={d} onClick={() => toggleDay(d)} style={{ padding: '9px 15px', borderRadius: 999, fontFamily: font, fontWeight: 700, fontSize: 13, cursor: 'pointer', background: on ? 'var(--brand)' : 'var(--white)', border: on ? '1.5px solid var(--brand)' : '1.5px solid var(--border-subtle)', color: on ? '#fff' : 'var(--text-body)' }}>{d}</button>
            ); })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
            <TimeField label="من الساعة" value={from} onChange={setFrom} />
            <TimeField label="إلى الساعة" value={to} onChange={setTo} />
          </div>
          {!validRange && from && to && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red-600)', fontSize: 13 }}>
              <Icon name="circle-alert" size={16} color="var(--red-500)" />وقت النهاية يجب أن يكون بعد وقت البداية.
            </div>
          )}

          {canSave && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, background: 'var(--brand-subtle)', color: 'var(--teal-700)', fontSize: 13.5 }}>
              <Icon name="calendar-check" size={18} color="var(--brand)" />الفترة: {daysLabel()} · {timeLabel(from)} – {timeLabel(to)}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button onClick={onClose} style={{ flex: '0 0 auto', padding: '13px 22px', borderRadius: 999, border: '1.5px solid var(--border-default)', background: '#fff', cursor: 'pointer', fontFamily: font, fontWeight: 700, fontSize: 14, color: 'var(--text-body)' }}>إلغاء</button>
            <button disabled={!canSave} onClick={() => onSave(doctor, { id: doctor + '-' + Date.now(), branch, days: daysLabel(), hours: `${timeLabel(from)} – ${timeLabel(to)}` })} style={{ flex: 1, padding: '13px', borderRadius: 999, border: 'none', cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.45, background: 'var(--brand)', color: '#fff', fontFamily: font, fontWeight: 800, fontSize: 15, boxShadow: canSave ? 'var(--shadow-brand)' : 'none' }}>حفظ الفترة</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DoctorsTab() {
  const [periods, setPeriods] = useState(seedPeriods);
  const [modalDoctor, setModalDoctor] = useState(null);
  const branches = AS.branches.map(b => b.name);
  const doctorNames = AS.roster.map(r => r.name);

  const savePeriod = (doctor, period) => {
    setPeriods(p => ({ ...p, [doctor]: [...(p[doctor] || []), period] }));
    setModalDoctor(null);
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontFamily: font, fontWeight: 800, fontSize: 17, color: 'var(--text-strong)' }}>فريق الأطباء</div>
        <button onClick={() => setModalDoctor(doctorNames[0])} style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--brand)', color: '#fff', fontFamily: font, fontWeight: 800, fontSize: 13.5, boxShadow: 'var(--shadow-brand)' }}>
          <Icon name="plus" size={17} color="#fff" stroke={2.5} />إضافة فترة
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {AS.roster.map(r => (
          <Card2 key={r.name}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={r.name} size="lg" />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: font, fontWeight: 800, fontSize: 16, color: 'var(--text-strong)' }}>{r.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{r.spec} · {r.branch}</div>
              </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: r.active ? 'var(--green-600)' : 'var(--gray-500)', background: r.active ? 'var(--green-50)' : 'var(--surface-sunken)', padding: '5px 12px', borderRadius: 999 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.active ? 'var(--green-500)' : 'var(--gray-400)' }} />{r.active ? 'متاح اليوم' : 'إجازة'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 16 }}>
              {[['star', r.rating, 'التقييم'], ['users', r.patients, 'مرضى'], ['calendar-check', r.today, 'مواعيد اليوم']].map(([ic, v, l]) => (
                <div key={l} style={{ background: 'var(--surface-page)', borderRadius: 13, padding: '11px 12px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: font, fontWeight: 900, fontSize: 18, color: 'var(--text-strong)' }}><Icon name={ic} size={15} color="var(--amber-500)" />{v}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ fontFamily: font, fontWeight: 700, fontSize: 12.5, color: 'var(--text-strong)', marginTop: 16, marginBottom: 8 }}>فترات العمل</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(periods[r.name] || []).map(p => (
                <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-body)', background: 'var(--surface-page)', border: '1px solid var(--border-subtle)', padding: '7px 12px', borderRadius: 999 }}>
                  <Icon name="clock" size={13} color="var(--text-muted)" />{p.days} · {p.hours}
                </span>
              ))}
              <button onClick={() => setModalDoctor(r.name)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--teal-700)', background: 'var(--brand-subtle)', border: '1px dashed var(--brand-border)', padding: '7px 12px', borderRadius: 999, cursor: 'pointer' }}>
                <Icon name="plus" size={13} color="var(--brand)" />إضافة فترة
              </button>
            </div>
          </Card2>
        ))}
      </div>

      {modalDoctor && (
        <AddPeriodModal doctors={doctorNames} branches={branches} defaultDoctor={modalDoctor} onClose={() => setModalDoctor(null)} onSave={savePeriod} />
      )}
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

// ---------- Staff ----------
function RoleBadge({ roleName }) {
  const role = AS.roles.find(r => r.name === roleName);
  const color = role ? role.color : 'var(--gray-500)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800, color, background: `color-mix(in srgb, ${color} 12%, white)`, padding: '4px 11px', borderRadius: 999 }}>
      <Icon name="shield" size={11} />{roleName}
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
  const [staff, setStaff] = useState(AS.staff);
  const [showAdd, setShowAdd] = useState(false);
  const branches = AS.branches.map(b => b.name);
  const roleNames = AS.roles.map(r => r.name);
  const toggleStatus = id => setStaff(list => list.map(s => s.id === id ? { ...s, status: s.status === 'active' ? 'suspended' : 'active' } : s));

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
        <div style={{ padding: '8px 22px 18px' }}>
          {staff.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', opacity: s.status === 'suspended' ? 0.55 : 1 }}>
              <Avatar name={s.name} />
              <div style={{ flex: 1, minWidth: 170 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: font, fontWeight: 800, fontSize: 14.5, color: 'var(--text-strong)' }}>{s.name}</span>
                  <RoleBadge roleName={s.role} />
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>{s.email} · {s.phone}</div>
              </div>
              <span style={{ fontSize: 12.5, color: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="map-pin" size={13} color="var(--text-muted)" />{s.branch}</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: s.status === 'active' ? 'var(--green-600)' : 'var(--gray-500)', background: s.status === 'active' ? 'var(--green-50)' : 'var(--surface-sunken)', padding: '5px 12px', borderRadius: 999 }}>{s.status === 'active' ? 'نشط' : 'موقوف'}</span>
              <button onClick={() => toggleStatus(s.id)} style={{ width: 36, height: 36, borderRadius: 11, border: '1px solid var(--border-default)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
function PermissionCell({ level, onChange }) {
  const meta = { none: ['var(--gray-400)', 'var(--surface-sunken)'], view: ['var(--blue-600)', 'var(--info-subtle)'], edit: ['var(--amber-700)', 'var(--warning-subtle)'], full: ['var(--green-600)', 'var(--success-subtle)'] }[level];
  return (
    <select value={level} onChange={e => onChange(e.target.value)} style={{ width: '100%', fontFamily: font, fontWeight: 700, fontSize: 12.5, color: meta[0], background: meta[1], border: 'none', borderRadius: 10, padding: '9px 10px', cursor: 'pointer', appearance: 'none', textAlign: 'center' }}>
      {AS.permissionLevels.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
    </select>
  );
}

function PermissionsTab() {
  const [roles, setRoles] = useState(AS.roles);
  const [saved, setSaved] = useState(false);
  const setLevel = (roleId, moduleId, level) => {
    setRoles(rs => rs.map(r => r.id === roleId ? { ...r, permissions: { ...r.permissions, [moduleId]: level } } : r));
    setSaved(false);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card2 pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontFamily: font, fontWeight: 800, fontSize: 17, color: 'var(--text-strong)' }}>مصفوفة الصلاحيات</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>حدد مستوى وصول كل دور إلى أقسام لوحة التحكم</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'start', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', padding: '10px 22px', borderBottom: '1px solid var(--border-subtle)' }}>الدور</th>
                {AS.permissionModules.map(([id, label]) => (
                  <th key={id} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map(r => (
                <tr key={r.id}>
                  <td style={{ padding: '12px 22px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: font, fontWeight: 800, fontSize: 14, color: 'var(--text-strong)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }} />{r.name}
                    </span>
                  </td>
                  {AS.permissionModules.map(([id]) => (
                    <td key={id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', minWidth: 110 }}>
                      <PermissionCell level={r.permissions[id]} onChange={lv => setLevel(r.id, id, lv)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => setSaved(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--brand)', color: '#fff', fontFamily: font, fontWeight: 800, fontSize: 13.5, boxShadow: 'var(--shadow-brand)' }}>
            <Icon name="check" size={16} color="#fff" stroke={2.5} />حفظ التغييرات
          </button>
          {saved && <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--green-600)', fontSize: 13 }}><Icon name="check-circle" size={15} />تم حفظ الصلاحيات</span>}
        </div>
      </Card2>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 16, borderRadius: 15, background: 'var(--brand-subtle)', color: 'var(--teal-700)', fontSize: 13 }}>
        <Icon name="info" size={17} color="var(--brand)" />
        بدون: لا يستطيع الوصول للقسم · عرض فقط: يشاهد دون تعديل · تعديل: يضيف ويحدّث · كامل: صلاحية كاملة شاملة الحذف والإعدادات.
      </div>
    </div>
  );
}

// ---------- shell ----------
function AdminDashboard({ initialTab = 'agenda' }) {
  const [tab, setTab] = useState(initialTab);
  const [modal, setModal] = useState(null);
  return (
    <div style={{ position: 'relative', display: 'flex', height: '100%', background: 'var(--surface-page)', fontFamily: body, direction: 'rtl', overflow: 'hidden' }}>
      <Rail tab={tab} setTab={setTab} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar tab={tab} onAdd={() => setModal(AS.agenda.find(a => a.isNew))} />
        <div style={{ flex: 1, overflowY: 'auto', padding: 26 }}>
          {tab === 'agenda' && <AgendaTab onEdit={setModal} />}
          {tab === 'reminders' && <RemindersTab />}
          {tab === 'doctors' && <DoctorsTab />}
          {tab === 'accounting' && <AccountingTab />}
          {tab === 'staff' && <StaffTab />}
          {tab === 'permissions' && <PermissionsTab />}
        </div>
      </div>
      {modal && <AppointmentModal appt={modal} onClose={() => setModal(null)} />}
    </div>
  );
}

Object.assign(window, { AdminDashboard });
