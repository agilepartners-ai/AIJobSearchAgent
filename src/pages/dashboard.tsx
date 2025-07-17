import Dashboard from '../components/dashboard/DashboardMain';

const EnvDebugInfo = () => (
  <div style={{ background: '#222', color: '#fff', padding: '20px', margin: '20px', borderRadius: '10px', fontFamily: 'monospace' }}>
    <h2>Client-Side Environment Variables</h2>
    <p>NEXT_PUBLIC_FIREBASE_API_KEY: <strong>{process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Loaded' : 'MISSING'}</strong></p>
    <p>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: <strong>{process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'MISSING'}</strong></p>
    <p>NEXT_PUBLIC_FIREBASE_PROJECT_ID: <strong>{process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'MISSING'}</strong></p>
  </div>
);

const DashboardPage = () => {
  return (
    <>
      <EnvDebugInfo />
      <Dashboard />
    </>
  );
};

export default DashboardPage;
