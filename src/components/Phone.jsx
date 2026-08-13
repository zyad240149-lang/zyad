// Bold mobile customer app for ميعاد — full-screen native feel, controlled by the storyboard.
import { MeaadStory as S } from '../data.js';

const { Icon, Avatar, StatusPill, Button } = window.MeaadDesignSystem_54b82a;

const STEP_TITLES = ['الرئيسية', 'الفرع', 'الخدمة', 'الطبيب', 'الوقت', 'المراجعة', 'تذكرتك', 'التذكير'];

function PhoneFrame({ children, label }) {
  return (
    <div style={{ position: 'relative', width: 372, flex: '0 0 auto' }}>
      <div style={{ position: 'relative', width: 372, height: 764, background: '#0b1414', borderRadius: 46, padding: 11, boxShadow: '0 40px 80px -24px rgba(6,60,60,.45), 0 0 0 2px #0b1414' }}>
        <div style={{ position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', width: 118, height: 26, background: '#0b1414', borderRadius: 20, zIndex: 30 }} />
        <div style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--surface-page)', borderRadius: 36, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function StatusBar({ dark }) {
  const c = dark ? 'rgba(255,255,255,.95)' : 'var(--text-strong)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 26px 4px', flex: '0 0 auto', color: c, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, zIndex: 20 }}>
      <span>٥:٤٠</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name="signal" size={15} color={c} />
        <Icon name="wifi" size={15} color={c} />
        <Icon name="battery-full" size={17} color={c} />
      </div>
    </div>
  );
}

function AppBar({ step, onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 18px 12px', flex: '0 0 auto' }}>
      <button onClick={onBack} style={{ width: 40, height: 40, borderRadius: 14, border: '1px solid var(--border-subtle)', background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: '0 0 auto' }}>
        <Icon name="chevron-right" size={20} color="var(--text-strong)" />
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--text-strong)' }}>{STEP_TITLES[step]}</div>
        <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ height: 4, flex: 1, borderRadius: 4, background: i <= step ? 'var(--brand)' : 'var(--surface-sunken)', transition: 'background .2s' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Tile({ selected, onClick, children }) {
  return (
    <button onClick={onClick} style={{ textAlign: 'start', width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: 15, cursor: 'pointer', background: 'var(--white)', borderRadius: 20, transition: 'all .15s',
      border: selected ? '2px solid var(--brand)' : '1.5px solid var(--border-subtle)', boxShadow: selected ? 'var(--shadow-focus)' : '0 1px 2px rgba(6,60,60,.04)' }}>
      {children}
      <div style={{ marginInlineStart: 'auto', width: 24, height: 24, borderRadius: '50%', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', border: selected ? 'none' : '2px solid var(--border-default)', background: selected ? 'var(--brand)' : 'transparent' }}>
        {selected && <Icon name="check" size={15} color="#fff" stroke={3} />}
      </div>
    </button>
  );
}

function Ring({ icon, tone = 'var(--brand)', size = 46 }) {
  return <div style={{ width: size, height: size, borderRadius: 15, flex: '0 0 auto', background: `color-mix(in srgb, ${tone} 13%, white)`, color: tone, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={size * 0.48} /></div>;
}

const scroll = { flex: 1, overflowY: 'auto', padding: '2px 18px 16px', display: 'flex', flexDirection: 'column', gap: 12 };

// ---- Screens ----
function HomeScreen({ go }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'linear-gradient(160deg,var(--teal-600),var(--teal-500))', padding: '4px 22px 30px', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, color: '#fff' }}>
        <StatusBar dark />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <div>
            <div style={{ opacity: .85, fontSize: 14 }}>مساء الخير،</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26 }}>{S.patient.first}</div>
          </div>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18 }}>س</div>
        </div>
      </div>
      <div style={{ padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 14, marginTop: -14 }}>
        <button onClick={() => go(1)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18, cursor: 'pointer', background: 'var(--white)', borderRadius: 22, border: 'none', boxShadow: 'var(--shadow-md)', textAlign: 'start' }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-brand)' }}><Icon name="plus" size={26} stroke={2.5} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--text-strong)' }}>احجز موعد جديد</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>فرع، خدمة، طبيب — في ثوانٍ</div>
          </div>
          <Icon name="chevron-left" size={22} color="var(--text-muted)" />
        </button>

        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--text-strong)', marginTop: 4 }}>موعدك القادم</div>
        <div style={{ background: 'var(--white)', borderRadius: 20, border: '1.5px solid var(--border-subtle)', padding: 16, display: 'flex', alignItems: 'center', gap: 13 }}>
          <Ring icon="sparkles" tone="var(--amber-600)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text-strong)' }}>تنظيف أسنان</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>الثلاثاء 12 أغسطس · 5:00 م</div>
          </div>
          <StatusPill status="confirmed" showIcon={false} />
        </div>

        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--text-strong)', marginTop: 4 }}>حجز سريع</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {S.services.map(s => (
            <button key={s.name} onClick={() => go(1)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 999, background: 'var(--white)', border: '1.5px solid var(--border-subtle)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-body)' }}>
              <Icon name={s.icon} size={16} color="var(--brand)" />{s.name}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 'auto' }}><BottomNav /></div>
    </div>
  );
}

