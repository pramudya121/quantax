import { useMemo } from 'react';
import { useReadContracts, useChainId } from 'wagmi';
import { getContracts, getTokenList, TokenInfo } from '@/config/contracts';
import { PAIR_ABI, FACTORY_ABI } from '@/config/abis';
import { formatUnits } from 'viem';

// Default prices for QMS Testnet tokens (simulated - would use oracles in production)
export const BASE_PRICES: Record<string, number> = {
  QMS: 1.0,
  WQMS: 1.0,
  QTX: 0.25,
  BNB: 580.0,
  ETH: 3200.0,
  MON: 2.5,
  HYPE: 15.0,
};

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
    query: { staleTime: 5 * 60_000, gcTime: 30 * 60_000 },
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
    // Auto-refresh prices every 45s; serve cached reserves for 20s to throttle RPCs.
    query: {
      enabled: pairTargets.length > 0,
      staleTime: 20_000,
      gcTime: 60_000,
      refetchInterval: 45_000,
      refetchIntervalInBackground: false,
    },
  });

  const prices = useMemo(() => {
    const priceMap: Record<string, number> = { ...BASE_PRICES };

    if (!reserveQueries.data) return priceMap;

    for (let i = 0; i < pairTargets.length; i++) {
      const reserves = reserveQueries.data[i * 2]?.result as [bigint, bigint, number] | undefined;
      const token0Addr = reserveQueries.data[i * 2 + 1]?.result as `0x${string}` | undefined;

      if (!reserves || !token0Addr || reserves[0] === 0n || reserves[1] === 0n) continue;

      const { token } = pairTargets[i];
      const isToken0Wopn = token0Addr.toLowerCase() === wrapped.toLowerCase();

      const wopnReserve = parseFloat(formatUnits(isToken0Wopn ? reserves[0] : reserves[1], 18));
      const tokenReserve = parseFloat(formatUnits(isToken0Wopn ? reserves[1] : reserves[0], token.decimals));

      if (tokenReserve > 0) {
        // Price in WQMS terms (WQMS = $1)
        priceMap[token.symbol] = wopnReserve / tokenReserve;
      }
    }

    return priceMap;
  }, [reserveQueries.data, pairTargets, wrapped]);

  return {
    prices,
    getPrice: (symbol: string) => prices[symbol] || 0,
    isLoading: pairQueries.isLoading || reserveQueries.isLoading,
  };
}

// Hook to calculate price impact for a swap.
// Uses the Uniswap V2 constant-product formula directly on reserves so the
// result is bounded between 0 and 100, regardless of decimal mismatches or
// noisy quote data.
export function usePriceImpact(
  fromToken: TokenInfo | null,
  toToken: TokenInfo | null,
  fromAmount: string,
  _toAmount: string,
  reserves?: [bigint, bigint],
  token0Address?: string
) {
  const chainId = useChainId();
  const wrappedNative = getContracts(chainId).WETH;
  return useMemo(() => {
    const severityOf = (impact: number) =>
      impact > 10 ? ('high' as const) : impact > 3 ? ('medium' as const) : ('low' as const);

    if (!fromToken || !toToken || !fromAmount) {
      return { priceImpact: 0, severity: 'low' as const };
    }

    const inputAmount = parseFloat(fromAmount);
    if (!Number.isFinite(inputAmount) || inputAmount <= 0) {
      return { priceImpact: 0, severity: 'low' as const };
    }

    // Direct-pair AMM formula (preferred): impact = 1 - midOut / amountOut*
    // where midOut = amountIn * reserveOut / reserveIn (no fee, no slippage)
    // and amountOut* = amountIn*997 * reserveOut / (reserveIn*1000 + amountIn*997)
    if (reserves && reserves[0] > 0n && reserves[1] > 0n && token0Address) {
      const fromAddr = (fromToken.isNative ? wrappedNative : fromToken.address).toLowerCase();
      const isFromToken0 = token0Address.toLowerCase() === fromAddr;

      const reserveIn = parseFloat(formatUnits(
        isFromToken0 ? reserves[0] : reserves[1],
        fromToken.decimals,
      ));
      const reserveOut = parseFloat(formatUnits(
        isFromToken0 ? reserves[1] : reserves[0],
        toToken.decimals,
      ));

      if (reserveIn > 0 && reserveOut > 0) {
        const amountInWithFee = inputAmount * 0.997;
        const numerator = amountInWithFee * reserveOut;
        const denominator = reserveIn + amountInWithFee;
        const amountOut = numerator / denominator;
        const midOut = inputAmount * (reserveOut / reserveIn);

        if (midOut > 0 && amountOut > 0 && amountOut <= midOut) {
          const impact = ((midOut - amountOut) / midOut) * 100;
          const clamped = Math.max(0, Math.min(impact, 99.99));
          return { priceImpact: clamped, severity: severityOf(clamped) };
        }
        // If amountOut > midOut something is off (stale reserves) — treat as low impact.
        return { priceImpact: 0, severity: 'low' as const };
      }
    }

    // Multi-hop / unknown reserves fallback: conservative size-based estimate.
    const estimatedImpact = Math.min(inputAmount * 0.05, 10);
    return { priceImpact: estimatedImpact, severity: severityOf(estimatedImpact) };
  }, [fromToken, toToken, fromAmount, reserves, token0Address, wrappedNative]);
}

// Hook to calculate TVL for a pool
export function usePoolTVL(
  token0Symbol: string,
  token1Symbol: string,
  reserve0: bigint,
  reserve1: bigint,
  token0Decimals: number = 18,
  token1Decimals: number = 18,
  prices: Record<string, number>
) {
  return useMemo(() => {
    const price0 = prices[token0Symbol] || 0;
    const price1 = prices[token1Symbol] || 0;

    const value0 = parseFloat(formatUnits(reserve0, token0Decimals)) * price0;
    const value1 = parseFloat(formatUnits(reserve1, token1Decimals)) * price1;

    return value0 + value1;
  }, [token0Symbol, token1Symbol, reserve0, reserve1, token0Decimals, token1Decimals, prices]);
}
