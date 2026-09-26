/**
 * A thinking orb at any size.
 *
 * `thinking-orbs` ships <ThinkingOrb> for three hand-tuned sizes (20, 32, 64 px).
 * That is right for an inline status, and wrong for a full-screen loader: the
 * component cannot be enlarged (its preset lookup only knows those sizes), and
 * stretching a 64 px canvas with CSS turns every dot into a blur.
 *
 * The package exports the engine underneath, whose painters take any CSS-pixel
 * size. This component drives that engine with the same presets and the same
 * animation clock, at the size you ask for, so the orb is identical in design
 * and crisp at full-screen scale.
 *
 * Behaviour matches <ThinkingOrb>: device pixel ratio capped at 2, paused while
 * the tab is hidden, a single still frame under prefers-reduced-motion.
 */
import { MODE_DRAWS, resolvePreset, scaleCounts, scaleRadii, type ModeKey, type OrbState } from 'thinking-orbs';
import React, { useEffect, useRef } from 'react';

/** The size the presets were tuned at; everything else is derived from it. */
const BASE_SIZE = 64;

/**
 * How dot count grows with size, per mode.
 *
 * The engine already grows dot radius with size (roughly size^0.6). For the
 * dots to keep the same spacing-to-size ratio the presets were designed with,
 * count has to grow more slowly than area:
 *
 *   - outline modes ('ring', 'morph') are one-dimensional: spacing along the
 *     line grows as size / count, so count must barely grow or the dots fuse
 *     into a solid pipe;
 *   - dense surface modes ('ribbon') are 2-D but start packed, so they grow
 *     slowly too;
 *   - everything else is a sparse enough surface or network to take more dots,
 *     which is what makes a large orb read as richer than a scaled-up small one.
 *
 * Tuned by eye at 300-520 px against the package's 64 px designs.
 */
const COUNT_EXPONENT: Partial<Record<ModeKey, number>> & { default: number } = {
  default: 0.85,
  ring: 0.3,
  morph: 0.3,
  ribbon: 0.45,
  // Each orbit particle also draws a trail of ghost arcs; count them at the default
  // exponent and a 520 px orb costs ~21 ms a frame (over the 16.7 ms budget).
  orbits: 0.4,
};

/** Extra growth in dot radius on top of the engine's own. */
const RADIUS_EXPONENT = 0;

export function orbOptions(state: OrbState, size: number) {
  const { mode, speed, opts } = resolvePreset(state, BASE_SIZE);
  const k = Math.max(1, size / BASE_SIZE);
  const exponent = COUNT_EXPONENT[mode] ?? COUNT_EXPONENT.default;
  return {
    mode,
    speed,
    opts: scaleRadii(scaleCounts(opts, k ** exponent), k ** RADIUS_EXPONENT),
  };
}

interface Props {
  state: OrbState;
  /** CSS pixels. */
  size: number;
  /** Multiplier on the preset's own speed. */
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function LargeOrb({ state, size, speed = 1, className, style }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { mode, speed: baseSpeed, opts } = orbOptions(state, size);
    const draw = MODE_DRAWS[mode];
    const effectiveSpeed = baseSpeed * speed;

    const frame = (seconds: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      // Dark background, so light ink.
      draw(ctx, size, seconds, true, opts);
    };

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      frame(0.6);
      return;
    }

    let raf = 0;
    let running = false;
    const loop = () => {
      frame((performance.now() / 1_000) * effectiveSpeed);
      if (running) raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const onVisibility = () => (document.visibilityState === 'hidden' ? stop() : start());

    frame((performance.now() / 1_000) * effectiveSpeed);
    document.addEventListener('visibilitychange', onVisibility);
    if (document.visibilityState !== 'hidden') start();
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [state, size, speed]);

  return <canvas ref={ref} aria-hidden className={className} style={{ width: size, height: size, display: 'block', ...style }} />;
}
