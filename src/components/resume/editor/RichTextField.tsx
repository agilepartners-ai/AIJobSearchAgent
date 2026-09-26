/**
 * Rich-text field backed by TipTap, restricted to exactly what the schema
 * allows: paragraphs, bullet lists, bold, italic, links. Anything pasted in
 * from elsewhere is normalised on the way out.
 */
import Link from '@tiptap/extension-link';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Link2, List } from 'lucide-react';
import React, { useEffect } from 'react';
import { normaliseRichText } from '../../../lib/resume/richtext';
import type { RichText } from '../../../lib/resume/schema';

interface Props {
  value: RichText;
  onChange: (value: RichText) => void;
  placeholder?: string;
}

const btn = (active: boolean) =>
  `rounded p-1.5 transition-colors ${
    active
      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
      : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
  }`;

export default function RichTextField({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        code: false,
        strike: false,
        orderedList: false,
      }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none px-3 py-2 focus:outline-none min-h-[72px] dark:prose-invert prose-p:my-1 prose-ul:my-1',
        'data-placeholder': placeholder ?? '',
      },
    },
    onUpdate: ({ editor: e }) => onChange(normaliseRichText(e.getJSON())),
  });

  // Undo, template switches and AI rewrites replace the value from outside.
  useEffect(() => {
    if (!editor) return;
    const current = normaliseRichText(editor.getJSON());
    if (JSON.stringify(current) === JSON.stringify(value)) return;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return <div className="min-h-[72px] rounded-lg border border-slate-200 dark:border-slate-700" />;

  return (
    <div className="rounded-lg border border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-700">
      <div className="flex items-center gap-0.5 border-b border-slate-100 px-2 py-1 dark:border-slate-800">
        <button type="button" className={btn(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Bold">
          <Bold size={14} />
        </button>
        <button type="button" className={btn(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="Italic">
          <Italic size={14} />
        </button>
        <button type="button" className={btn(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="Bullet list">
          <List size={14} />
        </button>
        <button
          type="button"
          className={btn(editor.isActive('link'))}
          aria-label="Link"
          onClick={() => {
            const href = window.prompt('Link URL', editor.getAttributes('link').href ?? 'https://');
            if (href === null) return;
            if (!href.trim()) editor.chain().focus().unsetLink().run();
            else editor.chain().focus().setLink({ href: href.trim() }).run();
          }}
        >
          <Link2 size={14} />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
