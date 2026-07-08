import { useEffect, useRef } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';
import { toast } from 'sonner';
import { useLiquidityPools } from './useLiquidityPools';

const SWAP_EVENT = parseAbiItem(
  'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)'
);
const MINT_EVENT = parseAbiItem(
  'event Mint(address indexed sender, uint256 amount0, uint256 amount1)'
);
const BURN_EVENT = parseAbiItem(
  'event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to)'
);

const POLL_MS = 15_000;
const LOOKBACK_BLOCKS = 500n; // small window so first poll doesn't spam old toasts

/**
 * Watches on-chain Swap events emitted from any indexed pool and toasts the
 * user whenever a swap they sent OR received completes. Uses light polling
 * instead of per-pool WebSocket subs to stay friendly to public RPCs.
 */
export function useLiveSwapNotifications() {
  const { address } = useAccount();
  const client = usePublicClient() as any;
  const { pools } = useLiquidityPools();

  const seenTx = useRef<Set<string>>(new Set());
  const cursor = useRef<bigint | null>(null);
  const initialised = useRef(false);

  useEffect(() => {
    if (!client || !address || pools.length === 0) return;
    let cancelled = false;
    const addresses = pools.map(p => p.pairAddress);
    const poolByAddr = new Map(
      pools.map(p => [p.pairAddress.toLowerCase(), p] as const)
    );
    const lower = address.toLowerCase();

    const tick = async () => {
      try {
        const latest = await client.getBlockNumber();
        if (cursor.current === null) {
          cursor.current = latest > LOOKBACK_BLOCKS ? latest - LOOKBACK_BLOCKS : 0n;
        }
        const from = cursor.current;
        if (from > latest) return;

        const logs = await client.getLogs({
          address: addresses,
          event: SWAP_EVENT,
          fromBlock: from,
          toBlock: latest,
        });

        cursor.current = latest + 1n;

        for (const log of logs) {
          const key = `${log.transactionHash}-${log.logIndex}`;
          if (seenTx.current.has(key)) continue;
          seenTx.current.add(key);

          const sender = (log.args.sender as string).toLowerCase();
          const to = (log.args.to as string).toLowerCase();
          if (sender !== lower && to !== lower) continue;

          // Skip toasts fired for the historical backfill on first run —
          // the user hasn't performed those in the current session.
          if (!initialised.current) continue;

          const pool = poolByAddr.get((log.address as string).toLowerCase());
          if (!pool) continue;
          const dec0 = pool.token0?.decimals ?? 18;
          const dec1 = pool.token1?.decimals ?? 18;
          const a0In = log.args.amount0In as bigint;
          const a0Out = log.args.amount0Out as bigint;
          const a1In = log.args.amount1In as bigint;
          const a1Out = log.args.amount1Out as bigint;
          const isToken0In = a0In > 0n;
          const amountIn = parseFloat(
            formatUnits(isToken0In ? a0In : a1In, isToken0In ? dec0 : dec1)
          );
          const amountOut = parseFloat(
            formatUnits(isToken0In ? a1Out : a0Out, isToken0In ? dec1 : dec0)
          );
          const symIn = isToken0In ? pool.token0Symbol : pool.token1Symbol;
          const symOut = isToken0In ? pool.token1Symbol : pool.token0Symbol;
          const fmt = (n: number) =>
            n.toLocaleString(undefined, { maximumFractionDigits: 6 });

          toast.success(`Swap confirmed`, {
            id: log.transactionHash,
            description: `${fmt(amountIn)} ${symIn} → ${fmt(amountOut)} ${symOut}`,
            action: {
              label: 'View',
              onClick: () =>
                window.open(
                  `https://testnet.iopn.tech/tx/${log.transactionHash}`,
                  '_blank',
                  'noopener,noreferrer'
                ),
            },
          });
        }

        // Mark ready after the first successful poll so future logs alert.
        initialised.current = true;
      } catch {
        // ignore transient RPC errors
      }
    };

    // Prime immediately, then poll.
    tick();
    const id = setInterval(() => {
      if (!cancelled) tick();
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [client, address, pools]);
}
