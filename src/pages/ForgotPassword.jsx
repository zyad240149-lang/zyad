import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth/AuthContext.jsx';

const { Icon, Button, Field, Input, Alert } = window.MeaadDesignSystem_54b82a;
const font = 'var(--font-display)';

const STYLE = `
  .shell{min-height:100vh;display:flex}
  .brand-panel{flex:1 1 46%;background:linear-gradient(160deg,var(--teal-800),var(--teal-900));position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;padding:48px}
  .form-panel{flex:1 1 54%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px}
  @media (max-width:880px){ .brand-panel{display:none} .form-panel{flex:1 1 100%} }
  .otp-input{width:48px;height:56px;text-align:center;font-size:22px;border-radius:14px;border:1.5px solid var(--border-default);font-family:var(--font-display);font-weight:800;color:var(--text-strong);outline:none;transition:border-color .15s ease, box-shadow .15s ease}
  .otp-input:focus{border-color:var(--brand);box-shadow:var(--shadow-focus)}
`;

function BrandPanel() {
  return (
    <div className="brand-panel">
      <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'var(--brand)', opacity: .22, filter: 'blur(60px)', top: -60, insetInlineStart: -60 }} />
      <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'var(--amber-500)', opacity: .16, filter: 'blur(50px)', bottom: -40, insetInlineEnd: -20 }} />
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, fontWeight: 900, fontSize: 20, boxShadow: 'var(--shadow-brand)' }}>م</div>
        <span style={{ fontFamily: font, fontWeight: 900, fontSize: 20, color: '#fff' }}>ميعاد</span>
      </Link>
      <div style={{ position: 'relative' }}>
        <h1 style={{ fontFamily: font, fontWeight: 900, fontSize: 34, lineHeight: 1.3, color: '#fff', margin: 0, maxWidth: 380 }}>استرجع حسابك</h1>
        <p style={{ color: 'rgba(255,255,255,.72)', fontSize: 15, lineHeight: 1.8, marginTop: 12, maxWidth: 360 }}>سنتأكد من رقم هاتفك بكود عبر SMS، ثم تختار كلمة مرور جديدة.</p>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,.6)', fontSize: 12.5 }}>
        <Icon name="shield-check" size={14} color="var(--amber-500)" />بياناتك محمية دائماً
      </div>
    </div>
  );
}

function OtpBoxes({ value, onChange, length = 6 }) {
  const refs = useRef([]);
  const set = (i, v) => {
    if (!/^[0-9]?$/.test(v)) return;
    const next = value.split(''); next[i] = v; onChange(next.join(''));
    if (v && refs.current[i + 1]) refs.current[i + 1].focus();
  };
  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !value[i] && refs.current[i - 1]) refs.current[i - 1].focus();
  };
  return (
    <div dir="ltr" style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {Array.from({ length }).map((_, i) => (
        <input key={i} ref={el => refs.current[i] = el} className="otp-input" inputMode="numeric" maxLength={1}
          value={value[i] || ''} onChange={e => set(i, e.target.value)} onKeyDown={e => onKeyDown(i, e)} />
      ))}
    </div>
  );
}

function PhoneStep({ onSent }) {
  const { requestOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const normalized = await requestOtp(phone);
      onSent(normalized);
    } catch (e) {
      setError(e.message || 'تعذّر إرسال الكود، حاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: 400 }}>
      <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 26 }}>
        <Icon name="arrow-right" size={16} />رجوع لتسجيل الدخول
      </Link>
      <h1 style={{ fontFamily: font, fontWeight: 900, fontSize: 27, color: 'var(--text-strong)', margin: 0 }}>نسيت كلمة المرور؟</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14.5, marginTop: 8 }}>أدخل رقم هاتفك المسجّل وسنرسل لك كود تحقق.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 26 }}>
        <Field label="رقم الهاتف">
          <Input iconStart="phone" placeholder="01xx xxx xxxx" value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" />
        </Field>
        {error && <Alert tone="danger">{error}</Alert>}
        <Button block size="lg" disabled={!phone || busy} onClick={submit}>{busy ? 'جارِ الإرسال…' : 'إرسال كود التحقق'}</Button>
      </div>
    </div>
  );
}

