import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth/AuthContext.jsx';

const { Icon } = window.MeaadDesignSystem_54b82a;

/** Redirects to /login (preserving the intended destination) when there's no session. */
export default function ProtectedRoute({ children, staffOnly = false }) {
  const { loading, user, isStaff } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 10, fontFamily: 'var(--font-body)' }}>
        <Icon name="loader" size={18} />جارِ التحقق من الجلسة…
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (staffOnly && !isStaff) {
    return <Navigate to="/account" replace />;
  }

  return children;
}
