/**
 * Helpers for the restricted rich-text model defined in schema.ts.
 *
 * normaliseRichText() is the gate every rich-text value passes through before
 * it is stored: it accepts arbitrary editor or AI output and returns only the
 * node and mark types both renderers support.
 */
import type {
  RichBlock,
  RichBulletList,
  RichListItem,
  RichMark,
  RichParagraph,
  RichText,
  RichTextNode,
} from './schema';

type Unknown = Record<string, unknown>;

const isObj = (v: unknown): v is Unknown => typeof v === 'object' && v !== null;

function normaliseMarks(marks: unknown): RichMark[] | undefined {
  if (!Array.isArray(marks)) return undefined;
  const out: RichMark[] = [];
  for (const m of marks) {
    if (!isObj(m)) continue;
    if (m.type === 'bold' || m.type === 'italic') out.push({ type: m.type });
    if (m.type === 'link' && isObj(m.attrs) && typeof m.attrs.href === 'string') {
      out.push({ type: 'link', attrs: { href: m.attrs.href } });
    }
  }
  return out.length ? out : undefined;
}

function normaliseInline(nodes: unknown): RichTextNode[] {
  if (!Array.isArray(nodes)) return [];
  const out: RichTextNode[] = [];
  for (const n of nodes) {
    if (!isObj(n)) continue;
    if (n.type === 'text' && typeof n.text === 'string' && n.text.length > 0) {
      const marks = normaliseMarks(n.marks);
      out.push(marks ? { type: 'text', text: n.text, marks } : { type: 'text', text: n.text });
    }
    // A hard break becomes a space: resumes should not hand-wrap lines.
    if (n.type === 'hardBreak') out.push({ type: 'text', text: ' ' });
  }
  return out;
}

function normaliseParagraph(node: Unknown): RichParagraph {
  const content = normaliseInline(node.content);
  return content.length ? { type: 'paragraph', content } : { type: 'paragraph' };
}

function normaliseList(node: Unknown, depth: number): RichBulletList | null {
  if (!Array.isArray(node.content)) return null;
  const items: RichListItem[] = [];
  for (const item of node.content) {
    if (!isObj(item) || !Array.isArray(item.content)) continue;
    const content: Array<RichParagraph | RichBulletList> = [];
    for (const child of item.content) {
      if (!isObj(child)) continue;
      if (child.type === 'paragraph') content.push(normaliseParagraph(child));
      // Ordered lists are flattened to bullets; nesting is capped at 3 levels.
      if ((child.type === 'bulletList' || child.type === 'orderedList') && depth < 2) {
        const nested = normaliseList(child, depth + 1);
        if (nested) content.push(nested);
      }
    }
    if (content.length) items.push({ type: 'listItem', content });
  }
  return items.length ? { type: 'bulletList', content: items } : null;
}

export function normaliseRichText(value: unknown): RichText {
  if (!isObj(value) || !Array.isArray(value.content)) return { type: 'doc', content: [] };
  const blocks: RichBlock[] = [];
  for (const node of value.content) {
    if (!isObj(node)) continue;
    if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'blockquote') {
      // Headings and quotes have no place inside an entry; keep their text.
      const para =
        node.type === 'blockquote' && Array.isArray(node.content) && isObj(node.content[0])
          ? normaliseParagraph(node.content[0])
          : normaliseParagraph(node);
      blocks.push(para);
    }
    if (node.type === 'bulletList' || node.type === 'orderedList') {
      const list = normaliseList(node, 0);
      if (list) blocks.push(list);
    }
  }
  // Drop trailing empty paragraphs the editor leaves behind.
  while (blocks.length) {
    const last = blocks[blocks.length - 1];
    if (last.type === 'paragraph' && !last.content?.length) blocks.pop();
    else break;
  }
  return { type: 'doc', content: blocks };
}

/** Build rich text from plain lines: "- " / "• " prefixed lines become bullets. */
export function richTextFromPlain(text: string): RichText {
  const lines = text.replace(/\r\n/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean);
  const blocks: RichBlock[] = [];
  let list: RichListItem[] = [];

  const flush = () => {
    if (list.length) blocks.push({ type: 'bulletList', content: list });
    list = [];
  };

  for (const line of lines) {
    const bullet = line.match(/^[-*•·▪]\s+(.*)$/);
    if (bullet) {
      list.push({ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: bullet[1] }] }] });
    } else {
      flush();
      blocks.push({ type: 'paragraph', content: [{ type: 'text', text: line }] });
    }
  }
  flush();
  return { type: 'doc', content: blocks };
}

export function bulletsFromStrings(items: string[]): RichText {
  const clean = items.map((s) => s.trim()).filter(Boolean);
  if (!clean.length) return { type: 'doc', content: [] };
  return {
    type: 'doc',
    content: [
      {
        type: 'bulletList',
        content: clean.map((text) => ({
          type: 'listItem' as const,
          content: [{ type: 'paragraph' as const, content: [{ type: 'text' as const, text }] }],
        })),
      },
    ],
  };
}

/** Plain text in document order, used for search, AI prompts and parity tests. */
export function richTextToPlain(doc: RichText): string {
  const parts: string[] = [];
  const walkBlock = (block: RichBlock) => {
    if (block.type === 'paragraph') {
      parts.push((block.content ?? []).map((n) => n.text).join(''));
    } else {
      for (const item of block.content) for (const child of item.content) walkBlock(child);
    }
  };
  doc.content.forEach(walkBlock);
  return parts.filter(Boolean).join('\n');
}

export const isRichTextEmpty = (doc: RichText): boolean => richTextToPlain(doc).trim() === '';
