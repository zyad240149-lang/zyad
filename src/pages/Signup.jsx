import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth/AuthContext.jsx';

const { Icon, Button, Field, Input, Alert } = window.MeaadDesignSystem_54b82a;
const font = 'var(--font-display)';

const STYLE = `
  .shell{min-height:100vh;display:flex}
  .brand-panel{flex:1 1 46%;background:linear-gradient(160deg,var(--teal-800),var(--teal-900));position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;padding:48px}
  .form-panel{flex:1 1 54%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px}
  @media (max-width:880px){ .brand-panel{display:none} .form-panel{flex:1 1 100%} }
`;

const BENEFITS = [
  ['calendar-check', 'احجز في عيادتك المفضّلة في أقل من دقيقة'],
  ['shield-check', 'تحقق تلقائي يمنع تعارض الحجوزات'],
  ['bell-ring', 'تذكير تلقائي بموعدك عبر واتساب وSMS'],
];

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
        <h1 style={{ fontFamily: font, fontWeight: 900, fontSize: 34, lineHeight: 1.3, color: '#fff', margin: 0, maxWidth: 380 }}>ابدأ معنا — أنشئ حسابك</h1>
        <p style={{ color: 'rgba(255,255,255,.72)', fontSize: 15, lineHeight: 1.8, marginTop: 12, maxWidth: 360 }}>اسمك ورقم هاتفك وكلمة مرور، وخلاص.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 30 }}>
          {BENEFITS.map(([ic, t]) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 34, height: 34, borderRadius: 11, background: 'rgba(255,255,255,.12)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><Icon name={ic} size={17} /></span>
              <span style={{ color: 'rgba(255,255,255,.92)', fontSize: 14 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,.6)', fontSize: 12.5 }}>
        <Icon name="star" size={14} color="var(--amber-500)" />تقييم 4.9 من أكثر من 120 عيادة
      </div>
    </div>
  );
}

function SignupForm() {
  const { signUpWithPassword, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const submitGoogle = async () => {
    setError('');
    setGoogleBusy(true);
    try {
      await signInWithGoogle('/account');
    } catch (e) {
      setError(e.message || 'تعذّر التسجيل بحساب Google.');
      setGoogleBusy(false);
    }
  };

  const submit = async () => {
    setError('');
    if (password.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل.'); return; }
    if (password !== confirm) { setError('كلمتا المرور غير متطابقتين.'); return; }
    setBusy(true);
    try {
      await signUpWithPassword(phone, password, { name: name.trim() });
      navigate('/account');
    } catch (e) {
      setError(e.message === 'User already registered' ? 'رقم الهاتف مسجّل بالفعل — سجّل الدخول بدلاً من ذلك.' : (e.message || 'تعذّر إنشاء الحساب، حاول مرة أخرى.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: 400 }}>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 26 }}>
        <Icon name="arrow-right" size={16} />العودة للرئيسية
      </Link>

      <h1 style={{ fontFamily: font, fontWeight: 900, fontSize: 27, color: 'var(--text-strong)', margin: 0 }}>إنشاء حساب</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14.5, marginTop: 8 }}>أدخل بياناتك لإنشاء حسابك في ميعاد، ثم احجز موعدك من صفحتك.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 26 }}>
        <Field label="الاسم بالكامل">
          <Input iconStart="user-round" placeholder="مثال: أحمد سامي" value={name} onChange={e => setName(e.target.value)} />
        </Field>
        <Field label="رقم الهاتف">
          <Input iconStart="phone" placeholder="01xx xxx xxxx" value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" />
        </Field>
        <Field label="كلمة المرور" hint="6 أحرف على الأقل">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Input iconStart="lock" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} dir="ltr" />
            <button onClick={() => setShowPassword(s => !s)} style={{ position: 'absolute', insetInlineEnd: 12, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
              <Icon name={showPassword ? 'eye-off' : 'eye'} size={17} />
            </button>
          </div>
        </Field>
        <Field label="تأكيد كلمة المرور">
          <Input iconStart="lock" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} dir="ltr" />
        </Field>
        {error && <Alert tone="danger">{error}</Alert>}
        <Button block size="lg" disabled={!name.trim() || !phone || !password || !confirm || busy} onClick={submit}>{busy ? 'جارِ الإنشاء…' : 'إنشاء الحساب'}</Button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-muted)', fontSize: 12.5 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          أو
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
        </div>

        <button
          onClick={submitGoogle}
          disabled={googleBusy}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '11px 16px', borderRadius: 'var(--radius-md, 10px)', border: '1px solid var(--border-subtle)', background: '#fff', color: 'var(--text-strong)', fontSize: 14, fontWeight: 700, cursor: googleBusy ? 'default' : 'pointer', opacity: googleBusy ? .7 : 1 }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
          </svg>
          {googleBusy ? 'جارِ التحويل…' : 'المتابعة بحساب Google'}
        </button>

        <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-muted)' }}>
          بالمتابعة أنت توافق على <a href="#">الشروط</a> و<a href="#">سياسة الخصوصية</a>
        </div>
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          لديك حساب بالفعل؟ <Link to="/login" style={{ color: 'var(--text-link)', fontWeight: 700 }}>تسجيل الدخول</Link>
        </div>
      </div>
    </div>
  );
}

export default function Signup() {
  return (
    <div className="shell">
      <style>{STYLE}</style>
      <BrandPanel />
      <div className="form-panel"><SignupForm /></div>
    </div>
  );
}
