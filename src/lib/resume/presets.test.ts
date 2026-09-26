import { describe, expect, it } from 'vitest';
import { createSampleResume } from './defaults';
import { getPreset, withPreset } from './presets';

describe('withPreset', () => {
  it('swaps layout and style but never touches content', () => {
    const doc = createSampleResume('harbor');
    const next = withPreset(doc, 'atlas');
    expect(next.presetId).toBe('atlas');
    expect(next.layout).toEqual(getPreset('atlas').layout);
    expect(next.style).toEqual(getPreset('atlas').style);
    expect(next.sections).toBe(doc.sections);
    expect(next.personal).toBe(doc.personal);
    expect(doc.presetId).toBe('harbor');
  });

  it('does not share mutable layout objects with the preset', () => {
    const next = withPreset(createSampleResume(), 'atlas');
    next.layout.marginX = 99;
    expect(getPreset('atlas').layout.marginX).not.toBe(99);
  });
});
