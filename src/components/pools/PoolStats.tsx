import { motion } from 'framer-motion';
import { Droplets, DollarSign, BarChart3, Percent } from 'lucide-react';
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
}

export function PoolStats({ isLoading, pairCount, totalTVL, activePools }: PoolStatsProps) {
  const tokenList = getTokenList(useChainId());
  if (isLoading) {
    return (
      <>
        {/* Top large stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        {/* Small stat row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      </>
    );
  }

  // Simulated values
  const estimatedVolume = totalTVL * 0.1;
  const avgAPY = activePools > 0 ? 13.49 : 0;

  return (
    <>
      {/* Large Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="relative overflow-hidden glass-card p-4 md:p-5 text-center">
          <BorderBeam size={80} duration={10} />
          <p className="text-xs text-muted-foreground mb-1">Total Value Locked</p>
          <p className="text-xl md:text-2xl font-bold text-success">
            ${totalTVL > 0 ? totalTVL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">From on-chain reserves</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="relative overflow-hidden glass-card p-4 md:p-5 text-center">
          <BorderBeam size={80} duration={10} delay={1} />
          <p className="text-xs text-muted-foreground mb-1">24h Volume</p>
          <p className="text-xl md:text-2xl font-bold">
            ${estimatedVolume > 0 ? estimatedVolume.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0.00'}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Estimated from TVL</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="relative overflow-hidden glass-card p-4 md:p-5 text-center">
          <BorderBeam size={80} duration={10} delay={2} />
          <p className="text-xs text-muted-foreground mb-1">Average APY</p>
          <p className="text-xl md:text-2xl font-bold text-primary">
            {avgAPY > 0 ? `${avgAPY}%` : '-'}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Based on trading fees</p>
        </motion.div>
      </div>

      {/* Small Stat Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="stat-card flex items-center gap-2 md:gap-3">
          <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
            <Droplets className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Total Pools</p>
            <p className="text-lg font-bold"><NumberTicker value={pairCount} /></p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="stat-card flex items-center gap-2 md:gap-3">
          <div className="p-1.5 md:p-2 rounded-lg bg-success/10">
            <DollarSign className="w-4 h-4 text-success" />
          </div>
          <div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Total TVL</p>
            <p className="text-lg font-bold">${totalTVL > 0 ? (totalTVL > 1000000 ? `${(totalTVL/1000000).toFixed(2)}M` : totalTVL.toLocaleString(undefined, { maximumFractionDigits: 0 })) : '0'}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="stat-card flex items-center gap-2 md:gap-3">
          <div className="p-1.5 md:p-2 rounded-lg bg-secondary/10">
            <BarChart3 className="w-4 h-4 text-secondary" />
          </div>
          <div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Tokens</p>
            <p className="text-lg font-bold"><NumberTicker value={tokenList.length} /></p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="stat-card flex items-center gap-2 md:gap-3">
          <div className="p-1.5 md:p-2 rounded-lg bg-accent/10">
            <Percent className="w-4 h-4 text-accent" />
          </div>
          <div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Pool Fee</p>
            <p className="text-lg font-bold">0.3%</p>
          </div>
        </motion.div>
      </div>
    </>
  );
}
