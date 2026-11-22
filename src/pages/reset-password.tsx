import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AuthService } from '../services/authService';
import { NoIndex } from '../components/seo/Seo';

/** Landing page for the password-reset email: the link carries a one-time token; choosing a password signs the person in. */
function ResetPasswordContent() {
  const router = useRouter();
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    const t = typeof router.query.token === 'string' ? router.query.token : null;
    setToken(t);
    // Keep the token out of the address bar, history and any Referer header from here on.
    if (t) window.history.replaceState(null, '', window.location.pathname);
  }, [router.isReady, router.query.token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) return;
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('The passwords do not match.');
    setBusy(true);
    try {
      await AuthService.confirmPasswordReset(token, password);
      setDone(true);
      setTimeout(() => router.push('/dashboard'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the password.');
    } finally {
      setBusy(false);
    }
  };

  const field = 'mt-1 block w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-blue-200/70 focus:outline-none focus:ring-2 focus:ring-blue-400';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/30 bg-white/10 p-8 shadow-xl backdrop-blur-lg">
        <h1 className="mb-2 text-2xl font-bold text-white">Choose a new password</h1>
        {token === undefined ? (
          <p className="text-blue-100">Loading…</p>
        ) : done ? (
          <p className="text-blue-100">Password updated. Taking you to your dashboard…</p>
        ) : !token ? (
          <p className="text-blue-100">
            This link is invalid or has expired. Request a new one from the sign-in page.{' '}
            <Link href="/login" className="text-blue-300 underline">Back to sign in</Link>
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {error && (
              <div role="alert" className="rounded-xl bg-red-500/20 p-3 text-sm text-red-100">
                {error}{' '}
                <Link href="/login" className="underline">Back to sign in</Link>
              </div>
            )}
            <label className="block text-sm text-white">
              New password
              <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
            </label>
            <label className="block text-sm text-white">
              Confirm password
              <input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
            </label>
            <p className="text-xs text-blue-200">At least 8 characters. Avoid common passwords and your email address.</p>
            <button disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-3 text-sm font-medium text-white disabled:opacity-50">
              {busy ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <>
      <NoIndex title="Reset your password" />
      <ResetPasswordContent />
    </>
  );
}
