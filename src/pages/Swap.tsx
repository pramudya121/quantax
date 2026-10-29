import { SEO } from '@/components/seo/SEO';
import { motion } from 'framer-motion';
import { SwapCard } from '@/components/swap/SwapCard';

import { Spotlight } from '@/components/ui/magic/Spotlight';
import { GlowingStarsBackground } from '@/components/ui/aceternity/GlowingStars';
import { ParticleField } from '@/components/ui/premium/ParticleField';
import { GlowOrb } from '@/components/ui/premium/GlowOrb';
import { Meteors } from '@/components/ui/magic/Meteors';
import { Flame, Shield, Zap, TrendingUp } from 'lucide-react';

export default function Swap() {
  return (
    <div className="relative min-h-[calc(100vh-80px)] pb-24 lg:pb-0 flex flex-col items-center justify-center overflow-hidden">
    <SEO title="Swap Tokens — QUANTAX on QMS Testnet" description="Instantly swap tokens on QMS Testnet with AMM pricing, multi-hop routing, and real-time price impact." path="/swap" />
      {/* Background Effects */}
      <Spotlight className="hidden md:block" />
      <GlowingStarsBackground starCount={20} className="opacity-10" />
      <ParticleField particleCount={12} colorScheme="dragon" className="opacity-10" />
      <Meteors number={5} className="opacity-15" />
      
      {/* Glow Orbs */}
      <GlowOrb color="primary" size="xl" className="top-10 -left-40 opacity-20" />
      <GlowOrb color="accent" size="lg" className="bottom-20 -right-20 opacity-15" />
      <GlowOrb color="primary" size="md" className="top-1/2 right-10 opacity-10 hidden lg:block" />

      <div className="relative z-10 w-full max-w-lg mx-auto px-3 sm:px-4">
        {/* Compact Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-4 sm:mb-6"
        >
          <div className="ember-pill mb-3">
            <Flame className="w-3.5 h-3.5" />
            <span>DragonSwap</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold gradient-text mb-1.5 tracking-tight">
            Trade Instantly
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
            Swap tokens with the best rates on QMS Testnet
          </p>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-2 sm:gap-3 mt-3"
          >
            {[
              { icon: Shield, text: 'Secure', color: 'text-success' },
              { icon: Zap, text: 'Fast', color: 'text-primary' },
              { icon: TrendingUp, text: 'Best Rate', color: 'text-accent' },
            ].map(({ icon: Icon, text, color }) => (
              <span key={text} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50 text-[10px] sm:text-xs ${color}`}>
                <Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                {text}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* Swap Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5, type: 'spring', stiffness: 100 }}
        >
          <SwapCard />
        </motion.div>

        
      </div>
    </div>
  );
}