function BottomNav() {
  const items = [['home', 'الرئيسية', true], ['calendar-check', 'مواعيدي'], ['bell', 'الإشعارات'], ['user-round', 'حسابي']];
  return (
    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '10px 8px 18px', borderTop: '1px solid var(--border-subtle)', background: 'var(--white)' }}>
      {items.map(([ic, lb, on]) => (
        <div key={lb} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: on ? 'var(--brand)' : 'var(--text-muted)' }}>
          <Icon name={ic} size={21} />
          <span style={{ fontSize: 10.5, fontWeight: on ? 700 : 400 }}>{lb}</span>
        </div>
      ))}
    </div>
  );
}

function ActionBar({ label, hint, disabled, onClick, icon }) {
  return (
    <div style={{ flex: '0 0 auto', padding: '12px 18px 22px', borderTop: '1px solid var(--border-subtle)', background: 'var(--white)', display: 'flex', alignItems: 'center', gap: 12 }}>
      {hint && <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{hint.top}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text-strong)', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hint.main}</div>
      </div>}
      <button disabled={disabled} onClick={onClick} style={{ flex: hint ? '0 0 auto' : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 24px', borderRadius: 999, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .45 : 1, background: 'var(--brand)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, boxShadow: disabled ? 'none' : 'var(--shadow-brand)' }}>
        {label}{icon && <Icon name={icon} size={19} color="#fff" />}
      </button>
    </div>
  );
}

