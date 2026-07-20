import { Settings2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  slippage: number;
  setSlippage: (v: number) => void;
  deadline: number;
  setDeadline: (v: number) => void;
}

const PRESETS = [0.1, 0.5, 1.0];

export function SlippageDeadlineControls({ slippage, setSlippage, deadline, setDeadline }: Props) {
  const [open, setOpen] = useState(false);

  const clampSlip = (n: number) => Math.min(Math.max(n, 0.01), 50);
  const clampDl = (n: number) => Math.min(Math.max(Math.floor(n), 1), 60);

  return (
    <div className="rounded-xl bg-muted/30 border border-border/40">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Settings2 className="w-3.5 h-3.5" />
          Slippage & Deadline
        </span>
        <span className="text-foreground font-medium">
          {slippage}% · {deadline}m
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border/40">
          <div>
            <div className="text-[11px] text-muted-foreground mb-1.5">Slippage tolerance</div>
            <div className="flex items-center gap-1.5">
              {PRESETS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSlippage(p)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs border transition-colors',
                    slippage === p
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border/40 hover:bg-muted'
                  )}
                >
                  {p}%
                </button>
              ))}
              <div className="relative flex-1">
                <input
                  type="number"
                  min={0.01}
                  max={50}
                  step={0.1}
                  value={slippage}
                  onChange={e => setSlippage(clampSlip(parseFloat(e.target.value) || 0))}
                  className="w-full px-2 py-1 text-xs rounded-md bg-background border border-border/40 pr-6"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
              </div>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground mb-1.5">Transaction deadline</div>
            <div className="relative w-32">
              <input
                type="number"
                min={1}
                max={60}
                step={1}
                value={deadline}
                onChange={e => setDeadline(clampDl(parseFloat(e.target.value) || 1))}
                className="w-full px-2 py-1 text-xs rounded-md bg-background border border-border/40 pr-10"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">min</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
