import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AuthService } from '../services/authService';
import { NoIndex } from '../components/seo/Seo';

type Phase = 'loading' | 'confirming' | 'failed' | 'waiting';

/**
 * Two jobs on one URL:
 *  - /verify-email           "check your email" after sign-up (no account exists yet);
 *  - /verify-email?token=…   the link in that email: creates the account, signs in, goes to the dashboard.
 */
function VerifyEmailContent() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const used = useRef(false);

  useEffect(() => {
    if (!router.isReady) return;
    const token = typeof router.query.token === 'string' ? router.query.token : null;
    try { setEmail(sessionStorage.getItem('pendingVerificationEmail')); } catch { /* private mode */ }
    if (!token) return setPhase('waiting');
    // The token is single-use: React strict mode runs effects twice in development, so guard it.
    if (used.current) return;
    used.current = true;
    window.history.replaceState(null, '', window.location.pathname);
    setPhase('confirming');
    AuthService.verifyEmail(token)
      .then(() => router.replace('/dashboard'))
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'This link is invalid or has expired.');
        setPhase('failed');
      });
  }, [router, router.isReady, router.query.token]);

  const resend = async () => {
    setError('');
    setNote('');
    setSending(true);
    try {
      await AuthService.sendEmailVerification();
      setNote('If that address is waiting for confirmation, a new email is on its way.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resend the email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-8 text-center">
        {phase === 'loading' || phase === 'confirming' ? (
          <>
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
            <p className="text-blue-100">{phase === 'confirming' ? 'Confirming your email…' : 'Loading…'}</p>
          </>
        ) : (
          <>
            <h1 className="mb-3 text-2xl font-bold text-white">{phase === 'failed' ? 'That link did not work' : 'Check your email'}</h1>
            {phase === 'waiting' ? (
              <p className="mb-4 text-blue-100">
                We sent a confirmation link{email ? <> to <span className="font-semibold">{email}</span></> : ''}. Open it to finish creating your account. It is valid for 24 hours.
                If you do not see it, check spam or junk.
              </p>
            ) : (
              <p className="mb-4 text-blue-100">The link is invalid, already used or has expired. Request a new one below, or sign up again.</p>
            )}
            {error && <div role="alert" className="mb-4 rounded-lg border border-red-500/40 bg-red-500/20 p-3 text-sm text-red-200">{error}</div>}
            {note && <div role="status" className="mb-4 rounded-lg border border-green-500/40 bg-green-500/20 p-3 text-sm text-green-100">{note}</div>}
            <div className="space-y-3">
              <button onClick={resend} disabled={sending || !email} className="w-full rounded-lg border border-blue-400 py-2 font-medium text-blue-200 disabled:opacity-50">
                {sending ? 'Sending…' : 'Send the email again'}
              </button>
              <Link href="/login" className="block text-sm text-blue-300 underline">Back to sign in</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPageRoute() {
  return (
    <>
      <NoIndex title="Verify your email" />
      <VerifyEmailContent />
    </>
  );
}
