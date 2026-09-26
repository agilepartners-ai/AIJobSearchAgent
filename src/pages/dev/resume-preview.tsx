/**
 * Development-only harness for the resume preview.
 *
 *   /dev/resume-preview?preset=atlas
 *
 * Renders the sample resume in a preset and publishes the computed page layout
 * on window.__resumeLayout, which the parity check compares against the PDF
 * that Texapi compiles from the same document. Not built in production.
 */
import type { GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import ResumePreview, { type PreviewLayout } from '../../components/resume/ResumePreview';
import { createLongSampleResume, createSampleResume } from '../../lib/resume/defaults';
import { PRESETS } from '../../lib/resume/presets';
import { buildView } from '../../lib/resume/view';

export const getStaticProps: GetStaticProps = async () =>
  process.env.NODE_ENV === 'production' ? { notFound: true } : { props: {} };

declare global {
  interface Window {
    __resumeLayout?: PreviewLayout & { preset: string };
    /** Parity anchors for the document on screen, in the same order the PDF extractor uses. */
    __resumeAnchors?: string[];
  }
}

export default function ResumePreviewHarness() {
  const router = useRouter();
  const preset = typeof router.query.preset === 'string' ? router.query.preset : 'harbor';
  // Query params are empty until the router is ready; do not publish a layout for the wrong preset.
  const ready = router.isReady;
  const long = router.query.long === '1';
  const doc = React.useMemo(() => (long ? createLongSampleResume(preset) : createSampleResume(preset)), [preset, long]);
  const [layout, setLayout] = useState<PreviewLayout | null>(null);

  return (
    <div style={{ minHeight: '100vh', background: '#e5e7eb', padding: 24, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => router.replace({ query: { ...router.query, preset: p.id } })}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid #9ca3af',
              background: p.id === preset ? '#111827' : '#fff',
              color: p.id === preset ? '#fff' : '#111827',
              fontSize: 13,
            }}
          >
            {p.name}
          </button>
        ))}
        <span data-testid="page-count" style={{ marginLeft: 12, fontSize: 13 }}>
          {layout ? `${layout.pageCount} page(s)` : 'measuring…'}
        </span>
      </div>
      {ready && <ResumePreview
        key={`${preset}:${long}`}
        document={doc}
        scale={1}
        onLayout={(l) => {
          setLayout(l);
          if (!ready) return;
          window.__resumeLayout = { ...l, preset: long ? `${preset}-long` : preset };
          const view = buildView(doc);
          window.__resumeAnchors = [
            view.header.name,
            ...[...view.side, ...view.main].flatMap((sec) => [sec.heading, ...sec.entries.map((e) => e.title)]),
          ].filter(Boolean);
        }}
      />}
    </div>
  );
}
