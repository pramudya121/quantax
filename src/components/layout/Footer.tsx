import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, ExternalLink, Github, Twitter, MessageCircle } from 'lucide-react';
import quantaxLogo from '@/assets/quantax-logo.jpg.asset.json';

const footerLinks = {
  Products: [
    { name: 'Swap', path: '/swap' },
    { name: 'Liquidity', path: '/liquidity' },
    { name: 'Pools', path: '/pools' },
    { name: 'Analytics', path: '/analytics' },
  ],
  Resources: [
    { name: 'Documentation', path: '/docs' },
    { name: 'Learn DeFi', path: '/learn' },
    { name: 'Portfolio', path: '/portfolio' },
    { name: 'QMS Explorer', path: 'https://testnet.qmsscan.io', external: true },
  ],
  Community: [
    { name: 'Discord', path: '#', external: true },
    { name: 'Twitter', path: '#', external: true },
    { name: 'GitHub', path: '#', external: true },
  ],
};

export function Footer() {
  return (
    <footer className="relative border-t border-border/50 bg-background/60 backdrop-blur-xl">
      {/* Gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-3 mb-4">
              <img src={dragonLogo} alt="QuantaX" className="h-10 w-10 rounded-xl" />
              <span className="text-xl font-bold gradient-text">QUANTAX</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs mb-6">
              The premier decentralized exchange on QMS Testnet. Swap, provide liquidity, and earn with the power of the dragon.
            </p>
            <div className="flex items-center gap-3">
              {[
                { icon: Twitter, label: 'Twitter' },
                { icon: MessageCircle, label: 'Discord' },
                { icon: Github, label: 'GitHub' },
              ].map(({ icon: Icon, label }) => (
                <motion.a
                  key={label}
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2.5 rounded-xl bg-muted/50 border border-border/50 hover:border-primary/50 hover:bg-primary/10 transition-colors"
                  aria-label={label}
                >
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold mb-4 text-foreground">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.name}>
                    {link.external ? (
                      <a
                        href={link.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
                      >
                        {link.name}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <Link
                        to={link.path}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} QuantaX. Built on QMS Testnet.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Flame className="w-3 h-3 text-primary" />
            <span>Powered by Dragon Fire</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