function OtpStep({ phone, onBack, onVerified }) {
  const { requestOtp, verifyOtp } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(45);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await verifyOtp(phone, code);
      onVerified();
    } catch (e) {
      setError(e.message || 'الكود غير صحيح أو انتهت صلاحيته.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError('');
    try {
      await requestOtp(phone);
      setSeconds(45);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13.5, fontWeight: 700, padding: 0, marginBottom: 18 }}>
        <Icon name="chevron-right" size={16} />رجوع
      </button>
      <div style={{ width: 60, height: 60, borderRadius: 18, background: 'var(--brand-subtle)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
        <Icon name="shield-check" size={28} />
      </div>
      <h1 style={{ fontFamily: font, fontWeight: 900, fontSize: 22, color: 'var(--text-strong)', margin: 0 }}>أدخل كود التحقق</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.75, marginTop: 8 }}>أرسلنا رمزاً من 6 أرقام برسالة SMS إلى <b dir="ltr" style={{ color: 'var(--text-strong)' }}>{phone}</b></p>

      <div style={{ marginTop: 24 }}><OtpBoxes value={code} onChange={setCode} /></div>
      {error && <div style={{ marginTop: 16 }}><Alert tone="danger">{error}</Alert></div>}

      <div style={{ marginTop: 18, fontSize: 13.5, color: 'var(--text-muted)' }}>
        {seconds > 0
          ? <span>إعادة إرسال الكود خلال <b style={{ color: 'var(--text-strong)', fontFamily: font }}>0:{String(seconds).padStart(2, '0')}</b></span>
          : <button onClick={resend} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-link)', fontWeight: 700, fontSize: 13.5 }}>إعادة إرسال الكود</button>}
      </div>

      <Button block size="lg" disabled={code.length < 6 || busy} style={{ marginTop: 22 }} onClick={submit}>{busy ? 'جارِ التحقق…' : 'تأكيد ومتابعة'}</Button>
    </div>
  );
}

function NewPasswordStep({ onDone }) {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    if (password.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل.'); return; }
    if (password !== confirm) { setError('كلمتا المرور غير متطابقتين.'); return; }
    setBusy(true);
    try {
      await updatePassword(password);
      onDone();
    } catch (e) {
      setError(e.message || 'تعذّر تحديث كلمة المرور.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
      <div style={{ width: 60, height: 60, borderRadius: 18, background: 'var(--brand-subtle)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
        <Icon name="lock" size={28} />
      </div>
      <h1 style={{ fontFamily: font, fontWeight: 900, fontSize: 22, color: 'var(--text-strong)', margin: 0 }}>اختر كلمة مرور جديدة</h1>
      <div style={{ marginTop: 22, textAlign: 'start', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="كلمة المرور الجديدة" hint="6 أحرف على الأقل">
          <Input iconStart="lock" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} dir="ltr" />
        </Field>
        <Field label="تأكيد كلمة المرور">
          <Input iconStart="lock" type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} dir="ltr" />
        </Field>
      </div>
      {error && <div style={{ marginTop: 14 }}><Alert tone="danger">{error}</Alert></div>}
      <Button block size="lg" disabled={!password || !confirm || busy} style={{ marginTop: 20 }} onClick={submit}>{busy ? 'جارِ الحفظ…' : 'حفظ كلمة المرور'}</Button>
    </div>
  );
}

function ForgotPasswordFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState('phone'); // phone | otp | password
  const [phone, setPhone] = useState('');

  if (step === 'phone') return <PhoneStep onSent={p => { setPhone(p); setStep('otp'); }} />;
  if (step === 'otp') return <OtpStep phone={phone} onBack={() => setStep('phone')} onVerified={() => setStep('password')} />;
  return <NewPasswordStep onDone={() => navigate('/account')} />;
}

export default function ForgotPassword() {
  return (
    <div className="shell">
      <style>{STYLE}</style>
      <BrandPanel />
      <div className="form-panel"><ForgotPasswordFlow /></div>
    </div>
  );
}
