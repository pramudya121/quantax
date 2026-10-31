import { useMemo, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Flame, ArrowRight } from 'lucide-react';
import quantaxLogo from '@/assets/quantax-logo.jpg.asset.json';
import { Link } from 'react-router-dom';
import { ShimmerButton } from '@/components/ui/magic/ShimmerButton';
import { AnimatedGradientText } from '@/components/ui/magic/AnimatedGradientText';
import { TextGenerateEffect } from '@/components/ui/aceternity/TextGenerateEffect';
import { NumberTicker } from '@/components/ui/magic/NumberTicker';
import { BorderBeam } from '@/components/ui/magic/BorderBeam';
// Lazy-load the 3D globe — ships ~780KB of three.js/drei separately, off the critical path.
const TokenGlobe3D = lazy(() =>
  import('@/components/home/TokenGlobe3D').then(m => ({ default: m.TokenGlobe3D }))
);
import { useAllPairsLength } from '@/hooks/useContract';
import { useLiquidityPools } from '@/hooks/useLiquidityPools';
import { useTokenPrices } from '@/hooks/usePrices';
import { formatUnits } from 'viem';

export function HeroSection() {
  const { data: pairsCount } = useAllPairsLength();
  const { pools } = useLiquidityPools();
  const { prices } = useTokenPrices();

  // Calculate real TVL from on-chain data
  const totalTVL = useMemo(() => {
    return pools.reduce((acc, pool) => {
      const price0 = prices[pool.token0Symbol] || 0;
      const price1 = prices[pool.token1Symbol] || 0;
      const value0 = parseFloat(formatUnits(pool.reserve0, pool.token0?.decimals || 18)) * price0;
      const value1 = parseFloat(formatUnits(pool.reserve1, pool.token1?.decimals || 18)) * price1;
      return acc + value0 + value1;
    }, 0);
  }, [pools, prices]);

  const activePools = useMemo(() => {
    return pools.filter(p => p.reserve0 > 0n && p.reserve1 > 0n).length;
  }, [pools]);

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Ambient red glow behind text (left) */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-gradient-radial from-primary/15 via-primary/5 to-transparent pointer-events-none blur-2xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* ── LEFT: Text + CTA */}
          <div className="text-left max-w-xl">
            {/* Logo + brand */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3 mb-6"
            >
              <img
                src={quantaxLogo.url}
                alt="QuantaX Logo"
                className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-[0_0_30px_hsl(var(--primary)/0.55)]"
              />
              <div className="leading-tight">
                <div className="font-display text-2xl sm:text-3xl font-black tracking-tight">
                  QuantaX<span className="text-primary">DEX</span>
                </div>
                <div className="text-[10px] sm:text-xs tracking-[0.25em] text-muted-foreground uppercase">
                  QMS Testnet
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/70 backdrop-blur border border-primary/30 text-primary text-xs sm:text-sm mb-6"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Live on QMS Testnet</span>
              <span className="text-muted-foreground">· Chain 19480</span>
            </motion.div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black mb-5 tracking-tight leading-[1.05]">
              Trade the universe of{' '}
              <AnimatedGradientText className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black">
                on-chain
              </AnimatedGradientText>{' '}
              tokens.
              <span className="sr-only"> — QuantaX, Decentralized Exchange on QMS Testnet</span>
            </h1>

            <TextGenerateEffect
              words="QuantaX is a fully on-chain AMM built on QMS. Swap, provide liquidity, and earn fees with transparent routing, real-time pool analytics, and a sleek pitch-black UI."
              className="text-base md:text-lg text-muted-foreground font-normal mb-7 max-w-lg"
            />

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap items-center gap-3 mb-8"
            >
              <Link to="/swap">
                <ShimmerButton>
                  <Flame className="w-5 h-5 mr-2" />
                  Launch Swap
                  <ArrowRight className="w-4 h-4 ml-2" />
                </ShimmerButton>
              </Link>

              <Link
                to="/liquidity"
                className="group inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-background/60 backdrop-blur hover:border-primary/50 transition-all font-medium"
              >
                <Flame className="w-4 h-4 text-primary" />
                Provide Liquidity
              </Link>
            </motion.div>

            {/* Stats - Real On-Chain Data */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-lg">
              {[
                { value: Number(pairsCount || 0), label: 'TOTAL POOLS', prefix: '', color: 'text-primary' },
                { value: totalTVL, label: 'ON-CHAIN TVL', prefix: '$', color: 'text-primary' },
                { value: activePools, label: 'ACTIVE POOLS', prefix: '', color: 'text-primary' },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + idx * 0.08 }}
                  className="relative bg-card/60 backdrop-blur-sm border border-border/60 rounded-xl p-3 overflow-hidden"
                >
                  <BorderBeam size={60} duration={10} delay={idx} />
                  <p className="text-[10px] tracking-[0.18em] text-muted-foreground mb-1">{stat.label}</p>
                  <p className={`text-lg sm:text-xl md:text-2xl font-bold ${stat.color}`}>
                    {stat.prefix}
                    <NumberTicker value={stat.value} decimalPlaces={stat.prefix === '$' ? 2 : 0} />
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: 3D Token Globe */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative h-[420px] sm:h-[520px] lg:h-[640px] w-full overflow-visible"
            style={{ background: 'transparent' }}
          >
            <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><div className="w-12 h-12 rounded-full border-2 border-primary/40 border-t-primary animate-spin" /></div>}>
              <TokenGlobe3D className="w-full h-full" />
            </Suspense>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
