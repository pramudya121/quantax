import { BarChart3, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwapPriceChartProps {
  fromSymbol: string;
  toSymbol: string;
  currentPrice: number;
  className?: string;
}

export function SwapPriceChart({ fromSymbol, toSymbol, currentPrice, className }: SwapPriceChartProps) {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return null;

  return (
    <section
      aria-label={`Live ${fromSymbol} to ${toSymbol} quote`}
      className={cn('glass-card flex flex-col gap-3 rounded-xl p-4', className)}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <BarChart3 aria-hidden="true" className="size-4 text-primary" />
        <span>Live pool quote</span>
      </div>
      <p className="font-mono-display text-lg font-semibold">
        1 {fromSymbol} = {currentPrice.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 })} {toSymbol}
      </p>
      <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
        <Clock3 aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        <p>Historical chart data is unavailable until on-chain swap history is indexed. No simulated prices are shown.</p>
      </div>
    </section>
  );
}
