import { describe, expect, it } from 'vitest';
import { GENERATION_PHASES, OPENING_PHASE, RECOVERING_PHASE, phaseAt } from './loaderPhases';

describe('loader phases', () => {
  it('starts at the first phase and walks forward in order', () => {
    expect(phaseAt(0).text).toBe('Reading your resume');
    const seen = [0, 4_000, 9_000, 14_000, 19_000, 24_000, 40_000].map((t) => phaseAt(t).orb);
    expect(seen).toEqual(['listening', 'searching', 'working', 'composing', 'solving', 'weaving', 'breathing']);
  });

  it('switches exactly at each boundary', () => {
    for (const phase of GENERATION_PHASES) {
      expect(phaseAt(phase.from)).toBe(phase);
      if (phase.from > 0) expect(phaseAt(phase.from - 1)).not.toBe(phase);
    }
  });

  it('is strictly increasing, so no phase can be skipped or repeated', () => {
    const times = GENERATION_PHASES.map((p) => p.from);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(new Set(times).size).toBe(times.length);
    expect(times[0]).toBe(0);
  });

  it('settles on a "still working" state for a long wait instead of freezing or looping', () => {
    expect(phaseAt(10 * 60_000).text).toMatch(/Still working/);
  });

  it('uses fixed phases for the hand-off and for a dropped connection', () => {
    expect(phaseAt(0, 'opening')).toBe(OPENING_PHASE);
    expect(phaseAt(99_999, 'opening')).toBe(OPENING_PHASE);
    expect(phaseAt(5, 'recovering')).toBe(RECOVERING_PHASE);
  });

  it('never claims a percentage', () => {
    for (const p of [...GENERATION_PHASES, OPENING_PHASE, RECOVERING_PHASE]) expect(p.text).not.toMatch(/%/);
  });
});
