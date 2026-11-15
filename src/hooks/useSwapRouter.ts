import { useMemo } from 'react';
import { useReadContracts, useReadContract, useChainId } from 'wagmi';
import { getContracts, getTokenList } from '@/config/contracts';
import { FACTORY_ABI, ROUTER_ABI } from '@/config/abis';
import { isSupportedChain } from '@/config/chains';

const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

// Common intermediate tokens for multi-hop routing (per active chain)
function getBridgeTokens(chainId?: number): `0x${string}`[] {
  const wrapped = getContracts(chainId).WETH;
  const list = getTokenList(chainId);
  const pick = (sym: string) =>
    list.find((t) => t.symbol === sym && !t.isNative)?.address as `0x${string}` | undefined;
  return [wrapped, pick('QTX'), pick('BNB'), pick('ETH')].filter(Boolean) as `0x${string}`[];
}

export interface SwapRoute {
  path: `0x${string}`[];
  pathSymbols: string[];
  hops: number;
}

/**
 * Hook to find all possible routes between two tokens.
 * Checks direct pair first, then tries 1-hop through bridge tokens.
 */
export function useFindRoutes(
  fromAddr: `0x${string}` | undefined,
  toAddr: `0x${string}` | undefined
) {
  const chainId = useChainId();
  const C = getContracts(chainId);
  const BRIDGE_TOKENS = useMemo(() => getBridgeTokens(chainId), [chainId]);

  // Build list of candidate pairs to check
  const candidatePairs = useMemo(() => {
    if (!isSupportedChain(chainId) || !fromAddr || !toAddr) return [];
    const pairs: { tokenA: `0x${string}`; tokenB: `0x${string}`; label: string }[] = [];

    // Direct pair
    pairs.push({ tokenA: fromAddr, tokenB: toAddr, label: 'direct' });

    // 1-hop through each bridge token
    for (const bridge of BRIDGE_TOKENS) {
      if (bridge.toLowerCase() === fromAddr.toLowerCase() || bridge.toLowerCase() === toAddr.toLowerCase()) continue;
      pairs.push({ tokenA: fromAddr, tokenB: bridge, label: `hop-${bridge}-A` });
      pairs.push({ tokenA: bridge, tokenB: toAddr, label: `hop-${bridge}-B` });
    }

    return pairs;
  }, [fromAddr, toAddr, BRIDGE_TOKENS, chainId]);

  // Batch getPair calls
  const { data: pairResults, isLoading } = useReadContracts({
    contracts: candidatePairs.map(p => ({
      address: C.FACTORY,
      abi: FACTORY_ABI,
      functionName: 'getPair',
      args: [p.tokenA, p.tokenB],
    })),
    query: { enabled: isSupportedChain(chainId) && candidatePairs.length > 0 },
  });

  const routes = useMemo((): SwapRoute[] => {
    if (!fromAddr || !toAddr || !pairResults) return [];

    const found: SwapRoute[] = [];
    const getSymbol = (addr: string) => {
      const t = getTokenList(chainId).find(t => {
        const tAddr = t.isNative ? C.WETH : t.address;
        return tAddr.toLowerCase() === addr.toLowerCase();
      });
      return t?.symbol || addr.slice(0, 6);
    };

    // Check direct pair (index 0)
    const directPair = pairResults[0]?.result as `0x${string}` | undefined;
    if (directPair && directPair !== ZERO_ADDR) {
      found.push({
        path: [fromAddr, toAddr],
        pathSymbols: [getSymbol(fromAddr), getSymbol(toAddr)],
        hops: 1,
      });
    }

    // Check bridge routes (indices 1+, in pairs of 2)
    const bridgesFiltered = BRIDGE_TOKENS.filter(
      b => b.toLowerCase() !== fromAddr.toLowerCase() && b.toLowerCase() !== toAddr.toLowerCase()
    );

    for (let i = 0; i < bridgesFiltered.length; i++) {
      const idxA = 1 + i * 2;
      const idxB = 2 + i * 2;
      const pairA = pairResults[idxA]?.result as `0x${string}` | undefined;
      const pairB = pairResults[idxB]?.result as `0x${string}` | undefined;

      if (pairA && pairA !== ZERO_ADDR && pairB && pairB !== ZERO_ADDR) {
        const bridge = bridgesFiltered[i];
        found.push({
          path: [fromAddr, bridge, toAddr],
          pathSymbols: [getSymbol(fromAddr), getSymbol(bridge), getSymbol(toAddr)],
          hops: 2,
        });
      }
    }

    return found;
  }, [fromAddr, toAddr, pairResults, chainId, C, BRIDGE_TOKENS]);

  return { routes, isLoading };
}

/**
 * Hook to find the best route with highest output for a given input amount.
 * Uses getAmountsOut for each candidate route.
 */
export function useBestRoute(
  fromAddr: `0x${string}` | undefined,
  toAddr: `0x${string}` | undefined,
  amountIn: bigint | undefined
) {
  const chainId = useChainId();
  const C = getContracts(chainId);
  const { routes, isLoading: isRoutesLoading } = useFindRoutes(fromAddr, toAddr);

  // Get quotes for all routes
  const { data: quoteResults, isLoading: isQuoting } = useReadContracts({
    contracts: routes.map(route => ({
      address: C.ROUTER,
      abi: ROUTER_ABI,
      functionName: 'getAmountsOut',
      args: [amountIn!, route.path],
    })),
    query: { enabled: routes.length > 0 && !!amountIn && amountIn > 0n },
  });

  const { bestRoute, allQuotes } = useMemo(() => {
    if (!quoteResults || routes.length === 0) return { bestRoute: null, allQuotes: [] };

    let best: { route: SwapRoute; amountsOut: bigint[]; outputAmount: bigint } | null = null;
    const quotes: { route: SwapRoute; output: bigint }[] = [];

    for (let i = 0; i < routes.length; i++) {
      const result = quoteResults[i];
      if (result.status !== 'success' || !result.result) continue;

      const amounts = result.result as unknown as bigint[];
      const output = amounts[amounts.length - 1];
      quotes.push({ route: routes[i], output });

      if (!best || output > best.outputAmount) {
        best = { route: routes[i], amountsOut: amounts, outputAmount: output };
      }
    }

    // Sort quotes by output descending
    quotes.sort((a, b) => (b.output > a.output ? 1 : b.output < a.output ? -1 : 0));

    return { bestRoute: best, allQuotes: quotes };
  }, [routes, quoteResults]);

  return {
    bestRoute,
    allRoutes: routes,
    allQuotes,
    isLoading: isRoutesLoading || isQuoting,
    hasRoute: routes.length > 0,
  };
}
