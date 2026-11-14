export type AddressPriceMap = Record<string, number>;

export function getTokenPrice(
  prices: AddressPriceMap,
  tokenAddress: string,
  wrappedNativeAddress?: string,
): number {
  const normalizedAddress = tokenAddress.toLowerCase();
  const address = normalizedAddress === 'native'
    ? wrappedNativeAddress?.toLowerCase()
    : normalizedAddress;
  if (!address) return 0;

  const price = prices[address];
  return typeof price === 'number' && Number.isFinite(price) && price > 0 ? price : 0;
}
