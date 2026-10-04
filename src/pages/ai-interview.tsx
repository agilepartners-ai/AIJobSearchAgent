import AIInterviewPage from '../components/pages/AIInterviewPage';
import { NoIndex } from '../components/seo/Seo';

const AIInterview = () => {
  return <AIInterviewPage />;
};

export default function AIInterviewRoute() {
  return (
    <>
      <NoIndex title="AI mock interview" />
      <AIInterview />
    </>
  );
}
