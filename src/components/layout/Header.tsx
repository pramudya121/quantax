import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowLeftRight, Droplets, LayoutGrid, BarChart3, Wallet, BookOpen, Home, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/wallet/WalletButton';
import { NetworkSelector } from '@/components/layout/NetworkSelector';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { FloatingDock } from '@/components/ui/aceternity/FloatingDock';
import { prefetchRoute } from '@/lib/prefetchRoutes';

import quantaxLogo from '@/assets/quantax-logo.jpg.asset.json';

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

const dockItems = navItems.filter(i => ['Home','Swap','Liquidity','Farm','Portfolio'].includes(i.name)).map(item => ({
  title: item.name,
  icon: item.icon,
  href: item.path,
}));

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
            <Link to="/" className="flex items-center gap-3 group">
              <motion.div
                whileHover={{ scale: 1.08, rotate: -6 }}
                transition={{ type: 'spring', stiffness: 400 }}
                className="relative"
              >
                <div className="absolute inset-0 rounded-xl bg-primary/40 blur-lg opacity-60 group-hover:opacity-100 transition-opacity" />
                <img src={quantaxLogo.url} alt="QuantaX" className="relative h-11 w-11 rounded-xl ring-1 ring-primary/30" />
              </motion.div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1 p-1 rounded-2xl bg-card/40 border border-border/40 backdrop-blur-xl">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onMouseEnter={() => prefetchRoute(item.path)}
                    onFocus={() => prefetchRoute(item.path)}
                    onTouchStart={() => prefetchRoute(item.path)}
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
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
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
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl"
            >
              <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
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

      {/* Floating Dock for Mobile */}
      <div className="lg:hidden">
        <FloatingDock items={dockItems} />
      </div>
    </>
  );
}
