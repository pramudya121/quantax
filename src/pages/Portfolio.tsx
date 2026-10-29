import { SEO } from '@/components/seo/SEO';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, Coins, ExternalLink, RefreshCw, PieChart, Activity, Zap, Crown, Shield, Droplets, ArrowUpRight, ArrowDownRight, Filter, Send, Download } from 'lucide-react';
import { useAccount, useBalance, useReadContracts, useChainId } from 'wagmi';
import { formatEther, formatUnits } from 'viem';
import { useTokenBalance } from '@/hooks/useContract';
import { getTokenList, getContracts } from '@/config/contracts';
import { useLiquidityPools } from '@/hooks/useLiquidityPools';
import { useTokenPrices } from '@/hooks/usePrices';
import { BorderBeam } from '@/components/ui/magic/BorderBeam';
import { NumberTicker } from '@/components/ui/magic/NumberTicker';
import { Spotlight } from '@/components/ui/magic/Spotlight';
import { BackgroundGradient } from '@/components/ui/aceternity/BackgroundGradient';
import { GlowingStarsCard } from '@/components/ui/aceternity/GlowingStars';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { AssetCardSkeleton, StatCardSkeleton } from '@/components/ui/loading/Skeleton';
import { TransactionHistory, useTransactionHistory, Transaction } from '@/components/history/TransactionHistory';
import { SendTokenModal } from '@/components/portfolio/SendTokenModal';
import { PortfolioAllocationChart } from '@/components/portfolio/AllocationChart';
import { PAIR_ABI, ERC20_ABI } from '@/config/abis';
import { cn } from '@/lib/utils';

type PortfolioTab = 'overview' | 'assets' | 'lp' | 'history';

const TABS: { id: PortfolioTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <PieChart className="w-4 h-4" /> },
  { id: 'assets', label: 'Assets', icon: <Coins className="w-4 h-4" /> },
  { id: 'lp', label: 'LP Positions', icon: <Droplets className="w-4 h-4" /> },
  { id: 'history', label: 'History', icon: <Activity className="w-4 h-4" /> },
];

