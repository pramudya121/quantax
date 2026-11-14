import { useEffect, useMemo, useState } from 'react';
import { useChainId, usePublicClient, useWatchContractEvent } from 'wagmi';
import { formatUnits, parseAbiItem, type Address } from 'viem';
import { LiquidityPool } from './useLiquidityPools';

const SWAP_EVENT = parseAbiItem(
  'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)'
);

// A recent block window sized for the configured QMS Testnet block time.
// Volume is only an estimate: it uses current WQMS spot quotes and pool events.
const BLOCK_WINDOW = 43200n;
const CHUNK = 2000n;
const CONCURRENT_CHUNKS = 4;
const MAX_LOGS = 10_000;

interface RawSwapLog {
  address: Address;
  transactionHash?: `0x${string}` | null;
  blockNumber?: bigint | null;
  logIndex?: number | null;
  args?: {
    amount0In?: bigint;
    amount1In?: bigint;
    amount0Out?: bigint;
    amount1Out?: bigint;
    sender?: Address;
  };
}

export interface SwapEventLog {
  pairAddress: Address;
  token0Symbol: string;
  token1Symbol: string;
  tokenInSymbol: string;
  tokenOutSymbol: string;
  amountIn: number;
  amountOut: number;
  volumeWQMS: number;
  txHash: `0x${string}`;
  blockNumber: bigint;
  logIndex?: number;
  sender: Address;
}

export interface SwapVolumeStats {
  totalVolumeWQMS: number;
  swapCount: number;
  perPool: Record<string, number>;
}

function parseSwapLogs(
  rawLogs: readonly RawSwapLog[],
  poolsByAddress: Map<string, LiquidityPool>,
  prices: Record<string, number>,
): SwapEventLog[] {
  return rawLogs.flatMap((log): SwapEventLog[] => {
    const pool = poolsByAddress.get(log.address.toLowerCase());
    const args = log.args;
    if (
      !pool || !args || !log.transactionHash || typeof log.blockNumber !== 'bigint' ||
      args.amount0In === undefined || args.amount1In === undefined ||
      args.amount0Out === undefined || args.amount1Out === undefined || !args.sender
    ) return [];

    const isToken0In = args.amount0In > 0n;
    const amountInRaw = isToken0In ? args.amount0In : args.amount1In;
    const amountOutRaw = isToken0In ? args.amount1Out : args.amount0Out;
    if (amountInRaw <= 0n || amountOutRaw <= 0n) return [];

    const decimals0 = pool.token0?.decimals ?? 18;
    const decimals1 = pool.token1?.decimals ?? 18;
    const tokenInSymbol = isToken0In ? pool.token0Symbol : pool.token1Symbol;
    const tokenOutSymbol = isToken0In ? pool.token1Symbol : pool.token0Symbol;
    const amountIn = Number(formatUnits(amountInRaw, isToken0In ? decimals0 : decimals1));
    const amountOut = Number(formatUnits(amountOutRaw, isToken0In ? decimals1 : decimals0));
    const inputValue = amountIn * (prices[tokenInSymbol] || 0);
    const outputValue = amountOut * (prices[tokenOutSymbol] || 0);
    const volumeWQMS = inputValue > 0 ? inputValue : outputValue;
    if (!Number.isFinite(amountIn) || !Number.isFinite(amountOut)) return [];

    return [{
      pairAddress: pool.pairAddress,
      token0Symbol: pool.token0Symbol,
      token1Symbol: pool.token1Symbol,
      tokenInSymbol,
      tokenOutSymbol,
      amountIn,
      amountOut,
      volumeWQMS: Number.isFinite(volumeWQMS) ? volumeWQMS : 0,
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      logIndex: log.logIndex ?? undefined,
      sender: args.sender,
    }];
  });
}

const logKey = (log: SwapEventLog) => `${log.txHash}-${log.pairAddress.toLowerCase()}-${log.logIndex ?? log.blockNumber}`;

