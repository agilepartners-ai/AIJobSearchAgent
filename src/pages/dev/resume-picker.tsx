/**
 * Development-only harness: the template picker for a generated resume, and the
 * resume card, rendered without Firestore. Not built in production.
 */
import type { GetStaticProps } from 'next';
import React from 'react';
import ResumeCard from '../../components/resume/ResumeCard';
import TemplateCard from '../../components/resume/TemplateCard';
import { createLongSampleResume } from '../../lib/resume/defaults';
import { PRESETS } from '../../lib/resume/presets';

export const getStaticProps: GetStaticProps = async () =>
  process.env.NODE_ENV === 'production' ? { notFound: true } : { props: {} };

export default function ResumePickerHarness() {
  const doc = React.useMemo(() => {
    const d = createLongSampleResume('harbor');
    d.title = 'React Developer – Acme';
    d.ai = {
      jobTitle: 'React Developer', company: 'Acme',
      analysis: { match_score: 68, strengths: [], gaps: [], suggestions: [], present_keywords: [], missing_keywords: [] },
      coverLetter: { tex: '', url: '', path: '' },
    };
    return d;
  }, []);
  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
      <div className="mb-6 w-56">
        <ResumeCard resume={doc} onOpen={() => undefined} onDuplicate={() => undefined} onDelete={() => undefined} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PRESETS.map((p) => (
          <TemplateCard key={p.id} preset={p} document={doc} onSelect={() => undefined} />
        ))}
      </div>
    </div>
  );
}
