/**
 * Performance utilities for QuantaX
 * Optimizations and monitoring
 */

// Debounce function for input handling
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return function (this: unknown, ...args: Parameters<T>) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), wait);
  };
}

// Throttle function for scroll/resize handlers
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Memoization with LRU cache
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  maxSize: number = 100
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      // Move to end (most recently used)
      const value = cache.get(key)!;
      cache.delete(key);
      cache.set(key, value);
      return value;
    }
    
    const result = fn(...args) as ReturnType<T>;
    cache.set(key, result);
    
    // Evict oldest if over limit
    if (cache.size > maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }
    
    return result;
  }) as T;
}

// Request idle callback polyfill
export const requestIdleCallback = 
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback
    : (cb: IdleRequestCallback) => setTimeout(() => cb({ 
        didTimeout: false, 
        timeRemaining: () => 50 
      }), 1);

// Performance measurement
export function measurePerformance(name: string) {
  if (typeof performance === 'undefined') return { end: () => {} };
  
  const start = performance.now();
  return {
    end: () => {
      const duration = performance.now() - start;
      if (duration > 100) {
        console.warn(`[Perf] ${name} took ${duration.toFixed(2)}ms`);
      }
    },
  };
}

// Lazy load images with intersection observer
export function lazyLoadImage(
  imgElement: HTMLImageElement,
  src: string,
  placeholder?: string
): () => void {
  if (placeholder) {
    imgElement.src = placeholder;
  }
  
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          imgElement.src = src;
          observer.unobserve(imgElement);
        }
      });
    },
    { rootMargin: '50px' }
  );
  
  observer.observe(imgElement);
  
  return () => observer.disconnect();
}

// Preload critical resources
export function preloadResource(
  href: string,
  as: 'script' | 'style' | 'font' | 'image'
): void {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  if (as === 'font') link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

// Connection quality detection
export function getConnectionQuality(): 'slow' | 'medium' | 'fast' {
  const connection = (navigator as Navigator & { 
    connection?: { 
      effectiveType?: string;
      downlink?: number;
    } 
  }).connection;
  
  if (!connection) return 'fast';
  
  if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
    return 'slow';
  }
  
  if (connection.effectiveType === '3g' || (connection.downlink && connection.downlink < 1.5)) {
    return 'medium';
  }
  
  return 'fast';
}

// Reduce motion preference
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
