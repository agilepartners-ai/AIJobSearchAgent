import JobSearchPage from '../components/pages/JobSearchPage';
import { NoIndex } from '../components/seo/Seo';

const JobSearch = () => {
  return <JobSearchPage />;
};

export default function JobSearchRoute() {
  return (
    <>
      <NoIndex title="Job search" />
      <JobSearch />
    </>
  );
}
