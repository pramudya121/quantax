import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Check, ExternalLink, AlertTriangle, Send, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type TxStage = 'submitted' | 'pending' | 'mined' | 'failed';

interface TransactionLifecycleModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** e.g. "Add Liquidity", "Swap 1.0 QMS → QTX" */
  description?: string;
  stage: TxStage;
  txHash?: string;
  errorMessage?: string;
  explorerBase?: string;
}

const STAGES: { key: TxStage; label: string; icon: any }[] = [
  { key: 'submitted', label: 'Submitted', icon: Send },
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'mined', label: 'Confirmed', icon: Check },
];

export function TransactionLifecycleModal({
  open,
  onClose,
  title,
  description,
  stage,
  txHash,
  errorMessage,
  explorerBase = 'https://testnet.qmsscan.io/tx/',
}: TransactionLifecycleModalProps) {
  const stageIndex = stage === 'failed' ? -1 : STAGES.findIndex(s => s.key === stage);
  const isDone = stage === 'mined' || stage === 'failed';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            className="absolute inset-0 bg-background/70 backdrop-blur-md"
            onClick={isDone ? onClose : undefined}
            aria-label="Close"
            disabled={!isDone}
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full sm:max-w-md bg-card border border-border/60 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className={cn(
              'h-[2px] bg-gradient-to-r from-transparent to-transparent',
              stage === 'failed' ? 'via-destructive/70' : 'via-primary/70'
            )} />
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <div className={cn(
                  'p-1.5 rounded-lg',
                  stage === 'failed' ? 'bg-destructive/10' : 'bg-primary/10'
                )}>
                  {stage === 'failed'
                    ? <AlertTriangle className="w-4 h-4 text-destructive" />
                    : <Zap className="w-4 h-4 text-primary" />}
                </div>
                <h3 className="text-base font-bold">{title}</h3>
              </div>
              <button
                onClick={onClose}
                disabled={!isDone}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-muted/60 transition-colors disabled:opacity-40"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 pb-5 space-y-4">
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}

              {/* Stepper */}
              <div className="flex items-center justify-between gap-2">
                {STAGES.map((s, i) => {
                  const done = stageIndex > i || stage === 'mined';
                  const active = stageIndex === i && stage !== 'failed';
                  const Icon = s.icon;
                  return (
                    <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center border transition-colors',
                        done ? 'bg-success/20 border-success text-success'
                          : active ? 'bg-primary/20 border-primary text-primary'
                          : 'bg-muted/40 border-border/40 text-muted-foreground'
                      )}>
                        {active
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : done ? <Check className="w-4 h-4" />
                          : <Icon className="w-4 h-4" />}
                      </div>
                      <span className={cn(
                        'text-[10px] font-medium',
                        active ? 'text-primary' : done ? 'text-success' : 'text-muted-foreground'
                      )}>{s.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Body */}
              {stage === 'failed' ? (
                <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-4 text-center space-y-1">
                  <p className="text-sm font-semibold text-destructive">Transaction Failed</p>
                  <p className="text-[11px] text-muted-foreground break-words">
                    {errorMessage || 'The transaction reverted on-chain.'}
                  </p>
                </div>
              ) : stage === 'mined' ? (
                <div className="rounded-xl bg-success/10 border border-success/30 p-4 text-center space-y-1">
                  <p className="text-sm font-semibold text-success">Confirmed on-chain</p>
                  <p className="text-[11px] text-muted-foreground">Your transaction is now final.</p>
                </div>
              ) : (
                <div className="rounded-xl bg-muted/30 border border-border/40 p-4 text-center space-y-1">
                  <p className="text-sm font-semibold">
                    {stage === 'submitted' ? 'Waiting for wallet…' : 'Confirming on blockchain…'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {stage === 'submitted'
                      ? 'Confirm the transaction in your wallet.'
                      : 'This usually takes a few seconds.'}
                  </p>
                </div>
              )}

              {txHash && (
                <a
                  href={`${explorerBase}${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary inline-flex items-center gap-1 hover:underline justify-center w-full"
                >
                  View on explorer <ExternalLink className="w-3 h-3" />
                </a>
              )}

              {isDone && (
                <Button onClick={onClose} className="w-full h-12 rounded-xl">
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

export default TransactionLifecycleModal;
