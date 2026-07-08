import { SEO } from '@/components/seo/SEO';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Plus, RefreshCw, Search, Grid, List, ArrowUpDown, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLiquidityPools } from '@/hooks/useLiquidityPools';
import { useTokenPrices } from '@/hooks/usePrices';
import { useSwapVolume } from '@/hooks/useSwapVolume';
import { Spotlight } from '@/components/ui/magic/Spotlight';
import { PoolCardSkeleton } from '@/components/ui/loading/Skeleton';
import { PoolCard } from '@/components/pools/PoolCard';
import { PoolStats } from '@/components/pools/PoolStats';
import { cn } from '@/lib/utils';
import { formatUnits } from 'viem';

export default function Pools() {
  const { pools, pairCount, isLoading, refetch } = useLiquidityPools();
  const { prices } = useTokenPrices();
  const { stats: swapStats } = useSwapVolume(pools, prices);
  const perPool = swapStats.perPool;
  const hotPoolAddr = useMemo(() => {
    let top: string | null = null; let max = 0;
    for (const [addr, vol] of Object.entries(perPool)) {
      if (vol > max) { max = vol; top = addr; }
    }
    return max > 0 ? top : null;
  }, [perPool]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'active' | 'empty'>('all');
  const [sortBy, setSortBy] = useState<'tvl' | 'volume' | 'apy'>('tvl');

  const activePools = pools.filter(p => p.reserve0 > 0n && p.reserve1 > 0n).length;

  const totalTVL = useMemo(() => {
    return pools.reduce((acc, pool) => {
      const price0 = prices[pool.token0Symbol] || 0;
      const price1 = prices[pool.token1Symbol] || 0;
      const value0 = parseFloat(formatUnits(pool.reserve0, pool.token0?.decimals || 18)) * price0;
      const value1 = parseFloat(formatUnits(pool.reserve1, pool.token1?.decimals || 18)) * price1;
      return acc + value0 + value1;
    }, 0);
  }, [pools, prices]);

  const filteredPools = useMemo(() => {
    const computeTvl = (pool: typeof pools[number]) => {
      const p0 = prices[pool.token0Symbol] || 0;
      const p1 = prices[pool.token1Symbol] || 0;
      const v0 = parseFloat(formatUnits(pool.reserve0, pool.token0?.decimals || 18)) * p0;
      const v1 = parseFloat(formatUnits(pool.reserve1, pool.token1?.decimals || 18)) * p1;
      return v0 + v1;
    };
    const filtered = pools.filter(pool => {
      const matchesSearch =
        pool.token0Symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pool.token1Symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pool.pairAddress.toLowerCase().includes(searchQuery.toLowerCase());

      if (filter === 'active') return matchesSearch && pool.reserve0 > 0n && pool.reserve1 > 0n;
      if (filter === 'empty') return matchesSearch && (pool.reserve0 === 0n || pool.reserve1 === 0n);
      return matchesSearch;
    });
    return filtered.sort((a, b) => {
      if (sortBy === 'tvl') return computeTvl(b) - computeTvl(a);
      if (sortBy === 'volume') {
        return (perPool[b.pairAddress] || 0) - (perPool[a.pairAddress] || 0);
      }
      // APR = fees24h * 365 / TVL
      const aprOf = (p: typeof pools[number]) => {
        const t = computeTvl(p);
        const v = perPool[p.pairAddress] || 0;
        return t > 0 && v > 0 ? (v * 0.003 * 365) / t : 0;
      };
      return aprOf(b) - aprOf(a);
    });
  }, [pools, prices, searchQuery, filter, sortBy, perPool]);

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 pb-24 lg:pb-8 relative min-h-screen">

    <SEO title="Liquidity Pools — DRAGONDEX" description="Browse all DRAGONDEX liquidity pools with real-time TVL, volume, and APR on OPN Testnet." path="/pools" />
      <Spotlight className="hidden md:block" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <span className="ember-pill inline-flex items-center gap-2 text-xs mb-4">
            <Droplets className="w-3.5 h-3.5" />
            <span className="uppercase tracking-[0.18em]">Liquidity Pools</span>
          </span>
          <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold gradient-text mb-3 tracking-tight">
            Forge of Liquidity
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-lg mx-auto">
            Explore live pools and provide liquidity to earn <span className="text-primary font-medium">0.3% fees</span> on every trade.
          </p>
        </div>


        {/* Stats */}
        <PoolStats
          isLoading={isLoading}
          pairCount={pairCount}
          totalTVL={totalTVL}
          activePools={activePools}
        />

        {/* Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search pools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full md:w-48 lg:w-64 bg-muted/50"
              />
            </div>

            {/* Filter */}
            <div className="flex bg-muted/50 rounded-lg p-1">
              {['all', 'active', 'empty'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={cn(
                    "px-2 md:px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize",
                    filter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {f === 'active' ? '🟢 Active' : f === 'empty' ? '⚪ Empty' : 'All'}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex bg-muted/50 rounded-lg p-1">
              {[
                { key: 'tvl', label: 'TVL', icon: <ArrowUpDown className="w-3 h-3" /> },
                { key: 'volume', label: 'Volume' },
                { key: 'apy', label: 'APY' },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSortBy(s.key as any)}
                  className={cn(
                    "px-2 md:px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1",
                    sortBy === s.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {s.icon}{s.label}
                </button>
              ))}
            </div>

            {/* View Toggle */}
            <div className="flex bg-muted/50 rounded-lg p-1">
              <button aria-label="Grid view" onClick={() => setViewMode('grid')} className={cn("p-2 rounded-md transition-colors", viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
                <Grid className="w-4 h-4" />
              </button>
              <button aria-label="List view" onClick={() => setViewMode('list')} className={cn("p-2 rounded-md transition-colors", viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Updated just now</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
            <Link to="/create-pool">
              <Button className="btn-dragon" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Pool
              </Button>
            </Link>
          </div>
        </div>

        {/* Pool Cards */}
        {isLoading ? (
          <div className={cn(
            "grid gap-4",
            viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'
          )}>
            {[...Array(6)].map((_, i) => <PoolCardSkeleton key={i} />)}
          </div>
        ) : filteredPools.length > 0 ? (
          <div className={cn(
            "grid gap-4",
            viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'
          )}>
            {filteredPools.map((pool, i) => (
              <PoolCard
                key={pool.pairAddress}
                pool={pool}
                index={i}
                prices={prices}
                volume24h={perPool[pool.pairAddress] || 0}
                isHot={hotPoolAddr === pool.pairAddress}
              />
            ))}
          </div>
        ) : (
          <div className="glass-card p-8 md:p-12 text-center">
            <Droplets className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-primary opacity-50" />
            <h3 className="text-lg md:text-xl font-bold mb-2">
              {pairCount === 0 ? 'No Pools Yet' : 'No Pools Found'}
            </h3>
            <p className="text-sm md:text-base text-muted-foreground mb-6">
              {pairCount === 0 ? 'Be the first to create a liquidity pool!' : 'Try a different search or filter'}
            </p>
            <Link to="/create-pool">
              <Button className="btn-dragon">
                <Plus className="w-4 h-4 mr-2" />
                Create First Pool
              </Button>
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
