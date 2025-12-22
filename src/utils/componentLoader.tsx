/**
 * Optimized component loading utilities for Next.js 15+
 */
import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Loading component with skeleton
export const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
  </div>
);

// Create optimized dynamic import
export const createDynamicImport = <P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    ssr?: boolean;
    loading?: ComponentType;
  }
) => {
  return dynamic(importFn, {
    ssr: options?.ssr ?? true,
    loading: options?.loading ?? LoadingFallback,
  });
};

// Preload components for better performance
export const preloadComponent = <P extends object>(
  component: ComponentType<P> & { preload?: () => Promise<any> }
) => {
  if (component.preload) {
    component.preload();
  }
};

// Lazy load heavy components
export const LazyComponents = {
  // Example: Video component (heavy)
  Video: createDynamicImport(
    () => import('@/components/Video'),
    { ssr: false }
  ),
  
  // Example: 3D visualization (heavy)
  Interactive3D: createDynamicImport(
    () => import('@/components/Interactive3DVisualization'),
    { ssr: false }
  ),
  
  // Example: PDF viewer (heavy)
  PDFViewer: createDynamicImport(
    () => import('@/components/common/PDFViewer'),
    { ssr: false }
  ),
};

// Route-based code splitting helper
export const createRouteComponent = <P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>
) => {
  return dynamic(importFn, {
    ssr: true,
    loading: LoadingFallback,
  });
};

// Intersection Observer based lazy loading
export const createIntersectionObserverComponent = <P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>
) => {
  return dynamic(importFn, {
    ssr: false,
    loading: () => <div className="min-h-[100px]" />,
  });
};
