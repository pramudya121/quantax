import { Suspense, lazy, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { WagmiProvider } from 'wagmi';

import { config } from '@/config/wagmi';
import { Layout } from '@/components/layout/Layout';
import { ErrorBoundary, RouteErrorBoundary } from '@/components/ErrorBoundary';
import { PageTransition } from '@/components/layout/PageTransition';
import { warmCriticalRoutes } from '@/lib/prefetchRoutes';
// Lazy-load every route so heavy deps (recharts, three.js, charts, etc.)
// only download when their page is visited. Cuts initial bundle dramatically.
const Index = lazy(() => import("./pages/Index"));
const Swap = lazy(() => import("./pages/Swap"));
const Liquidity = lazy(() => import("./pages/Liquidity"));
const Pools = lazy(() => import("./pages/Pools"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const CreatePool = lazy(() => import("./pages/CreatePool"));
const Docs = lazy(() => import("./pages/Docs"));
const Learn = lazy(() => import("./pages/Learn"));
const Farming = lazy(() => import("./pages/Farming"));
const AdminFarming = lazy(() => import("./pages/AdminFarming"));
const PairDetail = lazy(() => import("./pages/PairDetail"));
const ContractStatus = lazy(() => import("./pages/ContractStatus"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Snappier page transitions: serve cached data instantly while
      // background refetch keeps things fresh. gcTime keeps queries alive
      // across route changes so navigating back is instant.
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnMount: false,
      refetchOnReconnect: 'always',
    },
  },
});

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
    </div>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        {/* Key on pathname so the enter animation re-plays on every nav. */}
        <PageTransition key={location.pathname}>{children}</PageTransition>
      </Suspense>
    </RouteErrorBoundary>
  );
}

function PrefetchWarmer() {
  useEffect(() => {
    warmCriticalRoutes();
  }, []);
  return null;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PageWrapper><Index /></PageWrapper>} />
      <Route path="/swap" element={<PageWrapper><Swap /></PageWrapper>} />
      <Route path="/liquidity" element={<PageWrapper><Liquidity /></PageWrapper>} />
      <Route path="/pools" element={<PageWrapper><Pools /></PageWrapper>} />
      <Route path="/create-pool" element={<PageWrapper><CreatePool /></PageWrapper>} />
      <Route path="/analytics" element={<PageWrapper><Analytics /></PageWrapper>} />
      <Route path="/portfolio" element={<PageWrapper><Portfolio /></PageWrapper>} />
      <Route path="/docs" element={<PageWrapper><Docs /></PageWrapper>} />
      <Route path="/learn" element={<PageWrapper><Learn /></PageWrapper>} />
      <Route path="/farming" element={<PageWrapper><Farming /></PageWrapper>} />

      <Route path="/admin/farming" element={<PageWrapper><AdminFarming /></PageWrapper>} />
      <Route path="/pool/:address" element={<PageWrapper><PairDetail /></PageWrapper>} />
      <Route path="/status" element={<PageWrapper><ContractStatus /></PageWrapper>} />
      <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
    </Routes>
  );
}

const App = () => (
  <ErrorBoundary>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PrefetchWarmer />
            <Layout>
              <AppRoutes />
            </Layout>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </ErrorBoundary>
);

export default App;
