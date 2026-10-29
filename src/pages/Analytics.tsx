import { SEO } from '@/components/seo/SEO';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, TrendingUp, DollarSign, Activity, Users, Layers, Droplets, ExternalLink, RefreshCw, Coins, ArrowUpRight, Percent, ArrowRightLeft, Zap } from 'lucide-react';
import { useLiquidityPools } from '@/hooks/useLiquidityPools';
import { useTokenPrices } from '@/hooks/usePrices';
import { useSwapVolume } from '@/hooks/useSwapVolume';
import { NumberTicker } from '@/components/ui/magic/NumberTicker';
import { BorderBeam } from '@/components/ui/magic/BorderBeam';
import { Spotlight } from '@/components/ui/magic/Spotlight';
import { StatCardSkeleton, TableRowSkeleton } from '@/components/ui/loading/Skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatUnits } from 'viem';
import { TOKEN_LIST } from '@/config/contracts';
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
      <div className="stat-card relative">
        <BorderBeam size={100} duration={10} delay={delay * 2} />
        <div className="flex items-start justify-between mb-2">
          <div className="p-1.5 md:p-2 rounded-xl bg-primary/10">
            <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          </div>
          {isOnChain && (
            <span className="text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-full bg-success/20 text-success font-medium">
              On-Chain
            </span>
          )}
        </div>
        <p className="text-[10px] md:text-xs text-muted-foreground mb-1 tracking-[0.14em] uppercase">{label}</p>
        <p className="font-mono-display text-lg md:text-2xl font-bold">
          <NumberTicker value={value} prefix={prefix} suffix={suffix} delay={delay} decimalPlaces={value < 100 ? 2 : 0} />
        </p>
      </div>
    </motion.div>
  );
}

