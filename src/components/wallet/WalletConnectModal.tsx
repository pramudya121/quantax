import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, QrCode, Loader2 } from 'lucide-react';
import { useConnect, Connector } from 'wagmi';
import { cn } from '@/lib/utils';

// Official wallet logos from WalletConnect Explorer CDN
const WC_PROJECT_ID = '2f05ae7f1116030fde2d36508f472bfb';
const wcLogo = (id: string) =>
  `https://explorer-api.walletconnect.com/v3/logo/lg/${id}?projectId=${WC_PROJECT_ID}`;

interface WalletMeta {
  icons: string[];
  color: string;
  installUrl?: string;
  aliases?: string[];
  detector?: () => boolean; // checks window.ethereum.* flags
}

const isBrowser = typeof window !== 'undefined';
const hasProvider = (key: string) => {
  if (!isBrowser) return false;
  const eth: any = (window as any).ethereum;
  if (!eth) return (window as any)[key.replace(/^is/, '').toLowerCase()] !== undefined;
  if (eth[key]) return true;
  if (Array.isArray(eth.providers) && eth.providers.some((p: any) => p?.[key])) return true;
  return false;
};

// Official logos served directly from WalletConnect Explorer (cloud.reown.com).
// IDs sourced from https://explorer.walletconnect.com/?type=wallet
const WALLETS: Record<string, WalletMeta> = {
  'MetaMask': {
    icons: [wcLogo('eebe4a7f-7166-402f-92e0-1f64ca2aa800')],
    color: '#F6851B',
    installUrl: 'https://metamask.io/download/',
    detector: () => hasProvider('isMetaMask') && !hasProvider('isRabby') && !hasProvider('isOkxWallet'),
  },
  'Rabby Wallet': {
    icons: [wcLogo('255e6ba2-8dfd-43ad-e88e-57cbb98f6800')],
    color: '#7C8FEC',
    installUrl: 'https://rabby.io/',
    aliases: ['Rabby'],
    detector: () => hasProvider('isRabby'),
  },
  'OKX Wallet': {
    icons: [wcLogo('45f2f08e-fc0c-4d62-3e63-404e72170500')],
    color: '#000000',
    installUrl: 'https://www.okx.com/web3',
    aliases: ['OKX'],
    detector: () => isBrowser && (!!(window as any).okxwallet || hasProvider('isOkxWallet')),
  },
  'Bitget Wallet': {
    icons: [wcLogo('2b569b7f-e6c6-4faa-8e5a-ecd4dec8cf00')],
    color: '#00D0AA',
    installUrl: 'https://web3.bitget.com/',
    aliases: ['Bitget', 'BitKeep'],
    detector: () => isBrowser && (!!(window as any).bitkeep || hasProvider('isBitKeep')),
  },
  'Phantom': {
    icons: [wcLogo('b6ec7b81-bb4f-427d-e290-7631e6e50d00')],
    color: '#AB9FF2',
    installUrl: 'https://phantom.app/',
    detector: () => isBrowser && !!(window as any).phantom,
  },
  'WalletConnect': {
    icons: [
      wcLogo('ef333840-541e-4536-a352-c1e0cdcb5400'),
      'https://avatars.githubusercontent.com/u/37784886?s=200&v=4',
    ],
    color: '#3B99FC',
    installUrl: 'https://walletconnect.com/',
    aliases: ['WC', 'Wallet Connect'],
    detector: () => false,
  },
  'Coinbase Wallet': {
    icons: [
      wcLogo('a5ebc364-8f91-4200-fcc6-be81310a0000'),
      'https://avatars.githubusercontent.com/u/18060234?s=200&v=4',
    ],
    color: '#0052FF',
    installUrl: 'https://www.coinbase.com/wallet',
    aliases: ['Coinbase', 'CoinbaseWallet'],
    detector: () => isBrowser && (!!(window as any).coinbaseWalletExtension || hasProvider('isCoinbaseWallet')),
  },
};


