import { motion } from 'framer-motion';
import { Plus, ExternalLink, Star, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TokenIcon } from '@/components/ui/TokenIcon';
import { LiquidityPool } from '@/hooks/useLiquidityPools';
import { usePoolTVL } from '@/hooks/usePrices';
import { cn } from '@/lib/utils';
import { formatUnits } from 'viem';

interface PoolCardProps {
  pool: LiquidityPool;
  index: number;
  prices: Record<string, number>;
  volume24h?: number;
  isHot?: boolean;
}

export function PoolCard({ pool, index, prices, volume24h = 0, isHot = false }: PoolCardProps) {
  const token0Logo = pool.token0?.logoURI || '/tokens/opn.jpg';
  const token1Logo = pool.token1?.logoURI || '/tokens/opn.jpg';

  const reserve0Formatted = parseFloat(formatUnits(pool.reserve0, pool.token0?.decimals || 18));
  const reserve1Formatted = parseFloat(formatUnits(pool.reserve1, pool.token1?.decimals || 18));

  const tvl = usePoolTVL(
    pool.token0Symbol, pool.token1Symbol,
    pool.reserve0, pool.reserve1,
    pool.token0?.decimals || 18, pool.token1?.decimals || 18,
    prices
  );

  const hasLiquidity = pool.reserve0 > 0n && pool.reserve1 > 0n;

  // Real APR from on-chain 24h volume (fallback: 0 when no volume yet)
  const fees24h = volume24h * 0.003;
  const aprNum = hasLiquidity && tvl > 0 && volume24h > 0
    ? (fees24h * 365 / tvl) * 100
    : 0;
  const apy = aprNum > 0 ? aprNum.toFixed(2) : '0';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative bg-card/90 backdrop-blur-sm rounded-2xl border border-border/50 hover:border-primary/50 transition-all duration-300 overflow-hidden hover:shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.45)]"
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute -top-px left-1/2 -translate-x-1/2 h-px w-2/3 bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative p-4 md:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <TokenIcon src={token0Logo} symbol={pool.token0Symbol} size={36}
                fallbackSrc="/tokens/opn.jpg"
                className="border-2 border-background ring-1 ring-border/50" />
              <TokenIcon src={token1Logo} symbol={pool.token1Symbol} size={36}
                fallbackSrc="/tokens/opn.jpg"
                className="border-2 border-background ring-1 ring-border/50" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm md:text-base tracking-tight flex items-center gap-1.5">
                {pool.token0Symbol}<span className="text-muted-foreground/60">/</span>{pool.token1Symbol}
                {isHot && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary/15 text-primary border border-primary/30">
                    🔥 HOT
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                <span className="px-1.5 py-0.5 rounded bg-muted/60 font-medium">0.30% fee</span>
                {hasLiquidity && volume24h > 0 && (
                  <span className="flex items-center gap-0.5 text-success">
                    <TrendingUp className="w-2.5 h-2.5" />Active
                  </span>
                )}
              </div>
            </div>
          </div>
          <button className="text-muted-foreground hover:text-primary transition-colors">
            <Star className="w-4 h-4" />
          </button>
        </div>

        {/* TVL & APY Row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" /> TVL
            </p>
            <p className="font-mono-display font-bold text-sm md:text-base">
              ${tvl > 0 ? tvl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-end gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" /> APY
            </p>
            <p className="font-mono-display font-bold text-sm md:text-base text-success">{hasLiquidity ? `${apy}%` : '—'}</p>
          </div>
        </div>

        {/* Token Reserves */}
        <div className="bg-muted/30 rounded-xl p-3 space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <TokenIcon src={token0Logo} symbol={pool.token0Symbol} size={16} fallbackSrc="/tokens/opn.jpg" />
              <span className="text-muted-foreground">{pool.token0Symbol}</span>
            </div>
            <span className="font-medium">{reserve0Formatted.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <TokenIcon src={token1Logo} symbol={pool.token1Symbol} size={16} fallbackSrc="/tokens/opn.jpg" />
              <span className="text-muted-foreground">{pool.token1Symbol}</span>
            </div>
            <span className="font-medium">{reserve1Formatted.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
          </div>
        </div>

        {/* Volume & Fees */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-4 px-1">
          <span>24h Volume: <span className="text-foreground font-medium">${volume24h > 0 ? volume24h.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'}</span></span>
          <span>24h Fees: <span className="text-foreground font-medium">${fees24h > 0 ? fees24h.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'}</span></span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link to={`/pool/${pool.pairAddress}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-xs h-9">
              <ExternalLink className="w-3 h-3 mr-1" />
              Details
            </Button>
          </Link>
          <Link to="/liquidity" className="flex-1">
            <Button size="sm" className="w-full btn-dragon text-xs h-9">
              <Plus className="w-3 h-3 mr-1" />
              Add Liquidity
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
