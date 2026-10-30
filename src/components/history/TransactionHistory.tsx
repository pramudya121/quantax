import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, ArrowRightLeft, Plus, Minus, ExternalLink, ChevronDown, Clock, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export interface Transaction {
  hash: string;
  type: 'swap' | 'add_liquidity' | 'remove_liquidity' | 'approve' | 'wrap' | 'unwrap';
  status: 'pending' | 'success' | 'failed';
  timestamp: Date;
  details: {
    fromToken?: string;
    toToken?: string;
    fromAmount?: string;
    toAmount?: string;
    tokenA?: string;
    tokenB?: string;
    amountA?: string;
    amountB?: string;
  };
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  isLoading?: boolean;
  onRefresh?: () => void;
  maxDisplay?: number;
}

const getTypeIcon = (type: Transaction['type']) => {
  switch (type) {
    case 'swap': return <ArrowRightLeft className="w-4 h-4" />;
    case 'add_liquidity': return <Plus className="w-4 h-4" />;
    case 'remove_liquidity': return <Minus className="w-4 h-4" />;
    default: return <History className="w-4 h-4" />;
  }
};

const getTypeLabel = (type: Transaction['type']) => {
  switch (type) {
    case 'swap': return 'Swap';
    case 'add_liquidity': return 'Add Liquidity';
    case 'remove_liquidity': return 'Remove Liquidity';
    case 'approve': return 'Approve';
    case 'wrap': return 'Wrap';
    case 'unwrap': return 'Unwrap';
    default: return 'Transaction';
  }
};

const getStatusIcon = (status: Transaction['status']) => {
  switch (status) {
    case 'pending': return <Loader2 className="w-4 h-4 animate-spin text-warning" />;
    case 'success': return <CheckCircle className="w-4 h-4 text-success" />;
    case 'failed': return <XCircle className="w-4 h-4 text-destructive" />;
  }
};

const getStatusColor = (status: Transaction['status']) => {
  switch (status) {
    case 'pending': return 'bg-warning/20 text-warning border-warning/30';
    case 'success': return 'bg-success/20 text-success border-success/30';
    case 'failed': return 'bg-destructive/20 text-destructive border-destructive/30';
  }
};

export function TransactionHistory({ 
  transactions, 
  isLoading = false, 
  onRefresh,
  maxDisplay = 5 
}: TransactionHistoryProps) {
  const [expanded, setExpanded] = useState(false);
  
  const displayedTransactions = expanded ? transactions : transactions.slice(0, maxDisplay);
  const hasMore = transactions.length > maxDisplay;

  if (transactions.length === 0 && !isLoading) {
    return (
      <div className="glass-card p-6 text-center">
        <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="font-semibold mb-2">No Transactions Yet</h3>
        <p className="text-sm text-muted-foreground">
          Your transaction history will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Recent Transactions</h3>
          {transactions.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
              {transactions.length}
            </span>
          )}
        </div>
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        )}
      </div>

      {/* Transactions List */}
      <div className="divide-y divide-border/30">
        <AnimatePresence>
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
              <p className="text-sm text-muted-foreground mt-2">Loading transactions...</p>
            </div>
          ) : (
            displayedTransactions.map((tx, index) => (
              <motion.div
                key={tx.hash}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Type Icon */}
                  <div className={cn(
                    "p-2 rounded-lg",
                    tx.type === 'swap' ? 'bg-primary/10 text-primary' :
                    tx.type === 'add_liquidity' ? 'bg-success/10 text-success' :
                    tx.type === 'remove_liquidity' ? 'bg-destructive/10 text-destructive' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {getTypeIcon(tx.type)}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getTypeLabel(tx.type)}</span>
                      <span className={cn(
                        "px-1.5 py-0.5 text-xs font-medium rounded border",
                        getStatusColor(tx.status)
                      )}>
                        {tx.status}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {tx.type === 'swap' && tx.details.fromToken && tx.details.toToken && (
                        <span>
                          {parseFloat(tx.details.fromAmount || '0').toFixed(4)} {tx.details.fromToken} → {parseFloat(tx.details.toAmount || '0').toFixed(4)} {tx.details.toToken}
                        </span>
                      )}
                      {(tx.type === 'add_liquidity' || tx.type === 'remove_liquidity') && tx.details.tokenA && tx.details.tokenB && (
                        <span>
                          {tx.details.tokenA}/{tx.details.tokenB}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status & Time */}
                  <div className="text-right">
                    {getStatusIcon(tx.status)}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(tx.timestamp, { addSuffix: true })}
                    </div>
                  </div>

                  {/* Explorer Link */}
                  <a
                    href={`https://testnet.qmsscan.io/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </a>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Show More Button */}
      {hasMore && !isLoading && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-3 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors border-t border-border/30"
        >
          {expanded ? 'Show Less' : `Show ${transactions.length - maxDisplay} More`}
          <ChevronDown className={cn("w-4 h-4 transition-transform", expanded && "rotate-180")} />
        </button>
      )}
    </div>
  );
}

// Helper to read transactions from localStorage (migrates legacy brand key)
function readStoredTransactions(): Transaction[] {
  try {
    let stored = localStorage.getItem('quantax_transactions');
    if (!stored) {
      const legacy = localStorage.getItem('dragondex_transactions');
      if (legacy) {
        localStorage.setItem('quantax_transactions', legacy);
        localStorage.removeItem('dragondex_transactions');
        stored = legacy;
      }
    }
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    // Restore Date objects from JSON strings
    return parsed.map((tx: any) => ({
      ...tx,
      timestamp: new Date(tx.timestamp),
    }));
  } catch {
    return [];
  }
}

// Hook untuk menyimpan transaksi di localStorage
// Uses functional updater to avoid stale closure issues
export function useTransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>(readStoredTransactions);

  // Re-sync from localStorage when component mounts or tab becomes visible
  // This ensures data is fresh when navigating between pages
  const syncFromStorage = useCallback(() => {
    setTransactions(readStoredTransactions());
  }, []);

  useEffect(() => {
    // Listen for storage events (cross-tab) and visibility changes (same-tab navigation)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncFromStorage();
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'quantax_transactions') syncFromStorage();
    };
    
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('storage', handleStorage);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('storage', handleStorage);
    };
  }, [syncFromStorage]);

  // Re-read on every mount (handles same-tab navigation)
  useEffect(() => {
    syncFromStorage();
  }, [syncFromStorage]);

  const addTransaction = useCallback((tx: Omit<Transaction, 'timestamp'>) => {
    const newTx: Transaction = {
      ...tx,
      timestamp: new Date(),
    };
    setTransactions(prev => {
      const updated = [newTx, ...prev].slice(0, 50);
      localStorage.setItem('quantax_transactions', JSON.stringify(updated));
      return updated;
    });
    return newTx;
  }, []);

  const updateTransaction = useCallback((hash: string, updates: Partial<Transaction>) => {
    setTransactions(prev => {
      const updated = prev.map(tx =>
        tx.hash === hash ? { ...tx, ...updates } : tx
      );
      localStorage.setItem('quantax_transactions', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setTransactions([]);
    localStorage.removeItem('quantax_transactions');
  }, []);

  return {
    transactions,
    addTransaction,
    updateTransaction,
    clearHistory,
  };
}
