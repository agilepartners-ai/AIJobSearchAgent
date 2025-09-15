export function robustJsonParse(text: string): any {
  if (typeof text !== 'string') return null;

  // Trim and strip common Markdown code fences
  let s = text.trim();
  s = s.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

  // Find first JSON opener ({ or [)
  const firstIdx = s.search(/[\{\[]/);
  if (firstIdx === -1) return null;
  s = s.slice(firstIdx);

  // Extract top-level JSON block while respecting strings and escapes
  function extractTopLevelJSON(str: string): string | null {
    const openChar = str[0];
    const closeChar = openChar === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = 0; i < str.length; i++) {
      const ch = str[i];

      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (ch === openChar) depth++;
        else if (ch === closeChar) {
          depth--;
          if (depth === 0) {
            return str.slice(0, i + 1);
          }
        }
      }
    }
    return null;
  }

  let candidate = extractTopLevelJSON(s);
  if (!candidate) {
    // Fallback: take up to last closing brace/bracket
    const lastClose = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
    if (lastClose !== -1) candidate = s.slice(0, lastClose + 1);
  }
  if (!candidate) return null;

  // Cleaning helpers
  const removeComments = (str: string) => str.replace(/\/\/.*(?=[\n\r])/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const removeControl = (str: string) => str.replace(/[\u0000-\u001F]+/g, ' ');
  const removeTrailingCommas = (str: string) => str.replace(/,\s*([}\]])/g, '$1');

  let cleaned = candidate;
  cleaned = removeComments(cleaned);
  cleaned = removeControl(cleaned);
  cleaned = removeTrailingCommas(cleaned);

  // Try strict parse
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // continue to heuristics
  }

  // Heuristic attempt 1: replace single quotes with double quotes (best-effort)
  try {
    const singleToDouble = cleaned.replace(/'/g, '"');
    return JSON.parse(singleToDouble);
  } catch (err) {
    // continue
  }

  // Heuristic attempt 2: quote unquoted keys, then parse
  try {
    let attempt = cleaned;
    attempt = attempt.replace(/([{\s,])([A-Za-z0-9_@$-]+)\s*:/g, '$1"$2":');
    attempt = removeTrailingCommas(attempt);
    return JSON.parse(attempt);
  } catch (err) {
    // continue
  }

  // Heuristic attempt 3: replace single quotes, then quote keys
  try {
    let attempt = cleaned.replace(/'/g, '"');
    attempt = attempt.replace(/([{\s,])([A-Za-z0-9_@$-]+)\s*:/g, '$1"$2":');
    attempt = removeTrailingCommas(attempt);
    return JSON.parse(attempt);
  } catch (err) {
    // final fallback
  }

  return null;
}