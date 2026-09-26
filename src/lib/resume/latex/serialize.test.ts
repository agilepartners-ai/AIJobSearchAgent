import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { createEntry, createLongSampleResume, createResume, createSampleResume, createSection } from '../defaults';
import { PRESETS } from '../presets';
import { richTextFromPlain } from '../richtext';
import { escapeLatexText, escapeLatexUrl } from './escape';
import { serializeResume } from './serialize';
import { buildView } from '../view';

describe('escapeLatexText', () => {
  it('escapes every special character', () => {
    expect(escapeLatexText('100% R&D #1 $5 a_b {x} ~ ^ \\')).toBe(
      '100\\% R\\&D \\#1 \\$5 a\\_b \\{x\\} \\textasciitilde{} \\textasciicircum{} \\textbackslash{}',
    );
  });

  it('defeats TeX input ligatures so the PDF matches what was typed', () => {
    expect(escapeLatexText('2019--2021')).toBe('2019-{}-2021');
    expect(escapeLatexText("''quoted''")).toBe("'{}'quoted'{}'");
    expect(escapeLatexText('<<x>>')).toBe('\\textless{}\\textless{}x\\textgreater{}\\textgreater{}');
    expect(escapeLatexText('!`')).toBe('!{}`');
  });
});

describe('escapeLatexUrl', () => {
  it('makes # % ~ and spaces safe inside \\href', () => {
    expect(escapeLatexUrl('https://x.io/a b#c?d=50%~e')).toBe('https://x.io/a\\%20b\\#c?d=50\\%25\\string~e');
  });

  it('leaves existing percent-encoding intact', () => {
    expect(escapeLatexUrl('https://x.io/a%20b')).toBe('https://x.io/a\\%20b');
  });
});

describe('serializeResume', () => {
  it('produces one standalone document', () => {
    const tex = serializeResume(createSampleResume());
    expect(tex.match(/\\documentclass/g)).toHaveLength(1);
    expect(tex.match(/\\begin\{document\}/g)).toHaveLength(1);
    expect(tex.match(/\\end\{document\}/g)).toHaveLength(1);
  });

  it('emits big points, never TeX points, for every length', () => {
    const tex = serializeResume(createSampleResume('atlas'));
    // 0pt is unit-free zero and harmless; any other pt length would drift from CSS.
    expect(tex.match(/\d(\.\d+)?pt\b/g)?.filter((m) => m !== '0pt') ?? []).toEqual([]);
  });

  it('escapes user content rather than executing it', () => {
    const doc = createResume({
      personal: { fullName: '\\input{/etc/passwd} & Co 100%' },
      sections: [
        createSection('experience', {
          entries: [createEntry({ title: '\\write18{rm -rf /}', description: richTextFromPlain('- saved $2M_{x}') })],
        }),
      ],
    });
    const tex = serializeResume(doc);
    expect(tex).not.toContain('\\input{');
    expect(tex).not.toContain('\\write18{');
    expect(tex).toContain('\\textbackslash{}input\\{/etc/passwd\\} \\& Co 100\\%');
    expect(tex).toContain('saved \\$2M\\_\\{x\\}');
  });

  it('omits hidden sections and hidden entries', () => {
    const doc = createSampleResume();
    doc.sections[1].entries[0].hidden = true;
    doc.sections[4].hidden = true;
    const tex = serializeResume(doc);
    expect(tex).not.toContain('Lumen Savings');
    expect(tex).not.toContain('Yoruba');
    expect(tex).toContain('Northwell Health');
  });

  it('uses paracol only for two-column layouts', () => {
    expect(serializeResume(createSampleResume('harbor'))).not.toContain('paracol');
    expect(serializeResume(createSampleResume('atlas'))).toContain('\\begin{paracol}{2}');
  });

  it.each(PRESETS.map((p) => [p.id]))('preset %s produces a balanced document', (id) => {
    const tex = serializeResume(createSampleResume(id));
    const body = tex.slice(tex.indexOf('\\begin{document}') + '\\begin{document}'.length, tex.lastIndexOf('\\end{document}'));
    expect(body.length).toBeGreaterThan(500);
    // Balanced braces across the whole document.
    let depth = 0;
    for (let i = 0; i < tex.length; i += 1) {
      if (tex[i] === '\\') { i += 1; continue; }
      if (tex[i] === '{') depth += 1;
      if (tex[i] === '}') depth -= 1;
      expect(depth).toBeGreaterThanOrEqual(0);
    }
    expect(depth).toBe(0);
  });

  // Writes every preset to disk for compiling outside the test runner:
  //   DUMP_TEX_DIR=./tmp-tex pnpm vitest run serialize
  it.runIf(!!process.env.DUMP_TEX_DIR)('dumps preset .tex files', () => {
    const dir = process.env.DUMP_TEX_DIR!;
    fs.mkdirSync(dir, { recursive: true });
    const anchors: Record<string, string[]> = {};
    const variants = PRESETS.flatMap((p) => [
      { key: p.id, doc: createSampleResume(p.id) },
      { key: `${p.id}-long`, doc: createLongSampleResume(p.id) },
    ]);
    for (const { key, doc } of variants) {
      fs.writeFileSync(path.join(dir, `${key}.tex`), serializeResume(doc));
      // Parity anchors: the name, then each section heading and entry title, in reading order.
      const view = buildView(doc);
      anchors[key] = [
        view.header.name,
        ...[...view.side, ...view.main].flatMap((s) => [s.heading, ...s.entries.map((e) => e.title)]),
      ].filter(Boolean);
    }
    fs.writeFileSync(path.join(dir, 'anchors.json'), JSON.stringify(anchors, null, 2));
  });
});
