import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LiquidityPool } from '@/hooks/useLiquidityPools';
import type { SwapEventLog } from '@/hooks/useSwapVolume';

interface Props {
  pools: LiquidityPool[];
  logs: SwapEventLog[];
  latestBlock: bigint | null;
  isLoading?: boolean;
}

// OPN Testnet ~2s block time.
const BLOCK_SECONDS = 2;

export function PriceHistoryChart({ pools, logs, latestBlock, isLoading }: Props) {
  const activePools = useMemo(
    () => pools.filter(p => p.reserve0 > 0n && p.reserve1 > 0n),
    [pools]
  );

  const [selected, setSelected] = useState<string>('');
  const [inverted, setInverted] = useState(false);

  const activeAddress = selected || activePools[0]?.pairAddress || '';
  const pool = activePools.find(p => p.pairAddress === activeAddress);

  const series = useMemo(() => {
    if (!pool || !latestBlock) return [] as { t: number; price: number; label: string }[];
    const poolLogs = logs
      .filter(l => l.pairAddress === pool.pairAddress)
      .slice() // copy
      .sort((a, b) => Number(a.blockNumber - b.blockNumber));

    return poolLogs.map(l => {
      // price = token1 per token0 by default
      const isToken0In = l.tokenInSymbol === pool.token0Symbol;
      const rawPrice = isToken0In
        ? (l.amountIn > 0 ? l.amountOut / l.amountIn : 0)
        : (l.amountOut > 0 ? l.amountIn / l.amountOut : 0);
      const price = inverted ? (rawPrice > 0 ? 1 / rawPrice : 0) : rawPrice;
      const secondsAgo = Number(latestBlock - l.blockNumber) * BLOCK_SECONDS;
      const t = -secondsAgo;
      const label = secondsAgo > 3600
        ? `-${Math.round(secondsAgo / 3600)}h`
        : secondsAgo > 60
        ? `-${Math.round(secondsAgo / 60)}m`
        : `-${secondsAgo}s`;
      return { t, price, label };
    }).filter(p => p.price > 0);
  }, [pool, logs, latestBlock, inverted]);

  const stats = useMemo(() => {
    if (series.length < 1) return { first: 0, last: 0, high: 0, low: 0, change: 0 };
    const first = series[0].price;
    const last = series[series.length - 1].price;
    const high = Math.max(...series.map(s => s.price));
    const low = Math.min(...series.map(s => s.price));
    const change = first > 0 ? ((last - first) / first) * 100 : 0;
    return { first, last, high, low, change };
  }, [series]);

  const isUp = stats.change >= 0;
  const base = pool ? (inverted ? pool.token1Symbol : pool.token0Symbol) : '';
  const quote = pool ? (inverted ? pool.token0Symbol : pool.token1Symbol) : '';

  const fmt = (n: number) => {
    if (n === 0) return '0';
    if (n < 0.0001) return n.toExponential(2);
    if (n < 1) return n.toFixed(6);
    if (n < 100) return n.toFixed(4);
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <div className="glass-card p-4 md:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm md:text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Price History (on-chain)
          </h2>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
            Derived from Swap events on the selected pair
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={activeAddress}
            onChange={(e) => setSelected(e.target.value)}
            className="min-h-[36px] px-2.5 rounded-lg bg-muted/60 border border-border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Select pool"
          >
            {activePools.length === 0 && <option value="">No active pools</option>}
            {activePools.map(p => (
              <option key={p.pairAddress} value={p.pairAddress}>
                {p.token0Symbol}/{p.token1Symbol}
              </option>
            ))}
          </select>
          <button
            onClick={() => setInverted(v => !v)}
            className="min-h-[36px] min-w-[36px] px-2 rounded-lg bg-muted/60 border border-border hover:bg-muted transition-colors text-xs inline-flex items-center gap-1"
            aria-label="Invert price direction"
            title="Invert price direction"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {pool && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <div className="p-2.5 rounded-lg bg-muted/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Last</p>
            <p className="font-mono text-sm font-bold">{fmt(stats.last)}</p>
            <p className="text-[10px] text-muted-foreground">{quote}/{base}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Change</p>
            <p className={cn("font-mono text-sm font-bold flex items-center gap-1", isUp ? "text-success" : "text-destructive")}>
              {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {stats.change >= 0 ? '+' : ''}{stats.change.toFixed(2)}%
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">High</p>
            <p className="font-mono text-sm font-bold">{fmt(stats.high)}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Low</p>
            <p className="font-mono text-sm font-bold">{fmt(stats.low)}</p>
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="h-52 md:h-64 -mx-2"
      >
        {series.length < 2 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            {isLoading ? 'Loading swap history…' : 'Not enough swap events yet to draw a chart.'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis
                dataKey="label"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
                tickFormatter={fmt}
                width={64}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                formatter={(v: number) => [fmt(v), `${quote}/${base}`]}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#priceFill)"
                dot={false}
                isAnimationActive
                animationDuration={400}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </motion.div>
    </div>
  );
}
