import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Loader2, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSendTransaction, useChainId } from 'wagmi';
import { formatUnits, isAddress, parseUnits } from 'viem';
import { isValidAmount as isValidAmountInput } from '@/lib/security';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ERC20_ABI } from '@/config/abis';
import { QMS_CHAIN_ID } from '@/config/chains';
import { cn } from '@/lib/utils';

interface TokenOption {
  symbol: string;
  name: string;
  balance: string;
  logo: string;
  address: string;
  decimals: number;
  isNative?: boolean;
}

interface SendTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: TokenOption[];
  initialSymbol?: string;
}

export function SendTokenModal({ isOpen, onClose, tokens, initialSymbol }: SendTokenModalProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const isQmsNetwork = chainId === QMS_CHAIN_ID;
  const [selectedToken, setSelectedToken] = useState<TokenOption | null>(tokens[0] || null);

  // Sync selection with initialSymbol whenever modal opens / token list changes
  useEffect(() => {
    if (!isOpen) return;
    if (initialSymbol) {
      const found = tokens.find(t => t.symbol === initialSymbol);
      if (found) { setSelectedToken(found); return; }
    }
    if (!selectedToken && tokens[0]) setSelectedToken(tokens[0]);
  }, [isOpen, initialSymbol, tokens, selectedToken]);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [showTokenList, setShowTokenList] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { writeContract, isPending: isWritePending, error: writeError } = useWriteContract();
  const { sendTransaction, isPending: isSendPending, error: sendError } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const isPending = isWritePending || isSendPending || isConfirming;
  const error = writeError || sendError;

  const amountUnits = useMemo(() => {
    if (!selectedToken || !isValidAmountInput(amount, selectedToken.decimals)) return null;
    try {
      return parseUnits(amount.startsWith('.') ? `0${amount}` : amount, selectedToken.decimals);
    } catch {
      return null;
    }
  }, [amount, selectedToken]);
  const balanceUnits = useMemo(() => {
    if (!selectedToken) return null;
    try {
      return parseUnits(selectedToken.balance, selectedToken.decimals);
    } catch {
      return null;
    }
  }, [selectedToken]);
  const spendableBalanceUnits = useMemo(() => {
    if (!selectedToken || balanceUnits === null) return null;
    if (!selectedToken.isNative) return balanceUnits;
    try {
      const reserve = parseUnits('0.01', selectedToken.decimals);
      return balanceUnits > reserve ? balanceUnits - reserve : 0n;
    } catch {
      return 0n;
    }
  }, [selectedToken, balanceUnits]);
  const isValidRecipient = recipient && isAddress(recipient);
  const hasEnoughBalance = amountUnits !== null && amountUnits > 0n && spendableBalanceUnits !== null && amountUnits <= spendableBalanceUnits;
  const canSend = Boolean(isQmsNetwork && address && isValidRecipient && hasEnoughBalance && !isPending && selectedToken);

  const handleSend = async () => {
    if (!isQmsNetwork || !address || !canSend || !selectedToken || amountUnits === null) return;

    try {
      if (selectedToken.isNative) {
        sendTransaction({
          to: recipient as `0x${string}`,
          value: amountUnits,
        }, {
          onSuccess: (hash) => setTxHash(hash),
        });
      } else {
        writeContract({
          address: selectedToken.address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [recipient as `0x${string}`, amountUnits],
        }, {
          onSuccess: (hash) => setTxHash(hash),
        });
      }
    } catch (err) {
      console.error('Send failed:', err);
    }
  };

  const handleClose = () => {
    if (!isPending) {
      setRecipient('');
      setAmount('');
      setTxHash(undefined);
      onClose();
    }
  };

  const handleMax = () => {
    if (selectedToken) {
      try {
        const balance = parseUnits(selectedToken.balance, selectedToken.decimals);
        const reserve = selectedToken.isNative ? parseUnits('0.01', selectedToken.decimals) : 0n;
        const maximum = balance > reserve ? balance - reserve : 0n;
        setAmount(formatUnits(maximum, selectedToken.decimals));
      } catch {
        setAmount('');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="send-token-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md glass-card p-5 md:p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Send className="w-5 h-5 text-primary" />
              </div>
              <h2 id="send-token-title" className="text-lg font-bold">Send Token</h2>
            </div>
            <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {isSuccess ? (
            <div className="text-center py-6">
              <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-2">Transaction Sent!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {amount} {selectedToken?.symbol} sent successfully
              </p>
              {txHash && (
                <a
                  href={`https://testnet.qmsscan.io/tx/${txHash}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  View on Explorer →
                </a>
              )}
              <Button className="btn-dragon w-full mt-4" onClick={handleClose}>Done</Button>
            </div>
          ) : (
            <>
              {/* Token Selector */}
              <div className="mb-4">
                <label className="text-xs text-muted-foreground mb-1.5 block">Token</label>
                <div className="relative">
                  <button
                    onClick={() => setShowTokenList(!showTokenList)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border hover:border-primary/50 transition-colors"
                  >
                    {selectedToken && (
                      <>
                        <img src={selectedToken.logo} alt="" className="w-7 h-7 rounded-full" onError={(e) => { (e.target as HTMLImageElement).src = '/tokens/qms.svg'; }} />
                        <div className="flex-1 text-left">
                          <p className="font-medium text-sm">{selectedToken.symbol}</p>
                          <p className="text-[10px] text-muted-foreground">Balance: {parseFloat(selectedToken.balance).toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                        </div>
                      </>
                    )}
                    <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showTokenList && "rotate-180")} />
                  </button>

                  {showTokenList && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto"
                    >
                      {tokens.filter(t => parseFloat(t.balance) > 0.0001).map(token => (
                        <button
                          key={token.symbol}
                          onClick={() => { setSelectedToken(token); setShowTokenList(false); }}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors",
                            selectedToken?.symbol === token.symbol && "bg-primary/10"
                          )}
                        >
                          <img src={token.logo} alt="" className="w-6 h-6 rounded-full" onError={(e) => { (e.target as HTMLImageElement).src = '/tokens/qms.svg'; }} />
                          <div className="flex-1 text-left">
                            <p className="font-medium text-xs">{token.symbol}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">{parseFloat(token.balance).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Recipient */}
              <div className="mb-4">
                <label htmlFor="send-recipient" className="text-xs text-muted-foreground mb-1.5 block">Recipient Address</label>
                <Input
                  placeholder="0x..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className={cn(
                    "bg-muted/50",
                    recipient && !isValidRecipient && "border-destructive"
                  )}
                />
                {recipient && !isValidRecipient && (
                  <p className="text-[10px] text-destructive mt-1">Invalid address</p>
                )}
              </div>

              {/* Amount */}
              <div className="mb-5">
                <label htmlFor="send-amount" className="text-xs text-muted-foreground mb-1.5 block">Amount</label>
                <div className="relative">
                  <Input
                    id="send-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={cn(
                      "bg-muted/50 pr-16",
                      amount && !hasEnoughBalance && "border-destructive"
                    )}
                  />
                  <button
                    onClick={handleMax}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary hover:text-primary/80 px-2 py-1 rounded bg-primary/10"
                  >
                    MAX
                  </button>
                </div>
                {amount && !hasEnoughBalance && (
                  <p className="text-[10px] text-destructive mt-1">Insufficient balance</p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 mb-4">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-xs text-destructive">{(error as Error).message?.slice(0, 100)}</p>
                </div>
              )}

              {!isQmsNetwork && (
                <p role="alert" className="mb-3 text-xs text-destructive">
                  Switch to QMS Testnet before sending assets.
                </p>
              )}

              {/* Send Button */}
              <Button
                className="w-full btn-dragon"
                disabled={!canSend}
                onClick={handleSend}
              >
                {isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" />Send {selectedToken?.symbol || 'Token'}</>
                )}
              </Button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
