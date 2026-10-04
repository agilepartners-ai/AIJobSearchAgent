import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getSupabase } from '../lib/supabase/client';

/** Landing page for the password-reset email: Supabase signs the user in from the link, then they pick a new password. */
export default function ResetPassword() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
    });
    void supabase.auth.getSession().then(({ data: s }) => s.session && setReady(true));
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('The passwords do not match.');
    setBusy(true);
    const { error: err } = await getSupabase().auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(err.message);
    setDone(true);
    setTimeout(() => router.push('/dashboard'), 1500);
  };

  const field = 'mt-1 block w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-blue-200/70 focus:outline-none focus:ring-2 focus:ring-blue-400';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/30 bg-white/10 p-8 shadow-xl backdrop-blur-lg">
        <h1 className="mb-2 text-2xl font-bold text-white">Choose a new password</h1>
        {done ? (
          <p className="text-blue-100">Password updated. Taking you to your dashboard…</p>
        ) : !ready ? (
          <p className="text-blue-100">
            This link is invalid or has expired.{' '}
            <Link href="/login" className="text-blue-300 underline">Back to sign in</Link>
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {error && <div className="rounded-xl bg-red-500/20 p-3 text-sm text-red-100">{error}</div>}
            <label className="block text-sm text-white">
              New password
              <input type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
            </label>
            <label className="block text-sm text-white">
              Confirm password
              <input type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
            </label>
            <button disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-3 text-sm font-medium text-white disabled:opacity-50">
              {busy ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
