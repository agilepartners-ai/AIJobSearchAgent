/**
 * The account menu in the dashboard header: profile, job preferences and sign
 * out, which is the only way out of the app.
 */
import { signOut } from 'firebase/auth';
import { motion } from 'framer-motion';
import { LogOut, Settings, User } from 'lucide-react';
import { useRouter } from 'next/router';
import React, { useEffect, useRef, useState } from 'react';
import { auth } from '../../lib/firebase';

interface Props {
  name: string;
  onProfile: () => void;
  onPreferences: () => void;
}

export default function ProfileMenu({ name, onProfile, onPreferences }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const act = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  const signOutNow = async () => {
    setOpen(false);
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
    void router.push('/login');
  };

  const item =
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-semibold text-white">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <span className="max-w-[140px] truncate">{name}</span>
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          <button className={item} onClick={() => act(onProfile)} role="menuitem">
            <User size={15} /> Profile
          </button>
          <button className={item} onClick={() => act(onPreferences)} role="menuitem">
            <Settings size={15} /> Job preferences
          </button>
          <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
          <button className={`${item} text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950`} onClick={signOutNow} role="menuitem">
            <LogOut size={15} /> Sign out
          </button>
        </motion.div>
      )}
    </div>
  );
}
