import JobListingsPage from '../components/pages/JobListingsPage';
import { NoIndex } from '../components/seo/Seo';

const JobListings = () => {
  return <JobListingsPage />;
};

export default function JobListingsRoute() {
  return (
    <>
      <NoIndex title="Job listings" />
      <JobListings />
    </>
  );
}