export default function Analytics() {
  const { pools, pairCount, isLoading, refetch } = useLiquidityPools();
  const { prices } = useTokenPrices();
  const { logs: swapLogs, stats: volStats, isLoading: volLoading, refetch: refetchVol, latestBlock } = useSwapVolume(pools, prices);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');

  const totalTVL = useMemo(() => {
    return pools.reduce((acc, pool) => {
      const price0 = prices[pool.token0Symbol] || 0;
      const price1 = prices[pool.token1Symbol] || 0;
      const value0 = parseFloat(formatUnits(pool.reserve0, pool.token0?.decimals || 18)) * price0;
      const value1 = parseFloat(formatUnits(pool.reserve1, pool.token1?.decimals || 18)) * price1;
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
        const price0 = prices[pool.token0Symbol] || 0;
        const price1 = prices[pool.token1Symbol] || 0;
        const value0 = parseFloat(formatUnits(pool.reserve0, pool.token0?.decimals || 18)) * price0;
        const value1 = parseFloat(formatUnits(pool.reserve1, pool.token1?.decimals || 18)) * price1;
        const tvl = value0 + value1;
        const reserve0F = parseFloat(formatUnits(pool.reserve0, pool.token0?.decimals || 18));
        const reserve1F = parseFloat(formatUnits(pool.reserve1, pool.token1?.decimals || 18));
        const volume = volStats.perPool[pool.pairAddress] || 0;
        return { ...pool, tvl, reserve0F, reserve1F, volume };
      })
      .sort((a, b) => b.tvl - a.tvl);
  }, [pools, prices, volStats]);

  // Token analytics: aggregate liquidity per token
  const tokenAnalytics = useMemo(() => {
    const tokenMap: Record<string, { symbol: string; logo: string; totalLiquidity: number; poolCount: number; price: number }> = {};
    
    pools.forEach(pool => {
      const price0 = prices[pool.token0Symbol] || 0;
      const price1 = prices[pool.token1Symbol] || 0;
      const val0 = parseFloat(formatUnits(pool.reserve0, pool.token0?.decimals || 18)) * price0;
      const val1 = parseFloat(formatUnits(pool.reserve1, pool.token1?.decimals || 18)) * price1;
      
      if (!tokenMap[pool.token0Symbol]) {
        tokenMap[pool.token0Symbol] = { symbol: pool.token0Symbol, logo: pool.token0?.logoURI || '/tokens/opn.jpg', totalLiquidity: 0, poolCount: 0, price: price0 };
      }
      tokenMap[pool.token0Symbol].totalLiquidity += val0;
      if (pool.reserve0 > 0n) tokenMap[pool.token0Symbol].poolCount++;

      if (!tokenMap[pool.token1Symbol]) {
        tokenMap[pool.token1Symbol] = { symbol: pool.token1Symbol, logo: pool.token1?.logoURI || '/tokens/opn.jpg', totalLiquidity: 0, poolCount: 0, price: price1 };
      }
      tokenMap[pool.token1Symbol].totalLiquidity += val1;
      if (pool.reserve1 > 0n) tokenMap[pool.token1Symbol].poolCount++;
    });

    // Add tokens not yet in pools
    TOKEN_LIST.forEach(t => {
      const sym = t.symbol;
      if (!tokenMap[sym]) {
        tokenMap[sym] = { symbol: sym, logo: t.logoURI, totalLiquidity: 0, poolCount: 0, price: prices[sym] || 0 };
      }
    });

    return Object.values(tokenMap).sort((a, b) => b.totalLiquidity - a.totalLiquidity);
  }, [pools, prices]);

  const chartPools = topPools.filter(p => p.tvl > 0).slice(0, 8);
  const maxTVL = Math.max(...chartPools.map(p => p.tvl), 1);

  const stats = [
    { icon: DollarSign, label: 'Total Value Locked', value: totalTVL, prefix: '$', isOnChain: true },
    { icon: ArrowRightLeft, label: 'Volume (recent)', value: volStats.totalVolume, prefix: '$', isOnChain: true },
    { icon: Zap, label: 'Swaps (recent)', value: volStats.swapCount, isOnChain: true },
    { icon: Users, label: 'Unique Traders', value: volStats.uniqueTraders, isOnChain: true },
    { icon: Layers, label: 'Total Pools', value: pairCount, isOnChain: true },
    { icon: Activity, label: 'Active Pools', value: activePools, isOnChain: true },
    { icon: Coins, label: 'Listed Tokens', value: TOKEN_LIST.length, isOnChain: true },
    { icon: Percent, label: 'Est. Fees Earned', value: volStats.estimatedFees, prefix: '$', isOnChain: true },
  ];

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 pb-24 lg:pb-8 relative">

    <SEO title="Analytics — QUANTAX" description="On-chain analytics for QUANTAX: total value locked, trading volume, top pools and tokens on QMS Testnet." path="/analytics" />
      <Spotlight className="hidden md:block" />
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="ember-pill inline-flex items-center gap-2 mb-4"
          >
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-[10px] md:text-xs font-semibold tracking-[0.18em] uppercase">Protocol Analytics</span>
          </motion.div>
          <h1 className="font-display text-4xl md:text-5xl font-bold gradient-text mb-2 tracking-tight">Analytics</h1>
          <p className="text-sm md:text-base text-muted-foreground">Real-time on-chain protocol statistics from QMS Testnet</p>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {isLoading ? (
            [...Array(8)].map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            stats.map((s: any, i) => (
              <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} prefix={s.prefix} suffix={s.suffix} isOnChain={s.isOnChain} delay={i * 0.06} />
            ))
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-muted/50 border border-border/50">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all flex-1 justify-center",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
          <Button variant="ghost" size="sm" aria-label="Refresh analytics data" onClick={() => { refetch(); refetchVol(); }} disabled={isLoading || volLoading} className="ml-1 shrink-0">
            <RefreshCw className={cn("w-3.5 h-3.5", (isLoading || volLoading) && "animate-spin")} />
          </Button>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-4">
              <PriceHistoryChart pools={pools} logs={swapLogs} latestBlock={latestBlock} isLoading={volLoading} />
              <div className="grid md:grid-cols-2 gap-4">
                {/* TVL Bar Chart */}
                <div className="glass-card p-4 md:p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm md:text-base font-semibold">Pool TVL Distribution</h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/20 text-success">Live</span>
                  </div>
                  {chartPools.length > 0 ? (
                    <>
                      <div className="h-40 md:h-48 flex items-end gap-1.5">
                        {chartPools.map((pool, i) => {
                          const pct = maxTVL > 0 ? (pool.tvl / maxTVL) * 100 : 0;
                          return (
                            <motion.div
                              key={pool.pairAddress}
                              initial={{ height: 0 }}
                              animate={{ height: `${Math.max(pct, 5)}%` }}
                              transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }}
                              className="flex-1 bg-gradient-to-t from-primary to-secondary rounded-t-lg relative group cursor-pointer min-w-0"
                            >
                              <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-popover border border-border px-2 py-1 rounded text-[10px] whitespace-nowrap z-10 pointer-events-none">
                                {pool.token0Symbol}/{pool.token1Symbol}: ${pool.tvl.toFixed(2)}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-3 text-[8px] md:text-[10px] text-muted-foreground overflow-hidden">
                        {chartPools.map(p => (
                          <span key={p.pairAddress} className="truncate px-0.5 text-center flex-1 min-w-0">
                            {p.token0Symbol}/{p.token1Symbol}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                      No active pools with liquidity
                    </div>
                  )}
                </div>

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
                          <TokenIcon src={pool.token0?.logoURI} symbol={pool.token0Symbol} size={20} fallbackSrc="/tokens/opn.jpg" className="border border-background" />
                          <TokenIcon src={pool.token1?.logoURI} symbol={pool.token1Symbol} size={20} fallbackSrc="/tokens/opn.jpg" className="border border-background" />
                        </div>
                        <span className="text-xs font-medium flex-1">{pool.token0Symbol}/{pool.token1Symbol}</span>
                        <span className="text-xs font-bold text-success">${pool.tvl.toFixed(2)}</span>
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
                    {TOKEN_LIST.map((token, i) => (
                      <motion.div
                        key={token.symbol}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 + i * 0.05 }}
                        className="flex flex-col items-center p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <TokenIcon src={token.logoURI} symbol={token.symbol} size={32} fallbackSrc="/tokens/opn.jpg" className="border border-border mb-2" />
                        <span className="text-xs font-bold">{token.symbol}</span>
                        <span className="text-[10px] text-muted-foreground">
                          ${(prices[token.symbol] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm md:text-base font-semibold">All Pools</h2>
                  <span className="text-xs text-muted-foreground">{pools.length} pools on-chain</span>
                </div>
                <div className="overflow-x-auto -mx-4 md:mx-0">
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
                      ) : topPools.length > 0 ? (
                        topPools.map((pool, i) => {
                          const hasLiq = pool.reserve0 > 0n && pool.reserve1 > 0n;
                          return (
                            <tr key={pool.pairAddress} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                              <td className="py-2.5 px-3 text-xs">{i + 1}</td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex -space-x-1 shrink-0">
                                    <TokenIcon src={pool.token0?.logoURI} symbol={pool.token0Symbol} size={20} fallbackSrc="/tokens/opn.jpg" className="border border-background" />
                                    <TokenIcon src={pool.token1?.logoURI} symbol={pool.token1Symbol} size={20} fallbackSrc="/tokens/opn.jpg" className="border border-background" />
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
                                {pool.tvl > 0 ? `$${pool.tvl.toFixed(2)}` : '-'}
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
                        <tr><td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">No pools found on-chain</td></tr>
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
                      key={token.symbol}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <TokenIcon src={token.logo} symbol={token.symbol} size={36} fallbackSrc="/tokens/opn.jpg" className="border border-border shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{token.symbol}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {token.poolCount} pool{token.poolCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          ${token.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: token.price < 1 ? 4 : 2 })}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          TVL: ${token.totalLiquidity.toFixed(2)}
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
                      Live on-chain Swap events across all pools
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/20 text-success shrink-0">
                    {swapLogs.length} swaps
                  </span>
                </div>

                {volLoading && swapLogs.length === 0 ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <TableRowSkeleton key={i} columns={5} />)}
                  </div>
                ) : swapLogs.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground text-sm">
                    No recent swap activity detected on-chain
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 md:mx-0">
                    <table className="w-full min-w-[560px]">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Pool</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Swap</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Value</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Trader</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Tx</th>
                        </tr>
                      </thead>
                      <tbody>
                        {swapLogs.slice(0, 50).map((log, i) => (
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
                              {log.volumeUSD > 0 ? `$${log.volumeUSD.toFixed(2)}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right hidden sm:table-cell">
                              <a
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
