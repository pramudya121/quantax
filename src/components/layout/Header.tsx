import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowLeftRight, Droplets, LayoutGrid, BarChart3, Wallet, BookOpen, Home, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/wallet/WalletButton';
import { NetworkSelector } from '@/components/layout/NetworkSelector';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { prefetchRoute } from '@/lib/prefetchRoutes';

import quantaxLogo from '@/assets/quantax-logo.jpg';

const navItems = [
  { name: 'Home', path: '/', icon: Home },
  { name: 'Swap', path: '/swap', icon: ArrowLeftRight },
  { name: 'Liquidity', path: '/liquidity', icon: Droplets },
  { name: 'Pools', path: '/pools', icon: LayoutGrid },
  { name: 'Farm', path: '/farming', icon: Sprout },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Portfolio', path: '/portfolio', icon: Wallet },
  { name: 'Docs', path: '/docs', icon: BookOpen },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/40">
        {/* top accent line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="group flex min-w-0 items-center gap-3" aria-label="QuantaX home">
              <motion.div
                whileHover={{ scale: 1.04 }}
                transition={{ type: 'spring', stiffness: 400 }}
                className="relative shrink-0"
              >
                <img src={quantaxLogo} alt="" className="relative h-9 w-9 rounded-xl ring-1 ring-primary/25" />
              </motion.div>
              <span className="hidden font-display text-base font-semibold tracking-tight text-foreground sm:inline">QUANTAX</span>
            </Link>

            {/* Desktop Navigation */}
            <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-1 rounded-xl border border-border/60 bg-card/60 p-1 backdrop-blur-xl">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onMouseEnter={() => prefetchRoute(item.path)}
                    onFocus={() => prefetchRoute(item.path)}
                    onTouchStart={() => prefetchRoute(item.path)}
                    aria-current={location.pathname === item.path ? 'page' : undefined}
                    className={`nav-link flex items-center gap-2 ${location.pathname === item.path ? 'active' : ''}`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-2 sm:gap-3">
              <NetworkSelector />
              <NotificationCenter />
              <WalletButton />


              <Button
                variant="ghost"
                size="icon"
                className="touch-target lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute inset-x-0 top-[65px] min-h-[calc(100vh-65px)] overflow-y-auto border-t border-border bg-background lg:hidden"
            >
              <nav id="mobile-navigation" aria-label="Mobile navigation" className="container mx-auto flex flex-col gap-1 px-4 py-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onMouseEnter={() => prefetchRoute(item.path)}
                      onTouchStart={() => prefetchRoute(item.path)}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                        location.pathname === item.path
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted'
                      }`}
                      aria-current={location.pathname === item.path ? 'page' : undefined}
                    >
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

    </>
  );
}
