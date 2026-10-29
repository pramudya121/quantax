import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, ChevronDown, Droplets, Coins } from 'lucide-react';
import { formatUnits } from 'viem';
import { TOKEN_LIST, CONTRACTS } from '@/config/contracts';
import type { LiquidityPool } from '@/hooks/useLiquidityPools';
import { cn } from '@/lib/utils';
import { TokenIcon } from '@/components/ui/TokenIcon';

interface Props {
  pools: LiquidityPool[];
  prices: Record<string, number>;
  isLoading?: boolean;
}

const EXPLORER = 'https://testnet.iopn.tech';
// Only show user-facing assets (skip duplicate WQMS entry — it's the bridge).
const FEATURED = ['QTX', 'BNB', 'ETH', 'MON', 'HYPE'];

function TokenDetailRowSkeleton() {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-3 flex items-center gap-3 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-muted/60 shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="h-3 w-24 rounded bg-muted/60" />
        <div className="h-2.5 w-40 rounded bg-muted/40" />
      </div>
      <div className="space-y-2 text-right shrink-0">
        <div className="h-3 w-16 rounded bg-muted/60 ml-auto" />
        <div className="h-2.5 w-24 rounded bg-muted/40 ml-auto" />
      </div>
    </div>
  );
}

interface TokenPoolEntry {
  pool: LiquidityPool;
  isToken0: boolean;
  tokenReserve: number;
  quoteReserve: number;
  quoteSymbol: string;
  quoteAddress: `0x${string}`;
  tvl: number;
}

interface TokenEntry {
  symbol: string;
  meta: typeof TOKEN_LIST[number];
  price: number;
  tokenPools: TokenPoolEntry[];
  priceSource: TokenPoolEntry | null;
  totalLiquidity: number;
  totalTokenReserve: number;
  activePools: number;
}