function resolveWallet(name: string): { key: string; meta: WalletMeta } | undefined {
  if (WALLETS[name]) return { key: name, meta: WALLETS[name] };
  const lower = name.toLowerCase();
  for (const k of Object.keys(WALLETS)) {
    if (k.toLowerCase() === lower) return { key: k, meta: WALLETS[k] };
    if (WALLETS[k].aliases?.some(a => a.toLowerCase() === lower)) return { key: k, meta: WALLETS[k] };
  }
  for (const k of Object.keys(WALLETS)) {
    if (lower.includes(k.toLowerCase())) return { key: k, meta: WALLETS[k] };
  }
  return undefined;
}

const WalletIcon = ({ name, size = 32 }: { name: string; size?: number }) => {
  const resolved = resolveWallet(name);
  const [iconIdx, setIconIdx] = useState(0);
  if (!resolved || iconIdx >= resolved.meta.icons.length) {
    const initial = name.charAt(0).toUpperCase();
    return (
      <div
        className="rounded-xl flex items-center justify-center font-bold text-white"
        style={{ width: size, height: size, background: resolved?.meta.color || '#444', fontSize: size * 0.45 }}
      >{initial}</div>
    );
  }
  return (
    <div className="rounded-xl overflow-hidden flex items-center justify-center bg-card/40" style={{ width: size, height: size }}>
      <img
        key={resolved.meta.icons[iconIdx]}
        src={resolved.meta.icons[iconIdx]}
        alt={name}
        className="object-contain"
        style={{ width: size - 2, height: size - 2 }}
        onError={() => setIconIdx(i => i + 1)}
      />
    </div>
  );
};

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WalletRow {
  key: string;            // canonical wallet name
  displayName: string;
  connector?: Connector;  // wagmi connector if available
  detected: boolean;
  installUrl?: string;
  popular?: boolean;
}

