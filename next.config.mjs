/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable standalone output on Windows to avoid symlink EPERM during local builds; keep for others.
  output: process.platform === 'win32' ? undefined : 'standalone',

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
