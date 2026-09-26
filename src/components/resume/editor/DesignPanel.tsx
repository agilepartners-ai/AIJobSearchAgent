/**
 * The design side of the editor. Every control writes a value the schema
 * already defines, so the preview and the PDF both follow immediately — there
 * is no per-template code to keep in step.
 */
import { motion } from 'framer-motion';
import React from 'react';
import { FONTS, FONT_IDS } from '../../../lib/resume/fonts';
import { DATE_FORMATS, HEADING_STYLES, type HeadingStyle, type ResumeDocument } from '../../../lib/resume/schema';
import TemplateGrid from './TemplateGrid';
import type { ResumeEditor } from './useResumeEditor';

const ACCENTS = ['#1f2d3d', '#1d4ed8', '#0f766e', '#b45309', '#9d174d', '#4c1d95', '#166534', '#7c2d12'];

const group = 'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900';
const legend = 'mb-3 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400';
const rowLabel = 'text-xs text-slate-600 dark:text-slate-300';

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className={`${rowLabel} w-28 shrink-0`}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600 dark:bg-slate-700"
      />
      <span className="w-12 shrink-0 text-right text-xs tabular-nums text-slate-500">
        {Math.round(value * 10) / 10}
        {suffix}
      </span>
    </div>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className={`${rowLabel} w-28 shrink-0`}>{label}</span>
      <div className="flex flex-1 gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`relative flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              value === o.value ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            {value === o.value && (
              <motion.span
                layoutId={`choice-${label}`}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                className="absolute inset-0 rounded-md bg-white shadow-sm dark:bg-slate-700"
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="flex w-full items-center justify-between py-1.5">
      <span className={rowLabel}>{label}</span>
      <span className={`relative h-5 w-9 rounded-full transition-colors ${value ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 600, damping: 35 }}
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow"
          style={{ left: value ? 18 : 2 }}
        />
      </span>
    </button>
  );
}

export default function DesignPanel({ editor }: { editor: ResumeEditor }) {
  const { document: doc, update } = editor;
  const style = doc.style;
  const layout = doc.layout;

  const setStyle = (recipe: (s: ResumeDocument['style']) => void) => update((d) => recipe(d.style));
  const setLayout = (recipe: (l: ResumeDocument['layout']) => void) => update((d) => recipe(d.layout));

  return (
    <div className="space-y-4">
      <section className={group}>
        <h3 className={legend}>Template</h3>
        <TemplateGrid editor={editor} />
      </section>

      <section className={group}>
        <h3 className={legend}>Typography</h3>
        <div className="flex items-center gap-3 py-1.5">
          <span className={`${rowLabel} w-28 shrink-0`}>Body font</span>
          <select
            value={style.fontBody}
            onChange={(e) => setStyle((s) => { s.fontBody = e.target.value; })}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {FONT_IDS.map((id) => (
              <option key={id} value={id}>{FONTS[id].label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 py-1.5">
          <span className={`${rowLabel} w-28 shrink-0`}>Heading font</span>
          <select
            value={style.fontHeading}
            onChange={(e) => setStyle((s) => { s.fontHeading = e.target.value; })}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {FONT_IDS.map((id) => (
              <option key={id} value={id}>{FONTS[id].label}</option>
            ))}
          </select>
        </div>
        <Slider label="Body size" value={style.sizes.base} min={8} max={13} step={0.5} suffix="pt" onChange={(v) => setStyle((s) => { s.sizes.base = v; })} />
        <Slider label="Name size" value={style.sizes.name} min={14} max={40} step={0.5} suffix="pt" onChange={(v) => setStyle((s) => { s.sizes.name = v; })} />
        <Slider label="Job title size" value={style.sizes.title} min={9} max={22} step={0.5} suffix="pt" onChange={(v) => setStyle((s) => { s.sizes.title = v; })} />
        <Slider label="Heading size" value={style.sizes.heading} min={9} max={20} step={0.5} suffix="pt" onChange={(v) => setStyle((s) => { s.sizes.heading = v; })} />
        <Slider label="Entry title size" value={style.sizes.entryTitle} min={8} max={15} step={0.5} suffix="pt" onChange={(v) => setStyle((s) => { s.sizes.entryTitle = v; })} />
        <Slider label="Line height" value={style.lineHeight} min={1} max={1.8} step={0.01} onChange={(v) => setStyle((s) => { s.lineHeight = v; })} />
      </section>

      <section className={group}>
        <h3 className={legend}>Spacing</h3>
        <Slider label="Between sections" value={style.sectionGap} min={2} max={28} step={0.5} suffix="pt" onChange={(v) => setStyle((s) => { s.sectionGap = v; })} />
        <Slider label="Between entries" value={style.entryGap} min={0} max={18} step={0.5} suffix="pt" onChange={(v) => setStyle((s) => { s.entryGap = v; })} />
        <Slider label="Side margin" value={layout.marginX} min={8} max={30} step={0.5} suffix="mm" onChange={(v) => setLayout((l) => { l.marginX = v; })} />
        <Slider label="Top margin" value={layout.marginY} min={8} max={30} step={0.5} suffix="mm" onChange={(v) => setLayout((l) => { l.marginY = v; })} />
      </section>

      <section className={group}>
        <h3 className={legend}>Layout</h3>
        <Choice
          label="Columns"
          value={String(layout.columns) as '1' | '2'}
          options={[{ value: '1', label: 'One' }, { value: '2', label: 'Two' }]}
          onChange={(v) => setLayout((l) => { l.columns = v === '2' ? 2 : 1; })}
        />
        {layout.columns === 2 && (
          <>
            <Choice
              label="Side column"
              value={layout.sidePosition}
              options={[{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }]}
              onChange={(v) => setLayout((l) => { l.sidePosition = v; })}
            />
            <Slider label="Side width" value={layout.sideWidth} min={22} max={45} step={1} suffix="%" onChange={(v) => setLayout((l) => { l.sideWidth = v; })} />
            <Toggle
              label="Tinted side column"
              value={!!layout.sideBackground}
              onChange={(v) => setLayout((l) => { l.sideBackground = v ? '#f1f5f9' : null; })}
            />
          </>
        )}
        <Choice
          label="Page size"
          value={layout.pageFormat}
          options={[{ value: 'A4', label: 'A4' }, { value: 'Letter', label: 'Letter' }]}
          onChange={(v) => setLayout((l) => { l.pageFormat = v; })}
        />
        <Toggle label="Page numbers" value={style.pageNumbers} onChange={(v) => setStyle((s) => { s.pageNumbers = v; })} />
      </section>

      <section className={group}>
        <h3 className={legend}>Headings</h3>
        <div className="flex flex-wrap gap-1.5 py-1">
          {HEADING_STYLES.map((h: HeadingStyle) => (
            <button
              key={h}
              onClick={() => setStyle((s) => { s.headingStyle = h; })}
              className={`rounded-lg px-2.5 py-1 text-xs capitalize transition-colors ${
                style.headingStyle === h
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {h.replace(/([A-Z])/g, ' $1')}
            </button>
          ))}
        </div>
        <Toggle label="Uppercase headings" value={style.headingUppercase} onChange={(v) => setStyle((s) => { s.headingUppercase = v; })} />
      </section>

      <section className={group}>
        <h3 className={legend}>Colour</h3>
        <div className="flex flex-wrap items-center gap-2 py-1">
          {ACCENTS.map((c) => (
            <button
              key={c}
              onClick={() => setStyle((s) => { s.colors.accent = c; })}
              aria-label={`Accent ${c}`}
              className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${style.colors.accent.toLowerCase() === c ? 'ring-2 ring-slate-900 ring-offset-2 dark:ring-white dark:ring-offset-slate-900' : ''}`}
              style={{ background: c }}
            />
          ))}
          <input
            type="color"
            value={style.colors.accent}
            onChange={(e) => setStyle((s) => { s.colors.accent = e.target.value; })}
            className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0"
            aria-label="Custom accent colour"
          />
        </div>
        <Toggle label="Accent the name" value={style.accentOn.name} onChange={(v) => setStyle((s) => { s.accentOn.name = v; })} />
        <Toggle label="Accent headings" value={style.accentOn.headings} onChange={(v) => setStyle((s) => { s.accentOn.headings = v; })} />
        <Toggle label="Accent rules" value={style.accentOn.rules} onChange={(v) => setStyle((s) => { s.accentOn.rules = v; })} />
        <Toggle label="Accent links" value={style.accentOn.links} onChange={(v) => setStyle((s) => { s.accentOn.links = v; })} />
      </section>

      <section className={group}>
        <h3 className={legend}>Header &amp; entries</h3>
        <Choice
          label="Header align"
          value={style.header.align}
          options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Centre' }]}
          onChange={(v) => setStyle((s) => { s.header.align = v; })}
        />
        <Choice
          label="Separator"
          value={style.header.separator}
          options={[{ value: 'bullet', label: '•' }, { value: 'bar', label: '|' }, { value: 'dot', label: '·' }]}
          onChange={(v) => setStyle((s) => { s.header.separator = v; })}
        />
        <Choice
          label="Dates"
          value={style.entries.datePosition}
          options={[{ value: 'right', label: 'Right' }, { value: 'below', label: 'Below' }]}
          onChange={(v) => setStyle((s) => { s.entries.datePosition = v; })}
        />
        <Choice
          label="Organisation"
          value={style.entries.subtitleStyle}
          options={[{ value: 'normal', label: 'Normal' }, { value: 'italic', label: 'Italic' }, { value: 'bold', label: 'Bold' }]}
          onChange={(v) => setStyle((s) => { s.entries.subtitleStyle = v; })}
        />
        <div className="flex items-center gap-3 py-1.5">
          <span className={`${rowLabel} w-28 shrink-0`}>Date format</span>
          <select
            value={style.entries.dateFormat}
            onChange={(e) => setStyle((s) => { s.entries.dateFormat = e.target.value as typeof DATE_FORMATS[number]; })}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {DATE_FORMATS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <Toggle label="Underline links" value={style.underlineLinks} onChange={(v) => setStyle((s) => { s.underlineLinks = v; })} />
      </section>
    </div>
  );
}
