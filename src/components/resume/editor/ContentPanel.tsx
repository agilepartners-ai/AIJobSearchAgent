/**
 * The content side of the editor: personal details, then one collapsible card
 * per section. Sections and entries reorder by drag; every field writes
 * straight into the document through the editor's update().
 */
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Eye, EyeOff, GripVertical, Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { createEntry, createSection } from '../../../lib/resume/defaults';
import type { Entry, ResumeDocument, Section, SectionType } from '../../../lib/resume/schema';
import { SECTION_REGISTRY, type EntryField, type FieldSpec } from '../../../lib/resume/sections';
import type { ResumeEditor } from './useResumeEditor';
import RichTextField from './RichTextField';

const input =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const label = 'mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400';

function Sortable({ id, children }: { id: string; children: (handle: React.HTMLAttributes<HTMLElement>) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className={isDragging ? 'relative opacity-90 shadow-lg' : 'relative'}
    >
      {children({ ...attributes, ...listeners } as React.HTMLAttributes<HTMLElement>)}
    </div>
  );
}

const move = <T,>(items: T[], from: number, to: number): T[] => {
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

export default function ContentPanel({ editor }: { editor: ResumeEditor }) {
  const { document: doc, update } = editor;
  const [open, setOpen] = useState<string | null>(doc.sections[0]?.id ?? null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const onSectionDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    update((d) => {
      const from = d.sections.findIndex((s) => s.id === active.id);
      const to = d.sections.findIndex((s) => s.id === over.id);
      if (from >= 0 && to >= 0) d.sections = move(d.sections, from, to);
    });
  };

  return (
    <div className="space-y-6">
      <PersonalCard editor={editor} />

      <div>
        <h3 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Sections</h3>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onSectionDragEnd} modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
          <SortableContext items={doc.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {doc.sections.map((section) => (
                <Sortable key={section.id} id={section.id}>
                  {(handle) => (
                    <SectionCard
                      section={section}
                      editor={editor}
                      handle={handle}
                      open={open === section.id}
                      onToggle={() => setOpen(open === section.id ? null : section.id)}
                    />
                  )}
                </Sortable>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <AddSection editor={editor} onAdded={setOpen} />
    </div>
  );
}

function PersonalCard({ editor }: { editor: ResumeEditor }) {
  const { document: doc, update } = editor;
  const p = doc.personal;
  const set = (key: keyof typeof p, value: string) => update((d) => { (d.personal as Record<string, unknown>)[key] = value; });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Personal details</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label}>Full name</label>
          <input className={input} value={p.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Your name" />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Job title</label>
          <input className={input} value={p.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} placeholder="Senior Product Designer" />
        </div>
        <div>
          <label className={label}>Email</label>
          <input className={input} value={p.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div>
          <label className={label}>Phone</label>
          <input className={input} value={p.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Location</label>
          <input className={input} value={p.location} onChange={(e) => set('location', e.target.value)} />
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between">
          <span className={label}>Links</span>
          <button
            onClick={() => update((d) => { d.personal.links.push({ id: `l${Date.now()}`, label: '', url: '' }); })}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-indigo-600 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-950"
          >
            <Plus size={13} /> Add
          </button>
        </div>
        <div className="space-y-2">
          {p.links.map((link, i) => (
            <div key={link.id} className="flex gap-2">
              <input className={input} value={link.label} placeholder="Label" onChange={(e) => update((d) => { d.personal.links[i].label = e.target.value; })} />
              <input className={input} value={link.url} placeholder="https://" onChange={(e) => update((d) => { d.personal.links[i].url = e.target.value; })} />
              <button
                onClick={() => update((d) => { d.personal.links.splice(i, 1); })}
                aria-label="Remove link"
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionCard({
  section,
  editor,
  handle,
  open,
  onToggle,
}: {
  section: Section;
  editor: ResumeEditor;
  handle: React.HTMLAttributes<HTMLElement>;
  open: boolean;
  onToggle: () => void;
}) {
  const { update } = editor;
  const spec = SECTION_REGISTRY[section.type];
  const patch = (recipe: (s: Section) => void) =>
    update((d) => {
      const target = d.sections.find((s) => s.id === section.id);
      if (target) recipe(target);
    });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const onEntryDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    patch((s) => {
      const from = s.entries.findIndex((x) => x.id === active.id);
      const to = s.entries.findIndex((x) => x.id === over.id);
      if (from >= 0 && to >= 0) s.entries = move(s.entries, from, to);
    });
  };

  return (
    <section className={`rounded-xl border bg-white transition-colors dark:bg-slate-900 ${open ? 'border-indigo-300 dark:border-indigo-700' : 'border-slate-200 dark:border-slate-800'}`}>
      <div className="flex items-center gap-1 px-2 py-2">
        <span {...handle} className="cursor-grab rounded p-1.5 text-slate-300 hover:text-slate-500 active:cursor-grabbing" aria-label="Reorder section">
          <GripVertical size={16} />
        </span>
        <input
          value={section.title}
          onChange={(e) => patch((s) => { s.title = e.target.value; })}
          className={`min-w-0 flex-1 rounded-md bg-transparent px-1.5 py-1 text-sm font-medium outline-none focus:bg-slate-50 dark:focus:bg-slate-800 ${section.hidden ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}
        />
        <button onClick={() => patch((s) => { s.hidden = !s.hidden; })} aria-label={section.hidden ? 'Show section' : 'Hide section'} className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
          {section.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
        <button onClick={() => update((d) => { d.sections = d.sections.filter((s) => s.id !== section.id); })} aria-label="Delete section" className="rounded p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950">
          <Trash2 size={15} />
        </button>
        <button onClick={onToggle} aria-label={open ? 'Collapse' : 'Expand'} aria-expanded={open} className="rounded p-1.5 text-slate-400 transition-transform hover:bg-slate-100 dark:hover:bg-slate-800" style={{ transform: open ? 'rotate(180deg)' : undefined }}>
          <ChevronDown size={16} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-slate-100 px-3 py-3 dark:border-slate-800">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onEntryDragEnd} modifiers={[restrictToVerticalAxis]}>
                <SortableContext items={section.entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {section.entries.map((entry, index) => (
                      <Sortable key={entry.id} id={entry.id}>
                        {(entryHandle) => (
                          <EntryFields
                            entry={entry}
                            fields={spec.fields}
                            sortable={spec.kind !== 'paragraph'}
                            handle={entryHandle}
                            onChange={(recipe) => patch((s) => recipe(s.entries[index]))}
                            onRemove={spec.kind === 'paragraph' ? undefined : () => patch((s) => { s.entries.splice(index, 1); })}
                          />
                        )}
                      </Sortable>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {spec.kind !== 'paragraph' && (
                <button
                  onClick={() => patch((s) => { s.entries.push(createEntry()); })}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-500 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700"
                >
                  <Plus size={14} /> Add {spec.label.toLowerCase()}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function EntryFields({
  entry,
  fields,
  sortable,
  handle,
  onChange,
  onRemove,
}: {
  entry: Entry;
  fields: Partial<Record<EntryField, FieldSpec>>;
  sortable: boolean;
  handle: React.HTMLAttributes<HTMLElement>;
  onChange: (recipe: (e: Entry) => void) => void;
  onRemove?: () => void;
}) {
  const spec = (f: EntryField): FieldSpec | undefined => fields[f];
  const text = (f: 'title' | 'subtitle' | 'location' | 'url', wide = false) => {
    const field = spec(f);
    if (!field) return null;
    return (
      <div className={wide ? 'sm:col-span-2' : undefined}>
        <input
          className={input}
          placeholder={field.placeholder ?? field.label}
          value={entry[f]}
          onChange={(e) => onChange((x) => { x[f] = e.target.value; })}
        />
      </div>
    );
  };

  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
      {(sortable || onRemove) && (
        <div className="mb-2 flex items-center justify-between">
          <span {...handle} className="cursor-grab rounded p-1 text-slate-300 hover:text-slate-500 active:cursor-grabbing" aria-label="Reorder entry">
            <GripVertical size={14} />
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => onChange((x) => { x.hidden = !x.hidden; })} aria-label={entry.hidden ? 'Show entry' : 'Hide entry'} className="rounded p-1 text-slate-400 hover:text-slate-600">
              {entry.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            {onRemove && (
              <button onClick={onRemove} aria-label="Delete entry" className="rounded p-1 text-slate-400 transition-colors hover:text-rose-600">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {text('title', !spec('subtitle'))}
        {text('subtitle')}
        {text('location')}
        {spec('dates') && (
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2">
              <input className={input} placeholder="2021-04" value={entry.startDate} onChange={(e) => onChange((x) => { x.startDate = e.target.value; })} />
              <span className="text-slate-400">–</span>
              <input
                className={input}
                placeholder={entry.current ? 'Present' : '2024-01'}
                value={entry.current ? '' : entry.endDate}
                disabled={entry.current}
                onChange={(e) => onChange((x) => { x.endDate = e.target.value; })}
              />
            </div>
            <label className="mt-1.5 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={entry.current} onChange={(e) => onChange((x) => { x.current = e.target.checked; })} className="rounded border-slate-300" />
              Currently here
            </label>
          </div>
        )}
        {spec('level') && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Level</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                aria-label={`Level ${n}`}
                onClick={() => onChange((x) => { x.level = x.level === n ? null : n; })}
                className={`h-4 w-4 rounded-full transition-colors ${(entry.level ?? 0) >= n ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}
              />
            ))}
          </div>
        )}
        {text('url')}
      </div>

      {spec('description') && (
        <div className="mt-2">
          <RichTextField
            value={entry.description}
            placeholder={spec('description')?.placeholder}
            onChange={(v) => onChange((x) => { x.description = v; })}
          />
        </div>
      )}
    </div>
  );
}

function AddSection({ editor, onAdded }: { editor: ResumeEditor; onAdded: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const types = Object.keys(SECTION_REGISTRY) as SectionType[];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-600 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300"
      >
        <Plus size={16} /> Add section
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-x-0 z-20 mt-2 grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            {types.map((type) => (
              <button
                key={type}
                onClick={() => {
                  const section = createSection(type);
                  editor.update((d) => { d.sections.push(section); });
                  onAdded(section.id);
                  setOpen(false);
                }}
                className="rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {SECTION_REGISTRY[type].defaultTitle}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
