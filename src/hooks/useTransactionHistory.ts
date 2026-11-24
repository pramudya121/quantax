import { useCallback, useEffect, useState } from 'react';
import { useAccount, useChainId } from 'wagmi';

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

const TRANSACTION_EVENT = 'quantax:transactions-updated';

function getTransactionStorageKey(chainId: number, address?: string): string | null {
  if (!address) return null;
  return `quantax_transactions:${chainId}:${address.toLowerCase()}`;
}

function readStoredTransactions(storageKey: string | null): Transaction[] {
  if (!storageKey) return [];
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((tx): tx is Transaction & { timestamp: string } =>
        !!tx && typeof tx.hash === 'string' && typeof tx.timestamp === 'string'
      )
      .map(tx => ({ ...tx, timestamp: new Date(tx.timestamp) }))
      .filter(tx => !Number.isNaN(tx.timestamp.getTime()));
  } catch {
    return [];
  }
}

function persistTransactions(storageKey: string, transactions: Transaction[]) {
  localStorage.setItem(storageKey, JSON.stringify(transactions));
  window.dispatchEvent(new Event(TRANSACTION_EVENT));
}

export function useTransactionHistory() {
  const { address } = useAccount();
  const chainId = useChainId();
  const storageKey = getTransactionStorageKey(chainId, address);
  const [transactionState, setTransactionState] = useState(() => ({
    key: storageKey,
    transactions: readStoredTransactions(storageKey),
  }));
  const transactions = transactionState.key === storageKey ? transactionState.transactions : [];

  const syncFromStorage = useCallback(() => {
    setTransactionState({ key: storageKey, transactions: readStoredTransactions(storageKey) });
  }, [storageKey]);

  useEffect(() => {
    syncFromStorage();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncFromStorage();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey) syncFromStorage();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('storage', handleStorage);
    window.addEventListener(TRANSACTION_EVENT, syncFromStorage);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(TRANSACTION_EVENT, syncFromStorage);
    };
  }, [storageKey, syncFromStorage]);

  const addTransaction = useCallback((tx: Omit<Transaction, 'timestamp'>) => {
    const newTx: Transaction = { ...tx, timestamp: new Date() };
    if (!storageKey) return newTx;
    const previous = readStoredTransactions(storageKey);
    const updated = [newTx, ...previous]
      .filter((transaction, index, all) => all.findIndex(item => item.hash === transaction.hash) === index)
      .slice(0, 50);
    persistTransactions(storageKey, updated);
    setTransactionState({ key: storageKey, transactions: updated });
    return newTx;
  }, [storageKey]);

  const updateTransaction = useCallback((hash: string, updates: Partial<Transaction>) => {
    if (!storageKey) return;
    const current = readStoredTransactions(storageKey);
    const updated = current.map(tx => tx.hash === hash ? { ...tx, ...updates } : tx);
    persistTransactions(storageKey, updated);
    setTransactionState({ key: storageKey, transactions: updated });
  }, [storageKey]);

  const clearHistory = useCallback(() => {
    setTransactionState({ key: storageKey, transactions: [] });
    if (storageKey) {
      localStorage.removeItem(storageKey);
      window.dispatchEvent(new Event(TRANSACTION_EVENT));
    }
  }, [storageKey]);

  return { transactions, addTransaction, updateTransaction, clearHistory };
}
