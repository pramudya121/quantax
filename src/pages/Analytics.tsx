import { SEO } from '@/components/seo/SEO';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, TrendingUp, Activity, Layers, Droplets, ExternalLink, RefreshCw, Coins, ArrowUpRight, ArrowRightLeft, Zap } from 'lucide-react';
import { useLiquidityPools } from '@/hooks/useLiquidityPools';
import { useTokenPrices } from '@/hooks/usePrices';
import { useSwapVolume } from '@/hooks/useSwapVolume';
import { BorderBeam } from '@/components/ui/magic/BorderBeam';
import { Spotlight } from '@/components/ui/magic/Spotlight';
import { StatCardSkeleton, TableRowSkeleton } from '@/components/ui/loading/Skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChainId } from 'wagmi';
import { formatUnits } from 'viem';
import { getContracts, getTokenList } from '@/config/contracts';
import { getTokenPrice } from '@/lib/pricing';
import { Link } from 'react-router-dom';
import { TokenDetails } from '@/components/analytics/TokenDetails';
import { TokenIcon } from '@/components/ui/TokenIcon';
import { PriceHistoryChart } from '@/components/analytics/PriceHistoryChart';

type AnalyticsTab = 'overview' | 'pools' | 'tokens' | 'activity';

const TABS: { id: AnalyticsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'pools', label: 'Pools', icon: <Droplets className="w-4 h-4" /> },
  { id: 'tokens', label: 'Tokens', icon: <Coins className="w-4 h-4" /> },
  { id: 'activity', label: 'Activity', icon: <Activity className="w-4 h-4" /> },
];

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  delay?: number;
  isOnChain?: boolean;
}

function StatCard({ icon: Icon, label, value, prefix = '', suffix = '', delay = 0, isOnChain }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="relative overflow-hidden"
    >
      <div className="stat-card relative min-w-0 p-3 md:p-4">
        <BorderBeam size={100} duration={10} delay={delay * 2} />
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="p-1.5 md:p-2 rounded-xl bg-primary/10">
            <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          </div>
          {isOnChain && (
            <span className="text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-full bg-success/20 text-success font-medium">
              On-Chain
            </span>
          )}
        </div>
        <p className="mb-1 min-h-7 text-[9px] leading-tight tracking-[0.1em] text-muted-foreground uppercase md:min-h-0 md:text-xs">{label}</p>
        <p className="font-mono-display break-words text-base font-bold leading-tight tabular-nums md:text-2xl">
          {prefix}{value.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: Number.isInteger(value) ? 0 : value < 100 ? 2 : 0,
          })}{suffix}
        </p>
      </div>
    </motion.div>
  );
}

