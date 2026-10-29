import { motion } from 'framer-motion';
import { ArrowRightLeft, ExternalLink, History, Loader2, CheckCircle, XCircle, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useTransactionHistory, Transaction } from '@/components/history/TransactionHistory';
import { cn } from '@/lib/utils';

const EXPLORER = 'https://testnet.qmsscan.io/tx/';

function StatusDot({ status }: { status: Transaction['status'] }) {
  if (status === 'pending') return <Loader2 className="w-3 h-3 animate-spin text-warning" />;
  if (status === 'failed') return <XCircle className="w-3 h-3 text-destructive" />;
  return <CheckCircle className="w-3 h-3 text-success" />;
}

export function RecentSwapsPanel() {
  const { transactions } = useTransactionHistory();

  const swaps = transactions
    .filter(t => t.type === 'swap' || t.type === 'wrap' || t.type === 'unwrap')
    .slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      className="mt-4 glass-card overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40">
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Swap Terakhir
          </h3>
        </div>
        <Link
          to="/portfolio"
          className="text-[10px] font-medium text-primary hover:underline uppercase tracking-wider"
        >
          Lihat semua →
        </Link>
      </div>

      {swaps.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <Inbox className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">Belum ada riwayat swap</p>
        </div>
      ) : (
        <ul className="divide-y divide-border/30">
          {swaps.map((tx) => {
            const from = tx.details.fromToken || tx.details.tokenA;
            const to = tx.details.toToken || tx.details.tokenB;
            const fromAmt = tx.details.fromAmount || tx.details.amountA;
            const toAmt = tx.details.toAmount || tx.details.amountB;
            const ts = tx.timestamp instanceof Date ? tx.timestamp : new Date(tx.timestamp);

            return (
              <li key={tx.hash}>
                <a
                  href={`${EXPLORER}${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5 transition-colors"
                >
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                    tx.status === 'success' ? 'bg-success/10' : tx.status === 'failed' ? 'bg-destructive/10' : 'bg-warning/10',
                  )}>
                    <ArrowRightLeft className="w-3.5 h-3.5 text-foreground/80" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-medium truncate">
                      {fromAmt && <span className="tabular-nums">{parseFloat(fromAmt).toFixed(4)}</span>}
                      <span className="text-foreground">{from}</span>
                      <span className="text-muted-foreground">→</span>
                      {toAmt && <span className="tabular-nums">{parseFloat(toAmt).toFixed(4)}</span>}
                      <span className="text-foreground">{to}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StatusDot status={tx.status} />
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(ts, { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}
