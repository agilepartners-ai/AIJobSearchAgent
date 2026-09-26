/**
 * Development-only harness for the resume editor: the real editor over a
 * sample document, with saving switched off. Not built in production.
 */
import type { GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import React from 'react';
import ResumeEditorView from '../../components/resume/editor/ResumeEditorView';
import { createSampleResume } from '../../lib/resume/defaults';

export const getStaticProps: GetStaticProps = async () =>
  process.env.NODE_ENV === 'production' ? { notFound: true } : { props: {} };

export default function ResumeEditorHarness() {
  const router = useRouter();
  const preset = typeof router.query.preset === 'string' ? router.query.preset : 'harbor';
  const withAi = router.query.ai === '1';
  const doc = React.useMemo(() => {
    const d = createSampleResume(preset);
    if (withAi) {
      d.ai = {
        jobTitle: 'React Developer',
        company: 'Acme',
        analysis: {
          match_score: 68,
          strengths: ['Hands-on React and TypeScript experience'],
          gaps: ['No automated testing listed'],
          suggestions: ['Lead with the strongest project'],
          present_keywords: ['React', 'TypeScript'],
          missing_keywords: ['Jest', 'Cypress'],
        },
        coverLetter: { tex: '\clheader{A}{b}', url: 'about:blank', path: 'x' },
      };
    }
    return d;
  }, [preset, withAi]);

  if (!router.isReady) return null;
  return (
    <div className="h-screen bg-white dark:bg-slate-950">
      <ResumeEditorView uid={null} initial={doc} fresh={router.query.fresh === '1'} onBack={() => undefined} />
    </div>
  );
}
