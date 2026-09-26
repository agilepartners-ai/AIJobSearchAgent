/**
 * Development-only gallery: every orb state at large size, for tuning density.
 * /dev/orbs?size=300  ·  /dev/orbs?state=weaving&size=520
 * Not built in production.
 */
import type { GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import React from 'react';
import LargeOrb from '../../components/ai/LargeOrb';

export const getStaticProps: GetStaticProps = async () =>
  process.env.NODE_ENV === 'production' ? { notFound: true } : { props: {} };

const STATES = ['working', 'searching', 'solving', 'listening', 'connecting', 'weaving', 'composing', 'breathing', 'shaping'] as const;

export default function OrbGallery() {
  const router = useRouter();
  if (!router.isReady) return null;
  const size = Number(router.query.size) || 300;
  const only = typeof router.query.state === 'string' ? router.query.state : null;
  const list = only ? STATES.filter((s) => s === only) : STATES;

  return (
    <div style={{ background: '#050505', minHeight: '100vh', padding: 24, color: '#aaa', fontFamily: 'system-ui' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${size + 20}px, 1fr))`, gap: 16 }}>
        {list.map((state) => (
          <figure key={state} style={{ margin: 0, textAlign: 'center' }}>
            <LargeOrb state={state} size={size} />
            <figcaption style={{ fontSize: 12 }}>{state}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
