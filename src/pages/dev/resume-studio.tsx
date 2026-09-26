/**
 * Development-only harness for the Resume Studio view. Signed out there is no
 * resume list, but the template gallery renders exactly as it does in the
 * dashboard, which is what theming and layout changes need to be checked
 * against. Not built in production.
 */
import type { GetStaticProps } from 'next';
import React from 'react';
import ResumeStudioView from '../../components/dashboard/views/ResumeStudioView';

export const getStaticProps: GetStaticProps = async () =>
  process.env.NODE_ENV === 'production' ? { notFound: true } : { props: {} };

export default function ResumeStudioHarness() {
  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950">
      <ResumeStudioView uid="dev-harness" />
    </div>
  );
}
