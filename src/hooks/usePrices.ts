import { useCallback, useMemo } from 'react';
import { useReadContracts, useChainId } from 'wagmi';
import { getContracts, getTokenList, TokenInfo } from '@/config/contracts';
import { QMS_CHAIN_ID } from '@/config/chains';
import { PAIR_ABI, FACTORY_ABI } from '@/config/abis';
import { getTokenPrice } from '@/lib/pricing';
import { formatUnits } from 'viem';

// Pool quotes are denominated in WQMS; this identity rate is not a fiat peg.
const WQMS_IDENTITY_PRICE = 1;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Hook to get token prices based on pool reserves
export function useTokenPrices() {
  const chainId = useChainId();
  const C = getContracts(chainId);
  const wrapped = C.WETH;
  // Pairs against the wrapped native token are used to derive prices
  const wopnPairs = useMemo(
    () =>
      getTokenList(chainId).filter(
        (t) => !t.isNative && t.address.toLowerCase() !== wrapped.toLowerCase(),
      ),
    [chainId, wrapped],
  );

  const pairQueries = useReadContracts({
    contracts: wopnPairs.map((token) => ({
      address: C.FACTORY,
      abi: FACTORY_ABI,
      functionName: 'getPair',
      args: [wrapped, token.address as `0x${string}`],
    })),
    // Pair addresses are immutable once created — cache aggressively.
    query: {
      enabled: chainId === QMS_CHAIN_ID && wopnPairs.length > 0,
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
    },
  });

  const pairTargets = useMemo(() => {
    return wopnPairs
      .map((token, index) => ({
        token,
        pairAddress: pairQueries.data?.[index]?.result as `0x${string}` | undefined,
      }))
      .filter(
        ({ pairAddress }) =>
          !!pairAddress && pairAddress.toLowerCase() !== ZERO_ADDRESS
      ) as { token: (typeof wopnPairs)[number]; pairAddress: `0x${string}` }[];
  }, [wopnPairs, pairQueries.data]);

  const reserveQueries = useReadContracts({
    contracts: pairTargets.flatMap(({ pairAddress }) => [
      { address: pairAddress, abi: PAIR_ABI, functionName: 'getReserves' },
      { address: pairAddress, abi: PAIR_ABI, functionName: 'token0' },
    ]),
    // Refresh live reserve quotes every 15s while the page is visible.
    query: {
      enabled: chainId === QMS_CHAIN_ID && pairTargets.length > 0,
      staleTime: 5_000,
      gcTime: 60_000,
      refetchInterval: 15_000,
      refetchIntervalInBackground: false,
    },
  });

  const prices = useMemo(() => {
    const priceMap: Record<string, number> = {};
    if (chainId !== QMS_CHAIN_ID) return priceMap;
    priceMap[wrapped.toLowerCase()] = WQMS_IDENTITY_PRICE;

    if (!reserveQueries.data) return priceMap;

    for (let i = 0; i < pairTargets.length; i++) {
      const reserves = reserveQueries.data[i * 2]?.result as [bigint, bigint, number] | undefined;
      const token0Addr = reserveQueries.data[i * 2 + 1]?.result as `0x${string}` | undefined;

      if (!reserves || !token0Addr || reserves[0] === 0n || reserves[1] === 0n) continue;

      const { token } = pairTargets[i];
      const isToken0Wopn = token0Addr.toLowerCase() === wrapped.toLowerCase();

      const wopnReserve = parseFloat(formatUnits(isToken0Wopn ? reserves[0] : reserves[1], 18));
      const tokenReserve = parseFloat(formatUnits(isToken0Wopn ? reserves[1] : reserves[0], token.decimals));

      const priceInWQMS = wopnReserve / tokenReserve;
      if (Number.isFinite(wopnReserve) && Number.isFinite(tokenReserve) && tokenReserve > 0 && Number.isFinite(priceInWQMS) && priceInWQMS > 0) {
        priceMap[token.address.toLowerCase()] = priceInWQMS;
      }
    }

    return priceMap;
  }, [chainId, reserveQueries.data, pairTargets, wrapped]);

  const getPrice = useCallback(
    (tokenAddress: string) => getTokenPrice(prices, tokenAddress, wrapped),
    [prices, wrapped],
  );

  return {
    prices,
    getPrice,
    isLoading: chainId === QMS_CHAIN_ID && (pairQueries.isLoading || reserveQueries.isLoading),
  };
}

// Compare the router's current quoted output with the direct pool mid-price.
// If a trustworthy reserve baseline or quote is unavailable, report unknown
// instead of inventing a size-based impact estimate.
export function usePriceImpact(
  fromToken: TokenInfo | null,
  toToken: TokenInfo | null,
  fromAmount: string,
  quotedAmount: string,
  reserves?: [bigint, bigint],
  token0Address?: string
) {
  const chainId = useChainId();
  const wrappedNative = getContracts(chainId).WETH;
  return useMemo(() => {
    const unknown = { priceImpact: null, severity: 'unknown' as const };
    const severityOf = (impact: number) =>
      impact > 10 ? ('high' as const) : impact > 3 ? ('medium' as const) : ('low' as const);

    if (!fromToken || !toToken || !fromAmount || !quotedAmount || !reserves || !token0Address) return unknown;

    const inputAmount = Number(fromAmount);
    const outputAmount = Number(quotedAmount);
    if (!Number.isFinite(inputAmount) || inputAmount <= 0 || !Number.isFinite(outputAmount) || outputAmount <= 0) return unknown;
    if (reserves[0] <= 0n || reserves[1] <= 0n) return unknown;

    const fromAddr = (fromToken.isNative ? wrappedNative : fromToken.address).toLowerCase();
    const isFromToken0 = token0Address.toLowerCase() === fromAddr;
    const reserveIn = Number(formatUnits(isFromToken0 ? reserves[0] : reserves[1], fromToken.decimals));
    const reserveOut = Number(formatUnits(isFromToken0 ? reserves[1] : reserves[0], toToken.decimals));
    if (!Number.isFinite(reserveIn) || !Number.isFinite(reserveOut) || reserveIn <= 0 || reserveOut <= 0) return unknown;

    const midPriceOutput = inputAmount * (reserveOut / reserveIn);
    if (!Number.isFinite(midPriceOutput) || midPriceOutput <= 0 || outputAmount > midPriceOutput) return unknown;

    const impact = Math.max(0, Math.min(((midPriceOutput - outputAmount) / midPriceOutput) * 100, 99.99));
    return { priceImpact: impact, severity: severityOf(impact) };
  }, [fromToken, toToken, fromAmount, quotedAmount, reserves, token0Address, wrappedNative]);
}

// Hook to calculate TVL for a pool
export function usePoolTVL(
  token0Address: string,
  token1Address: string,
  reserve0: bigint,
  reserve1: bigint,
  token0Decimals: number = 18,
  token1Decimals: number = 18,
  prices: Record<string, number>
) {
  return useMemo(() => {
    const price0 = getTokenPrice(prices, token0Address);
    const price1 = getTokenPrice(prices, token1Address);

    const value0 = parseFloat(formatUnits(reserve0, token0Decimals)) * price0;
    const value1 = parseFloat(formatUnits(reserve1, token1Decimals)) * price1;

    return value0 + value1;
  }, [token0Address, token1Address, reserve0, reserve1, token0Decimals, token1Decimals, prices]);
}
