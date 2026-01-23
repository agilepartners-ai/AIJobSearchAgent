/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable standalone output on Windows to avoid symlink EPERM during local builds; keep for others.
  output: process.platform === 'win32' ? undefined : 'standalone',
};

export default nextConfig;
