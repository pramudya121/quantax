import { SEO } from '@/components/seo/SEO';
import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatUnits } from 'viem';
import { ArrowLeft, ExternalLink, Plus, ArrowLeftRight, Droplets, TrendingUp, Loader2, Layers } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spotlight } from '@/components/ui/magic/Spotlight';
import { GlowOrb } from '@/components/ui/premium/GlowOrb';
import { SwapPriceChart } from '@/components/swap/SwapPriceChart';
import { PriceHistoryChart } from '@/components/analytics/PriceHistoryChart';
import { TokenIcon } from '@/components/ui/TokenIcon';
import { useLiquidityPools } from '@/hooks/useLiquidityPools';
import { useTokenPrices, usePoolTVL } from '@/hooks/usePrices';
import { useSwapVolume } from '@/hooks/useSwapVolume';

export default function PairDetail() {
  const { address } = useParams<{ address: string }>();
  const { pools, isLoading } = useLiquidityPools();
  const { prices } = useTokenPrices();

  const pool = useMemo(
    () => pools.find((p) => p.pairAddress.toLowerCase() === (address ?? '').toLowerCase()),
    [pools, address]
  );

  const dec0 = pool?.token0?.decimals ?? 18;
  const dec1 = pool?.token1?.decimals ?? 18;
  const reserve0 = pool ? parseFloat(formatUnits(pool.reserve0, dec0)) : 0;
  const reserve1 = pool ? parseFloat(formatUnits(pool.reserve1, dec1)) : 0;

  const tvl = usePoolTVL(
    pool?.token0Symbol ?? '',
    pool?.token1Symbol ?? '',
    pool?.reserve0 ?? 0n,
    pool?.reserve1 ?? 0n,
    dec0,
    dec1,
    prices
  );

  const singlePool = useMemo(() => (pool ? [pool] : []), [pool]);
  const { logs: swapLogs, latestBlock, isLoading: volLoading } = useSwapVolume(singlePool, prices);

  const price0in1 = reserve0 > 0 ? reserve1 / reserve0 : 0;
  const price1in0 = reserve1 > 0 ? reserve0 / reserve1 : 0;

  const pairPath = `/pool/${address ?? ''}`;
  const pairLabel = pool ? `${pool.token0Symbol}/${pool.token1Symbol}` : 'Liquidity';
  const seoTitle = pool
    ? `${pairLabel} Pool — DRAGONDEX on OPN Testnet`
    : 'Pool Details — DRAGONDEX';
  const seoDescription = pool
    ? `View reserves, price chart, TVL, and recent swaps for the ${pairLabel} liquidity pool on DRAGONDEX (OPN Testnet).`
    : 'Detailed view of a DRAGONDEX liquidity pool with reserves, price chart, and recent swaps.';

  if (isLoading) {
    return (
      <div className="container mx-auto py-20 flex justify-center">
        <SEO title={seoTitle} description={seoDescription} path={pairPath} />
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <h1 className="text-2xl font-bold mb-2">Pair Not Found</h1>
        <p className="text-muted-foreground mb-6 font-mono text-xs break-all">{address}</p>
        <Link to="/pools">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Pools
          </Button>
        </Link>
      </div>
    );
  }

  const logo0 = pool.token0?.logoURI || '/tokens/opn.jpg';
  const logo1 = pool.token1?.logoURI || '/tokens/opn.jpg';

  return (
    <div className="relative min-h-[calc(100vh-80px)] pb-24 lg:pb-12 overflow-hidden">
      <Spotlight className="hidden md:block" />
      <GlowOrb color="primary" size="xl" className="-top-20 -left-40 opacity-20" />
      <GlowOrb color="accent" size="lg" className="bottom-10 -right-20 opacity-15" />

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-6xl">
        <Link to="/pools" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> All Pools
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-4 mb-6"
        >
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              <TokenIcon src={logo0} symbol={pool.token0Symbol} size={48}
                fallbackSrc="/tokens/opn.jpg"
                className="border-2 border-background ring-1 ring-primary/30" />
              <TokenIcon src={logo1} symbol={pool.token1Symbol} size={48}
                fallbackSrc="/tokens/opn.jpg"
                className="border-2 border-background ring-1 ring-primary/30" />
            </div>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold gradient-text">
                {pool.token0Symbol}/{pool.token1Symbol}
              </h1>
              <p className="text-xs text-muted-foreground font-mono break-all">{pool.pairAddress}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a href={`https://testnet.iopn.tech/address/${pool.pairAddress}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Explorer
              </Button>
            </a>
            <Link to="/swap">
              <Button variant="outline" size="sm">
                <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" /> Trade
              </Button>
            </Link>
            <Link to="/liquidity">
              <Button size="sm" className="bg-gradient-to-r from-primary to-accent">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Liquidity
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'TVL', value: `$${tvl.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: 'text-primary' },
            { label: `${pool.token0Symbol} Reserve`, value: reserve0.toLocaleString(undefined, { maximumFractionDigits: 4 }), color: '' },
            { label: `${pool.token1Symbol} Reserve`, value: reserve1.toLocaleString(undefined, { maximumFractionDigits: 4 }), color: '' },
            { label: 'LP Supply', value: parseFloat(formatUnits(pool.totalSupply, 18)).toLocaleString(undefined, { maximumFractionDigits: 4 }), color: 'text-accent' },
          ].map((s) => (
            <Card key={s.label} className="p-4 bg-card/60 backdrop-blur-xl border-border/40">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className={`font-mono font-bold text-lg mt-1 ${s.color}`}>{s.value}</div>
            </Card>
          ))}
        </div>

        {/* Chart + Pricing */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2">
            <SwapPriceChart
              fromSymbol={pool.token0Symbol}
              toSymbol={pool.token1Symbol}
              currentPrice={price0in1}
            />
          </div>
          <Card className="p-5 bg-card/60 backdrop-blur-xl border-primary/20 space-y-4">
            <h3 className="font-display font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Current Price
            </h3>
            <div className="space-y-3">
              <div className="rounded-lg p-3 bg-background/40 border border-border/40">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  1 {pool.token0Symbol} =
                </div>
                <div className="font-mono font-bold text-base mt-1">
                  {price0in1.toLocaleString(undefined, { maximumFractionDigits: 8 })} {pool.token1Symbol}
                </div>
              </div>
              <div className="rounded-lg p-3 bg-background/40 border border-border/40">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  1 {pool.token1Symbol} =
                </div>
                <div className="font-mono font-bold text-base mt-1">
                  {price1in0.toLocaleString(undefined, { maximumFractionDigits: 8 })} {pool.token0Symbol}
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                Fee: <span className="text-foreground font-medium">0.30%</span> per swap
              </div>
            </div>
          </Card>
        </div>

        {/* Tokens info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { sym: pool.token0Symbol, addr: pool.token0Address, logo: logo0, reserve: reserve0 },
            { sym: pool.token1Symbol, addr: pool.token1Address, logo: logo1, reserve: reserve1 },
          ].map((t) => (
            <Card key={t.addr} className="p-5 bg-card/60 backdrop-blur-xl border-border/40">
              <div className="flex items-center gap-3 mb-3">
                <TokenIcon src={t.logo} symbol={t.sym} size={40}
                  fallbackSrc="/tokens/opn.jpg"
                  className="ring-1 ring-border/50" />
                <div className="flex-1">
                  <div className="font-display font-bold">{t.sym}</div>
                  <a
                    href={`https://testnet.iopn.tech/address/${t.addr}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-muted-foreground hover:text-primary font-mono break-all inline-flex items-center gap-1"
                  >
                    {t.addr.slice(0, 10)}...{t.addr.slice(-8)}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Droplets className="w-3 h-3" /> Reserve
                </span>
                <span className="font-mono font-semibold">
                  {t.reserve.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
