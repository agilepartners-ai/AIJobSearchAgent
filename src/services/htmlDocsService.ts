import puppeteer from 'puppeteer';
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
  console.log('[htmlDocsService] convertHtmlToDocxBuffer called');
  if (!html) {
    console.error('[htmlDocsService] Empty HTML provided');
    throw new Error('Empty HTML provided');
  }
  console.log('[htmlDocsService] launching isolated Puppeteer instance');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: opts?.pageWidthPx || 1200, height: 800 });

    // Set content and wait for network + fonts
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    // Give fonts / webfonts a short grace window
    await new Promise(resolve => setTimeout(resolve, 250));

    console.log('[htmlDocsService] extracting structured DOM nodes for headings/lists/paragraphs with inline styles');
    const structuredNodes: any[] = await page.evaluate(() => {
      function parseStyle(styleStr: string) {
        const out: any = {};
        if (!styleStr) return out;
        const parts = styleStr.split(';').map(s => s.trim()).filter(Boolean);
        for (const p of parts) {
          const [k, v] = p.split(':').map(s => s.trim());
          if (!k) continue;
          const key = k.toLowerCase();
          if (key === 'font-weight') out.fontWeight = v;
          else if (key === 'font-style') out.fontStyle = v;
          else if (key === 'text-decoration') out.textDecoration = v;
          else if (key === 'font-family') out.fontFamily = v.replace(/['"]/g, '');
          else if (key === 'font-size') out.fontSize = v;
        }
        return out;
      }

      function extractInlineRuns(root: any) {
        const runs: any[] = [];

        function walk(node: any, active: any) {
          active = Object.assign({}, active || { bold: false, italic: false, underline: false, font: undefined, size: undefined });
          if (node.nodeType === Node.TEXT_NODE) {
            const txt = node.textContent || '';
            if (txt && txt.trim()) runs.push({ text: txt, bold: !!active.bold, italic: !!active.italic, underline: !!active.underline, font: active.font, size: active.size });
            return;
          }

          if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = (node.tagName || '').toUpperCase();
            if (tag === 'B' || tag === 'STRONG') active.bold = true;
            if (tag === 'I' || tag === 'EM') active.italic = true;
            if (tag === 'U') active.underline = true;

            const style = node.getAttribute && node.getAttribute('style');
            if (style) {
              const parsed = parseStyle(style);
              if (parsed.fontWeight) {
                const fw = parsed.fontWeight;
                if (fw === 'bold' || fw === 'bolder' || (/^\d+$/.test(fw) && Number(fw) >= 600)) active.bold = true;
              }
              if (parsed.fontStyle && parsed.fontStyle.indexOf('italic') !== -1) active.italic = true;
              if (parsed.textDecoration && parsed.textDecoration.indexOf('underline') !== -1) active.underline = true;
              if (parsed.fontFamily) active.font = parsed.fontFamily.split(',')[0].trim();
              if (parsed.fontSize) {
                const m = parsed.fontSize.match(/([\d.]+)px/);
                if (m) {
                  const px = parseFloat(m[1]);
                  active.size = Math.round(px * 2); // docx size is in half-points
                }
              }
            }

            // Recurse children
            const childNodes = Array.from(node.childNodes || []);
            if (childNodes.length === 0) {
              const txt = node.textContent || '';
              if (txt && txt.trim()) runs.push({ text: txt, bold: !!active.bold, italic: !!active.italic, underline: !!active.underline, font: active.font, size: active.size });
            } else {
              for (const c of childNodes) walk(c, active);
            }
          }
        }

        walk(root, {});
        return runs;
      }

      function extractNode(el: any): any {
        const tag = (el.tagName || '').toUpperCase();
        if (/^H[1-6]$/.test(tag)) {
          return { type: 'heading', level: Number(tag[1]), runs: extractInlineRuns(el) };
        }
        if (tag === 'P') return { type: 'paragraph', runs: extractInlineRuns(el) };
        if (tag === 'UL' || tag === 'OL') {
          return {
            type: 'list',
            ordered: tag === 'OL',
            items: Array.from(el.querySelectorAll('li')).map((li: any) => ({ runs: extractInlineRuns(li) })),
          };
        }
        if (tag === 'SECTION' || tag === 'MAIN' || tag === 'ARTICLE' || tag === 'DIV') {
          const children = Array.from(el.children || []);
          if (children.length === 0) return { type: 'paragraph', runs: extractInlineRuns(el) };
          return { type: 'group', children: children.map(extractNode) };
        }
        const inner = el.querySelectorAll && el.querySelectorAll('p, ul, ol, h1, h2, h3, h4, h5, h6');
        if (inner && inner.length) {
          return { type: 'group', children: Array.from(inner).map(extractNode) };
        }
        return { type: 'paragraph', runs: extractInlineRuns(el) };
      }

      return Array.from(document.body.children).map(extractNode);
    });

    // Also capture the full rendered HTML as fallback
    const renderedHtml: string = await page.evaluate(() => document.documentElement.outerHTML);

    await page.close();
    await browser.close();

    // 2) Try to convert using available html->docx libraries (prefer html-docs-js)
    // Use dynamic require so the app still runs if the packages are not installed.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const htmlDocs = Function('return require')()('html-docs-js');
      if (htmlDocs) {
        if (typeof htmlDocs === 'function') {
          const out = htmlDocs(renderedHtml);
          if (Buffer.isBuffer(out)) return out;
          if (typeof out === 'string') return Buffer.from(out, 'binary');
        } else if (typeof htmlDocs.create === 'function') {
          const out = await htmlDocs.create(renderedHtml);
          if (Buffer.isBuffer(out)) return out;
          if (out && typeof out === 'string') return Buffer.from(out, 'binary');
          if (out && out.data) return Buffer.from(out.data, 'binary');
        }
      }
    } catch (_e) {
      console.log('[htmlDocsService] html-docs-js not available or failed, continuing');
    }

    // Attempt #2: html-docx-js
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const htmlDocx = Function('return require')()('html-docx-js');
      if (htmlDocx) {
        if (typeof htmlDocx.asBuffer === 'function') {
          const out: Buffer = htmlDocx.asBuffer(renderedHtml);
          if (Buffer.isBuffer(out)) return out;
        } else if (typeof htmlDocx.asBlob === 'function') {
          const blobLike = htmlDocx.asBlob(renderedHtml);
          if (blobLike && typeof blobLike.arrayBuffer === 'function') {
            const ab = await blobLike.arrayBuffer();
            return Buffer.from(new Uint8Array(ab));
          }
        } else if (typeof htmlDocx === 'function') {
          const out = htmlDocx(renderedHtml);
          if (Buffer.isBuffer(out)) return out;
          if (typeof out === 'string') return Buffer.from(out, 'binary');
        }
      }
    } catch (_e) {
      console.log('[htmlDocsService] html-docx-js not available or failed, continuing');
    }

    console.log('[htmlDocsService] mapping structured nodes to docx paragraphs (headings/lists/paragraphs with inline styles)');

    const children = mapNodesToDocxChildren(structuredNodes);

    // If nothing extracted, fall back to plain-text paragraph split
    let finalChildren = children;
    if (!finalChildren || finalChildren.length === 0) {
      console.log('[htmlDocsService] structured extraction empty, falling back to plain-text');
      const plain = stripHtmlToPlainText(renderedHtml);
      const paragraphs = splitTextToParagraphs(plain, 800);
      finalChildren = paragraphs.map(p => new Paragraph({ children: [new TextRun(p)] }));
    }

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
    // Ensure browser is closed on error
    try {
      if (browser) await browser.close();
    } catch (e) {
      // ignore
    }
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