"use client";

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { AuthService } from '../../services/authService';

interface Props {
  label?: string;
  onError: (message: string) => void;
}

/** Starts Google sign-in; the browser leaves for Google and returns to /dashboard signed in. */
const GoogleButton: React.FC<Props> = ({ label = 'Continue with Google', onError }) => {
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      await AuthService.initializeProvider();
      await AuthService.signInWithGoogle();
    } catch (err) {
      setBusy(false);
      onError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        data-testid="google-signin"
        className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/25 bg-white py-3 px-4 text-sm font-medium text-gray-800 shadow-lg transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60"
      >
        <Icon icon="logos:google-icon" className="h-5 w-5" />
        {busy ? 'Redirecting to Google…' : label}
      </button>
      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-blue-100/70">
        <span className="h-px flex-1 bg-white/20" />
        or
        <span className="h-px flex-1 bg-white/20" />
      </div>
    </>
  );
};

export default GoogleButton;
