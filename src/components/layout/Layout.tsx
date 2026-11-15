import { useEffect, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { useLiveSwapNotifications } from '@/hooks/useLiveSwapNotifications';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [showBot, setShowBot] = useState(false);
  const [DragonBotComponent, setDragonBotComponent] = useState<ComponentType | null>(null);
  useLiveSwapNotifications();

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

  useEffect(() => {
    if (!showBot) return;
    let active = true;
    import('@/components/chat/DragonBot')
      .then(({ QuantaBot }) => {
        if (active) setDragonBotComponent(() => QuantaBot);
      })
      .catch((error) => {
        console.error('[v0] Optional chat widget failed to load:', error);
      });
    return () => {
      active = false;
    };
  }, [showBot]);

  return (
    <div className="wave-bg min-h-screen relative flex flex-col overflow-x-clip">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 opacity-60" style={{ backgroundImage: 'var(--gradient-mesh)' }} />
      <Header />
      <main id="main-content" tabIndex={-1} className="relative z-10 flex-1 pb-12 pt-20 focus:outline-none">
        {children}
      </main>
      <Footer />
      {showBot && DragonBotComponent && (
        <ErrorBoundary fallback={<></>}>
          <DragonBotComponent />
        </ErrorBoundary>
      )}
    </div>
  );
}

