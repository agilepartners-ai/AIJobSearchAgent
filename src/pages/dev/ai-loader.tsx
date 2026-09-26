/**
 * Development-only preview of the full-screen AI loader.
 * /dev/ai-loader?mode=generating&t=9000   (t skips ahead to a stage)
 * Not built in production.
 */
import type { GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import React from 'react';
import AiThinkingScreen from '../../components/ai/AiThinkingScreen';
import type { LoaderMode } from '../../lib/ai/loaderPhases';

export const getStaticProps: GetStaticProps = async () =>
  process.env.NODE_ENV === 'production' ? { notFound: true } : { props: {} };

export default function AiLoaderPreview() {
  const router = useRouter();
  if (!router.isReady) return null;
  const mode = (['generating', 'opening', 'recovering'].includes(String(router.query.mode)) ? router.query.mode : 'generating') as LoaderMode;
  return <AiThinkingScreen mode={mode} tip="Tip: tailor your resume to each job, rather than sending one version to everyone." />;
}
