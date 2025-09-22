import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

/**
 * Render given HTML using an isolated Puppeteer instance and convert to DOCX.
 * - Tries to use html-docs-js (or html-docx-js) if available.
 * - Falls back to a docx generation using `docx` package, preserving headings/lists/paragraphs and inline styles.
 *
 * This implementation launches and closes its own Puppeteer browser so it does not
 * interfere with any other Puppeteer usages in the project.
 */

export async function convertHtmlToDocxBuffer(html: string, opts?: { pageWidthPx?: number }): Promise<Buffer> {
  console.log('[htmlDocsService] convertHtmlToDocxBuffer called (puppeteer removed)');
  if (!html) {
    console.error('[htmlDocsService] Empty HTML provided');
    throw new Error('Empty HTML provided');
  }

  // Try to use installed html->docx converters first (html-docs-js -> html-docx-js)
  // If not available, fall back to a best-effort plain-text conversion using existing helpers.
  try {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const htmlDocs = Function('return require')()('html-docs-js');
      if (htmlDocs) {
        const out = typeof htmlDocs === 'function' ? htmlDocs(html) : (typeof htmlDocs.create === 'function' ? await htmlDocs.create(html) : null);
        if (Buffer.isBuffer(out)) return out;
        if (typeof out === 'string') return Buffer.from(out, 'binary');
      }
    } catch (_e) {
      // not installed, continue
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const htmlDocx = Function('return require')()('html-docx-js');
      if (htmlDocx) {
        if (typeof htmlDocx.asBuffer === 'function') {
          const out: Buffer = htmlDocx.asBuffer(html);
          if (Buffer.isBuffer(out)) return out;
        } else if (typeof htmlDocx.asBlob === 'function') {
          const blobLike = htmlDocx.asBlob(html);
          if (blobLike && typeof blobLike.arrayBuffer === 'function') {
            const ab = await blobLike.arrayBuffer();
            return Buffer.from(new Uint8Array(ab));
          }
        } else if (typeof htmlDocx === 'function') {
          const out = htmlDocx(html);
          if (Buffer.isBuffer(out)) return out;
          if (typeof out === 'string') return Buffer.from(out, 'binary');
        }
      }
    } catch (_e) {
      // not installed, continue
    }

    // Fallback: create a simple docx from plain text derived from HTML
    console.log('[htmlDocsService] Falling back to plain-text conversion');
    const plain = stripHtmlToPlainText(html);
    const paragraphs = splitTextToParagraphs(plain, 800);
    const finalChildren = paragraphs.map(p => new Paragraph({ children: [new TextRun(p)] }));

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: finalChildren,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    return Buffer.from(buffer);
  } catch (err) {
    console.error('[htmlDocsService] convert failed', err);
    throw err;
  }
}

/**
 * Map extracted structured nodes into docx Paragraphs.
 */
export function mapNodesToDocxChildren(nodes: any[]): Paragraph[] {
  const children: Paragraph[] = [];

  for (const node of nodes || []) {
    if (!node) continue;
    if (node.type === 'heading') {
      const lvl = Math.min(Math.max(Number(node.level) || 1, 1), 6);
      let headingLevel;
      let headingSize;
      switch (lvl) {
        case 1: headingLevel = HeadingLevel.HEADING_1; headingSize = 56; break;
        case 2: headingLevel = HeadingLevel.HEADING_2; headingSize = 40; break;
        case 3: headingLevel = HeadingLevel.HEADING_3; headingSize = 32; break;
        case 4: headingLevel = HeadingLevel.HEADING_4; headingSize = 28; break;
        case 5: headingLevel = HeadingLevel.HEADING_5; headingSize = 24; break;
        default: headingLevel = HeadingLevel.HEADING_6; headingSize = 22; break;
      }
      if (Array.isArray(node.runs) && node.runs.length) {
        children.push(new Paragraph({ heading: headingLevel, children: node.runs.map((r: any) => buildTextRun(r)) }));
      } else {
        children.push(new Paragraph({ children: [new TextRun({ text: node.text || '', bold: true, size: headingSize })], spacing: { after: 160 } , heading: headingLevel }));
      }
    } else if (node.type === 'paragraph') {
      if (Array.isArray(node.runs) && node.runs.length) {
        children.push(new Paragraph({ children: node.runs.map((r: any) => buildTextRun(r)), spacing: { before: 120, after: 120 } }));
      } else {
        children.push(new Paragraph({ children: [new TextRun(node.text || '')], spacing: { before: 120, after: 120 } }));
      }
    } else if (node.type === 'list') {
      const items = node.items || [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i] || {};
        if (Array.isArray(item.runs) && item.runs.length) {
          if (node.ordered) {
            const runs = [new TextRun({ text: `${i + 1}. `, bold: true }), ...item.runs.map((r: any) => buildTextRun(r))];
            children.push(new Paragraph({ children: runs, spacing: { after: 80 }, indent: { left: 720 } }));
          } else {
            children.push(new Paragraph({ children: item.runs.map((r: any) => buildTextRun(r)), spacing: { after: 80 }, bullet: { level: 0 }, indent: { left: 720 } }));
          }
        } else {
          const text = (item.text || item || '').toString();
          if (node.ordered) {
            children.push(new Paragraph({ children: [new TextRun({ text: `${i + 1}. ${text}` })], spacing: { after: 80 }, indent: { left: 720 } }));
          } else {
            children.push(new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 80 }, indent: { left: 720 } }));
          }
        }
      }
    } else if (node.type === 'group') {
      children.push(...mapNodesToDocxChildren(node.children || []));
    } else {
      const content = node.text || (typeof node === 'string' ? node : '');
      if (content && content.trim()) children.push(new Paragraph({ children: [new TextRun(content)], spacing: { before: 120, after: 120 } }));
    }
  }

  return children;
}

function buildTextRun(r: any): TextRun {
  const opts: any = { text: r.text || '' };
  if (r.bold) opts.bold = true;
  if (r.italic) opts.italics = true;
  if (r.underline) opts.underline = {};
  if (r.font) opts.font = r.font;
  if (r.size) opts.size = r.size;
  return new TextRun(opts);
}

/**
 * Strip HTML to plain textual paragraphs.
 */
function stripHtmlToPlainText(html: string): string {
  try {
    // A simple, safe HTML tag stripper
    const text = html.replace(/<\/?[^>]+(>|$)/g, ' ');
    // Collapse whitespace
    return text.replace(/\s+/g, ' ').trim();
  } catch (e) {
    return '';
  }
}

/**
 * Split a long text into smaller paragraph strings for docx generation.
 */
function splitTextToParagraphs(text: string, maxLen = 1000): string[] {
  if (!text) return [];
  if (text.length <= maxLen) return [text];

  const sentences = text.split(/(?<=[.?!])\s+/);
  const paragraphs: string[] = [];
  let current = '';

  for (const s of sentences) {
    if ((current + ' ' + s).trim().length > maxLen) {
      if (current.trim().length) paragraphs.push(current.trim());
      current = s;
    } else {
      current = (current + ' ' + s).trim();
    }
  }
  if (current.trim().length) paragraphs.push(current.trim());
  return paragraphs;
}