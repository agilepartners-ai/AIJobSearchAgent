"use client";
import React from 'react';

import { ReactNode } from 'react';
import ErrorBoundary from '../src/components/dashboard/ErrorBoundary';
import { ToastProvider } from '../src/components/ui/ToastProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ToastProvider>{children}</ToastProvider>
    </ErrorBoundary>
  );
}
