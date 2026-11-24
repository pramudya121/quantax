// Route prefetcher: warm up the dynamic chunks of lazy-loaded pages on
// hover/focus so navigation feels instant. Each entry mirrors the lazy()
// import in App.tsx — keep them in sync.

type Loader = () => Promise<unknown>;

const loaders: Record<string, Loader> = {
  '/': () => import('@/pages/Index'),
  '/swap': () => import('@/pages/Swap'),
  '/liquidity': () => import('@/pages/Liquidity'),
  '/pools': () => import('@/pages/Pools'),
  '/create-pool': () => import('@/pages/CreatePool'),
  '/analytics': () => import('@/pages/Analytics'),
  '/portfolio': () => import('@/pages/Portfolio'),
  '/docs': () => import('@/pages/Docs'),
  '/farming': () => import('@/pages/Farming'),
  '/admin/farming': () => import('@/pages/AdminFarming'),
};

const warmed = new Set<string>();

export function prefetchRoute(path: string) {
  if (warmed.has(path)) return;
  const loader = loaders[path];
  if (!loader) return;
  warmed.add(path);
  // fire-and-forget; ignore failures (will retry on real navigation)
  loader().catch(() => warmed.delete(path));
}

// Warm only the most-used route when the browser is idle and the connection
// can afford it. Other pages are prefetched on navigation intent in the header.
export function warmCriticalRoutes() {
  if (typeof window === 'undefined') return;

  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  if (connection?.saveData || connection?.effectiveType?.includes('2g')) return;

  const warmSwap = () => prefetchRoute('/swap');
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(warmSwap, { timeout: 2000 });
  } else {
    window.setTimeout(warmSwap, 1200);
  }
}
