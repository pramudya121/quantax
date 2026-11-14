 import { motion } from 'framer-motion';
 import { Flame, TrendingUp, Shield, Zap, Users, BarChart3 } from 'lucide-react';
 import { HoverEffect } from '@/components/ui/aceternity/HoverEffect';
 
 const features = [
   { 
     icon: <Zap className="w-6 h-6" />, 
     title: 'Instant Swaps', 
     description: 'Lightning-fast trades powered by automated market makers on QMS Testnet' 
   },
   { 
     icon: <Shield className="w-6 h-6" />, 
title: 'Wallet Safeguards',
     description: 'Exact approvals and input validation; smart-contract risk remains'
   },
   { 
     icon: <TrendingUp className="w-6 h-6" />, 
     title: 'Best Rates', 
     description: 'Optimal pricing through our advanced AMM algorithm with minimal slippage' 
   },
   { 
     icon: <Users className="w-6 h-6" />, 
     title: 'Earn Rewards', 
     description: 'Provide liquidity and receive any swap fees configured by the deployed contracts'
   },
   { 
     icon: <BarChart3 className="w-6 h-6" />, 
     title: 'Real Analytics', 
     description: 'Track your positions, volume, and returns with our comprehensive dashboard' 
   },
   { 
     icon: <Flame className="w-6 h-6" />, 
     title: 'Dragon Power', 
     description: 'Unleash the power of decentralized finance on QMS Testnet' 
   },
 ];
 
 export function FeaturesSection() {
   return (
     <section className="py-20">
       <motion.div 
         initial={{ opacity: 0 }} 
         whileInView={{ opacity: 1 }} 
         viewport={{ once: true }}
         className="container mx-auto px-4"
       >
         <div className="text-center mb-12">
           <motion.span
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className="inline-block px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-sm font-medium mb-4"
           >
             Why Choose Us
           </motion.span>
           <motion.h2
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ delay: 0.1 }}
             className="text-3xl md:text-4xl font-bold mb-4"
           >
             Why QUANTAX?
           </motion.h2>
           <motion.p
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ delay: 0.2 }}
             className="text-muted-foreground max-w-xl mx-auto"
           >
             Built for speed, security, and simplicity. Experience DeFi the way it should be.
           </motion.p>
         </div>
         
         <div className="max-w-6xl mx-auto">
           <HoverEffect items={features} />
         </div>
       </motion.div>
     </section>
   );
 }
