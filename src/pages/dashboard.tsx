import Dashboard from '../components/dashboard/DashboardMain';
import { NoIndex } from '../components/seo/Seo';

const DashboardPage = () => {
  return (
    <>
      <Dashboard />
    </>
  );
};

export default function DashboardPageRoute() {
  return (
    <>
      <NoIndex title="Dashboard" />
      <DashboardPage />
    </>
  );
}
