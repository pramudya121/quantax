import { ReactNode, lazy, Suspense, useEffect, useState } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { useLiveSwapNotifications } from '@/hooks/useLiveSwapNotifications';

// Defer decorative backgrounds — pure visuals, not part of the critical path.
const WaveBackground = lazy(() =>
  import('@/components/ui/WaveBackground').then(m => ({ default: m.WaveBackground }))
);
const StarCometOverlay = lazy(() =>
  import('@/components/ui/StarCometOverlay').then(m => ({ default: m.StarCometOverlay }))
);
const DragonBot = lazy(() =>
  import('@/components/chat/DragonBot').then(m => ({ default: m.DragonBot }))
);


interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [showBot, setShowBot] = useState(false);

  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    const schedule = w.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1500));
    const id = schedule(() => setShowBot(true));
    return () => {
      const cancel = (window as Window & { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback;
      if (cancel) cancel(id as number);
      else clearTimeout(id as unknown as number);
    };
  }, []);

  return (
    <div className="min-h-screen relative flex flex-col" style={{ background: 'hsl(0 0% 3%)' }}>
      <Suspense fallback={null}>
        <WaveBackground />
        <StarCometOverlay starCount={100} cometCount={8} />
      </Suspense>



      <Header />
      <main className="relative z-10 pt-20 pb-12 flex-1">
        {children}
      </main>
      <Footer />
      {showBot && (
        <Suspense fallback={null}>
          <DragonBot />
        </Suspense>
      )}
    </div>
  );
}

