/**
 * Editor state for one resume: an undo stack over the document, plus debounced
 * autosave.
 *
 * Every mutation goes through update(), which is what makes undo, the dirty
 * flag and autosave a single consistent story rather than three bolted-on
 * behaviours.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ResumeDocument } from '../../../lib/resume/schema';
import { saveResume } from '../../../services/resumeService';

const AUTOSAVE_MS = 1200;
const HISTORY_LIMIT = 100;

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface ResumeEditor {
  document: ResumeDocument;
  update: (recipe: (draft: ResumeDocument) => void, options?: { history?: boolean }) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saveState: SaveState;
  saveNow: () => Promise<void>;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function useResumeEditor(uid: string | null, initial: ResumeDocument): ResumeEditor {
  const [document, setDocument] = useState<ResumeDocument>(initial);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const past = useRef<ResumeDocument[]>([]);
  const future = useRef<ResumeDocument[]>([]);
  const [, forceRender] = useState(0);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<ResumeDocument | null>(null);

  const flush = useCallback(async () => {
    const doc = pending.current;
    if (!doc || !uid) return;
    pending.current = null;
    setSaveState('saving');
    try {
      await saveResume(uid, doc);
      setSaveState('saved');
    } catch {
      // Keep the document queued so the next edit retries it.
      pending.current = doc;
      setSaveState('error');
    }
  }, [uid]);

  const schedule = useCallback(
    (doc: ResumeDocument) => {
      pending.current = doc;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, AUTOSAVE_MS);
    },
    [flush],
  );

  const update = useCallback(
    (recipe: (draft: ResumeDocument) => void, options?: { history?: boolean }) => {
      setDocument((current) => {
        const draft = clone(current);
        recipe(draft);
        draft.updatedAt = new Date().toISOString();
        if (options?.history !== false) {
          past.current = [...past.current, current].slice(-HISTORY_LIMIT);
          future.current = [];
        }
        schedule(draft);
        return draft;
      });
      forceRender((n) => n + 1);
    },
    [schedule],
  );

  const undo = useCallback(() => {
    setDocument((current) => {
      const previous = past.current[past.current.length - 1];
      if (!previous) return current;
      past.current = past.current.slice(0, -1);
      future.current = [current, ...future.current];
      schedule(previous);
      return previous;
    });
    forceRender((n) => n + 1);
  }, [schedule]);

  const redo = useCallback(() => {
    setDocument((current) => {
      const next = future.current[0];
      if (!next) return current;
      future.current = future.current.slice(1);
      past.current = [...past.current, current];
      schedule(next);
      return next;
    });
    forceRender((n) => n + 1);
  }, [schedule]);

  // Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z, except while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target?.tagName ?? '')) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // Never lose the last edit to a navigation or a closed tab.
  useEffect(() => {
    const onLeave = () => {
      if (pending.current) void flush();
    };
    window.addEventListener('beforeunload', onLeave);
    return () => {
      window.removeEventListener('beforeunload', onLeave);
      onLeave();
    };
  }, [flush]);

  return {
    document,
    update,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    saveState,
    saveNow: flush,
  };
}
