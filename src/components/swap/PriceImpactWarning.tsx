import { AlertTriangle, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PriceImpactWarningProps {
  priceImpact: number | null;
  severity: 'low' | 'medium' | 'high' | 'unknown';
}

export function PriceImpactWarning({ priceImpact, severity }: PriceImpactWarningProps) {
  const isUnknown = priceImpact === null || severity === 'unknown';
  const Icon = isUnknown || severity === 'low' ? Info : AlertTriangle;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-start gap-2 rounded-xl border p-3 text-xs',
        isUnknown && 'border-border bg-muted/40 text-muted-foreground',
        !isUnknown && severity === 'high' && 'border-destructive/30 bg-destructive/10 text-destructive',
        !isUnknown && severity === 'medium' && 'border-warning/30 bg-warning/10 text-warning',
        !isUnknown && severity === 'low' && 'border-border bg-muted/40 text-muted-foreground',
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="flex flex-col gap-1">
        <p className="font-semibold">
          {isUnknown
            ? 'Execution impact unavailable'
            : `${priceImpact.toFixed(2)}% execution delta versus pool mid-price`}
        </p>
        <p className="leading-relaxed opacity-90">
          {isUnknown
            ? 'A reliable reserve baseline is unavailable for this route. The estimate is intentionally omitted; review the quoted output and wallet details before signing.'
            : 'This estimate compares the router quote with the direct pool mid-price and includes the pool fee. Actual execution can change before confirmation.'}
        </p>
      </div>
    </motion.div>
  );
}
