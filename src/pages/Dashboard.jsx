import AdminDashboard from '../components/Admin.jsx';

export default function Dashboard() {
  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      <AdminDashboard initialTab="agenda" />
    </div>
  );
}
