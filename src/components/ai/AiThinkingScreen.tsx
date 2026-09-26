/**
 * Full-screen loader for AI work.
 *
 * A dark screen with one large thinking orb in the middle and the status lines
 * at the bottom centre. The orb changes with the stage of the work (see
 * lib/ai/loaderPhases), crossfading from one animation to the next, and the
 * status line and a rotating tip follow it.
 *
 * It is a portal on <body> so no ancestor's overflow, transform or stacking can
 * clip it, and it locks page scroll while it is up. It announces itself to
 * screen readers as a polite status region; the orb is decorative.
 */
import { motion, useReducedMotion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { phaseAt, type LoaderMode } from '../../lib/ai/loaderPhases';
import LargeOrb from './LargeOrb';
import styles from './AiThinkingScreen.module.css';

interface Props {
  mode?: LoaderMode;
  /** A short rotating hint under the status line. */
  tip?: string;
}

const FADE_MS = 700;
const MIN_ORB = 220;
const MAX_ORB = 520;

/** The previous value for a moment after it changes, so it can fade out. */
function usePrevious<T>(value: T, holdMs: number): T | null {
  const [previous, setPrevious] = useState<T | null>(null);
  const last = useRef(value);
  useEffect(() => {
    if (last.current === value) return;
    setPrevious(last.current);
    last.current = value;
    const timer = setTimeout(() => setPrevious(null), holdMs);
    return () => clearTimeout(timer);
  }, [value, holdMs]);
  return previous;
}

function useOrbSize(): number {
  const [size, setSize] = useState(360);
  useEffect(() => {
    const fit = () => setSize(Math.round(Math.min(MAX_ORB, Math.max(MIN_ORB, Math.min(window.innerWidth, window.innerHeight) * 0.56))));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return size;
}

export default function AiThinkingScreen({ mode = 'generating', tip }: Props) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const orbSize = useOrbSize();

  useEffect(() => {
    setMounted(true);
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - started), 400);
    // Nothing behind the loader should scroll or take focus while it is up.
    // `inert` on the app root removes it from the tab order and from assistive
    // technology; the portal lives on <body>, outside the root, so it is unaffected.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const root = document.getElementById('__next');
    const wasInert = root?.hasAttribute('inert') ?? false;
    root?.setAttribute('inert', '');
    return () => {
      clearInterval(timer);
      document.body.style.overflow = overflow;
      if (!wasInert) root?.removeAttribute('inert');
    };
  }, []);

  const phase = phaseAt(elapsed, mode);
  const previousOrb = usePrevious(phase.orb, FADE_MS);
  const previousText = usePrevious(phase.text, FADE_MS);
  const ease = [0.22, 1, 0.36, 1] as const;

  if (!mounted) return null;

  return createPortal(
    <motion.div
      role="status"
      aria-live="polite"
      aria-label={`${phase.text}…`}
      initial={{ opacity: reduce ? 1 : 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease }}
      className="fixed inset-0 z-[9999] overflow-hidden bg-[#050505]"
    >
      {/* Orb, centred and enlarged. */}
      <div className="absolute inset-0 flex items-center justify-center pb-24">
        <div className="relative" style={{ width: orbSize, height: orbSize }}>
          <div className={`${styles.glow} absolute -inset-[35%]`} aria-hidden />
          {previousOrb && (
            <motion.div key={`out-${previousOrb}`} className="absolute inset-0" initial={{ opacity: 1, scale: 1 }} animate={{ opacity: 0, scale: 1.06 }} transition={{ duration: FADE_MS / 1000, ease }}>
              <LargeOrb state={previousOrb} size={orbSize} />
            </motion.div>
          )}
          <motion.div key={`in-${phase.orb}`} className="absolute inset-0" initial={{ opacity: 0, scale: reduce ? 1 : 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: FADE_MS / 1000, ease }}>
            <LargeOrb state={phase.orb} size={orbSize} />
          </motion.div>
        </div>
      </div>

      {/* Status lines, bottom centre. */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-6 pb-[max(2.5rem,7vh)] text-center">
        <div className="relative flex min-h-[2rem] w-full items-center justify-center">
          {previousText && (
            <motion.p key={`out-${previousText}`} aria-hidden className="absolute text-lg font-medium text-white/70 sm:text-xl" initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, ease }}>
              {previousText}
            </motion.p>
          )}
          <motion.p
            key={`in-${phase.text}`}
            className="absolute text-lg font-medium sm:text-xl"
            initial={{ opacity: 0, y: reduce ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease, delay: 0.15 }}
          >
            <span className={styles.shimmer}>{phase.text}</span>
            <span className={`${styles.dots} text-white`} aria-hidden>
              <span>.</span>
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </motion.p>
        </div>

        {tip && (
          <motion.p key={tip} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="mt-4 max-w-md text-sm leading-relaxed text-white/45">
            {tip}
          </motion.p>
        )}
      </div>
    </motion.div>,
    document.body,
  );
}
