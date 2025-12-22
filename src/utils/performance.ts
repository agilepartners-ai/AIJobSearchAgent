/**
 * Performance utilities for Next.js 15+ optimization
 */

// Web Vitals tracking
export const reportWebVitals = (metric: any) => {
  if (process.env.NODE_ENV === 'production') {
    // Log to console in development
    console.log(metric);
    
    // You can send to analytics service
    // Example: sendToAnalytics(metric)
  }
};

// Dynamic import helper with preload
export const dynamicImportWithPreload = <T>(
  importFn: () => Promise<T>,
  preloadDelay = 0
): (() => Promise<T>) => {
  let modulePromise: Promise<T> | null = null;
  
  const preload = () => {
    if (!modulePromise) {
      modulePromise = importFn();
    }
  };
  
  if (preloadDelay > 0) {
    setTimeout(preload, preloadDelay);
  }
  
  return () => {
    if (!modulePromise) {
      modulePromise = importFn();
    }
    return modulePromise;
  };
};

// Lazy load images with Intersection Observer
export const lazyLoadImage = (
  imgElement: HTMLImageElement,
  src: string,
  options?: IntersectionObserverInit
) => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        imgElement.src = src;
        observer.unobserve(imgElement);
      }
    });
  }, options);
  
  observer.observe(imgElement);
  
  return () => observer.disconnect();
};

// Debounce function for performance
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

// Throttle function for performance
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Measure component render time
export const measureRenderTime = (componentName: string) => {
  if (typeof window === 'undefined') return;
  
  const startMark = `${componentName}-start`;
  const endMark = `${componentName}-end`;
  const measureName = `${componentName}-render`;
  
  performance.mark(startMark);
  
  return () => {
    performance.mark(endMark);
    performance.measure(measureName, startMark, endMark);
    
    const measure = performance.getEntriesByName(measureName)[0];
    console.log(`${componentName} render time:`, measure.duration, 'ms');
    
    // Cleanup
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(measureName);
  };
};

// Prefetch route
export const prefetchRoute = (href: string) => {
  if (typeof window === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  link.as = 'document';
  document.head.appendChild(link);
};

// Check if user prefers reduced motion
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Memory usage tracking (Chrome only)
export const getMemoryUsage = (): number | null => {
  if (typeof window === 'undefined') return null;
  
  const performance = window.performance as any;
  if (performance.memory) {
    return performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
  }
  return null;
};
