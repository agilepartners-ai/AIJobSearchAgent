import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['lucide-react'],
  },
  server: {
    proxy: {
      // Proxy API requests to avoid CORS issues during development
      '/api/proxy/resume-optimization': {
        target: 'https://resumebuilder-arfb.onrender.com',
        changeOrigin: true,
        rewrite: (path) => '/optimizer/api/optimize-resume/',
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
      // Proxy AI enhancement requests
      '/api/ai-enhance': {
        target: 'https://resumebuilder-arfb.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('AI enhancement proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending AI Enhancement Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received AI Enhancement Response:', proxyRes.statusCode, req.url);
          });
        },
      },
      // Proxy resume extraction requests
      '/api/extract-resume-json': {
        target: 'https://resumebuilder-arfb.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Resume extraction proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Resume Extraction Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Resume Extraction Response:', proxyRes.statusCode, req.url);
          });
        },
      },
      // Proxy PDF generation requests
      '/api/optimize-resume': {
        target: 'https://resumebuilder-arfb.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('PDF optimization proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending PDF Optimization Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received PDF Optimization Response:', proxyRes.statusCode, req.url);
          });
        },
      },
      // Proxy cover letter generation requests
      '/api/generate-cover-letter': {
        target: 'https://resumebuilder-arfb.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Cover letter proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Cover Letter Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Cover Letter Response:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  }
});