export function TokenDetails({ pools, prices, isLoading = false }: Props) {
  const [open, setOpen] = useState<string | null>(FEATURED[0]);
  const showSkeleton = isLoading && pools.length === 0;

  const data = useMemo<TokenEntry[]>(() => {
    const out: TokenEntry[] = [];
    for (const symbol of FEATURED) {
      const meta = TOKEN_LIST.find(t => t.symbol === symbol);
      if (!meta) continue;
      const addr = meta.address.toLowerCase();

      const tokenPools: TokenPoolEntry[] = [];
      for (const p of pools) {
        const isToken0 = p.token0Address.toLowerCase() === addr;
        const isToken1 = p.token1Address.toLowerCase() === addr;
        if (!isToken0 && !isToken1) continue;
        const dec0 = p.token0?.decimals ?? 18;
        const dec1 = p.token1?.decimals ?? 18;
        const r0 = parseFloat(formatUnits(p.reserve0, dec0));
        const r1 = parseFloat(formatUnits(p.reserve1, dec1));
        const price0 = prices[p.token0Symbol] || 0;
        const price1 = prices[p.token1Symbol] || 0;
        tokenPools.push({
          pool: p,
          isToken0,
          tokenReserve: isToken0 ? r0 : r1,
          quoteReserve: isToken0 ? r1 : r0,
          quoteSymbol: isToken0 ? p.token1Symbol : p.token0Symbol,
          quoteAddress: isToken0 ? p.token1Address : p.token0Address,
          tvl: r0 * price0 + r1 * price1,
        });
      }

      // Prefer the WQMS pair as price source (WQMS anchors $1), else the deepest pool.
      const wopnPair = tokenPools.find(
        p =>
          p.quoteAddress.toLowerCase() === CONTRACTS.WETH.toLowerCase() &&
          p.tokenReserve > 0 &&
          p.quoteReserve > 0,
      );
      const deepest = [...tokenPools]
        .filter(p => p.tokenReserve > 0 && p.quoteReserve > 0)
        .sort((a, b) => b.tvl - a.tvl)[0];

      out.push({
        symbol,
        meta,
        price: prices[symbol] || 0,
        tokenPools,
        priceSource: wopnPair || deepest || null,
        totalLiquidity: tokenPools.reduce((acc, p) => acc + p.tvl, 0),
        totalTokenReserve: tokenPools.reduce((acc, p) => acc + p.tokenReserve, 0),
        activePools: tokenPools.filter(p => p.tokenReserve > 0 && p.quoteReserve > 0).length,
      });
    }
    return out;
  }, [pools, prices]);

  return (
    <div className="glass-card p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm md:text-base font-semibold flex items-center gap-2">
            <Coins className="w-4 h-4 text-primary" />
            Token Details
          </h3>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
            Logo, reserves, and on-chain price source for every listed asset
          </p>
        </div>
        <span className={cn(
          "text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0",
          showSkeleton ? "bg-muted text-muted-foreground animate-pulse" : "bg-success/20 text-success"
        )}>
          {showSkeleton ? 'Loading…' : 'On-Chain · Auto-refresh 45s'}
        </span>
      </div>

      {showSkeleton ? (
        <div className="space-y-2">
          {FEATURED.map((s) => <TokenDetailRowSkeleton key={s} />)}
        </div>
      ) : (

      <div className="space-y-2">
        {data.map((t, i) => {
          const isOpen = open === t.symbol;
          return (
            <motion.div
              key={t.symbol}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                'rounded-xl border transition-colors',
                isOpen ? 'bg-muted/40 border-primary/40' : 'bg-muted/20 border-border/50 hover:bg-muted/30',
              )}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : t.symbol)}
                className="w-full flex items-center gap-3 p-3 text-left"
              >
                <TokenIcon
                  src={t.meta.logoURI}
                  symbol={t.symbol}
                  alt={t.symbol}
                  size={40}
                  fallbackSrc="/tokens/opn.jpg"
                  className="border border-border"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm">{t.symbol}</p>
                    <span className="text-[10px] text-muted-foreground truncate">{t.meta.name}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">
                    {t.meta.address.slice(0, 10)}…{t.meta.address.slice(-6)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">
                    ${t.price.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: t.price < 1 ? 4 : 2,
                    })}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    TVL ${t.totalLiquidity.toFixed(2)} · {t.activePools} pool{t.activePools !== 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-muted-foreground transition-transform shrink-0',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 grid gap-3 md:grid-cols-2">
                      {/* Price source */}
                      <div className="rounded-lg bg-background/40 border border-border/40 p-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
                          Price Source (on-chain)
                        </p>
                        {t.priceSource ? (
                          <>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-xs font-medium">
                                {t.symbol}/{t.priceSource.quoteSymbol} pool
                              </span>
                              <a
                                href={`${EXPLORER}/address/${t.priceSource.pool.pairAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-primary hover:underline inline-flex items-center gap-1"
                              >
                                Explorer <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <p className="text-muted-foreground">{t.symbol} reserve</p>
                                <p className="font-mono font-medium">
                                  {t.priceSource.tokenReserve.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">{t.priceSource.quoteSymbol} reserve</p>
                                <p className="font-mono font-medium">
                                  {t.priceSource.quoteReserve.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                </p>
                              </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                              Derived from constant-product reserves:{' '}
                              <span className="font-mono">
                                price = {t.priceSource.quoteSymbol}_reserve / {t.symbol}_reserve
                              </span>
                            </p>
                          </>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">
                            No active pool yet — displayed price falls back to the listed base price.
                          </p>
                        )}
                      </div>

                      {/* All pools containing this token */}
                      <div className="rounded-lg bg-background/40 border border-border/40 p-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5 flex items-center gap-1.5">
                          <Droplets className="w-3 h-3" /> All Pools ({t.tokenPools.length})
                        </p>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {t.tokenPools.length === 0 && (
                            <p className="text-[11px] text-muted-foreground">No pools created yet.</p>
                          )}
                          {t.tokenPools.map((p: any) => (
                            <div
                              key={p.pool.pairAddress}
                              className="flex items-center justify-between gap-2 text-[11px] py-1 border-b border-border/30 last:border-0"
                            >
                              <span className="font-medium">
                                {t.symbol}/{p.quoteSymbol}
                              </span>
                              <span className="text-muted-foreground font-mono">
                                ${p.tvl.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Contract */}
                      <div className="rounded-lg bg-background/40 border border-border/40 p-3 md:col-span-2">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
                          Contract
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-[11px] font-mono break-all">{t.meta.address}</code>
                          <a
                            href={`${EXPLORER}/address/${t.meta.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-primary hover:underline inline-flex items-center gap-1 shrink-0"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
                          <div>
                            <p className="text-muted-foreground">Decimals</p>
                            <p className="font-medium">{t.meta.decimals}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Total Reserve</p>
                            <p className="font-medium font-mono">
                              {t.totalTokenReserve.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Active Pools</p>
                            <p className="font-medium">{t.activePools}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
      )}
    </div>
  );
}
