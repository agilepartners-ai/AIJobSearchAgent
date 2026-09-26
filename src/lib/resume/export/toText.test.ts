import { describe, expect, it } from 'vitest';
import { createSampleResume } from '../defaults';
import { resumeToPlainText } from './toText';

describe('resumeToPlainText', () => {
  it('includes header, section titles, entries and bullets', () => {
    const text = resumeToPlainText(createSampleResume());
    expect(text).toContain('Maya Okonkwo');
    expect(text).toContain('EXPERIENCE');
    expect(text).toContain('Senior Product Designer | Lumen Savings');
    expect(text).toContain('- Redesigned onboarding');
  });

  it('leaves out hidden sections and entries', () => {
    const d = createSampleResume();
    d.sections[1].entries[0].hidden = true;
    d.sections[4].hidden = true;
    const text = resumeToPlainText(d);
    expect(text).not.toContain('Lumen Savings');
    expect(text).not.toContain('Yoruba');
  });
});
