import { useAccount, useSwitchChain, useChainId } from 'wagmi';
import { ChevronDown, Check } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SUPPORTED_CHAINS, OPN_CHAIN_ID, AER_CHAIN_ID } from '@/config/chains';
import aerLogo from '@/assets/aer.jpg.asset.json';
import { toast } from 'sonner';

const CHAIN_LOGO: Record<number, string> = {
  [OPN_CHAIN_ID]: '/tokens/opn.jpg',
  [AER_CHAIN_ID]: aerLogo.url,
};

export function NetworkSelector() {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const [open, setOpen] = useState(false);

  const active = SUPPORTED_CHAINS.find((c) => c.id === chainId) ?? SUPPORTED_CHAINS[0];
  const unsupported = !SUPPORTED_CHAINS.some((c) => c.id === chainId);

  const handleSwitch = async (id: number) => {
    setOpen(false);
    if (id === chainId) return;
    try {
      await switchChain({ chainId: id });
      toast.success(`Beralih ke ${SUPPORTED_CHAINS.find((c) => c.id === id)?.name}`);
    } catch (err: any) {
      // Wallet may not know about the chain — try adding it manually.
      const target = SUPPORTED_CHAINS.find((c) => c.id === id);
      const provider = (window as any).ethereum;
      if (target && provider?.request) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${target.id.toString(16)}`,
                chainName: target.name,
                nativeCurrency: target.nativeCurrency,
                rpcUrls: target.rpcUrls.default.http,
                blockExplorerUrls: [target.blockExplorers.default.url],
              },
            ],
          });
          toast.success(`${target.name} ditambahkan ke wallet`);
          return;
        } catch (addErr: any) {
          toast.error(addErr?.message ?? 'Gagal menambahkan jaringan');
          return;
        }
      }
      toast.error(err?.message ?? 'Gagal berganti jaringan');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
          unsupported && isConnected
            ? 'bg-destructive/15 border-destructive/40 text-destructive hover:bg-destructive/25'
            : 'bg-card/60 border-border/40 hover:border-primary/40 hover:bg-card/80'
        }`}
        aria-label="Select network"
      >
        <img
          src={CHAIN_LOGO[active.id]}
          alt=""
          className="w-4 h-4 rounded-full object-cover ring-1 ring-border/40"
        />
        <span className="hidden sm:inline">
          {unsupported && isConnected ? 'Wrong Network' : active.name}
        </span>
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-56 z-50 rounded-xl border border-border/60 bg-background/95 backdrop-blur-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                Select Network
              </div>
              {SUPPORTED_CHAINS.map((c) => {
                const isActive = c.id === chainId;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSwitch(c.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-primary/10 transition-colors ${
                      isActive ? 'bg-primary/5' : ''
                    }`}
                  >
                    <img
                      src={CHAIN_LOGO[c.id]}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover ring-1 ring-border/40"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{c.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {c.nativeCurrency.symbol} · Chain {c.id}
                      </div>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
