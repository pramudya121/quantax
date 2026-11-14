import { Marquee } from '@/components/ui/magic/Marquee';
import { useTokenPrices } from '@/hooks/usePrices';
import { getTokenList } from '@/config/contracts';
import { TokenIcon } from '@/components/ui/TokenIcon';

function formatQuote(value: number) {
  if (value >= 1) return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  if (value >= 0.01) return value.toFixed(4);
  if (value > 0) return value.toFixed(8);
  return '—';
}

export function PriceTicker() {
  const { prices, isLoading } = useTokenPrices();
  const quotedTokens = getTokenList()
    .filter((token) => Number.isFinite(prices[token.symbol]) && prices[token.symbol] > 0)
    .map((token) => token.symbol);

  return (
    <div aria-label="Live token quotes denominated in WQMS" className="overflow-hidden border-b border-border/50 bg-background/50 py-2 backdrop-blur-sm">
      {isLoading && quotedTokens.length === 0 ? (
        <p className="px-4 py-2 text-center text-xs text-muted-foreground" role="status">Loading on-chain quotes…</p>
      ) : quotedTokens.length > 0 ? (
        <Marquee pauseOnHover speed={30}>
          {quotedTokens.map((symbol) => (
            <div key={symbol} className="mx-2 flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-2">
              <TokenIcon src={getTokenList().find((token) => token.symbol === symbol)?.logoURI} symbol={symbol} alt={symbol} size={20} />
              <span className="font-semibold">{symbol}</span>
              <span className="text-muted-foreground">{formatQuote(prices[symbol])} WQMS</span>
            </div>
          ))}
        </Marquee>
      ) : (
        <p className="px-4 py-2 text-center text-xs text-muted-foreground" role="status">No on-chain pool quotes available.</p>
      )}
    </div>
  );
}
