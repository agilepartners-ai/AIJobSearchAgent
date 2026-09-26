/**
 * Split résumé or job-description text into chunks worth embedding.
 *
 * Resumes reach us as text extracted from a PDF, which is unreliable about
 * blank lines: some arrive as tidy paragraphs, some as one long run of lines.
 * So a chunk boundary is any blank line *or* a line that looks like a section
 * heading, and chunks are then packed up to a size where one embedding still
 * describes one idea. The first chunk of a résumé is therefore its header
 * (name and contacts), which the retriever always keeps.
 */

export interface ChunkOptions {
  /** Upper bound on a chunk, in characters. ~900 chars is roughly 200 tokens. */
  maxChars?: number;
  /** Chunks shorter than this are merged into the next one. */
  minChars?: number;
}

const HEADING = /^(?:[A-Z][A-Z0-9 &/,.'-]{2,38}|(?:professional |work |technical |core )?(?:summary|experience|education|skills|projects|certifications?|awards|achievements|languages|interests|profile|objective|publications|volunteer(?:ing)?)[:\s]*)$/i;

const isHeading = (line: string): boolean => {
  const t = line.trim();
  if (!t || t.length > 40) return false;
  // ALL CAPS, or a known section word on its own line.
  return t === t.toUpperCase() ? /[A-Z]{3}/.test(t) : HEADING.test(t) && /^[A-Z]/.test(t) && t.split(/\s+/).length <= 4;
};

/** Break one oversized block at sentence or line ends. */
function splitLong(block: string, maxChars: number): string[] {
  const pieces = block.split(/(?<=[.!?])\s+|\n/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let current = '';
  for (const piece of pieces) {
    if (piece.length > maxChars) {
      // A single run with no boundary: cut it hard rather than lose the tail.
      if (current) out.push(current);
      current = '';
      for (let i = 0; i < piece.length; i += maxChars) out.push(piece.slice(i, i + maxChars));
      continue;
    }
    if (current && current.length + 1 + piece.length > maxChars) {
      out.push(current);
      current = piece;
    } else {
      current = current ? `${current}\n${piece}` : piece;
    }
  }
  if (current) out.push(current);
  return out;
}

export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const maxChars = options.maxChars ?? 900;
  const minChars = options.minChars ?? 120;

  const normalised = text.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (!normalised) return [];

  // 1. Blocks: split on blank lines and before section headings.
  const blocks: string[] = [];
  let current: string[] = [];
  const flush = () => {
    const block = current.join('\n').trim();
    if (block) blocks.push(block);
    current = [];
  };
  for (const line of normalised.split('\n')) {
    if (!line.trim()) {
      flush();
    } else if (isHeading(line)) {
      flush();
      current.push(line);
    } else {
      current.push(line);
    }
  }
  flush();

  // 2. Pack blocks into chunks of a useful size. A heading stays with its body.
  const chunks: string[] = [];
  let pending = '';
  for (const block of blocks) {
    for (const piece of block.length > maxChars ? splitLong(block, maxChars) : [block]) {
      if (pending && pending.length + 2 + piece.length <= maxChars && (pending.length < minChars || isHeading(pending.split('\n')[0]) && pending.split('\n').length === 1)) {
        pending = `${pending}\n${piece}`;
      } else {
        if (pending) chunks.push(pending);
        pending = piece;
      }
    }
  }
  if (pending) chunks.push(pending);

  // 3. A trailing sliver joins the chunk before it.
  if (chunks.length > 1 && chunks[chunks.length - 1].length < minChars) {
    const tail = chunks.pop()!;
    const merged = `${chunks[chunks.length - 1]}\n${tail}`;
    if (merged.length <= maxChars * 1.3) chunks[chunks.length - 1] = merged;
    else chunks.push(tail);
  }
  return chunks;
}
