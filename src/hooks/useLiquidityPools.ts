import { useState, useEffect } from 'react';
import { useReadContract, useReadContracts, useWatchContractEvent, useChainId } from 'wagmi';
import { getContracts, getTokenByAddress, getWrappedNative, TokenInfo } from '@/config/contracts';
import { QMS_CHAIN_ID } from '@/config/chains';
import { FACTORY_ABI, PAIR_ABI, ERC20_ABI } from '@/config/abis';
import { formatUnits } from 'viem';

export interface LiquidityPool {
  pairAddress: `0x${string}`;
  token0: TokenInfo | null;
  token1: TokenInfo | null;
  token0Address: `0x${string}`;
  token1Address: `0x${string}`;
  reserve0: bigint;
  reserve1: bigint;
  totalSupply: bigint;
  token0Symbol: string;
  token1Symbol: string;
}

// Hook to get all LP pairs from the Factory contract
export function useLiquidityPools() {
  const [pools, setPools] = useState<LiquidityPool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const chainId = useChainId();
  const C = getContracts(chainId);
  const wrapped = getWrappedNative(chainId).toLowerCase();
  const wrappedSymbol = 'WQMS';
  const wrappedName = 'Wrapped QMS';

  // Clear stale pools immediately when the user switches network.
  useEffect(() => {
    setPools([]);
    setIsLoading(true);
  }, [chainId]);

  // Get total number of pairs (cheap call, can refresh more often)
  const { data: pairsLength, refetch: refetchLength } = useReadContract({
    address: C.FACTORY,
    abi: FACTORY_ABI,
    functionName: 'allPairsLength',
    query: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchInterval: 60_000,
      refetchIntervalInBackground: false,
    },
  });

  // Auto-index new pairs: when Factory emits PairCreated, refetch length
  // so Pools/Analytics surface the new pair without a hard reload.
  useWatchContractEvent({
    address: C.FACTORY,
    abi: FACTORY_ABI,
    eventName: 'PairCreated',
    onLogs: () => {
      refetchLength();
    },
  });

  // Get all pair addresses
  const pairCount = Number(pairsLength || 0);
  const pairIndices = Array.from({ length: pairCount }, (_, i) => i);

  const pairAddressesResult = useReadContracts({
    contracts: pairIndices.map(index => ({
      address: C.FACTORY,
      abi: FACTORY_ABI,
      functionName: 'allPairs',
      args: [BigInt(index)],
    })),
    // Pair addresses by index are immutable — cache for the session.
    query: { enabled: pairCount > 0, staleTime: 10 * 60_000, gcTime: 30 * 60_000 },
  });

  const pairAddresses = (pairAddressesResult.data || [])
    .map(result => result.result as `0x${string}` | undefined)
    .filter(Boolean) as `0x${string}`[];

  // Get token0, token1, reserves, totalSupply for each pair (batched multicall)
  const tokenCallsResult = useReadContracts({
    contracts: pairAddresses.flatMap(pairAddress => [
      { address: pairAddress, abi: PAIR_ABI, functionName: 'token0' },
      { address: pairAddress, abi: PAIR_ABI, functionName: 'token1' },
      { address: pairAddress, abi: PAIR_ABI, functionName: 'getReserves' },
      { address: pairAddress, abi: PAIR_ABI, functionName: 'totalSupply' },
    ]),
    // Auto-refresh reserves every 45s with a short cache to avoid RPC spam.
    query: {
      enabled: pairAddresses.length > 0,
      staleTime: 20_000,
      gcTime: 60_000,
      refetchInterval: 45_000,
      refetchIntervalInBackground: false,
    },
  });

  // Get symbols for unknown tokens
  const tokenAddresses = new Set<`0x${string}`>();
  if (tokenCallsResult.data) {
    for (let i = 0; i < pairAddresses.length; i++) {
      const token0 = tokenCallsResult.data[i * 4]?.result as `0x${string}` | undefined;
      const token1 = tokenCallsResult.data[i * 4 + 1]?.result as `0x${string}` | undefined;
      if (token0) tokenAddresses.add(token0);
      if (token1) tokenAddresses.add(token1);
    }
  }

  const symbolCallsResult = useReadContracts({
    contracts: Array.from(tokenAddresses).flatMap(address => [
      { address, abi: ERC20_ABI, functionName: 'symbol' },
      { address, abi: ERC20_ABI, functionName: 'name' },
      { address, abi: ERC20_ABI, functionName: 'decimals' },
    ]),
    // Token metadata (symbol/name/decimals) is immutable — cache for the session.
    query: { enabled: tokenAddresses.size > 0, staleTime: 30 * 60_000, gcTime: 60 * 60_000 },
  });

  // Build symbol map
  const symbolMap = new Map<string, { symbol: string; name: string; decimals: number }>();
  if (symbolCallsResult.data) {
    const addresses = Array.from(tokenAddresses);
    for (let i = 0; i < addresses.length; i++) {
      const symbol = symbolCallsResult.data[i * 3]?.result as string | undefined;
      const name = symbolCallsResult.data[i * 3 + 1]?.result as string | undefined;
      const decimals = symbolCallsResult.data[i * 3 + 2]?.result as number | undefined;
      if (symbol) {
        // On-chain WQMS contract is a WETH9 fork and reports "WETH"/"Wrapped Ether".
        // Normalize to QMS-native branding everywhere it surfaces.
        const isWrapped = addresses[i].toLowerCase() === wrapped || symbol === 'WETH';
        const normalizedSymbol = isWrapped ? wrappedSymbol : symbol;
        const normalizedName = (name === 'Wrapped Ether' || !name) ? wrappedName : name;
        symbolMap.set(addresses[i].toLowerCase(), {
          symbol: normalizedSymbol,
          name: isWrapped ? normalizedName : (name || symbol),
          // Preserve 0-decimal tokens; only fall back when the read failed.
          decimals: typeof decimals === 'number' ? decimals : 18,
        });
      }
    }
  }

  useEffect(() => {
    if (!tokenCallsResult.data || tokenCallsResult.isLoading) {
      return;
    }

    try {
      const poolsData: LiquidityPool[] = [];

      for (let i = 0; i < pairAddresses.length; i++) {
        const pairAddress = pairAddresses[i];
        const token0Address = tokenCallsResult.data[i * 4]?.result as `0x${string}` | undefined;
        const token1Address = tokenCallsResult.data[i * 4 + 1]?.result as `0x${string}` | undefined;
        const reserves = tokenCallsResult.data[i * 4 + 2]?.result as [bigint, bigint, number] | undefined;
        const totalSupply = tokenCallsResult.data[i * 4 + 3]?.result as bigint | undefined;

        if (!token0Address || !token1Address) continue;

        // Get symbol from map if not in TOKEN_LIST
        const token0Data = symbolMap.get(token0Address.toLowerCase());
        const token1Data = symbolMap.get(token1Address.toLowerCase());

        // Known tokens keep their curated metadata (logo, native flag).
        // Unknown (custom) tokens get a full TokenInfo built from the
        // on-chain symbol/name/decimals reads, so reserves, prices and TVL
        // use the real decimals instead of an assumed 18.
        const resolveTokenInfo = (
          tokenAddress: `0x${string}`,
          onChainData: { symbol: string; name: string; decimals: number } | undefined
        ): TokenInfo | null => {
          const known = getTokenByAddress(tokenAddress, chainId);
          if (known) return known;
          if (!onChainData) return null;
          return {
            address: tokenAddress,
            symbol: onChainData.symbol === 'WETH' ? wrappedSymbol : onChainData.symbol,
            name: onChainData.name,
            decimals: onChainData.decimals,
            logoURI: '',
          };
        };

        const token0Info = resolveTokenInfo(token0Address, token0Data);
        const token1Info = resolveTokenInfo(token1Address, token1Data);

        const normalizeSym = (s?: string) => (s === 'WETH' ? wrappedSymbol : s || 'Unknown');

        poolsData.push({
          pairAddress,
          token0: token0Info,
          token1: token1Info,
          token0Address,
          token1Address,
          reserve0: reserves?.[0] || 0n,
          reserve1: reserves?.[1] || 0n,
          totalSupply: totalSupply || 0n,
          token0Symbol: normalizeSym(token0Info?.symbol || token0Data?.symbol),
          token1Symbol: normalizeSym(token1Info?.symbol || token1Data?.symbol),
        });
      }

      setPools(poolsData);
      setIsLoading(false);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setIsLoading(false);
    }
  }, [tokenCallsResult.data, tokenCallsResult.isLoading, pairAddresses.length, symbolMap.size, chainId]);

  const refetch = () => {
    refetchLength();
    pairAddressesResult.refetch();
    tokenCallsResult.refetch();
    symbolCallsResult.refetch();
  };

  return {
    pools,
    pairCount,
    isLoading: isLoading || pairAddressesResult.isLoading || tokenCallsResult.isLoading,
    error,
    refetch,
  };
}

// Hook to validate a token contract address
export function useValidateToken(address: `0x${string}` | undefined) {
  const isValidAddress = address && /^0x[a-fA-F0-9]{40}$/.test(address);

  const symbolResult = useReadContract({
    address: address,
    abi: ERC20_ABI,
    functionName: 'symbol',
    query: { enabled: !!isValidAddress },
  });

  const nameResult = useReadContract({
    address: address,
    abi: ERC20_ABI,
    functionName: 'name',
    query: { enabled: !!isValidAddress },
  });

  const decimalsResult = useReadContract({
    address: address,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: { enabled: !!isValidAddress },
  });

  // A 0-decimal token is valid — only treat "not loaded yet" as invalid.
  const isLoading = symbolResult.isLoading || nameResult.isLoading || decimalsResult.isLoading;
  const isValid = symbolResult.data !== undefined && decimalsResult.data !== undefined;

  return {
    isValid,
    isLoading,
    symbol: symbolResult.data as string | undefined,
    name: nameResult.data as string | undefined,
    decimals: decimalsResult.data !== undefined ? Number(decimalsResult.data) : 18,
    error: symbolResult.error || nameResult.error || decimalsResult.error,
  };
}
