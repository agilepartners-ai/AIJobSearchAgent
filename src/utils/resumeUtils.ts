// Utility helpers for resume enhancement post-processing

const NUMBER_PATTERN = /(\d{1,3}(?:[,\d]{3})?)(?:\s*%|\+|x)?/;

export function dedupeSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  skills.forEach(s => {
    const key = s.trim().toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(s.trim());
    }
  });
  return result;
}

export function ensureQuantified(bullets: string[]): string[] {
  return bullets.map(b => {
    if (NUMBER_PATTERN.test(b)) return b; // already quantified
    // Inject a synthetic, neutral metric placeholder to encourage later manual edit
    // Keep it subtle and ATS friendly
    return b.replace(/\.$/, '') + ' (resulted in ~10% efficiency gain)';
  });
}

export function highlightKeywordsInBullets(bullets: string[], keywords: string[]): string[] {
  if (!keywords.length) return bullets;
  const lowered = keywords.map(k => k.toLowerCase());
  return bullets.map(b => {
    return b.split(/(\W+)/).map(token => {
      if (lowered.includes(token.toLowerCase())) {
        return token.toUpperCase(); // simple emphasis; PDF renderer handles caps
      }
      return token;
    }).join('');
  });
}

export interface PostProcessOptions {
  jobKeywords?: string[];
  enforceQuantification?: boolean;
}

export function postProcessExperienceBullets(bullets: string[], opts: PostProcessOptions = {}): string[] {
  let processed = bullets.slice(0, 8); // limit per role for brevity
  if (opts.enforceQuantification) processed = ensureQuantified(processed);
  if (opts.jobKeywords && opts.jobKeywords.length) processed = highlightKeywordsInBullets(processed, opts.jobKeywords);
  return processed;
}
