import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth/AuthContext.jsx';

const { Icon, Button, Field, Input, Alert } = window.MeaadDesignSystem_54b82a;
const font = 'var(--font-display)';

const STYLE = `
  .shell{min-height:100vh;display:flex}
  .brand-panel{flex:1 1 46%;background:linear-gradient(160deg,var(--teal-900),#0b1414);position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;padding:48px}
  .form-panel{flex:1 1 54%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px}
  @media (max-width:880px){ .brand-panel{display:none} .form-panel{flex:1 1 100%} }
`;

const FEATURES = [
  ['layout-grid', 'مركز تحكم شامل لكل فروع عيادتك'],
  ['shield-check', 'صلاحيات مخصّصة لكل دور في الفريق'],
  ['bar-chart-3', 'تقارير ومتابعة فورية للحجوزات والإيرادات'],
];

function BrandPanel() {
  return (
    <div className="brand-panel">
      <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'var(--brand)', opacity: .18, filter: 'blur(60px)', top: -60, insetInlineStart: -60 }} />
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, fontWeight: 900, fontSize: 20, boxShadow: 'var(--shadow-brand)' }}>م</div>
        <span style={{ fontFamily: font, fontWeight: 900, fontSize: 20, color: '#fff' }}>ميعاد <span style={{ opacity: .6, fontWeight: 700 }}>· الإدارة</span></span>
      </Link>
      <div style={{ position: 'relative' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,.1)', padding: '5px 13px', borderRadius: 999, marginBottom: 16 }}>
          <Icon name="shield-check" size={13} color="var(--amber-500)" />بوابة الموظفين
        </span>
        <h1 style={{ fontFamily: font, fontWeight: 900, fontSize: 34, lineHeight: 1.3, color: '#fff', margin: 0, maxWidth: 380 }}>مركز تحكم عيادتك</h1>
        <p style={{ color: 'rgba(255,255,255,.72)', fontSize: 15, lineHeight: 1.8, marginTop: 12, maxWidth: 360 }}>هذه البوابة مخصّصة لفريق العيادة فقط.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 30 }}>
          {FEATURES.map(([ic, t]) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 34, height: 34, borderRadius: 11, background: 'rgba(255,255,255,.12)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><Icon name={ic} size={17} /></span>
              <span style={{ color: 'rgba(255,255,255,.92)', fontSize: 14 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'relative', fontSize: 12.5, color: 'rgba(255,255,255,.5)' }}>لا تملك حساب موظف؟ تواصل مع مدير العيادة لإضافتك.</div>
    </div>
  );
}

function AdminLoginForm() {
  const { signInWithPassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const { profile } = await signInWithPassword(phone, password);
      // This portal is staff-only — customers have their own login, kept separate
      // from this internal surface.
      if (!profile?.role || profile.role === 'customer') {
        await signOut();
        setError('هذا الحساب خاص بالعملاء. سجّل الدخول من صفحة العملاء.');
        return;
      }
      const redirect = params.get('redirect');
      navigate(redirect || '/dashboard');
    } catch (e) {
      setError(e.message === 'Invalid login credentials' ? 'رقم الهاتف أو كلمة المرور غير صحيحة.' : (e.message || 'تعذّر تسجيل الدخول، حاول مرة أخرى.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: 400 }}>
      <h1 style={{ fontFamily: font, fontWeight: 900, fontSize: 27, color: 'var(--text-strong)', margin: 0 }}>دخول الإدارة</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14.5, marginTop: 8 }}>سجّل الدخول برقم هاتفك وكلمة مرور حسابك الوظيفي.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 26 }}>
        <Field label="رقم الهاتف">
          <Input iconStart="phone" placeholder="01xx xxx xxxx" value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" />
        </Field>
        <Field label="كلمة المرور">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Input iconStart="lock" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} dir="ltr" />
            <button onClick={() => setShowPassword(s => !s)} style={{ position: 'absolute', insetInlineEnd: 12, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
              <Icon name={showPassword ? 'eye-off' : 'eye'} size={17} />
            </button>
          </div>
        </Field>
        <div style={{ textAlign: 'end' }}>
          <Link to="/forgot-password" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-link)' }}>نسيت كلمة المرور؟</Link>
        </div>
        {error && <Alert tone="danger">{error}</Alert>}
        <Button block size="lg" disabled={!phone || !password || busy} onClick={submit}>{busy ? 'جارِ الدخول…' : 'دخول'}</Button>
        <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-muted)' }}>
          عميل؟ <Link to="/login" style={{ color: 'var(--text-link)', fontWeight: 700 }}>سجّل الدخول من هنا</Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <div className="shell">
      <style>{STYLE}</style>
      <BrandPanel />
      <div className="form-panel"><AdminLoginForm /></div>
    </div>
  );
}
