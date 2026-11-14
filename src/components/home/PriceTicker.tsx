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
  const { getPrice, isLoading } = useTokenPrices();
  const quotedTokens = getTokenList()
    .map((token) => ({ token, price: getPrice(token.address) }))
    .filter(({ price }) => Number.isFinite(price) && price > 0);

  return (
    <div aria-label="Live token quotes denominated in WQMS" className="overflow-hidden border-b border-border/50 bg-background/50 py-2 backdrop-blur-sm">
      {isLoading && quotedTokens.length === 0 ? (
        <p className="px-4 py-2 text-center text-xs text-muted-foreground" role="status">Loading on-chain quotes…</p>
      ) : quotedTokens.length > 0 ? (
        <Marquee pauseOnHover speed={30}>
          {quotedTokens.map(({ token, price }) => (
            <div key={token.address} className="mx-2 flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-2">
              <TokenIcon src={token.logoURI} symbol={token.symbol} alt={token.symbol} size={20} />
              <span className="font-semibold">{token.symbol}</span>
              <span className="text-muted-foreground">{formatQuote(price)} WQMS</span>
            </div>
          ))}
        </Marquee>
      ) : (
        <p className="px-4 py-2 text-center text-xs text-muted-foreground" role="status">No on-chain pool quotes available.</p>
      )}
    </div>
  );
}
