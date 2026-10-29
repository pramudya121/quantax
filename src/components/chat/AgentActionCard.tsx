import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, Sparkles, ExternalLink, Shield } from 'lucide-react';
import { AgentAction, ActionState, actionLabel } from './agentTools';
import { useAgentExecutor } from '@/hooks/useAgentExecutor';
import { getTokenBySymbol } from '@/config/contracts';
import { cn } from '@/lib/utils';

interface Props {
  action: AgentAction;
  onResult: (result: { status: 'success' | 'error' | 'rejected'; txHash?: string; error?: string }) => void;
}

function tokenLogo(sym: string) {
  return getTokenBySymbol(sym)?.logoURI || '/tokens/opn.jpg';
}

function ActionVisual({ action }: { action: AgentAction }) {
  // Multi-token visual depending on action type
  if (action.type === 'swap') {
    return (
      <div className="flex items-center gap-2">
        <img src={tokenLogo(action.fromSymbol)} alt="" className="w-8 h-8 rounded-full border-2 border-card" />
        <div className="text-xs text-muted-foreground">→</div>
        <img src={tokenLogo(action.toSymbol)} alt="" className="w-8 h-8 rounded-full border-2 border-card" />
      </div>
    );
  }
  if (action.type === 'add_liquidity' || action.type === 'remove_liquidity') {
    return (
      <div className="flex -space-x-2">
        <img src={tokenLogo(action.tokenA)} alt="" className="w-8 h-8 rounded-full border-2 border-card" />
        <img src={tokenLogo(action.tokenB)} alt="" className="w-8 h-8 rounded-full border-2 border-card" />
      </div>
    );
  }
  if (action.type === 'wrap' || action.type === 'unwrap') {
    return (
      <div className="flex items-center gap-2">
        <img src={tokenLogo(action.type === 'wrap' ? 'QMS' : 'WQMS')} className="w-8 h-8 rounded-full border-2 border-card" alt="" />
        <div className="text-xs text-muted-foreground">→</div>
        <img src={tokenLogo(action.type === 'wrap' ? 'WQMS' : 'QMS')} className="w-8 h-8 rounded-full border-2 border-card" alt="" />
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 border-2 border-card flex items-center justify-center text-xs font-bold">
      F#{('pid' in action) ? action.pid : '?'}
    </div>
  );
}

export function AgentActionCard({ action, onResult }: Props) {
  const { execute, isConnected } = useAgentExecutor();
  const [state, setState] = useState<ActionState>({ status: 'pending' });

  const handleConfirm = async () => {
    if (!isConnected) {
      setState({ status: 'error', error: 'Wallet not connected' });
      onResult({ status: 'error', error: 'Wallet not connected' });
      return;
    }
    setState({ status: 'confirming' });
    try {
      const txHash = await execute(action);
      setState({ status: 'success', txHash });
      onResult({ status: 'success', txHash });
    } catch (e: any) {
      const msg = e?.shortMessage || e?.message || 'Transaction failed';
      const rejected = /user rejected|user denied/i.test(msg);
      setState({ status: rejected ? 'rejected' : 'error', error: msg });
      onResult({ status: rejected ? 'rejected' : 'error', error: msg });
    }
  };

  const handleReject = () => {
    setState({ status: 'rejected' });
    onResult({ status: 'rejected' });
  };

  const accentByType: Record<AgentAction['type'], { ring: string; chip: string; cta: string }> = {
    swap:             { ring: 'ring-primary/40',     chip: 'bg-primary/20 text-primary',         cta: 'from-primary to-secondary' },
    add_liquidity:    { ring: 'ring-success/40',     chip: 'bg-success/20 text-success',         cta: 'from-success to-primary' },
    remove_liquidity: { ring: 'ring-destructive/40', chip: 'bg-destructive/20 text-destructive', cta: 'from-destructive to-primary' },
    farm_stake:       { ring: 'ring-accent/40',      chip: 'bg-accent/20 text-accent',           cta: 'from-accent to-secondary' },
    farm_unstake:     { ring: 'ring-accent/40',      chip: 'bg-accent/20 text-accent',           cta: 'from-accent to-secondary' },
    farm_harvest:     { ring: 'ring-success/40',     chip: 'bg-success/20 text-success',         cta: 'from-success to-accent' },
    farm_emergency:   { ring: 'ring-destructive/50', chip: 'bg-destructive/20 text-destructive', cta: 'from-destructive to-destructive/70' },
    wrap:             { ring: 'ring-primary/40',     chip: 'bg-primary/20 text-primary',         cta: 'from-primary to-secondary' },
    unwrap:           { ring: 'ring-primary/40',     chip: 'bg-primary/20 text-primary',         cta: 'from-primary to-secondary' },
  };
  const tone = accentByType[action.type];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-2xl p-4 ring-1",
        "bg-card/95 border border-border/60 text-foreground shadow-lg",
        tone.ring,
      )}
      style={{ backdropFilter: 'blur(8px)' }}
    >
      {/* Top accent bar */}
      <div className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", tone.cta)} />

      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase", tone.chip)}>
          <Sparkles className="w-2.5 h-2.5" /> Agent Action
        </span>
        <span className="text-[9px] text-muted-foreground/80 inline-flex items-center gap-1">
          <Shield className="w-2.5 h-2.5" /> Wallet sign required
        </span>
      </div>

      <div className="flex items-center gap-3">
        <ActionVisual action={action} />
        <p className="text-sm font-semibold text-foreground leading-snug flex-1 min-w-0 break-words">
          {actionLabel(action)}
        </p>
      </div>

      {action.type === 'swap' && (() => {
        const effSlip = Math.min(Math.max(action.slippage ?? 0.5, 0.01), 50);
        const clamped = (action.slippage ?? 0.5) !== effSlip;
        return (
          <div className="mt-2.5 px-3 py-2 rounded-lg bg-muted/40 border border-border/40 text-[11px] text-muted-foreground flex items-center justify-between gap-2">
            <span>Max slippage</span>
            <span className={cn("font-mono font-semibold", effSlip > 5 ? 'text-destructive' : 'text-foreground')}>
              {effSlip}%{clamped && <span className="ml-1 text-[9px] uppercase text-primary">clamped</span>}
            </span>
          </div>
        );
      })()}

      {state.status === 'pending' && (
        <div className="flex gap-2 mt-3.5">
          <button
            onClick={handleReject}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-muted/60 hover:bg-muted text-foreground/80 hover:text-foreground border border-border/60 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConnected}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-xs font-bold text-primary-foreground bg-gradient-to-r shadow-md hover:opacity-95 hover:shadow-lg transition-all disabled:opacity-50",
              tone.cta,
            )}
          >
            {isConnected ? 'Confirm Transaction' : 'Connect Wallet'}
          </button>
        </div>
      )}

      {state.status === 'confirming' && (
        <div className="mt-3.5 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/30">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span className="text-xs text-foreground">Awaiting wallet signature & confirmation...</span>
        </div>
      )}

      {state.status === 'success' && (
        <div className="mt-3.5 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-success/15 border border-success/40">
          <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
          <span className="text-xs text-foreground flex-1 font-medium">Transaction confirmed</span>
          {state.txHash && (
            <a
              href={`https://testnet.iopn.tech/tx/${state.txHash}`}
              target="_blank" rel="noopener noreferrer"
              className="text-[11px] text-primary font-semibold hover:underline inline-flex items-center gap-1"
            >
              View <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      )}

      {(state.status === 'error' || state.status === 'rejected') && (
        <div className="mt-3.5 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-destructive/15 border border-destructive/40">
          <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
          <div className="text-[11px] text-foreground break-words">
            {state.status === 'rejected' ? 'Cancelled by user.' : (state.error?.slice(0, 140) || 'Failed')}
          </div>
        </div>
      )}
    </motion.div>
  );
}