export function WalletConnectModal({ isOpen, onClose }: WalletConnectModalProps) {
  const { connectors, connect, isPending } = useConnect();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Build the canonical wallet list. Use detectors + known wallets.
  // Map each canonical wallet to a wagmi connector when possible.
  const wallets: WalletRow[] = useMemo(() => {
    const rows: WalletRow[] = [];

    const findConnector = (key: string, meta: WalletMeta): Connector | undefined => {
      const lower = key.toLowerCase();
      const aliases = (meta.aliases || []).map(a => a.toLowerCase());
      return connectors.find(c => {
        const cn = c.name.toLowerCase();
        if (cn === lower) return true;
        if (aliases.includes(cn)) return true;
        if (cn.includes(lower) || lower.includes(cn)) return true;
        return false;
      });
    };

    for (const [key, meta] of Object.entries(WALLETS)) {
      const conn = findConnector(key, meta);
      const detected = !!meta.detector?.();
      rows.push({
        key,
        displayName: key,
        connector: conn,
        detected,
        installUrl: meta.installUrl,
        popular: key === 'MetaMask',
      });
    }

    // Append any connector not represented above (e.g. injected with unknown name)
    for (const c of connectors) {
      if (c.name === 'Injected') continue;
      if (rows.some(r => r.connector?.uid === c.uid)) continue;
      if (resolveWallet(c.name)) continue; // already in map
      rows.push({ key: c.name, displayName: c.name, connector: c, detected: true });
    }

    return rows;
  }, [connectors]);

  // Pick the topmost detected wallet for the "DETECTED" hero card
  const heroDetected = useMemo(() => wallets.find(w => w.detected && !!w.connector), [wallets]);

  const otherWallets = useMemo(() => {
    return wallets.filter(w => w.key !== heroDetected?.key);
  }, [wallets, heroDetected]);

  const filteredOthers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return otherWallets;
    return otherWallets.filter(w => w.displayName.toLowerCase().includes(q));
  }, [otherWallets, search]);

  useEffect(() => { if (!isOpen) { setSearch(''); setConnecting(null); } }, [isOpen]);

  const handleConnect = async (row: WalletRow) => {
    if (!row.connector) {
      // Not installed -> open install page
      if (row.installUrl) window.open(row.installUrl, '_blank', 'noopener');
      return;
    }
    setConnecting(row.key);
    try {
      await connect({ connector: row.connector });
      onClose();
    } catch (e) {
      console.error('Connect failed:', e);
    } finally {
      setConnecting(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-[400px] max-h-[88vh] overflow-hidden"
          >
            <div
              className="relative rounded-3xl border border-white/10 overflow-hidden flex flex-col max-h-[88vh]"
              style={{
                background: 'linear-gradient(180deg, hsl(0 0% 6%) 0%, hsl(0 0% 4%) 100%)',
                boxShadow: '0 25px 60px -12px rgba(0,0,0,0.7)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  Connect a wallet
                </h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="px-4 pb-5 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                {/* Hero detected wallet */}
                {heroDetected && (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleConnect(heroDetected)}
                    disabled={isPending}
                    className="relative w-full flex items-center gap-3 p-3.5 rounded-2xl text-left overflow-hidden border border-white/10 group"
                    style={{
                      background: 'linear-gradient(135deg, hsl(280 90% 55% / 0.35) 0%, hsl(320 90% 55% / 0.35) 100%)',
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/10 via-transparent to-pink-500/10 opacity-80" />
                    <WalletIcon name={heroDetected.key} size={44} />
                    <div className="flex-1 min-w-0 relative">
                      <p className="text-sm font-bold text-white truncate">Continue with {heroDetected.displayName.split(' ')[0]} ...</p>
                      <p className="text-[11px] text-white/70 truncate">Wallet detected in your browser</p>
                    </div>
                    <span className="relative shrink-0 text-[9px] tracking-wider font-bold px-2 py-1 rounded-md bg-white/15 text-white border border-white/20">
                      DETECTED
                    </span>
                    {connecting === heroDetected.key && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-white" />
                    )}
                  </motion.button>
                )}

                {/* Mobile QR option (Coming soon) */}
                <button
                  disabled
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left bg-white/[0.03] border border-white/10 opacity-70 cursor-not-allowed"
                >
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center border border-white/10">
                    <QrCode className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">QuantaX Mobile</p>
                    <p className="text-[11px] text-muted-foreground truncate">Scan a QR code to connect</p>
                  </div>
                  <span className="shrink-0 text-[9px] tracking-wider font-bold px-2 py-1 rounded-md bg-white/5 text-muted-foreground border border-white/10">
                    SOON
                  </span>
                </button>

                {/* OTHER WALLETS */}
                <div className="pt-1">
                  <p className="text-center text-[10px] tracking-[0.18em] font-semibold text-muted-foreground/70 uppercase mb-2">
                    Other Wallets
                  </p>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search wallets..."
                      className="w-full pl-8 pr-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/40 focus:bg-white/[0.06] transition-all"
                    />
                  </div>

                  <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                    {filteredOthers.length === 0 && (
                      <p className="text-center text-xs text-muted-foreground py-4">No wallets found</p>
                    )}
                    {filteredOthers.map((w) => (
                      <button
                        key={w.key}
                        onClick={() => handleConnect(w)}
                        disabled={isPending}
                        className={cn(
                          "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left border border-transparent",
                          "hover:bg-white/[0.05] hover:border-white/10",
                          connecting === w.key && "bg-primary/10 border-primary/30"
                        )}
                      >
                        <WalletIcon name={w.key} size={32} />
                        <span className="flex-1 text-sm font-semibold text-foreground truncate">{w.displayName}</span>
                        {connecting === w.key ? (
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        ) : w.detected ? (
                          <span className="text-[10px] font-semibold text-success">Detected</span>
                        ) : w.popular ? (
                          <span className="text-[10px] font-medium text-muted-foreground">Popular</span>
                        ) : !w.connector ? (
                          <span className="text-[10px] font-medium text-muted-foreground/60">Install</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-white/5 text-center shrink-0">
                <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                  By connecting a wallet, you agree to QuantaX{' '}
                  <a href="#" className="text-foreground hover:text-primary transition-colors">Terms of Service</a>
                  {' '}and acknowledge the{' '}
                  <a href="#" className="text-foreground hover:text-primary transition-colors">Privacy Policy</a>.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
