import { Marquee } from '@/components/ui/magic/Marquee';
import { useTokenPrices, BASE_PRICES } from '@/hooks/usePrices';
import { getTokenBySymbol } from '@/config/contracts';
import { TokenIcon } from '@/components/ui/TokenIcon';

function PriceTickerItem({ symbol, price, basePrice }: { symbol: string; price: number; basePrice: number }) {
  const token = getTokenBySymbol(symbol);
  const hasPrice = price > 0;
  const change = hasPrice && basePrice > 0 ? ((price - basePrice) / basePrice) * 100 : 0;
  const isPositive = change >= 0;
  const displayPrice = hasPrice ? price : basePrice;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 rounded-lg border border-border/50 mx-2">
      <TokenIcon
        src={token?.logoURI}
        symbol={symbol}
        alt={symbol}
        size={20}
      />
      <span className="font-semibold">{symbol}</span>
      <span className="text-muted-foreground">
        ${displayPrice.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: displayPrice < 1 ? 4 : 2,
        })}
      </span>
      <span className={isPositive ? 'text-success' : 'text-destructive'}>
        {isPositive ? '+' : ''}{change.toFixed(2)}%
      </span>
    </div>
  );
}

export function PriceTicker() {
  const { prices } = useTokenPrices();

  const tokenList = ['QMS', 'DRAGON', 'BNB', 'ETH', 'MON', 'HYPE'];

  return (
    <div className="border-b border-border/50 bg-background/50 backdrop-blur-sm py-2 overflow-hidden">
      <Marquee pauseOnHover speed={30}>
        {tokenList.map((symbol) => (
          <PriceTickerItem
            key={symbol}
            symbol={symbol}
            price={prices[symbol] || 0}
            basePrice={BASE_PRICES[symbol] || 0}
          />
        ))}
      </Marquee>
    </div>
  );
}
