import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, toLocalPhone, normalizeEgyptPhone } from '../lib/auth/AuthContext.jsx';
import { listBranches, listServices, listDoctors, updateCustomer } from '../lib/api/reference.js';
import { createAppointment, listTakenTimes } from '../lib/api/appointments.js';
import { getDoctorSchedule, computeSlotsForDay, listDoctorServices } from '../lib/api/availability.js';
import { formatArabicTime } from '../lib/time.js';
import Countdown from '../components/Countdown.jsx';

const { Icon, Button, Card, Alert, Field, Select, Input } = window.MeaadDesignSystem_54b82a;
const font = 'var(--font-display)';

// Logged-in-only booking flow, reached from the customer's own account page.
// 1) service + appointment time  2) confirm your details + payment  3) confirmation.
const STEP_LABELS = ['الخدمة والميعاد', 'بياناتك والدفع', 'التأكيد'];

const STYLE = `.wrap-book{max-width:640px;margin:0 auto;padding:0 20px 60px}`;

function Ring({ icon, tone = 'var(--brand)' }) {
  return <div style={{ width: 40, height: 40, borderRadius: 13, flex: '0 0 auto', background: `color-mix(in srgb, ${tone} 13%, white)`, color: tone, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={19} /></div>;
}

function StepHeader({ step, onBack }) {
  return (
    <div style={{ padding: '26px 0 18px' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13.5, fontWeight: 700, padding: 0, marginBottom: 14 }}>
        <Icon name="chevron-right" size={16} />رجوع
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {STEP_LABELS.map((label, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: i < STEP_LABELS.length - 1 ? 1 : '0 0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 26, height: 26, borderRadius: '50%', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, fontWeight: 800, fontSize: 12.5, background: i <= step ? 'var(--brand)' : 'var(--surface-sunken)', color: i <= step ? '#fff' : 'var(--text-muted)' }}>{i + 1}</span>
              <span style={{ fontFamily: font, fontWeight: 700, fontSize: 13, color: i <= step ? 'var(--text-strong)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && <div style={{ height: 2, flex: 1, background: i < step ? 'var(--brand)' : 'var(--surface-sunken)' }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionBar({ label, disabled, busy, onClick }) {
  return (
    <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid var(--border-subtle)', padding: '14px 0', marginTop: 20 }}>
      <Button block size="lg" disabled={disabled || busy} onClick={onClick}>{busy ? 'جارِ التنفيذ…' : label}</Button>
    </div>
  );
}

function Row({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderTop: '1px solid var(--border-subtle)' }}>
      <Icon name={icon} size={18} color="var(--text-muted)" />
      <span style={{ color: 'var(--text-muted)', fontSize: 13, width: 60 }}>{label}</span>
      <span style={{ fontFamily: font, fontWeight: 700, color: 'var(--text-strong)', marginInlineStart: 'auto' }}>{value || '—'}</span>
    </div>
  );
}

function SuccessScreen({ appointment, onDone }) {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(170deg,var(--teal-600),var(--teal-700))', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px' }}>
      <div style={{ width: 74, height: 74, borderRadius: '50%', background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#fff', color: 'var(--green-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={30} stroke={3} /></div>
      </div>
      <div style={{ fontFamily: font, fontWeight: 900, fontSize: 25, color: '#fff', marginTop: 16 }}>تم تأكيد موعدك</div>
      <div style={{ color: 'rgba(255,255,255,.85)', fontSize: 13.5, marginTop: 4 }}>سنبلغك عند تأكيد الإدارة له</div>

      <div style={{ width: '100%', maxWidth: 380, marginTop: 24, background: '#fff', borderRadius: 22, padding: 20, boxShadow: '0 24px 40px -18px rgba(0,0,0,.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 14 }}>
          <Ring icon="sparkles" tone="var(--amber-600)" />
          <div>
            <div style={{ fontFamily: font, fontWeight: 800, color: 'var(--text-strong)', fontSize: 16 }}>{appointment.service}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{appointment.doctor}</div>
          </div>
        </div>
        <div style={{ borderTop: '2px dashed var(--border-default)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, paddingTop: 16 }}>
          <div><div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>التاريخ</div><div style={{ fontFamily: font, fontWeight: 800, color: 'var(--text-strong)', fontSize: 14.5 }}>{appointment.date}</div></div>
          <div><div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>الوقت</div><div style={{ fontFamily: font, fontWeight: 800, color: 'var(--text-strong)', fontSize: 14.5 }}>{formatArabicTime(appointment.time)}</div></div>
          <div><div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>الفرع</div><div style={{ fontFamily: font, fontWeight: 800, color: 'var(--text-strong)', fontSize: 14.5 }}>{appointment.branch}</div></div>
          <div><div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>السعر</div><div style={{ fontFamily: font, fontWeight: 800, color: 'var(--text-strong)', fontSize: 14.5 }}>{appointment.price != null ? `${appointment.price} ج` : '—'}</div></div>
        </div>
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 6 }}>الوقت المتبقي حتى الموعد</div>
          <Countdown date={appointment.date} time={appointment.time} size="lg" style={{ justifyContent: 'center' }} />
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22 }}>
        <button onClick={onDone} style={{ padding: 14, borderRadius: 999, border: 'none', cursor: 'pointer', background: '#fff', color: 'var(--teal-700)', fontFamily: font, fontWeight: 800, fontSize: 15 }}>الذهاب لحسابي</button>
      </div>
    </div>
  );
}

export default function Book() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [step, setStep] = useState(0);
  const [loadingLists, setLoadingLists] = useState(true);
  const [branches, setBranches] = useState([]);
  const [services, setServices] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [branchId, setBranchId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('');

  const [contactName, setContactName] = useState(() => profile?.name || '');
  const [contactPhone, setContactPhone] = useState(() => toLocalPhone(profile?.phone));

  const [checkingTimes, setCheckingTimes] = useState(false);
  const [takenTimes, setTakenTimes] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [doctorServices, setDoctorServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  useEffect(() => {
    Promise.all([listBranches(), listServices(), listDoctors()])
      .then(([b, s, d]) => { setBranches(b); setServices(s); setDoctors(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoadingLists(false));
  }, []);

  // The doctor's actual weekly schedule — slots offered are derived from this rather
  // than a fixed list, so it reflects whatever hours the doctor actually set.
  useEffect(() => {
    if (!doctorId) { setSchedule(null); return; }
    getDoctorSchedule(doctorId).then(setSchedule).catch(() => setSchedule(null));
  }, [doctorId]);

  // Only the services this specific doctor actually performs — a service list scoped
  // by specialty (e.g. an orthopedist never offers teeth cleaning).
  useEffect(() => {
    if (!doctorId) { setDoctorServices([]); return; }
    setLoadingServices(true);
    listDoctorServices(doctorId)
      .then(list => setDoctorServices(list.filter(s => s.enabled)))
      .catch(() => setDoctorServices([]))
      .finally(() => setLoadingServices(false));
  }, [doctorId]);

  useEffect(() => {
    if (!doctorId || !date) { setTakenTimes([]); return; }
    setCheckingTimes(true);
    listTakenTimes({ doctorId, date })
      .then(list => { setTakenTimes(list); setTime(t => (t && list.includes(t) ? '' : t)); })
      .catch(() => setTakenTimes([]))
      .finally(() => setCheckingTimes(false));
  }, [doctorId, date]);

  useEffect(() => {
    if (!profile) return;
    setContactName(n => n || profile.name || '');
    setContactPhone(p => p || toLocalPhone(profile.phone));
  }, [profile]);

  const branch = branches.find(b => b.id === branchId);
  const service = services.find(s => s.id === serviceId);
  const doctor = doctors.find(d => d.id === doctorId);
  const doctorsInBranch = branchId ? doctors.filter(d => !d.branch_id || d.branch_id === branchId) : doctors;
  const slotMinutes = service?.duration_minutes || 30;
  const daySlots = schedule ? computeSlotsForDay(schedule, date, slotMinutes) : [];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + (doctor?.max_advance_days ?? 30));

  const back = () => { if (step === 0) navigate('/account'); else setStep(step - 1); };

  const hasVerifiedPhone = !!profile?.phone;

  const confirm = async () => {
    setError('');
    if (!hasVerifiedPhone && !normalizeEgyptPhone(contactPhone)) {
      setError('رقم الهاتف غير صحيح. استخدم صيغة مصرية مثل 01xxxxxxxxx.');
      return;
    }
    setSaving(true);
    try {
      // The phone entered here is contact info for this booking only — it does NOT
      // become the account's login phone (that must stay unique per account; this
      // field doesn't, since the same number can be a booking contact for several accounts).
      if (contactName.trim() && contactName.trim() !== (profile?.name || '')) {
        await updateCustomer(profile.id, { name: contactName.trim() });
      }
      const appt = await createAppointment({
        customerId: profile.id,
        customerName: contactName.trim(),
        customerPhone: contactPhone.trim(),
        branchId, serviceId, doctorId, date, time,
        status: 'pending',
        price: service?.price ?? null,
      });
      setCreated(appt);
    } catch (e) {
      setError(e.message || 'تعذّر إتمام الحجز.');
    } finally {
      setSaving(false);
    }
  };

  if (created) return <SuccessScreen appointment={created} onDone={() => navigate('/account')} />;

  if (loadingLists) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>جارِ التحميل…</div>;
  }

  const step1Ready = branchId && serviceId && doctorId && time;
  const step2Ready = contactName.trim() && contactPhone.trim() && (hasVerifiedPhone || !!normalizeEgyptPhone(contactPhone));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-page)' }}>
      <style>{STYLE}</style>
      <div className="wrap-book">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0 0' }}>
          <Link to="/account" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, fontWeight: 900, fontSize: 15 }}>م</div>
            <span style={{ fontFamily: font, fontWeight: 900, fontSize: 16, color: 'var(--text-strong)' }}>ميعاد</span>
          </Link>
        </div>

        <StepHeader step={step} onBack={back} />
        {error && <div style={{ marginBottom: 16 }}><Alert tone="danger">{error}</Alert></div>}

        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card padding={18}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label="الفرع">
                  <Select value={branchId} onChange={e => {
                    const nextBranchId = e.target.value;
                    setBranchId(nextBranchId);
                    if (doctor && doctor.branch_id && doctor.branch_id !== nextBranchId) { setDoctorId(''); setServiceId(''); setTime(''); }
                  }} placeholder="اختر الفرع">
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </Select>
                </Field>
                <Field label="الطبيب">
                  <Select value={doctorId} onChange={e => { setDoctorId(e.target.value); setServiceId(''); setTime(''); }} disabled={!branchId} placeholder={branchId ? 'اختر الطبيب' : 'اختر الفرع أولاً'}>
                    {doctorsInBranch.map(d => <option key={d.id} value={d.id}>{d.name}{d.specialty ? ` · ${d.specialty}` : ''}</option>)}
                  </Select>
                </Field>
                <Field label="الخدمة" hint={doctorId && !loadingServices && doctorServices.length === 0 ? 'هذا الطبيب لا يقدّم أي خدمة حالياً' : undefined}>
                  <Select value={serviceId} onChange={e => setServiceId(e.target.value)} disabled={!doctorId || loadingServices} placeholder={!doctorId ? 'اختر الطبيب أولاً' : (loadingServices ? 'جارِ التحميل…' : 'اختر الخدمة')}>
                    {doctorServices.map(s => <option key={s.id} value={s.id}>{s.name} · {s.price} ج</option>)}
                  </Select>
                </Field>
                <Field label="التاريخ">
                  <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} max={maxDate.toISOString().slice(0, 10)} onChange={e => { setDate(e.target.value); setTime(''); }}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--border-subtle)', fontFamily: font, fontWeight: 700, fontSize: 14, color: 'var(--text-strong)' }} />
                </Field>
              </div>
            </Card>

            {doctorId && (
              <div>
                <div style={{ fontFamily: font, fontWeight: 800, fontSize: 14, color: 'var(--text-strong)', marginBottom: 10 }}>الأوقات المتاحة</div>
                {daySlots.length === 0 ? (
                  <div style={{ padding: '18px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>لا توجد مواعيد متاحة في هذا اليوم — جرّب تاريخاً آخر.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                    {daySlots.map(t => {
                      const on = time === t;
                      const isTaken = takenTimes.includes(t);
                      return (
                        <button key={t} disabled={isTaken} onClick={() => setTime(t)} style={{ padding: '13px 0', borderRadius: 14, fontFamily: font, fontWeight: 700, fontSize: 12.5, cursor: isTaken ? 'not-allowed' : 'pointer', opacity: isTaken ? .4 : 1, textDecoration: isTaken ? 'line-through' : 'none', background: on ? 'var(--brand)' : '#fff', border: on ? '2px solid var(--brand)' : '1.5px solid var(--border-subtle)', color: on ? '#fff' : 'var(--text-body)' }}>{formatArabicTime(t)}</button>
                      );
                    })}
                  </div>
                )}
                {checkingTimes && <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-muted)' }}>جارِ التحقق من التوفّر…</div>}
                {daySlots.length > 0 && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="info" size={14} />المواعيد المشطوبة محجوزة بالفعل.</div>}
              </div>
            )}

            <ActionBar label="التالي" disabled={!step1Ready} onClick={() => setStep(1)} />
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: 0 }}>أكّد بياناتك لهذا الحجز.</p>
            <Field label="الاسم بالكامل">
              <Input iconStart="user-round" placeholder="مثال: أحمد سامي" value={contactName} onChange={e => setContactName(e.target.value)} />
            </Field>
            <Field label="رقم الهاتف" hint={hasVerifiedPhone ? undefined : 'أضف رقم هاتفك لإتمام الحجز'}>
              <Input iconStart="phone" placeholder="01xx xxx xxxx" value={contactPhone} onChange={e => setContactPhone(e.target.value)} dir="ltr" disabled={hasVerifiedPhone} />
            </Field>

            <Card padding={0} style={{ overflow: 'hidden', marginTop: 4 }}>
              <div style={{ padding: '4px 18px' }}>
                <Row icon="map-pin" label="الفرع" value={branch?.name} />
                <Row icon="sparkles" label="الخدمة" value={service?.name} />
                <Row icon="stethoscope" label="الطبيب" value={doctor?.name} />
                <Row icon="calendar" label="التاريخ" value={date} />
                <Row icon="clock" label="الوقت" value={formatArabicTime(time)} />
              </div>
            </Card>

            <div>
              <div style={{ fontFamily: font, fontWeight: 800, fontSize: 14, color: 'var(--text-strong)', marginBottom: 10 }}>الدفع</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 18, background: 'var(--brand-subtle)' }}>
                <span style={{ fontFamily: font, fontWeight: 700, color: 'var(--teal-800)' }}>الإجمالي</span>
                <span style={{ fontFamily: font, fontWeight: 900, fontSize: 22, color: 'var(--teal-800)' }}>{service?.price ?? '—'} ج</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 14, borderRadius: 16, background: 'var(--surface-page)', color: 'var(--text-muted)', fontSize: 13, marginTop: 10 }}>
                <Icon name="wallet" size={18} />الدفع في العيادة عند الوصول.
              </div>
            </div>

            <ActionBar label="تأكيد الحجز" disabled={!step2Ready} busy={saving} onClick={confirm} />
          </div>
        )}
      </div>
    </div>
  );
}