function BookingApp({ step, sel, setStep, setSel }) {
  const set = (k, v) => setSel(s => ({ ...s, [k]: v }));
  const canNext = [null, sel.branch, sel.service, sel.doctor, sel.time][step] != null || step === 5;

  if (step === 0) return (<><HomeScreen go={setStep} /></>);
  if (step === 6) return <TicketScreen onReset={() => { setSel({}); setStep(0); }} onReminder={() => setStep(7)} />;
  if (step === 7) return <ReminderScreen onBack={() => setStep(6)} />;

  return (
    <>
      <StatusBar />
      <AppBar step={step} onBack={() => setStep(step - 1)} />
      {step === 1 && <div style={scroll}>
        {S.branches.map(b => (
          <Tile key={b.name} selected={sel.branch === b.name} onClick={() => set('branch', b.name)}>
            <Ring icon="map-pin" />
            <div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text-strong)' }}>{b.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{b.dist} · {b.hours}</div></div>
          </Tile>
        ))}
      </div>}
      {step === 2 && <div style={{ ...scroll, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignContent: 'start' }}>
        {S.services.map(s => {
          const on = sel.service === s.name;
          return (
            <button key={s.name} onClick={() => set('service', s.name)} style={{ textAlign: 'start', padding: 15, borderRadius: 20, cursor: 'pointer', background: 'var(--white)', border: on ? '2px solid var(--brand)' : '1.5px solid var(--border-subtle)', boxShadow: on ? 'var(--shadow-focus)' : 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Ring icon={s.icon} tone="var(--amber-600)" />
              <div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text-strong)' }}>{s.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.dur} · {s.price} ج</div></div>
            </button>
          );
        })}
      </div>}
      {step === 3 && <div style={scroll}>
        {S.doctors.map(dc => (
          <Tile key={dc.name} selected={sel.doctor === dc.name} onClick={() => set('doctor', dc.name)}>
            <Avatar name={dc.name} />
            <div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text-strong)' }}>{dc.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="star" size={13} color="var(--amber-500)" />{dc.rating} · {dc.next}</div></div>
          </Tile>
        ))}
      </div>}
      {step === 4 && <div style={{ ...scroll, gap: 16 }}>
        <div style={{ display: 'flex', gap: 9, overflowX: 'auto', paddingBottom: 4 }}>
          {S.dates.map(d => { const on = sel.date === `${d.d} ${d.mo}`; return (
            <button key={d.d} onClick={() => set('date', `${d.d} ${d.mo}`)} style={{ flex: '0 0 auto', width: 62, padding: '12px 0', borderRadius: 16, cursor: 'pointer', textAlign: 'center', background: on ? 'var(--brand)' : 'var(--white)', border: on ? '2px solid var(--brand)' : '1.5px solid var(--border-subtle)', color: on ? '#fff' : 'var(--text-body)' }}>
              <div style={{ fontSize: 11, opacity: .85 }}>{d.day}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22 }}>{d.d}</div>
            </button>); })}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--text-strong)' }}>الأوقات المتاحة</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {S.times.map(t => { const taken = t === S.takenTime; const on = sel.time === t; return (
            <button key={t} disabled={taken} onClick={() => set('time', t)} style={{ padding: '13px 0', borderRadius: 14, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, cursor: taken ? 'not-allowed' : 'pointer', opacity: taken ? .4 : 1, textDecoration: taken ? 'line-through' : 'none', background: on ? 'var(--brand)' : 'var(--white)', border: on ? '2px solid var(--brand)' : '1.5px solid var(--border-subtle)', color: on ? '#fff' : 'var(--text-body)' }}>{t}</button>); })}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="info" size={14} />المواعيد المشطوبة محجوزة بالفعل.</div>
      </div>}
      {step === 5 && <div style={{ ...scroll, gap: 14 }}>
        <div style={{ background: 'var(--white)', borderRadius: 20, border: '1.5px solid var(--border-subtle)', padding: '6px 18px' }}>
          <Row icon="map-pin" label="الفرع" value={sel.branch} />
          <Row icon="sparkles" label="الخدمة" value={sel.service} />
          <Row icon="stethoscope" label="الطبيب" value={sel.doctor} />
          <Row icon="calendar" label="التاريخ" value={sel.date} />
          <Row icon="clock" label="الوقت" value={sel.time} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 20, background: 'var(--brand-subtle)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--teal-800)' }}>الإجمالي</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: 'var(--teal-800)' }}>600 ج</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 14, borderRadius: 16, background: 'var(--accent-subtle)', color: 'var(--amber-700)', fontSize: 13 }}>
          <Icon name="bell" size={18} />سنذكّرك قبل الموعد بـ 24 ساعة وقبل ساعة واحدة.
        </div>
      </div>}

      {step >= 1 && step <= 4 && <ActionBar label="التالي" icon="chevron-left" disabled={!canNext} onClick={() => setStep(step + 1)} />}
      {step === 5 && <ActionBar label="تأكيد الحجز" icon="check" onClick={() => setStep(6)} />}
    </>
  );
}

function Row({ icon, label, value }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid var(--border-subtle)' }}>
    <Icon name={icon} size={18} color="var(--text-muted)" />
    <span style={{ color: 'var(--text-muted)', fontSize: 13, width: 56 }}>{label}</span>
    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-strong)', marginInlineStart: 'auto' }}>{value || '—'}</span>
  </div>;
}

