import { motion } from 'framer-motion';
import { Activity, ArrowRightLeft, Droplets, Layers3 } from 'lucide-react';
import { BorderBeam } from '@/components/ui/magic/BorderBeam';
import { NumberTicker } from '@/components/ui/magic/NumberTicker';
import { useChainId } from 'wagmi';
import { getTokenList } from '@/config/contracts';
import { StatCardSkeleton } from '@/components/ui/loading/Skeleton';

interface PoolStatsProps {
  isLoading: boolean;
  pairCount: number;
  totalTVL: number;
  activePools: number;
  recentVolumeWQMS: number;
  recentSwapCount: number;
  volumeScanComplete: boolean;
}

export function PoolStats({
  isLoading,
  pairCount,
  totalTVL,
  activePools,
  recentVolumeWQMS,
  recentSwapCount,
  volumeScanComplete,
}: PoolStatsProps) {
  const tokenList = getTokenList(useChainId());
  const stats = [
    { icon: Droplets, label: 'Pools on chain', value: pairCount, tone: 'text-primary' },
    { icon: Activity, label: 'Pools with liquidity', value: activePools, tone: 'text-success' },
    { icon: Layers3, label: 'Configured assets', value: tokenList.length, tone: 'text-secondary' },
  ];

  if (isLoading) {
    return (
      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  return (
    <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden glass-card p-4 text-center"
      >
        <BorderBeam size={80} duration={10} />
        <p className="text-xs text-muted-foreground">TVL estimate</p>
        <p className="mt-1 font-mono-display text-xl font-bold text-success">
          {totalTVL > 0 ? `${totalTVL.toLocaleString(undefined, { maximumFractionDigits: 2 })} WQMS` : 'Not available'}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">Derived from live reserves and pool spot quotes; not fiat value.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative overflow-hidden glass-card p-4 text-center"
      >
        <BorderBeam size={80} duration={10} delay={1} />
        <p className="text-xs text-muted-foreground">Recent swap volume estimate</p>
        <p className="mt-1 font-mono-display text-xl font-bold">
          {volumeScanComplete
            ? `${recentVolumeWQMS.toLocaleString(undefined, { maximumFractionDigits: 2 })} WQMS est.`
            : 'Not available'}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {volumeScanComplete ? `${recentSwapCount.toLocaleString()} indexed swaps` : 'On-chain log scan is incomplete'}
        </p>
      </motion.div>

      {stats.map(({ icon: Icon, label, value, tone }, index) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + index * 0.04 }}
          className="stat-card flex items-center gap-3"
        >
          <div className="rounded-lg bg-muted/50 p-2">
            <Icon aria-hidden="true" className={`size-4 ${tone}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold"><NumberTicker value={value} /></p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
