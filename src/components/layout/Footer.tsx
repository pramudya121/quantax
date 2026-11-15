import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import quantaxLogo from '@/assets/quantax-logo.jpg';

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
    { name: 'GitHub', path: 'https://github.com/pramudya121/quantax', external: true },
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
          <div className="col-span-2 lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-3 mb-4">
              <img src={quantaxLogo} alt="QuantaX" className="h-10 w-10 rounded-xl" />
              <span className="text-xl font-bold gradient-text">QUANTAX</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs mb-6">
              A community-built exchange on QMS Testnet for swapping tokens and managing liquidity on-chain.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold mb-4 text-foreground">{title}</h4>
              <ul className="flex flex-col gap-2.5">
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
            <span className="size-2 rounded-full bg-success" aria-hidden="true" />
            <span>QMS Testnet</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