export default function Portfolio() {
  const { address, isConnected } = useAccount();
  const { data: opnBalance, refetch: refetchOpn, isLoading } = useBalance({ address });
  const chainId = useChainId();
  const C = getContracts(chainId);
  const chainTokens = useMemo(() => getTokenList(chainId), [chainId]);
  const erc20Tokens = useMemo(() => chainTokens.filter((t) => !t.isNative), [chainTokens]);
  const nativeToken = chainTokens.find((t) => t.isNative);

  // Batch every ERC20 balance for the active network in a single multicall.
  const tokenBalances = useReadContracts({
    contracts: erc20Tokens.map((t) => ({
      address: t.address as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: address ? [address] : undefined,
    })),
    query: { enabled: !!address && erc20Tokens.length > 0, refetchInterval: 30_000 },
  });

  const { transactions } = useTransactionHistory();
  const { pools, isLoading: poolsLoading } = useLiquidityPools();
  const { prices } = useTokenPrices();

  const [activeTab, setActiveTab] = useState<PortfolioTab>('overview');
  const [txFilter, setTxFilter] = useState<'all' | 'swap' | 'liquidity'>('all');
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendInitialSymbol, setSendInitialSymbol] = useState<string | undefined>();
  const openSendFor = (symbol?: string) => { setSendInitialSymbol(symbol); setShowSendModal(true); };

  const lpBalanceResults = useReadContracts({
    contracts: pools.map(pool => ({
      address: pool.pairAddress,
      abi: PAIR_ABI,
      functionName: 'balanceOf',
      args: address ? [address] : undefined,
    })),
    query: { enabled: pools.length > 0 && !!address },
  });

  const lpPositions = useMemo(() => {
    if (!lpBalanceResults.data || pools.length === 0) return [];
    return pools
      .map((pool, i) => {
        const balance = lpBalanceResults.data?.[i]?.result as bigint | undefined;
        if (!balance || balance === 0n) return null;
        const balanceFormatted = parseFloat(formatUnits(balance, 18));
        const totalSupply = parseFloat(formatUnits(pool.totalSupply || 1n, 18));
        const share = totalSupply > 0 ? (balanceFormatted / totalSupply) * 100 : 0;
        const res0 = parseFloat(formatUnits(pool.reserve0, pool.token0?.decimals || 18));
        const res1 = parseFloat(formatUnits(pool.reserve1, pool.token1?.decimals || 18));
        const myToken0 = res0 * (share / 100);
        const myToken1 = res1 * (share / 100);
        const price0 = prices[pool.token0Symbol] || 0;
        const price1 = prices[pool.token1Symbol] || 0;
        const value = (myToken0 * price0) + (myToken1 * price1);
        return { ...pool, lpBalance: balance, lpBalanceFormatted: balanceFormatted, share, myToken0, myToken1, value };
      })
      .filter(Boolean) as any[];
  }, [pools, lpBalanceResults.data, prices]);

  const tokens = useMemo(() => {
    const list = [] as {
      symbol: string; name: string; balance: string; logo: string; price: number;
      address: string; isNative: boolean; decimals: number;
    }[];
    if (nativeToken) {
      list.push({
        symbol: nativeToken.symbol,
        name: nativeToken.name,
        balance: opnBalance ? formatEther(opnBalance.value) : '0',
        logo: nativeToken.logoURI,
        price: prices[nativeToken.symbol] || 1,
        address: 'native',
        isNative: true,
        decimals: nativeToken.decimals,
      });
    }
    erc20Tokens.forEach((t, i) => {
      const raw = tokenBalances.data?.[i]?.result as bigint | undefined;
      list.push({
        symbol: t.symbol,
        name: t.name,
        balance: raw ? formatUnits(raw, t.decimals) : '0',
        logo: t.logoURI,
        price: prices[t.symbol] || 0,
        address: t.address,
        isNative: false,
        decimals: t.decimals,
      });
    });
    return list;
  }, [nativeToken, erc20Tokens, tokenBalances.data, opnBalance, prices]);

  const totalTokenValue = tokens.reduce((acc, token) => acc + parseFloat(token.balance) * token.price, 0);
  const totalLPValue = lpPositions.reduce((acc: number, lp: any) => acc + lp.value, 0);
  const totalValue = totalTokenValue + totalLPValue;
  const tokensWithBalance = tokens.filter(t => parseFloat(t.balance) > 0.0001);

  const allocationData = useMemo(() => {
    const items = tokens.map(t => ({
      name: t.symbol, value: parseFloat(t.balance) * t.price, color: '', percentage: 0,
    }));
    lpPositions.forEach((lp: any) => {
      items.push({ name: `${lp.token0Symbol}/${lp.token1Symbol} LP`, value: lp.value, color: '', percentage: 0 });
    });
    const total = items.reduce((s, i) => s + i.value, 0);
    return items.filter(i => i.value > 0).map(i => ({ ...i, percentage: total > 0 ? (i.value / total) * 100 : 0 }));
  }, [tokens, lpPositions]);

  const filteredTransactions = useMemo(() => {
    if (txFilter === 'all') return transactions;
    if (txFilter === 'swap') return transactions.filter((t: Transaction) => t.type === 'swap');
    return transactions.filter((t: Transaction) => t.type === 'add_liquidity' || t.type === 'remove_liquidity');
  }, [transactions, txFilter]);

  const swapStats = useMemo(() => {
    const swaps = transactions.filter((t: Transaction) => t.type === 'swap' && t.status === 'success');
    return { totalSwaps: swaps.length };
  }, [transactions]);

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
      <SEO title="Portfolio — QUANTAX" description="Track your token holdings, LP positions, allocation chart, and transaction history on QUANTAX." path="/portfolio" />
        <Spotlight className="hidden md:block" />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <GlowingStarsCard className="bg-card border border-border">
            <div className="text-center p-6 md:p-8">
              <div className="p-4 rounded-full bg-primary/10 w-16 h-16 md:w-20 md:h-20 flex items-center justify-center mx-auto mb-4 md:mb-6">
                <Wallet className="w-8 h-8 md:w-10 md:h-10 text-primary" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold mb-2">Connect Your Wallet</h2>
              <p className="text-sm md:text-base text-muted-foreground mb-6">Connect your wallet to view your portfolio and track your assets</p>
            </div>
          </GlowingStarsCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 pb-24 lg:pb-8 relative min-h-screen">
      <Spotlight className="hidden md:block" />
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="ember-pill inline-flex items-center gap-2 mb-4"
          >
            <Crown className="w-3 h-3 md:w-4 md:h-4 text-primary" />
            <span className="text-[10px] md:text-xs font-semibold tracking-[0.18em] uppercase">On-Chain Portfolio</span>
          </motion.div>
          <h1 className="font-display text-4xl md:text-5xl font-bold gradient-text mb-3 tracking-tight">Your Portfolio</h1>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-4 font-mono">
            <Shield className="w-3 h-3 text-primary" />
            <span>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            <a href={`https://testnet.iopn.tech/address/${address}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Button className="btn-dragon" size="sm" onClick={() => openSendFor()}>
              <Send className="w-4 h-4 mr-2" />
              Send Token
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!transactions.length) return;
                const header = ['hash','type','status','timestamp','from','to','amountFrom','amountTo'];
                const rows = transactions.map((t) => [
                  t.hash,
                  t.type,
                  t.status,
                  new Date(t.timestamp).toISOString(),
                  t.details.fromToken || t.details.tokenA || '',
                  t.details.toToken || t.details.tokenB || '',
                  t.details.fromAmount || t.details.amountA || '',
                  t.details.toAmount || t.details.amountB || '',
                ]);
                const csv = [header, ...rows]
                  .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
                  .join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `dragondex-portfolio-${Date.now()}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              disabled={!transactions.length}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards - Always visible */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {isLoading ? (
            <>
              <div className="col-span-2"><StatCardSkeleton /></div>
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="col-span-2 relative">
                <BackgroundGradient containerClassName="h-full" animate>
                  <div className="glass-card p-4 md:p-5 h-full">
                    <BorderBeam size={100} duration={10} />
                    <div className="flex items-center gap-2 md:gap-3 mb-2">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-secondary">
                        <Coins className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground tracking-[0.18em] uppercase">Total Balance</p>
                        <p className="font-mono-display text-2xl md:text-3xl font-bold">
                          $<NumberTicker value={totalValue} decimalPlaces={2} />
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Coins className="w-3 h-3" /> Tokens: ${totalTokenValue.toFixed(2)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Droplets className="w-3 h-3" /> LP: ${totalLPValue.toFixed(2)}</span>
                    </div>
                  </div>
                </BackgroundGradient>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative">
                <div className="stat-card h-full flex flex-col justify-center">
                  <BorderBeam size={80} duration={10} delay={2} />
                  <div className="flex items-center gap-2 mb-1">
                    <PieChart className="w-4 h-4 text-secondary" />
                    <span className="text-[10px] md:text-xs text-muted-foreground">Assets</span>
                  </div>
                  <p className="text-lg md:text-2xl font-bold">{tokensWithBalance.length}</p>
                  <span className="text-muted-foreground text-[10px] md:text-xs">Active tokens</span>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="relative">
                <div className="stat-card h-full flex flex-col justify-center">
                  <BorderBeam size={80} duration={10} delay={4} />
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="text-[10px] md:text-xs text-muted-foreground">Trades</span>
                  </div>
                  <p className="text-lg md:text-2xl font-bold">{swapStats.totalSwaps}</p>
                  <span className="text-muted-foreground text-[10px] md:text-xs">Total swaps</span>
                </div>
              </motion.div>
            </>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-muted/50 border border-border/50 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
          <Button variant="ghost" size="sm" aria-label="Refresh portfolio balances" onClick={() => refetchOpn()} className="ml-1 shrink-0">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Allocation Chart */}
                <div className="glass-card p-4">
                  <h2 className="text-sm md:text-base font-bold mb-3 flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-secondary" />
                    Allocation
                  </h2>
                  <PortfolioAllocationChart data={allocationData} />
                </div>

                {/* Top Holdings */}
                <div className="glass-card p-4">
                  <h2 className="text-sm md:text-base font-bold mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    Top Holdings
                  </h2>
                  <div className="space-y-2">
                    {tokens
                      .filter(t => parseFloat(t.balance) > 0.0001)
                      .sort((a, b) => (parseFloat(b.balance) * b.price) - (parseFloat(a.balance) * a.price))
                      .slice(0, 5)
                      .map(token => {
                        const balance = parseFloat(token.balance);
                        const value = balance * token.price;
                        return (
                          <div key={token.symbol} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <img src={token.logo} alt={`${token.symbol} token logo`} className="w-8 h-8 rounded-full border border-border" onError={(e) => { (e.target as HTMLImageElement).src = '/tokens/opn.jpg'; }} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{token.symbol}</p>
                              <p className="text-xs text-muted-foreground">{balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                            </div>
                            <p className="font-bold text-sm">${value.toFixed(2)}</p>
                          </div>
                        );
                      })}
                    {tokensWithBalance.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No tokens found</p>
                    )}
                  </div>
                </div>

                {/* Quick LP Summary */}
                <div className="glass-card p-4 md:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm md:text-base font-bold flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-primary" />
                      LP Summary
                    </h2>
                    {lpPositions.length > 0 && (
                      <button onClick={() => setActiveTab('lp')} className="text-xs text-primary hover:underline flex items-center gap-1">
                        View all <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {lpPositions.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {lpPositions.slice(0, 4).map((lp: any) => (
                        <div key={lp.pairAddress} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                          <div className="flex -space-x-1">
                            <img src={lp.token0?.logoURI || '/tokens/opn.jpg'} alt={`${lp.token0Symbol} token logo`} className="w-5 h-5 rounded-full border border-background" onError={(e) => { (e.target as HTMLImageElement).src = '/tokens/opn.jpg'; }} />
                            <img src={lp.token1?.logoURI || '/tokens/opn.jpg'} alt={`${lp.token1Symbol} token logo`} className="w-5 h-5 rounded-full border border-background" onError={(e) => { (e.target as HTMLImageElement).src = '/tokens/opn.jpg'; }} />
                          </div>
                          <span className="text-xs font-medium flex-1">{lp.token0Symbol}/{lp.token1Symbol}</span>
                          <span className="text-xs font-bold text-success">${lp.value.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-3">No active LP positions</p>
                      <Link to="/liquidity"><Button className="btn-dragon" size="sm"><Zap className="w-3 h-3 mr-1" />Add Liquidity</Button></Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'assets' && (
            <motion.div key="assets" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <div className="grid gap-2 md:gap-3">
                {isLoading ? (
                  [...Array(4)].map((_, i) => <AssetCardSkeleton key={i} />)
                ) : (
                  tokens.map((token, i) => {
                    const balance = parseFloat(token.balance);
                    const value = balance * token.price;
                    const hasBalance = balance > 0.0001;
                    const allocation = totalValue > 0 ? (value / totalValue) * 100 : 0;
                    return (
                      <motion.div key={token.symbol} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                        <div className={cn(
                          "glass-card p-3 md:p-4 flex items-center gap-3 md:gap-4 hover:border-primary/50 transition-all group",
                          !hasBalance && "opacity-50"
                        )}>
                          <img src={token.logo} alt={`${token.symbol} token logo`} className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-border" onError={(e) => { (e.target as HTMLImageElement).src = '/tokens/opn.jpg'; }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm md:text-base">{token.symbol}</p>
                              {allocation > 5 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{allocation.toFixed(1)}%</span>
                              )}
                            </div>
                            <p className="text-xs md:text-sm text-muted-foreground truncate">{token.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm md:text-base">{balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                            <p className="text-xs md:text-sm text-muted-foreground">${value.toFixed(2)}</p>
                          </div>
                          <button
                            onClick={() => openSendFor(token.symbol)}
                            disabled={!hasBalance}
                            title={`Send ${token.symbol}`}
                            className={cn(
                              "shrink-0 ml-1 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border",
                              hasBalance
                                ? "bg-gradient-to-r from-primary/15 to-accent/15 border-primary/30 text-primary hover:from-primary/25 hover:to-accent/25 hover:border-primary/50 hover:scale-105"
                                : "bg-muted/30 border-border/40 text-muted-foreground cursor-not-allowed"
                            )}
                          >
                            <Send className="w-3 h-3" />
                            <span className="hidden sm:inline">Send</span>
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'lp' && (
            <motion.div key="lp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {poolsLoading ? (
                <div className="glass-card p-6 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">Loading LP positions...</p>
                </div>
              ) : lpPositions.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {lpPositions.map((lp: any) => (
                    <div key={lp.pairAddress} className="glass-card p-4 hover:border-primary/50 transition-all">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex -space-x-1">
                          <img src={lp.token0?.logoURI || '/tokens/opn.jpg'} alt={`${lp.token0Symbol} token logo`} className="w-7 h-7 rounded-full border border-background" onError={(e) => { (e.target as HTMLImageElement).src = '/tokens/opn.jpg'; }} />
                          <img src={lp.token1?.logoURI || '/tokens/opn.jpg'} alt={`${lp.token1Symbol} token logo`} className="w-7 h-7 rounded-full border border-background" onError={(e) => { (e.target as HTMLImageElement).src = '/tokens/opn.jpg'; }} />
                        </div>
                        <span className="font-medium text-sm">{lp.token0Symbol}/{lp.token1Symbol}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/20 text-success">On-Chain</span>
                        {lp.value > 0 && <span className="ml-auto text-sm font-bold text-success">${lp.value.toFixed(2)}</span>}
                      </div>
                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex justify-between"><span>LP Balance</span><span className="font-medium text-foreground">{lp.lpBalanceFormatted.toFixed(6)}</span></div>
                        <div className="flex justify-between"><span>Pool Share</span><span className="font-medium text-foreground">{lp.share.toFixed(4)}%</span></div>
                        <div className="flex justify-between"><span>{lp.token0Symbol}</span><span className="font-medium text-foreground">{lp.myToken0.toFixed(4)}</span></div>
                        <div className="flex justify-between"><span>{lp.token1Symbol}</span><span className="font-medium text-foreground">{lp.myToken1.toFixed(4)}</span></div>
                      </div>
                      <a href={`https://testnet.iopn.tech/address/${lp.pairAddress}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline mt-2 inline-flex items-center gap-1">
                        View Contract <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <GlowingStarsCard className="bg-card border border-border">
                  <div className="p-6 md:p-8 text-center">
                    <Droplets className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">No active liquidity positions</p>
                    <Link to="/liquidity"><Button className="btn-dragon" size="sm"><Zap className="w-4 h-4 mr-2" />Add Liquidity</Button></Link>
                  </div>
                </GlowingStarsCard>
              )}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Transactions
                </h2>
                <div className="flex gap-1">
                  {(['all', 'swap', 'liquidity'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setTxFilter(f)}
                      className={cn(
                        "px-2.5 py-1 text-xs rounded-lg transition-colors font-medium",
                        txFilter === f ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {f === 'all' ? 'All' : f === 'swap' ? 'Swaps' : 'Liquidity'}
                    </button>
                  ))}
                </div>
              </div>
              <TransactionHistory transactions={filteredTransactions} maxDisplay={20} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Send Token Modal */}
      <SendTokenModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        initialSymbol={sendInitialSymbol}
        tokens={tokens.map(t => ({
          symbol: t.symbol,
          name: t.name,
          balance: t.balance,
          logo: t.logo,
          address: t.address,
          isNative: t.isNative,
        }))}
      />
    </div>
  );
}
