/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets a production build run in its own folder (NEXT_DIST_DIR=.next-check) without
  // touching the .next that a running dev server is using; building over it breaks the dev server.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Disable standalone output on Windows to avoid symlink EPERM during local builds; keep for others.
  output: process.platform === 'win32' ? undefined : 'standalone',

  // Security headers on every response (also set for static assets in public/_headers, because assets
  // are served without running this). SAMEORIGIN, not DENY: the PDF preview is a same-origin iframe of
  // /api/documents/file. No Content-Security-Policy yet: Next's inline bootstrap script needs a nonce setup first.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
        ],
      },
    ];
  },

  // The LaTeX templates and the system prompt are read with fs.readFileSync at
  // request time. Next's tracer cannot see through a runtime path.join, so
  // without this they are absent from the standalone build and every
  // generation fails with ENOENT in production.
  outputFileTracingIncludes: {
    '/api/documents/generate': [
      './src/server/latex/templates/**',
      './src/server/ai/prompts/**',
    ],
  },
};

export default nextConfig;
