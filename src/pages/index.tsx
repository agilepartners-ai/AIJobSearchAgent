import App from '../App';
import Seo from '../components/seo/Seo';
import { HOME_FAQ } from '../lib/seo/faq';
import { faqPage, organization, softwareApplication, website } from '../lib/seo/jsonld';
import { pageMeta } from '../lib/seo/site';

const HomePage = () => {
  const meta = pageMeta('/');
  return (
    <>
      <Seo
        path="/"
        jsonLd={[
          organization(),
          website(),
          softwareApplication({
            path: '/',
            description: meta.description,
            features: [
              'Résumé tailored to a specific job description',
              'Match analysis with strengths, gaps and keywords',
              'Matching cover letter',
              'Résumé editor with 12 templates, PDF and LaTeX export',
              'Application tracker',
              'AI mock interview',
            ],
          }),
          faqPage(HOME_FAQ),
        ]}
      />
      <App />
    </>
  );
};

export default HomePage;
