import { SEO } from '@/components/seo/SEO';
import { motion } from 'framer-motion';
import { Spotlight } from '@/components/ui/magic/Spotlight';
import { Meteors } from '@/components/ui/magic/Meteors';
import { GlowingStarsBackground } from '@/components/ui/aceternity/GlowingStars';
import { ParticleField } from '@/components/ui/premium/ParticleField';
import { GlowOrb } from '@/components/ui/premium/GlowOrb';
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { PriceTicker } from '@/components/home/PriceTicker';
import { CTASection } from '@/components/home/CTASection';

export default function Index() {
  return (
    <div className="relative min-h-screen overflow-hidden">
    <SEO title="QUANTAX — Decentralized Exchange on QMS Testnet" description="QUANTAX is a UniswapV2-style AMM on QMS Testnet (Chain 19480). Swap tokens, provide liquidity, and earn trading fees on-chain." path="/" />
      {/* Premium Background Effects - seamless, no boundaries */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <Spotlight className="hidden md:block" />
        <GlowingStarsBackground starCount={30} className="opacity-15" />
        <ParticleField particleCount={20} colorScheme="dragon" className="opacity-15" />
        <Meteors number={10} className="opacity-20" />
        <GlowOrb color="primary" size="xl" className="top-20 -left-40 opacity-25" />
        <GlowOrb color="accent" size="lg" className="bottom-40 -right-20 opacity-20" />
        <GlowOrb color="secondary" size="md" className="top-1/2 left-1/4 opacity-10" />
      </div>

      {/* Content flows seamlessly */}
      <div className="relative z-10">
        {/* Price Ticker */}
        <PriceTicker />

        {/* Hero with 3D Token Globe */}
        <HeroSection />

        {/* Features */}
        <FeaturesSection />

        {/* CTA */}
        <CTASection />
      </div>
    </div>
  );
}
