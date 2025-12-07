import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // same as in DashboardMain
import { useAuth } from '../hooks/useAuth';
import { AuthService } from '../services/authService';

const VerifyEmailPage: React.FC = () => {
  const { user, loading, isEmailVerified } = useAuth();
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  // Redirect logic
  useEffect(() => {
    if (loading) return;

    // Not logged in → go to login
    if (!user) {
      router.replace('/login');
      return;
    }

    // Already verified → go to dashboard
    if (isEmailVerified) {
      router.replace('/dashboard');
    }
  }, [loading, user, isEmailVerified, router]);

  const handleResend = async () => {
    setError('');
    try {
      setSending(true);
      await AuthService.sendEmailVerification(); // uses provider's sendEmailVerification
    } catch (e: any) {
      setError(e.message ?? 'Failed to resend verification email.');
    } finally {
      setSending(false);
    }
  };

  const handleCheckVerified = async () => {
    setError('');
    if (!user) {
      setError('No user is logged in.');
      return;
    }
    try {
      setChecking(true);
      // simplest way: reload page so Firebase SDK refreshes user info
      window.location.reload();
    } catch (e: any) {
      setError(e.message ?? 'Failed to check verification status.');
      setChecking(false);
    }
  };

  if (loading || (!user && !error)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-xl text-gray-200">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/10 rounded-2xl p-8 border border-white/20 text-center">
        <h1 className="text-2xl font-bold text-white mb-3">Verify your email</h1>
        <p className="text-blue-100 mb-4">
          We’ve sent a verification link to{' '}
          <span className="font-semibold">{user?.email}</span>. Click the link in that email, then
          come back here and press “I’ve verified my email”.
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-200 bg-red-500/20 border border-red-500/40 rounded-lg p-3">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleCheckVerified}
            disabled={checking}
            className="w-full py-2 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50"
          >
            {checking ? 'Checking…' : "I've verified my email"}
          </button>

          <button
            onClick={handleResend}
            disabled={sending}
            className="w-full py-2 rounded-lg border border-blue-400 text-blue-200 font-medium disabled:opacity-50"
          >
            {sending ? 'Resending…' : 'Resend verification email'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;