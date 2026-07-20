import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowDown, Loader2, Check, ExternalLink, Zap, Flame, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TokenIcon } from '@/components/ui/TokenIcon';
import { TokenInfo } from '@/config/contracts';
import { cn } from '@/lib/utils';

interface SwapConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fromToken: TokenInfo | null;
  toToken: TokenInfo | null;
  fromAmount: string;
  toAmount: string;
  rate: number | null;
  minReceived: string;
  slippage: number;
  priceImpact: number;
  severity: 'low' | 'medium' | 'high';
  isWrapUnwrap?: boolean;
  isWrapping?: boolean;
  /** transaction is being submitted / mined */
  isProcessing: boolean;
  /** explorer link once a hash exists */
  txHash?: string;
  /** transaction confirmed on-chain */
  isSuccess?: boolean;
  /** transaction failed / reverted */
  isError?: boolean;
  errorMessage?: string;
}

export function SwapConfirmModal({
  open,
  onClose,
  onConfirm,
  fromToken,
  toToken,
  fromAmount,
  toAmount,
  rate,
  minReceived,
  slippage,
  priceImpact,
  severity,
  isWrapUnwrap,
  isWrapping,
  isProcessing,
  txHash,
  isSuccess,
  isError,
  errorMessage,
}: SwapConfirmModalProps) {
  if (!fromToken || !toToken) return null;

  const handleClose = () => {
    if (isProcessing) return; // lock during tx
    onClose();
  };

  const actionLabel = isWrapUnwrap
    ? isWrapping ? 'Wrap OPN → WOPN' : 'Unwrap WOPN → OPN'
    : 'Confirm Swap';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Backdrop */}
          <button
            className="absolute inset-0 bg-background/70 backdrop-blur-md"
            onClick={handleClose}
            aria-label="Close"
            disabled={isProcessing}
          />

          {/* Sheet / Card */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full sm:max-w-md bg-card border border-border/60 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Top glow line */}
            <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Flame className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-base font-bold">
                  {isError ? 'Transaction Failed' : isSuccess ? 'Transaction Confirmed' : isProcessing ? 'Processing Transaction' : 'Confirm Swap'}
                </h3>
              </div>
              <button
                onClick={handleClose}
                disabled={isProcessing}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-muted/60 transition-colors disabled:opacity-40"
                aria-label="Close confirm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 pb-5 space-y-4">
              {/* Token flow */}
              <div className="space-y-2">
                <TokenRow token={fromToken} amount={fromAmount} label="You Pay" />
                <div className="flex justify-center">
                  <motion.div
                    animate={isProcessing ? { rotate: 360 } : { rotate: 0 }}
                    transition={isProcessing ? { repeat: Infinity, duration: 1.6, ease: 'linear' } : { duration: 0.3 }}
                    className="p-1.5 rounded-full bg-muted/60 border border-border/40"
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-primary" />
                  </motion.div>
                </div>
                <TokenRow token={toToken} amount={toAmount} label="You Receive" highlight />
              </div>

              {/* Details */}
              {!isProcessing && !isSuccess && !isError && (
                <div className="rounded-xl bg-muted/30 border border-border/40 p-3 space-y-1.5 text-xs">
                  {rate && (
                    <Row label="Rate" value={`1 ${fromToken.symbol} = ${rate.toFixed(6)} ${toToken.symbol}`} />
                  )}
                  {!isWrapUnwrap && (
                    <>
                      <Row label="Min. Received" value={`${minReceived} ${toToken.symbol}`} />
                      <Row label="Slippage" value={`${slippage}%`} />
                      <Row
                        label="Price Impact"
                        value={`${priceImpact.toFixed(2)}%`}
                        valueClassName={cn(
                          severity === 'high' ? 'text-destructive' :
                          severity === 'medium' ? 'text-warning' : 'text-success'
                        )}
                      />
                    </>
                  )}
                  <Row label="Network Fee" value="~0.001 OPN" />
                </div>
              )}

              {/* Processing visual */}
              {isProcessing && !isSuccess && !isError && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl bg-muted/30 border border-border/40 p-5 flex flex-col items-center text-center gap-3"
                >
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {txHash ? 'Confirming on blockchain…' : 'Waiting for wallet…'}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {txHash ? 'This usually takes a few seconds.' : 'Confirm the transaction in your wallet.'}
                    </p>
                  </div>
                  {txHash && (
                    <a
                      href={`https://testnet.iopn.tech/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-primary inline-flex items-center gap-1 hover:underline"
                    >
                      View on explorer <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </motion.div>
              )}

              {/* Success visual */}
              {isSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl bg-success/10 border border-success/30 p-5 flex flex-col items-center text-center gap-2"
                >
                  <div className="w-14 h-14 rounded-full bg-success/20 flex items-center justify-center">
                    <Check className="w-7 h-7 text-success" />
                  </div>
                  <p className="text-sm font-semibold text-success">Swap Successful</p>
                  {txHash && (
                    <a
                      href={`https://testnet.iopn.tech/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-success inline-flex items-center gap-1 hover:underline"
                    >
                      View transaction <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </motion.div>
              )}

              {/* Error visual */}
              {isError && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl bg-destructive/10 border border-destructive/30 p-5 flex flex-col items-center text-center gap-2"
                >
                  <div className="w-14 h-14 rounded-full bg-destructive/20 flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7 text-destructive" />
                  </div>
                  <p className="text-sm font-semibold text-destructive">Transaction Failed</p>
                  {errorMessage && (
                    <p className="text-[11px] text-muted-foreground max-w-xs line-clamp-3">{errorMessage}</p>
                  )}
                  {txHash && (
                    <a
                      href={`https://testnet.iopn.tech/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-destructive inline-flex items-center gap-1 hover:underline"
                    >
                      View transaction <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </motion.div>
              )}

              {/* Actions */}
              {!isProcessing && !isSuccess && !isError && (
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1 h-12 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={onConfirm}
                    className={cn(
                      'flex-1 h-12 rounded-xl text-sm font-semibold',
                      severity === 'high' ? 'bg-destructive hover:bg-destructive/90' : 'btn-dragon'
                    )}
                  >
                    {actionLabel}
                  </Button>
                </div>
              )}

              {(isSuccess || isError) && (
                <Button onClick={onClose} className="w-full h-12 rounded-xl btn-dragon">
                  Done
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TokenRow({
  token,
  amount,
  label,
  highlight,
}: {
  token: TokenInfo;
  amount: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-3 flex items-center justify-between gap-3',
        highlight
          ? 'bg-primary/5 border-primary/30'
          : 'bg-muted/30 border-border/40'
      )}
    >
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        <p className="text-lg sm:text-xl font-bold truncate">{amount || '0.0'}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <TokenIcon src={token.logoURI} symbol={token.symbol} alt={token.symbol} size={28} />
        <span className="font-semibold text-sm">{token.symbol}</span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium', valueClassName)}>{value}</span>
    </div>
  );
}

export default SwapConfirmModal;
