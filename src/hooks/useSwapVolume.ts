import { useEffect, useMemo, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';
import type { LiquidityPool } from './useLiquidityPools';

const SWAP_EVENT = parseAbiItem(
  'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)'
);

// QMS Testnet ~2s block time → 24h ≈ 43200 blocks.
// Public RPCs often cap getLogs ranges, so we scan a tighter recent window in chunks.
const BLOCK_WINDOW = 20000n;
const CHUNK = 2000n;

export interface SwapEventLog {
  pairAddress: `0x${string}`;
  token0Symbol: string;
  token1Symbol: string;
  tokenInSymbol: string;
  tokenOutSymbol: string;
  amountIn: number;
  amountOut: number;
  volumeUSD: number;
  txHash: `0x${string}`;
  blockNumber: bigint;
  sender: `0x${string}`;
}

export interface SwapVolumeStats {
  totalVolume: number;
  swapCount: number;
  uniqueTraders: number;
  estimatedFees: number; // 0.3%
  perPool: Record<string, number>;
}

export function useSwapVolume(pools: LiquidityPool[], prices: Record<string, number>) {
  const client = usePublicClient() as any;
  const [logs, setLogs] = useState<SwapEventLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fromBlock, setFromBlock] = useState<bigint | null>(null);
  const [latestBlock, setLatestBlock] = useState<bigint | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Stable signature so the effect only refires when pool set changes.
  const poolKey = useMemo(
    () => pools.map(p => p.pairAddress).sort().join(','),
    [pools]
  );

  useEffect(() => {
    if (!client || pools.length === 0) return;
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const latest = await client.getBlockNumber();
        const start = latest > BLOCK_WINDOW ? latest - BLOCK_WINDOW : 0n;
        setFromBlock(start);
        setLatestBlock(latest);

        const addresses = pools.map(p => p.pairAddress);
        const poolByAddr = new Map(
          pools.map(p => [p.pairAddress.toLowerCase(), p] as const)
        );

        const allLogs: any[] = [];
        for (let from = start; from <= latest; from += CHUNK) {
          const to = from + CHUNK - 1n > latest ? latest : from + CHUNK - 1n;
          try {
            const chunk = await client.getLogs({
              address: addresses,
              event: SWAP_EVENT,
              fromBlock: from,
              toBlock: to,
            });
            allLogs.push(...chunk);
          } catch {
            // ignore individual chunk failures (RPC range limits)
          }
          if (cancelled) return;
        }

        const parsed: SwapEventLog[] = [];
        for (const log of allLogs) {
          const pool = poolByAddr.get((log.address as string).toLowerCase());
          if (!pool) continue;
          const dec0 = pool.token0?.decimals ?? 18;
          const dec1 = pool.token1?.decimals ?? 18;
          const a0In = log.args.amount0In as bigint;
          const a1In = log.args.amount1In as bigint;
          const a0Out = log.args.amount0Out as bigint;
          const a1Out = log.args.amount1Out as bigint;
          const isToken0In = a0In > 0n;
          const amountInRaw = isToken0In ? a0In : a1In;
          const amountOutRaw = isToken0In ? a1Out : a0Out;
          const decIn = isToken0In ? dec0 : dec1;
          const decOut = isToken0In ? dec1 : dec0;
          const symIn = isToken0In ? pool.token0Symbol : pool.token1Symbol;
          const symOut = isToken0In ? pool.token1Symbol : pool.token0Symbol;
          const amountIn = parseFloat(formatUnits(amountInRaw, decIn));
          const amountOut = parseFloat(formatUnits(amountOutRaw, decOut));
          const priceIn = prices[symIn] || 0;
          const priceOut = prices[symOut] || 0;
          const volumeUSD = priceIn > 0 ? amountIn * priceIn : amountOut * priceOut;
          parsed.push({
            pairAddress: pool.pairAddress,
            token0Symbol: pool.token0Symbol,
            token1Symbol: pool.token1Symbol,
            tokenInSymbol: symIn,
            tokenOutSymbol: symOut,
            amountIn,
            amountOut,
            volumeUSD,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            sender: log.args.sender,
          });
        }

        parsed.sort((a, b) => Number(b.blockNumber - a.blockNumber));
        if (!cancelled) setLogs(parsed);
      } catch {
        if (!cancelled) setLogs([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, poolKey, refreshKey]);

  const stats: SwapVolumeStats = useMemo(() => {
    let totalVolume = 0;
    const perPool: Record<string, number> = {};
    const traders = new Set<string>();
    for (const l of logs) {
      totalVolume += l.volumeUSD;
      perPool[l.pairAddress] = (perPool[l.pairAddress] || 0) + l.volumeUSD;
      traders.add(l.sender.toLowerCase());
    }
    return {
      totalVolume,
      swapCount: logs.length,
      uniqueTraders: traders.size,
      estimatedFees: totalVolume * 0.003,
      perPool,
    };
  }, [logs]);

  return {
    logs,
    stats,
    isLoading,
    fromBlock,
    latestBlock,
    refetch: () => setRefreshKey(k => k + 1),
  };
}