export default function Analytics() {
  const chainId = useChainId();
  const tokenList = useMemo(() => getTokenList(chainId), [chainId]);
  const { pools, pairCount, isLoading, error: poolsError, refetch } = useLiquidityPools();
  const { prices } = useTokenPrices();
  const { logs: swapLogs, stats: volStats, isLoading: volLoading, volumeScanComplete, refetch: refetchVol, latestBlock } = useSwapVolume(pools, prices);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [poolSearch, setPoolSearch] = useState('');
  const [activityPage, setActivityPage] = useState(0);
  const activityPageSize = 25;

  const totalTVL = useMemo(() => {
    return pools.reduce((acc, pool) => {
      const price0 = getTokenPrice(prices, pool.token0Address);
      const price1 = getTokenPrice(prices, pool.token1Address);
      const value0 = parseFloat(formatUnits(pool.reserve0, pool.token0?.decimals ?? 18)) * price0;
      const value1 = parseFloat(formatUnits(pool.reserve1, pool.token1?.decimals ?? 18)) * price1;
      return acc + value0 + value1;
    }, 0);
  }, [pools, prices]);

  const activePools = useMemo(() => pools.filter(p => p.reserve0 > 0n && p.reserve1 > 0n).length, [pools]);

  const uniqueTokens = useMemo(() => {
    const tokenSet = new Set<string>();
    pools.forEach(p => {
      tokenSet.add(p.token0Address.toLowerCase());
      tokenSet.add(p.token1Address.toLowerCase());
    });
    return tokenSet.size;
  }, [pools]);

  const topPools = useMemo(() => {
    return pools
      .map(pool => {
        const price0 = getTokenPrice(prices, pool.token0Address);
        const price1 = getTokenPrice(prices, pool.token1Address);
        const value0 = parseFloat(formatUnits(pool.reserve0, pool.token0?.decimals ?? 18)) * price0;
        const value1 = parseFloat(formatUnits(pool.reserve1, pool.token1?.decimals ?? 18)) * price1;
        const tvl = value0 + value1;
        const reserve0F = parseFloat(formatUnits(pool.reserve0, pool.token0?.decimals ?? 18));
        const reserve1F = parseFloat(formatUnits(pool.reserve1, pool.token1?.decimals ?? 18));
        const volume = volStats.perPool[pool.pairAddress] || 0;
        return { ...pool, tvl, reserve0F, reserve1F, volume };
      })
      .sort((a, b) => b.tvl - a.tvl);
  }, [pools, prices, volStats]);

  // Aggregate by contract address so a spoofed symbol cannot inherit another token's quote.
  const tokenAnalytics = useMemo(() => {
    type TokenAnalyticsEntry = {
      address: string;
      symbol: string;
      logo: string;
      totalLiquidity: number;
      poolCount: number;
      price: number;
    };
    const tokenMap: Record<string, TokenAnalyticsEntry> = {};

    const addToken = (
      address: string,
      symbol: string,
      logo: string,
      price: number,
      liquidity: number,
      hasLiquidity: boolean,
    ) => {
      const key = address.toLowerCase();
      const entry = tokenMap[key] ?? {
        address,
        symbol,
        logo: logo || '/tokens/qms.svg',
        totalLiquidity: 0,
        poolCount: 0,
        price,
      };
      entry.totalLiquidity += liquidity;
      entry.poolCount += hasLiquidity ? 1 : 0;
      entry.price = price;
      tokenMap[key] = entry;
    };

    pools.forEach(pool => {
      const price0 = getTokenPrice(prices, pool.token0Address);
      const price1 = getTokenPrice(prices, pool.token1Address);
      const value0 = parseFloat(formatUnits(pool.reserve0, pool.token0?.decimals ?? 18)) * price0;
      const value1 = parseFloat(formatUnits(pool.reserve1, pool.token1?.decimals ?? 18)) * price1;
      const hasLiquidity = pool.reserve0 > 0n && pool.reserve1 > 0n;
      addToken(pool.token0Address, pool.token0Symbol, pool.token0?.logoURI || '', price0, value0, hasLiquidity);
      addToken(pool.token1Address, pool.token1Symbol, pool.token1?.logoURI || '', price1, value1, hasLiquidity);
    });

    tokenList.forEach(token => {
      const key = token.address.toLowerCase();
      if (!tokenMap[key]) {
        tokenMap[key] = {
          address: token.address,
          symbol: token.symbol,
          logo: token.logoURI,
          totalLiquidity: 0,
          poolCount: 0,
          price: getTokenPrice(prices, token.address, getContracts(chainId).WETH),
        };
      }
    });

    return Object.values(tokenMap).sort((a, b) => b.totalLiquidity - a.totalLiquidity);
  }, [pools, prices, tokenList, chainId]);

  const chartPools = topPools.filter(p => p.tvl > 0).slice(0, 8);
  const maxTVL = Math.max(...chartPools.map(p => p.tvl), 1);
  const filteredPools = useMemo(() => {
    const query = poolSearch.trim().toLowerCase();
    if (!query) return topPools;
    return topPools.filter(pool =>
      `${pool.token0Symbol}/${pool.token1Symbol} ${pool.pairAddress}`.toLowerCase().includes(query),
    );
  }, [topPools, poolSearch]);
  const activityPageCount = Math.ceil(swapLogs.length / activityPageSize);
  const safeActivityPage = Math.min(activityPage, Math.max(activityPageCount - 1, 0));
  const visibleActivity = swapLogs.slice(safeActivityPage * activityPageSize, (safeActivityPage + 1) * activityPageSize);

  const stats: StatCardProps[] = [
    { icon: Droplets, label: 'TVL (WQMS estimate)', value: totalTVL, suffix: ' WQMS', isOnChain: true },
    { icon: ArrowRightLeft, label: volumeScanComplete ? 'Recent pool-event volume' : 'Partial indexed volume', value: volStats.totalVolumeWQMS, suffix: ' WQMS est.', isOnChain: volumeScanComplete },
    { icon: Zap, label: 'Indexed pool swap events', value: volStats.swapCount, isOnChain: volumeScanComplete },
    { icon: Layers, label: 'Total Pools', value: pairCount, isOnChain: true },
    { icon: Activity, label: 'Active Pools', value: activePools, isOnChain: true },
    { icon: Coins, label: 'Configured Tokens', value: tokenList.length, isOnChain: false },
  ];

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 pb-24 lg:pb-8 relative">

    <SEO title="Analytics — QUANTAX" description="On-chain analytics for QUANTAX: total value locked, trading volume, top pools and tokens on QMS Testnet." path="/analytics" />
      <Spotlight className="hidden md:block" />
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="ember-pill mb-2 inline-flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-[10px] md:text-xs font-semibold tracking-[0.16em] uppercase">Protocol Analytics</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold gradient-text tracking-tight">Analytics</h1>
            <p className="mt-1 text-xs md:text-sm text-muted-foreground">On-chain market activity and liquidity</p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-xl border border-border/60 bg-muted/30 px-3 py-2 sm:self-auto">
            <span className={cn('size-2 shrink-0 rounded-full', poolsError ? 'bg-destructive' : isLoading ? 'bg-muted-foreground' : 'bg-success')} aria-hidden="true" />
            <span className="text-[11px] font-medium">QMS Testnet</span>
            <span className="h-3 border-l border-border/70" />
            <span className="text-[10px] text-muted-foreground">
              {latestBlock
                ? `Block ${latestBlock.toLocaleString()}`
                : isLoading
                  ? 'Loading pools…'
                  : pairCount === 0
                    ? 'No pools indexed'
                    : volLoading
                      ? 'Scanning recent activity…'
                      : 'Block data unavailable'}
            </span>
          </div>
        </div>
        
        {poolsError && (
          <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
            <span>Pool data could not be loaded. Check the network connection and retry.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={cn('mr-2 size-4', isLoading && 'animate-spin')} /> Retry
            </Button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
{isLoading || volLoading ? (
                    [...Array(6)].map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            stats.map((s, i) => (
              <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} prefix={s.prefix} suffix={s.suffix} isOnChain={s.isOnChain} delay={i * 0.06} />
            ))
          )}
        </div>

        {/* Tab Navigation */}
        <div className="mb-5 flex items-center gap-2">
          <nav aria-label="Analytics sections" className="flex min-w-0 flex-1 items-center gap-1 rounded-xl border border-border/50 bg-muted/40 p-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                aria-current={activeTab === tab.id ? 'page' : undefined}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-1.5 sm:px-3 text-[10px] sm:text-xs font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sr-only sm:hidden">{tab.label}</span>
              </button>
            ))}
          </nav>
          <Button variant="outline" size="icon" aria-label="Refresh analytics data" onClick={() => { refetch(); refetchVol(); }} disabled={isLoading || volLoading} className="size-10 shrink-0 rounded-xl">
            <RefreshCw className={cn("w-3.5 h-3.5", (isLoading || volLoading) && "animate-spin")} />
          </Button>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-4">
              <PriceHistoryChart pools={pools} logs={swapLogs} latestBlock={latestBlock} isLoading={volLoading} />
              <div className="grid md:grid-cols-2 gap-4">
                {/* TVL Distribution */}
                <section className="glass-card p-4 md:p-5" aria-labelledby="pool-tvl-heading">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 id="pool-tvl-heading" className="text-sm md:text-base font-semibold">Pool liquidity</h2>
                      <p className="mt-1 text-[10px] text-muted-foreground">Top pools by estimated TVL</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-success/10 px-2 py-1 text-[9px] font-medium text-success">On-chain</span>
                  </div>
                  {chartPools.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {chartPools.map((pool, i) => {
                        const pct = maxTVL > 0 ? (pool.tvl / maxTVL) * 100 : 0;
                        return (
                          <div key={pool.pairAddress} className="flex flex-col gap-1.5" aria-label={`${pool.token0Symbol}/${pool.token1Symbol} pool TVL`}>
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="min-w-0 truncate font-medium">{pool.token0Symbol}/{pool.token1Symbol}</span>
                              <span className="shrink-0 font-mono tabular-nums text-muted-foreground">{pool.tvl.toLocaleString(undefined, { maximumFractionDigits: 2 })} WQMS</span>
                            </div>
                            <div
                              role="meter"
                              aria-label={`${pool.token0Symbol}/${pool.token1Symbol} relative TVL`}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={Math.round(pct)}
                              className="h-1.5 overflow-hidden rounded-full bg-muted/70"
                            >
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ delay: 0.15 + i * 0.05, duration: 0.45 }}
                                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex min-h-32 items-center justify-center text-center text-xs text-muted-foreground">
                      No active pools with liquidity
                    </div>
                  )}
                </section>

                {/* Top Pools Quick View */}
                <div className="glass-card p-4 md:p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm md:text-base font-semibold">Top Pools by TVL</h2>
                    <button onClick={() => setActiveTab('pools')} className="text-xs text-primary hover:underline flex items-center gap-1">
                      View all <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {topPools.filter(p => p.tvl > 0).slice(0, 6).map((pool, i) => (
                      <motion.div
                        key={pool.pairAddress}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.05 }}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex -space-x-1">
                          <TokenIcon src={pool.token0?.logoURI} symbol={pool.token0Symbol} size={20} fallbackSrc="/tokens/qms.svg" className="border border-background" />
                          <TokenIcon src={pool.token1?.logoURI} symbol={pool.token1Symbol} size={20} fallbackSrc="/tokens/qms.svg" className="border border-background" />
                        </div>
                        <span className="text-xs font-medium flex-1">{pool.token0Symbol}/{pool.token1Symbol}</span>
                        <span className="text-xs font-bold text-success">{pool.tvl.toFixed(2)} WQMS est.</span>
                      </motion.div>
                    ))}
                    {topPools.filter(p => p.tvl > 0).length === 0 && (
                      <p className="text-center text-muted-foreground text-sm py-6">No active pools</p>
                    )}
                  </div>
                </div>

                {/* Token Prices Quick View */}
                <div className="glass-card p-4 md:p-5 md:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm md:text-base font-semibold flex items-center gap-2">
                      <Coins className="w-4 h-4 text-primary" />
                      Token Prices
                    </h2>
                    <button onClick={() => setActiveTab('tokens')} className="text-xs text-primary hover:underline flex items-center gap-1">
                      View all <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                    {tokenList.map((token, i) => (
                      <motion.div
                      key={token.address}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 + i * 0.05 }}
                        className="flex flex-col items-center p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <TokenIcon src={token.logoURI} symbol={token.symbol} size={32} fallbackSrc="/tokens/qms.svg" className="border border-border mb-2" />
                        <span className="text-xs font-bold">{token.symbol}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {getTokenPrice(prices, token.address, getContracts(chainId).WETH) > 0 ? `${getTokenPrice(prices, token.address, getContracts(chainId).WETH).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} WQMS est.` : 'No pool quote'}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'pools' && (
            <motion.div key="pools" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <div className="glass-card p-4 md:p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-sm md:text-base font-semibold">All Pools</h2>
                    <p className="mt-1 text-xs text-muted-foreground">Live reserves from QMS Testnet, sorted by estimated TVL</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{filteredPools.length}{filteredPools.length !== pools.length ? ` of ${pools.length}` : ''} pools on-chain</span>
                </div>
                <label className="mb-4 flex min-h-10 items-center gap-2 rounded-lg border border-border bg-muted/30 px-3">
                  <span className="sr-only">Search pools by token or address</span>
                  <input
                    value={poolSearch}
                    onChange={event => setPoolSearch(event.target.value)}
                    placeholder="Search token pair or pool address"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    type="search"
                  />
                </label>
                <div className="grid gap-2 sm:hidden">
                  {isLoading ? (
                    [...Array(4)].map((_, i) => <TableRowSkeleton key={i} columns={2} />)
                  ) : filteredPools.length > 0 ? (
                    filteredPools.map((pool, i) => {
                      const hasLiq = pool.reserve0 > 0n && pool.reserve1 > 0n;
                      return (
                        <article key={pool.pairAddress} className="rounded-xl border border-border/50 bg-muted/20 p-3">
                          <div className="flex items-center gap-2">
                            <span className="w-5 shrink-0 text-[10px] text-muted-foreground">{i + 1}</span>
                            <div className="flex -space-x-1 shrink-0">
                              <TokenIcon src={pool.token0?.logoURI} symbol={pool.token0Symbol} size={20} fallbackSrc="/tokens/qms.svg" className="border border-background" />
                              <TokenIcon src={pool.token1?.logoURI} symbol={pool.token1Symbol} size={20} fallbackSrc="/tokens/qms.svg" className="border border-background" />
                            </div>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold">{pool.token0Symbol}/{pool.token1Symbol}</span>
                            <span className={cn("shrink-0 rounded-full px-2 py-1 text-[9px] font-medium", hasLiq ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                              {hasLiq ? 'Active' : 'Empty'}
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/40 pt-2.5 text-[10px]">
                            <div>
                              <p className="text-muted-foreground">Reserve 0</p>
                              <p className="mt-0.5 truncate font-mono tabular-nums">{pool.reserve0F.toLocaleString(undefined, { maximumFractionDigits: 2 })} {pool.token0Symbol}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Reserve 1</p>
                              <p className="mt-0.5 truncate font-mono tabular-nums">{pool.reserve1F.toLocaleString(undefined, { maximumFractionDigits: 2 })} {pool.token1Symbol}</p>
                            </div>
                            <div className="col-span-2 flex items-center justify-between gap-2">
                              <span className="text-muted-foreground">Estimated TVL</span>
                              <span className="font-semibold tabular-nums">{pool.tvl > 0 ? `${pool.tvl.toFixed(2)} WQMS` : '—'}</span>
                            </div>
                          </div>
                          <a href={`https://testnet.qmsscan.io/address/${pool.pairAddress}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${pool.token0Symbol}/${pool.token1Symbol} on explorer`} className="mt-2 inline-flex min-h-9 items-center gap-1 text-[10px] font-medium text-primary hover:underline">
                            View on explorer <ExternalLink className="w-3 h-3" />
                          </a>
                        </article>
                      );
                    })
                  ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground">{poolSearch ? 'No pools match your search.' : 'No pools found on-chain.'}</p>
                  )}
                </div>
                <div className="hidden overflow-x-auto -mx-4 md:mx-0 sm:block">
                  <table className="w-full min-w-[500px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">#</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Pool</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Reserve 0</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Reserve 1</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">TVL</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Status</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Explorer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        [...Array(4)].map((_, i) => <TableRowSkeleton key={i} columns={7} />)
                      ) : filteredPools.length > 0 ? (
                        filteredPools.map((pool, i) => {
                          const hasLiq = pool.reserve0 > 0n && pool.reserve1 > 0n;
                          return (
                            <tr key={pool.pairAddress} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                              <td className="py-2.5 px-3 text-xs">{i + 1}</td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex -space-x-1 shrink-0">
                                    <TokenIcon src={pool.token0?.logoURI} symbol={pool.token0Symbol} size={20} fallbackSrc="/tokens/qms.svg" className="border border-background" />
                                    <TokenIcon src={pool.token1?.logoURI} symbol={pool.token1Symbol} size={20} fallbackSrc="/tokens/qms.svg" className="border border-background" />
                                  </div>
                                  <span className="font-medium text-xs">{pool.token0Symbol}/{pool.token1Symbol}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right text-xs">
                                {pool.reserve0F.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right text-xs hidden sm:table-cell">
                                {pool.reserve1F.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right text-xs font-medium">
                                {pool.tvl > 0 ? `${pool.tvl.toFixed(2)} WQMS est.` : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right hidden md:table-cell">
                                <span className={cn(
                                  "text-[10px] px-2 py-0.5 rounded-full",
                                  hasLiq ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                                )}>
                                  {hasLiq ? 'Active' : 'Empty'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <a href={`https://testnet.qmsscan.io/address/${pool.pairAddress}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                  <ExternalLink className="w-3 h-3 inline" />
                                </a>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr><td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">{poolSearch ? 'No pools match your search.' : 'No pools found on-chain.'}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'tokens' && (
            <motion.div key="tokens" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-4">
              <TokenDetails pools={pools} prices={prices} isLoading={isLoading} />
              <div className="glass-card p-4 md:p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm md:text-base font-semibold">All Tokens Overview</h2>
                  <span className="text-xs text-muted-foreground">{tokenAnalytics.length} tokens</span>
                </div>
                <div className="grid gap-2">
                  {tokenAnalytics.map((token, i) => (
                    <motion.div
                      key={token.address.toLowerCase()}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <TokenIcon src={token.logo} symbol={token.symbol} size={36} fallbackSrc="/tokens/qms.svg" className="border border-border shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{token.symbol}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {token.poolCount} pool{token.poolCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {token.price > 0 ? `${token.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: token.price < 1 ? 4 : 2 })} WQMS est.` : 'No pool quote'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          TVL: {token.totalLiquidity.toFixed(2)} WQMS est.
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'activity' && (
            <motion.div key="activity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <div className="glass-card p-4 md:p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm md:text-base font-semibold flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      Recent Swaps
                    </h2>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                      Live pool Swap events; one transaction can emit multiple events
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                    {swapLogs.length} indexed events
                  </span>
                </div>

                {!volumeScanComplete && (
                  <p role="status" className="mb-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    Activity scan is partial or still running. Event totals and volume may not cover the full recent block window.
                  </p>
                )}

                {volLoading && swapLogs.length === 0 ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <TableRowSkeleton key={i} columns={5} />)}
                  </div>
                ) : swapLogs.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground text-sm">
                    {volumeScanComplete ? 'No swap events found in the scanned block window.' : 'No swap events are available yet; the block scan is incomplete.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 md:mx-0">
                    <table className="w-full min-w-[560px]">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Pool</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Swap</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Est. Volume</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Pair caller (may be router)</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Tx</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleActivity.map((log, i) => (
                          <motion.tr
                            key={`${log.txHash}-${i}`}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(i * 0.02, 0.4) }}
                            className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                          >
                            <td className="py-2.5 px-3">
                              <span className="text-xs font-medium">{log.token0Symbol}/{log.token1Symbol}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="font-mono">{log.amountIn.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                                <span className="text-muted-foreground">{log.tokenInSymbol}</span>
                                <ArrowRightLeft className="w-3 h-3 text-primary mx-0.5" />
                                <span className="font-mono">{log.amountOut.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                                <span className="text-muted-foreground">{log.tokenOutSymbol}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right text-xs font-medium text-success">
                              {log.volumeWQMS > 0 ? `${log.volumeWQMS.toFixed(2)} WQMS est.` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right hidden sm:table-cell">
                              <a
                                aria-label={`View caller ${log.sender} on QMS Explorer`}
                                href={`https://testnet.qmsscan.io/address/${log.sender}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-mono text-muted-foreground hover:text-primary"
                              >
                                {log.sender.slice(0, 6)}…{log.sender.slice(-4)}
                              </a>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <a
                                aria-label={`View transaction ${log.txHash} on QMS Explorer`}
                                href={`https://testnet.qmsscan.io/tx/${log.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {activityPageCount > 1 && (
                  <div className="mt-4 flex flex-col gap-3 border-t border-border/40 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      Showing {safeActivityPage * activityPageSize + 1}–{Math.min((safeActivityPage + 1) * activityPageSize, swapLogs.length)} of {swapLogs.length} indexed events
                    </p>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setActivityPage(page => Math.max(0, page - 1))} disabled={safeActivityPage === 0}>
                        Previous
                      </Button>
                      <span className="min-w-16 text-center text-xs text-muted-foreground">{safeActivityPage + 1} / {activityPageCount}</span>
                      <Button variant="outline" size="sm" onClick={() => setActivityPage(page => Math.min(activityPageCount - 1, page + 1))} disabled={safeActivityPage >= activityPageCount - 1}>
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
