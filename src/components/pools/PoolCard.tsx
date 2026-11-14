import { motion } from 'framer-motion';
import { Plus, ExternalLink, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TokenIcon } from '@/components/ui/TokenIcon';
import { LiquidityPool } from '@/hooks/useLiquidityPools';
import { usePoolTVL } from '@/hooks/usePrices';
import { formatUnits } from 'viem';

interface PoolCardProps {
  pool: LiquidityPool;
  index: number;
  prices: Record<string, number>;
  volumeWQMS?: number;
  volumeScanComplete?: boolean;
  volumeLoading?: boolean;
  isHot?: boolean;
}

export function PoolCard({ pool, index, prices, volumeWQMS = 0, volumeScanComplete = false, volumeLoading = false, isHot = false }: PoolCardProps) {
  const token0Logo = pool.token0?.logoURI || '/tokens/qms.svg';
  const token1Logo = pool.token1?.logoURI || '/tokens/qms.svg';
  const reserve0Formatted = parseFloat(formatUnits(pool.reserve0, pool.token0?.decimals ?? 18));
  const reserve1Formatted = parseFloat(formatUnits(pool.reserve1, pool.token1?.decimals ?? 18));
  const tvl = usePoolTVL(
    pool.token0Address,
    pool.token1Address,
    pool.reserve0,
    pool.reserve1,
    pool.token0?.decimals ?? 18,
    pool.token1?.decimals ?? 18,
    prices,
  );
  const hasLiquidity = pool.reserve0 > 0n && pool.reserve1 > 0n;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/90 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.45)]"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <TokenIcon src={token0Logo} symbol={pool.token0Symbol} size={36} fallbackSrc="/tokens/qms.svg" className="border-2 border-background ring-1 ring-border/50" />
              <TokenIcon src={token1Logo} symbol={pool.token1Symbol} size={36} fallbackSrc="/tokens/qms.svg" className="border-2 border-background ring-1 ring-border/50" />
            </div>
            <div>
              <h3 className="flex items-center gap-1.5 font-display text-sm font-bold tracking-tight md:text-base">
                {pool.token0Symbol}<span className="text-muted-foreground/60">/</span>{pool.token1Symbol}
                {isHot && <span className="rounded-full border border-primary/30 bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary">HOT</span>}
              </h3>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="rounded bg-muted/60 px-1.5 py-0.5 font-medium">QMS Testnet</span>
                {hasLiquidity && <span className="flex items-center gap-0.5 text-success"><TrendingUp aria-hidden="true" className="size-3" />Active liquidity</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" /> TVL estimate
            </p>
            <p className="font-mono-display text-sm font-bold md:text-base">
              {tvl > 0 ? tvl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'} <span className="text-xs text-muted-foreground">WQMS</span>
            </p>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success" /> Recent volume estimate
            </p>
            <p className="font-mono-display text-sm font-bold md:text-base">
              {volumeLoading ? 'Scanning…' : volumeScanComplete ? volumeWQMS.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'Partial scan'}
              {volumeScanComplete && <span className="text-xs text-muted-foreground"> WQMS est.</span>}
            </p>
          </div>
        </div>

        <div className="mb-3 space-y-2 rounded-xl bg-muted/30 p-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2"><TokenIcon src={token0Logo} symbol={pool.token0Symbol} size={16} fallbackSrc="/tokens/qms.svg" /><span className="text-muted-foreground">{pool.token0Symbol}</span></div>
            <span className="font-medium">{reserve0Formatted.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2"><TokenIcon src={token1Logo} symbol={pool.token1Symbol} size={16} fallbackSrc="/tokens/qms.svg" /><span className="text-muted-foreground">{pool.token1Symbol}</span></div>
            <span className="font-medium">{reserve1Formatted.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
          </div>
        </div>

        <p className="mb-4 px-1 text-[10px] text-muted-foreground">WQMS values use current pool spot quotes. Fee tier and APR are not shown because they are not verified from the deployed pair.</p>

        <div className="flex gap-2">
          <Link to={`/pool/${pool.pairAddress}`} className="flex-1">
            <Button variant="outline" size="sm" className="h-9 w-full text-xs"><ExternalLink aria-hidden="true" data-icon="inline-start" />Details</Button>
          </Link>
          <Link to="/liquidity" className="flex-1">
            <Button size="sm" className="btn-dragon h-9 w-full text-xs"><Plus aria-hidden="true" data-icon="inline-start" />Add Liquidity</Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
