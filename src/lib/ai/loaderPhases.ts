/**
 * What the full-screen AI loader shows, and when.
 *
 * Generation is one server request with no progress events, so the loader
 * cannot know which step the server is on. Showing a percentage would be a
 * lie that stalls at 90%. Instead it walks through the real stages in order,
 * each with its own orb and status line, and on a long wait settles into a
 * reassuring loop rather than freezing on the last one.
 *
 * Timings are deliberately close to a real run (a résumé takes 10-25 s), so
 * the stages read as roughly true without claiming precision.
 */
import type { OrbState } from 'thinking-orbs';

export interface LoaderPhase {
  /** Which orb animation to show. */
  orb: OrbState;
  /** The status line at the bottom of the screen (without trailing dots). */
  text: string;
  /** Elapsed milliseconds at which this phase begins. */
  from: number;
}

export const GENERATION_PHASES: LoaderPhase[] = [
  { orb: 'listening', text: 'Reading your resume', from: 0 },
  { orb: 'searching', text: 'Matching it against the job', from: 3_500 },
  { orb: 'working', text: 'Tailoring your experience', from: 8_000 },
  { orb: 'composing', text: 'Writing your cover letter', from: 13_000 },
  { orb: 'solving', text: 'Checking every fact against your resume', from: 18_000 },
  { orb: 'weaving', text: 'Putting the final touches together', from: 23_000 },
  // A long wait: stop advancing and say so, instead of repeating a step.
  { orb: 'breathing', text: 'Still working — longer resumes take a little more time', from: 32_000 },
];

/** After a successful generation, while the Studio opens. */
export const OPENING_PHASE: LoaderPhase = { orb: 'connecting', text: 'Opening your resume in the Studio', from: 0 };

/** The connection dropped; the server may still be finishing. */
export const RECOVERING_PHASE: LoaderPhase = { orb: 'shaping', text: 'Connection interrupted — checking whether your resume finished', from: 0 };

export type LoaderMode = 'generating' | 'opening' | 'recovering';

export function phaseAt(elapsedMs: number, mode: LoaderMode = 'generating'): LoaderPhase {
  if (mode === 'opening') return OPENING_PHASE;
  if (mode === 'recovering') return RECOVERING_PHASE;
  let current = GENERATION_PHASES[0];
  for (const phase of GENERATION_PHASES) {
    if (elapsedMs >= phase.from) current = phase;
  }
  return current;
}