function TicketScreen({ onReset, onReminder }) {
  const c = S.chosen;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'linear-gradient(170deg,var(--teal-600),var(--teal-700))' }}>
      <StatusBar dark />
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fff', color: 'var(--green-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={30} stroke={3} /></div>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: '#fff', marginTop: 14 }}>تم تأكيد موعدك</div>
        <div style={{ color: 'rgba(255,255,255,.85)', fontSize: 13, marginTop: 4 }}>احتفظ بالتذكرة — رمز الحجز {c.code}</div>

        <div style={{ position: 'relative', width: '100%', marginTop: 22, background: '#fff', borderRadius: 24, padding: 20, boxShadow: '0 24px 40px -18px rgba(0,0,0,.35)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 16 }}>
            <Ring icon="sparkles" tone="var(--amber-600)" />
            <div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text-strong)', fontSize: 17 }}>{c.service}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.doctor}</div></div>
            <div style={{ marginInlineStart: 'auto' }}><StatusPill status="confirmed" /></div>
          </div>
          <div style={{ position: 'relative', borderTop: '2px dashed var(--border-default)', margin: '0 -20px' }}>
            <span style={{ position: 'absolute', top: -11, insetInlineStart: -11, width: 22, height: 22, borderRadius: '50%', background: 'var(--teal-700)' }} />
            <span style={{ position: 'absolute', top: -11, insetInlineEnd: -11, width: 22, height: 22, borderRadius: '50%', background: 'var(--teal-700)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingTop: 18 }}>
            <TicketCell label="التاريخ" value={`${c.day} ${c.date}`} />
            <TicketCell label="الوقت" value={c.time} />
            <TicketCell label="الفرع" value={c.branch} />
            <TicketCell label="رمز الحجز" value={c.code} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 16, color: 'rgba(255,255,255,.92)', fontSize: 13 }}>
          <Icon name="bell" size={17} color="#fff" />سيصلك تذكير قبل 24 ساعة وقبل ساعة واحدة.
        </div>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
          <button onClick={onReminder} style={{ padding: '14px', borderRadius: 999, border: 'none', cursor: 'pointer', background: '#fff', color: 'var(--teal-700)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Icon name="message-circle" size={18} color="var(--whatsapp)" />شاهد رسالة التذكير</button>
          <button onClick={onReset} style={{ padding: '13px', borderRadius: 999, border: '1.5px solid rgba(255,255,255,.5)', cursor: 'pointer', background: 'transparent', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>حجز موعد آخر</button>
        </div>
      </div>
    </div>
  );
}
function TicketCell({ label, value }) {
  return <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text-strong)', fontSize: 15, marginTop: 2 }}>{value}</div></div>;
}

function ReminderScreen({ onBack }) {
  const c = S.chosen;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg,#0b1f1f,#06181f)' }}>
      <StatusBar dark />
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 18px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.9)', marginTop: 4 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 46 }}>٤:٠٠</div>
          <div style={{ fontSize: 13, opacity: .8 }}>الإثنين، 11 أغسطس</div>
        </div>
        {/* Push notification card */}
        <div style={{ marginTop: 20, background: 'rgba(255,255,255,.14)', backdropFilter: 'blur(8px)', borderRadius: 20, padding: 14, color: '#fff', border: '1px solid rgba(255,255,255,.16)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, opacity: .85, marginBottom: 6 }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 10 }}>م</div>
            ميعاد · الآن
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15 }}>تذكير بموعدك</div>
          <div style={{ fontSize: 13, opacity: .92, marginTop: 2 }}>مرحباً {S.patient.name}، نذكّرك بأن لديك موعداً غداً {c.time}.</div>
        </div>
        {/* WhatsApp bubble */}
        <div style={{ marginTop: 22, background: 'rgba(255,255,255,.06)', borderRadius: 20, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,.85)', fontSize: 12, marginBottom: 10 }}>
            <Icon name="message-circle" size={16} color="var(--whatsapp)" />WhatsApp · ميعاد
          </div>
          <div style={{ background: '#dcf8c6', color: '#0b2e13', borderRadius: '16px 16px 4px 16px', padding: '12px 14px', fontSize: 13.5, lineHeight: 1.7, boxShadow: '0 2px 6px rgba(0,0,0,.15)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: 6 }}>تذكير بموعدك</div>
            مرحباً {S.patient.name}، نذكّرك بأن لديك موعداً غداً.<br />
            الخدمة: {c.service}<br />
            الطبيب: {c.doctor}<br />
            التاريخ: {c.date}<br />
            الوقت: {c.time}<br />
            الفرع: {c.branch}<br />
            <span style={{ display: 'block', marginTop: 6 }}>نتمنى لك السلامة.</span>
            <div style={{ textAlign: 'start', fontSize: 11, color: '#5a7a52', marginTop: 6 }}>✓✓ ٤:٠٠ م</div>
          </div>
        </div>
        <button onClick={onBack} style={{ marginTop: 'auto', alignSelf: 'center', padding: '11px 22px', borderRadius: 999, border: '1.5px solid rgba(255,255,255,.4)', background: 'transparent', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="chevron-right" size={18} color="#fff" />رجوع للتذكرة
        </button>
      </div>
    </div>
  );
}

export { PhoneFrame, BookingApp };
