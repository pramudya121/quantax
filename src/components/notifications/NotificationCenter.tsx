import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle, Loader2, XCircle, ExternalLink, ArrowRightLeft, Plus, Minus, Trash2, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTransactionHistory, type Transaction } from '@/components/history/TransactionHistory';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const EXPLORER = 'https://testnet.iopn.tech';

const typeIcon = (t: Transaction['type']) => {
  switch (t) {
    case 'swap': return <ArrowRightLeft className="w-3.5 h-3.5" />;
    case 'add_liquidity': return <Plus className="w-3.5 h-3.5" />;
    case 'remove_liquidity': return <Minus className="w-3.5 h-3.5" />;
    default: return <Sparkles className="w-3.5 h-3.5" />;
  }
};

const typeLabel = (t: Transaction['type']) => {
  switch (t) {
    case 'swap': return 'Swap';
    case 'add_liquidity': return 'Add LP';
    case 'remove_liquidity': return 'Remove LP';
    case 'approve': return 'Approve';
    case 'wrap': return 'Wrap';
    case 'unwrap': return 'Unwrap';
    default: return 'Tx';
  }
};

const statusIcon = (s: Transaction['status']) => {
  if (s === 'pending') return <Loader2 className="w-3.5 h-3.5 animate-spin text-warning" />;
  if (s === 'success') return <CheckCircle className="w-3.5 h-3.5 text-success" />;
  return <XCircle className="w-3.5 h-3.5 text-destructive" />;
};

const txSummary = (tx: Transaction) => {
  const d = tx.details || {};
  if (tx.type === 'swap' && d.fromToken && d.toToken) {
    return `${d.fromAmount ?? ''} ${d.fromToken} → ${d.toAmount ?? ''} ${d.toToken}`;
  }
  if ((tx.type === 'add_liquidity' || tx.type === 'remove_liquidity') && d.tokenA && d.tokenB) {
    return `${d.tokenA}/${d.tokenB}`;
  }
  if ((tx.type === 'wrap' || tx.type === 'unwrap') && d.fromAmount) {
    return `${d.fromAmount} ${tx.type === 'wrap' ? 'QMS → WQMS' : 'WQMS → QMS'}`;
  }
  return tx.hash.slice(0, 10) + '…' + tx.hash.slice(-6);
};

export function NotificationCenter() {
  const { transactions, clearHistory } = useTransactionHistory();
  const [open, setOpen] = useState(false);
  const [seenCount, setSeenCount] = useState(0);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Sort newest first
  const sorted = useMemo(
    () => [...transactions].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 15),
    [transactions],
  );

  const pendingCount = useMemo(
    () => transactions.filter((t) => t.status === 'pending').length,
    [transactions],
  );

  // Unread = recent items beyond what user last saw + any pending
  const unread = Math.max(0, transactions.length - seenCount) + pendingCount;

  useEffect(() => {
    // initialize seen count to current on first mount so users don't see a huge badge
    setSeenCount((prev) => (prev === 0 ? transactions.length : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) setSeenCount(transactions.length);
  }, [open, transactions.length]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative h-10 w-10 rounded-xl flex items-center justify-center',
          'border border-border/60 bg-background/40 backdrop-blur-md',
          'hover:border-primary/60 hover:bg-primary/10 transition-colors',
        )}
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-[0_0_10px_hsl(var(--primary)/0.6)]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
        {pendingCount > 0 && (
          <span className="absolute inset-0 rounded-xl ring-1 ring-warning/60 animate-pulse pointer-events-none" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="notif-panel"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute right-0 mt-2 w-[360px] max-w-[92vw] z-50',
              'rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl',
              'shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.4)]',
            )}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5" />
                </span>
                <div className="leading-tight">
                  <div className="text-sm font-semibold">Notifications</div>
                  <div className="text-[11px] text-muted-foreground">
                    {pendingCount > 0
                      ? `${pendingCount} pending · ${transactions.length} total`
                      : `${transactions.length} recent activity`}
                  </div>
                </div>
              </div>
              {transactions.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                  onClick={clearHistory}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {sorted.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/40 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="text-sm font-medium">No notifications yet</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Your swaps, liquidity & farming activity will appear here.
                  </div>
                </div>
              ) : (
                <ul className="py-1">
                  {sorted.map((tx) => (
                    <li key={tx.hash}>
                      <a
                        href={`${EXPLORER}/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          'flex items-start gap-3 px-4 py-3 border-b border-border/40 last:border-b-0',
                          'hover:bg-primary/5 transition-colors',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border',
                            tx.status === 'pending' && 'bg-warning/10 text-warning border-warning/30',
                            tx.status === 'success' && 'bg-success/10 text-success border-success/30',
                            tx.status === 'failed' && 'bg-destructive/10 text-destructive border-destructive/30',
                          )}
                        >
                          {typeIcon(tx.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">{typeLabel(tx.type)}</span>
                            {statusIcon(tx.status)}
                            <span className="ml-auto text-[10px] text-muted-foreground">
                              {formatDistanceToNow(tx.timestamp, { addSuffix: true })}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate mt-0.5">
                            {txSummary(tx)}
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-primary/80">
                            <ExternalLink className="w-3 h-3" />
                            View on explorer
                          </div>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
