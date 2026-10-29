import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, ChevronDown, Copy, ExternalLink, LogOut, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/useWallet';
import { formatEther } from 'viem';
import { WalletConnectModal } from './WalletConnectModal';

export function WalletButton() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    address,
    isConnected,
    isConnecting,
    disconnect,
    balance,
    isCorrectNetwork,
    switchToQMS,
    formatAddress,
  } = useWallet();

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isConnected) {
    return (
      <>
        <Button
          onClick={() => setShowWalletModal(true)}
          className="btn-dragon"
          disabled={isConnecting}
          size="sm"
        >
          <Wallet className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
        </Button>

        <WalletConnectModal 
          isOpen={showWalletModal} 
          onClose={() => setShowWalletModal(false)} 
        />
      </>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <Button onClick={switchToQMS} variant="destructive" className="animate-pulse">
        Switch to QMS
      </Button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="group flex items-center gap-1.5 sm:gap-2 pl-2 pr-2.5 sm:pr-3 py-1.5 rounded-xl bg-gradient-to-r from-primary/15 via-secondary/10 to-accent/10 hover:from-primary/25 hover:via-secondary/15 hover:to-accent/15 border border-primary/30 hover:border-primary/50 transition-all text-sm shadow-[0_4px_20px_-8px_hsl(var(--primary)/0.5)]"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
        </span>
        <span className="font-mono-display font-semibold tabular-nums">{formatAddress(address!)}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform text-muted-foreground group-hover:text-foreground ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {showDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-card border border-border/50 rounded-xl shadow-2xl p-4 z-50"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Connected</span>
                <div className="flex items-center gap-1.5 text-success text-xs font-medium">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  QMS Testnet
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/30 border border-border/30 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono">{formatAddress(address!)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleCopyAddress}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                      title="Copy address"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      )}
                    </button>
                    <a
                      href={`https://testnet.iopn.tech/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                      title="View on explorer"
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </a>
                  </div>
                </div>
                <div className="mt-3 text-2xl font-bold">
                  {balance ? parseFloat(formatEther(balance.value)).toFixed(4) : '0'} QMS
                </div>
              </div>

              <Button
                onClick={() => {
                  disconnect();
                  setShowDropdown(false);
                }}
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
