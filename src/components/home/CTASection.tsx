import { motion } from 'framer-motion';
import { Flame, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ShimmerButton } from '@/components/ui/magic/ShimmerButton';
import { MovingBorder } from '@/components/ui/aceternity/MovingBorder';

export function CTASection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <MovingBorder duration={6000} borderRadius="1.5rem">
            <div className="p-8 md:p-12 bg-card/95 rounded-3xl text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
              
              <div className="relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  <Flame className="w-12 h-12 mx-auto mb-4 text-primary" />
                </motion.div>
                
                <h3 className="text-2xl md:text-3xl font-bold mb-4">Ready to breathe fire?</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Join thousands of traders on the most powerful DEX on QMS Testnet
                </p>
                
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Link to="/swap">
                    <ShimmerButton>
                      <Rocket className="w-4 h-4 mr-2" />
                      Launch App
                    </ShimmerButton>
                  </Link>
                  <Link
                    to="/docs"
                    className="px-6 py-3 rounded-xl border border-border hover:border-primary/50 transition-all font-medium"
                  >
                    Read Docs
                  </Link>
                </div>
              </div>
            </div>
          </MovingBorder>
        </motion.div>
      </div>
    </section>
  );
}
