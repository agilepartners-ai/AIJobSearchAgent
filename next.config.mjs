/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Note: 'standalone' output may cause symlink permission issues on Windows
  // Use 'standalone' only for Docker/production deployments
  output: process.env.NEXT_OUTPUT_MODE === 'standalone' ? 'standalone' : undefined,
  
  // Turbopack configuration (Next.js 16+ uses Turbopack by default)
  // Empty config acknowledges we're aware of the webpack config below
  turbopack: {},
  
  // Webpack configuration to handle server-only modules
  // This is used when building with --webpack flag
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Externalize Node.js-only modules for client-side bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        child_process: false,
        'google-auth-library': false,
      };
    }
    return config;
  },
};

export default nextConfig;
