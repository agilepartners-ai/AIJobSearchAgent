import React from 'react';
import type { Metadata } from 'next';
import { Providers } from '../components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'AIJobSearchAgent | AI-Powered Career Success Platform',
  description: 'Transform your job search with AI-powered resume optimization, mock interviews, and personalized career guidance. Land your dream job faster with AIJobSearchAgent.',
  keywords: ['job search', 'resume optimization', 'interview coaching', 'career guidance', 'AI career tools'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