export function useSwapVolume(pools: LiquidityPool[], prices: Record<string, number>) {
  const chainId = useChainId();
  const client = usePublicClient();
  const [logs, setLogs] = useState<SwapEventLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [volumeScanComplete, setVolumeScanComplete] = useState(false);
  const [fromBlock, setFromBlock] = useState<bigint | null>(null);
  const [latestBlock, setLatestBlock] = useState<bigint | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const poolKey = useMemo(
    () => `${chainId}|${pools.map(pool => pool.pairAddress).sort().join(',')}`,
    [chainId, pools],
  );
  const poolAddresses = useMemo(
    () => (poolKey.split('|')[1] || '').split(',').filter(Boolean) as Address[],
    [poolKey],
  );
  const poolsByAddress = useMemo(
    () => new Map(pools.map(pool => [pool.pairAddress.toLowerCase(), pool] as const)),
    [pools],
  );

  useWatchContractEvent({
    address: poolAddresses.length > 0 ? poolAddresses : undefined,
    abi: [SWAP_EVENT],
    eventName: 'Swap',
    enabled: poolAddresses.length > 0,
    onLogs: eventLogs => {
      const additions = parseSwapLogs(eventLogs as unknown as RawSwapLog[], poolsByAddress, prices);
      if (additions.length === 0) return;
      setLogs(current => {
        const known = new Set(current.map(logKey));
        const merged = [...additions.filter(log => !known.has(logKey(log))), ...current];
        return merged.sort((a, b) => Number(b.blockNumber - a.blockNumber)).slice(0, MAX_LOGS);
      });
      setLatestBlock(current => additions.reduce((latest, log) => log.blockNumber > latest ? log.blockNumber : latest, current ?? 0n));
    },
  });

  useEffect(() => {
    if (!client || pools.length === 0) {
      setLogs([]);
      setIsLoading(false);
      setVolumeScanComplete(pools.length === 0);
      setFromBlock(null);
      setLatestBlock(null);
      return;
    }

    let cancelled = false;
    setLogs([]);

    (async () => {
      setIsLoading(true);
      setVolumeScanComplete(false);
      try {
        const latest = await client.getBlockNumber();
        const start = latest > BLOCK_WINDOW ? latest - BLOCK_WINDOW : 0n;
        if (cancelled) return;
        setFromBlock(start);
        setLatestBlock(latest);

        const ranges: { fromBlock: bigint; toBlock: bigint }[] = [];
        for (let from = start; from <= latest; from += CHUNK) {
          ranges.push({ fromBlock: from, toBlock: from + CHUNK - 1n > latest ? latest : from + CHUNK - 1n });
        }

        const allLogs: RawSwapLog[] = [];
        let complete = true;
        for (let index = 0; index < ranges.length; index += CONCURRENT_CHUNKS) {
          const batch = await Promise.all(ranges.slice(index, index + CONCURRENT_CHUNKS).map(async range => {
            try {
              const result = await client.getLogs({ address: poolAddresses, event: SWAP_EVENT, ...range });
              return result as unknown as RawSwapLog[];
            } catch {
              return null;
            }
          }));
          if (cancelled) return;
          for (const result of batch) {
            if (result === null) complete = false;
            else allLogs.push(...result);
          }
        }

        const parsed = parseSwapLogs(allLogs, poolsByAddress, prices);
        complete = complete && parsed.length <= MAX_LOGS;
        if (!cancelled) {
          setLogs(current => {
            const known = new Set(parsed.map(logKey));
            const merged = [...current.filter(log => !known.has(logKey(log))), ...parsed];
            return merged.sort((a, b) => Number(b.blockNumber - a.blockNumber)).slice(0, MAX_LOGS);
          });
          setVolumeScanComplete(complete);
        }
      } catch {
        if (!cancelled) {
          setLogs([]);
          setVolumeScanComplete(false);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Reserve-price changes do not require rescanning historical logs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, poolKey, refreshKey]);

  const pricedLogs = useMemo(() => logs.map(log => {
    const inputValue = log.amountIn * (prices[log.tokenInSymbol] || 0);
    const outputValue = log.amountOut * (prices[log.tokenOutSymbol] || 0);
    const volumeWQMS = inputValue > 0 ? inputValue : outputValue;
    return { ...log, volumeWQMS: Number.isFinite(volumeWQMS) ? volumeWQMS : 0 };
  }), [logs, prices]);

  const stats: SwapVolumeStats = useMemo(() => {
    let totalVolumeWQMS = 0;
    const perPool: Record<string, number> = {};
    for (const log of pricedLogs) {
      totalVolumeWQMS += log.volumeWQMS;
      perPool[log.pairAddress] = (perPool[log.pairAddress] || 0) + log.volumeWQMS;
    }
    return { totalVolumeWQMS, swapCount: pricedLogs.length, perPool };
  }, [pricedLogs]);

  return {
    logs: pricedLogs,
    stats,
    isLoading,
    volumeScanComplete,
    fromBlock,
    latestBlock,
    refetch: () => setRefreshKey(key => key + 1),
  };
}
