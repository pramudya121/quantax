// ============= Full file contents =============

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient, useWriteContract, useReadContract, useChainId, useWatchContractEvent } from 'wagmi';
import { parseUnits, formatUnits, erc20Abi, type Address } from 'viem';
import { getFarmingContract, FARMING_ABI } from '@/config/farming';
import { QMS_CHAIN_ID, getExplorerUrl } from '@/config/chains';
import { getTokenByAddress } from '@/config/contracts';
import { toast } from 'sonner';

export interface FarmPool {
  pid: number;
  stakingToken: Address;
  rewardToken: Address;
  stakingSymbol: string;
  rewardSymbol: string;
  stakingDecimals: number;
  rewardDecimals: number;
  rewardPerBlock: bigint;
  totalStaked: bigint;
  lastRewardBlock: bigint;
  accRewardPerShare: bigint;
}

export interface UserFarmInfo {
  amount: bigint;
  rewardDebt: bigint;
  pending: bigint;
}

// Error messages we toast ourselves — the caller must not re-toast these.
const HANDLED_ERRORS = new Set([
  'WALLET_NOT_CONNECTED',
  'WRONG_NETWORK',
  'CONTRACT_NOT_DEPLOYED',
  'RPC_UNAVAILABLE',
  'TRANSACTION_REVERTED',
]);

async function fetchTokenMeta(client: any, addr: Address, chainId?: number) {
  const known = getTokenByAddress(addr, chainId);
  if (known) return { symbol: known.symbol, decimals: known.decimals };
  try {
    const [symbol, decimals] = await Promise.all([
      client.readContract({ address: addr, abi: erc20Abi, functionName: 'symbol' }),
      client.readContract({ address: addr, abi: erc20Abi, functionName: 'decimals' }),
    ]);
    const normalizedDecimals = Number(decimals);
    if (typeof symbol !== 'string' || !symbol.trim() || !Number.isInteger(normalizedDecimals) || normalizedDecimals < 0 || normalizedDecimals > 255) {
      return null;
    }
    return { symbol, decimals: normalizedDecimals };
  } catch {
    return null;
  }
}

// Retry transient RPC failures so one flaky read doesn't hide a real pool.
async function readWithRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch {
      // retry
    }
  }
  return null;
}

export function useFarmingOwner() {
  const chainId = useChainId();
  const FARMING_CONTRACT = getFarmingContract(chainId);
  const { data: owner } = useReadContract({
    address: FARMING_CONTRACT,
    abi: FARMING_ABI,
    functionName: 'owner',
    // Only meaningful on QMS Testnet — never read a foreign chain.
    query: { enabled: chainId === QMS_CHAIN_ID },
  });
  const { address } = useAccount();
  const isAdmin = !!(
    chainId === QMS_CHAIN_ID &&
    owner &&
    address &&
    (owner as string).toLowerCase() === address.toLowerCase()
  );
  return { owner: owner as Address | undefined, isAdmin };
}

export function useFarmingPools() {
  const chainId = useChainId();
  const FARMING_CONTRACT = getFarmingContract(chainId);
  const client = usePublicClient() as any;
  const [pools, setPools] = useState<FarmPool[]>([]);
  const [loading, setLoading] = useState(false);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useWatchContractEvent({
    address: FARMING_CONTRACT,
    abi: FARMING_ABI,
    eventName: 'PoolAdded',
    enabled: chainId === QMS_CHAIN_ID,
    onLogs: refresh,
  });
  useWatchContractEvent({
    address: FARMING_CONTRACT,
    abi: FARMING_ABI,
    eventName: 'RewardPerBlockUpdated',
    enabled: chainId === QMS_CHAIN_ID,
    onLogs: refresh,
  });
  useWatchContractEvent({
    address: FARMING_CONTRACT,
    abi: FARMING_ABI,
    eventName: 'Deposit',
    enabled: chainId === QMS_CHAIN_ID,
    onLogs: refresh,
  });
  useWatchContractEvent({
    address: FARMING_CONTRACT,
    abi: FARMING_ABI,
    eventName: 'Withdraw',
    enabled: chainId === QMS_CHAIN_ID,
    onLogs: refresh,
  });
  useWatchContractEvent({
    address: FARMING_CONTRACT,
    abi: FARMING_ABI,
    eventName: 'EmergencyWithdraw',
    enabled: chainId === QMS_CHAIN_ID,
    onLogs: refresh,
  });

  useEffect(() => {
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!client) return;
    if (chainId !== QMS_CHAIN_ID) {
      // Never probe a foreign chain: the farming address only exists on
      // QMS Testnet, and reads elsewhere would silently return garbage.
      setWrongNetwork(true);
      setPools([]);
      return;
    }
    setWrongNetwork(false);
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Verify the contract is actually deployed on this chain first —
        // a call to an empty address "succeeds" and hides real problems.
        const code = await client.getBytecode({ address: FARMING_CONTRACT });
        if (!code || code === '0x') {
          if (!cancelled) setPools([]);
          return;
        }

        // The contract has no poolLength getter. Read bounded contiguous batches so
        // discovery stays responsive without launching hundreds of RPC requests.
        const found: FarmPool[] = [];
        const poolBatchSize = 10;
        for (let startPid = 0; startPid < 200; startPid += poolBatchSize) {
          if (cancelled) return;
          const batch = await Promise.all(
            Array.from({ length: poolBatchSize }, (_, offset) => startPid + offset).map(async pid => ({
              pid,
              info: await readWithRetry(() =>
                client.readContract({
                  address: FARMING_CONTRACT,
                  abi: FARMING_ABI,
                  functionName: 'poolInfo',
                  args: [BigInt(pid)],
                })
              ),
            })),
          );
          const firstMissing = batch.findIndex(({ info }) => !info);
          const validBatch = firstMissing === -1 ? batch : batch.slice(0, firstMissing);
          const poolData = validBatch.map(({ pid, info }) => {
            const [stakingToken, rewardToken, lastRewardBlock, accRewardPerShare, rewardPerBlock, totalStaked] =
              info as readonly [Address, Address, bigint, bigint, bigint, bigint];
            return { pid, stakingToken, rewardToken, lastRewardBlock, accRewardPerShare, rewardPerBlock, totalStaked };
          });
          const enriched = await Promise.all(poolData.map(async pool => {
            const [sMeta, rMeta] = await Promise.all([
              fetchTokenMeta(client, pool.stakingToken, chainId),
              fetchTokenMeta(client, pool.rewardToken, chainId),
            ]);
            // Do not invent symbols or decimals when an unknown token cannot be read.
            if (!sMeta || !rMeta) return null;
            return {
              ...pool,
              stakingSymbol: sMeta.symbol,
              rewardSymbol: rMeta.symbol,
              stakingDecimals: sMeta.decimals,
              rewardDecimals: rMeta.decimals,
            };
          }));
          found.push(...enriched.filter((pool): pool is FarmPool => pool !== null));
          if (firstMissing !== -1) break;
        }
        if (!cancelled) setPools(found);
      } catch {
        if (!cancelled) setPools([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, chainId, refreshKey]);

  return { pools, loading, refresh, wrongNetwork };
}

export function useUserFarmInfo(pid: number | null) {
  const chainId = useChainId();
  const FARMING_CONTRACT = getFarmingContract(chainId);
  const { address } = useAccount();
  const client = usePublicClient() as any;
  const [info, setInfo] = useState<UserFarmInfo | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!client || pid === null || !address || chainId !== QMS_CHAIN_ID) {
      setInfo(null);
      return;
    }
    let cancelled = false;
    const fetchInfo = async () => {
      try {
        const [u, pending] = await Promise.all([
          client.readContract({
            address: FARMING_CONTRACT,
            abi: FARMING_ABI,
            functionName: 'userInfo',
            args: [BigInt(pid), address],
          }) as Promise<readonly [bigint, bigint]>,
          client.readContract({
            address: FARMING_CONTRACT,
            abi: FARMING_ABI,
            functionName: 'pendingReward',
            args: [BigInt(pid), address],
          }) as Promise<bigint>,
        ]);
        if (!cancelled) setInfo({ amount: u[0], rewardDebt: u[1], pending });
      } catch {
        // Unknown is not the same as an on-chain zero balance.
        if (!cancelled) setInfo(null);
      }
    };
    fetchInfo();
    // Auto-refresh every 8s for live pending rewards
    const interval = setInterval(fetchInfo, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [client, pid, address, chainId, refreshKey]);

  return { info, refresh };
}

function assertValidPoolId(pid: number) {
  if (!Number.isSafeInteger(pid) || pid < 0 || pid >= 200) {
    throw new Error('Invalid farming pool ID');
  }
}

function assertPositiveAmount(amount: bigint) {
  if (amount <= 0n) throw new Error('Amount must be greater than zero');
}

export function useFarmingActions() {
  const chainId = useChainId();
  const FARMING_CONTRACT = getFarmingContract(chainId);
  const { writeContractAsync: writeRaw } = useWriteContract();
  const writeContractAsync = writeRaw as any;
  const { address } = useAccount();
  const client = usePublicClient() as any;

  // Pre-flight guard: wallet connected, correct network, contract deployed.
  // Without this a transaction to an empty address is mined successfully
  // and does nothing — the exact bug that made added farms never appear.
  const guard = useCallback(
    async (toastId: string) => {
      if (!address) {
        toast.error('Connect your wallet first', { id: toastId });
        throw new Error('WALLET_NOT_CONNECTED');
      }
      if (chainId !== QMS_CHAIN_ID) {
        toast.error('Wrong network — switch to QMS Testnet, then try again.', { id: toastId });
        throw new Error('WRONG_NETWORK');
      }
      if (!client) {
        toast.error('RPC client is unavailable. Check your connection and retry.', { id: toastId });
        throw new Error('RPC_UNAVAILABLE');
      }
      let code: string | undefined;
      try {
        code = await client.getBytecode({ address: FARMING_CONTRACT });
      } catch (e: any) {
        const reason = e?.shortMessage || e?.message;
        toast.error(
          reason ? `Could not verify farming contract: ${reason}` : 'Could not verify farming contract. Check your RPC connection and retry.',
          { id: toastId, duration: 12_000 }
        );
        throw new Error('RPC_UNAVAILABLE');
      }
      if (!code || code === '0x') {
        toast.error('Farming contract not found on this network — switch to QMS Testnet.', { id: toastId });
        throw new Error('CONTRACT_NOT_DEPLOYED');
      }
    },
    [address, chainId, client, FARMING_CONTRACT]
  );

  // Wait for the receipt and only pass when the transaction truly succeeded.
  const confirmTx = useCallback(
    async (hash: `0x${string}`, toastId: string, errLabel: string) => {
      if (!client) return;
      const receipt = await client.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') {
        toast.error(`${errLabel} — ${getExplorerUrl(QMS_CHAIN_ID, `tx/${hash}`)}`, {
          id: toastId,
          duration: 10_000,
        });
        throw new Error('TRANSACTION_REVERTED');
      }
    },
    [client]
  );

  const ensureAllowance = useCallback(
    async (token: Address, amount: bigint) => {
      if (!address || !client) throw new Error('Wallet not connected');
      const allowance = (await client.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address, FARMING_CONTRACT],
      })) as bigint;
      if (allowance < amount) {
        const hash = await writeContractAsync({
          address: token,
          abi: erc20Abi,
          functionName: 'approve',
          args: [FARMING_CONTRACT, amount],
        });
        await confirmTx(hash, 'farm-deposit', 'Approval failed on-chain');
      }
    },
    [address, client, FARMING_CONTRACT, writeContractAsync, confirmTx]
  );

  const deposit = useCallback(
    async (pid: number, amount: bigint, stakingToken: Address) => {
      try {
        assertValidPoolId(pid);
        assertPositiveAmount(amount);
        if (!/^0x[a-fA-F0-9]{40}$/.test(stakingToken)) throw new Error('Invalid staking token address');
        await guard('farm-deposit');
        const poolInfo = await client.readContract({
          address: FARMING_CONTRACT,
          abi: FARMING_ABI,
          functionName: 'poolInfo',
          args: [BigInt(pid)],
        }) as readonly [Address, Address, bigint, bigint, bigint, bigint];
        if (poolInfo[0].toLowerCase() !== stakingToken.toLowerCase()) {
          throw new Error('Selected staking token does not match this farm');
        }
        toast.loading('Approving...', { id: 'farm-deposit' });
        await ensureAllowance(stakingToken, amount);
        toast.loading('Depositing...', { id: 'farm-deposit' });
        const hash = await writeContractAsync({
          address: FARMING_CONTRACT,
          abi: FARMING_ABI,
          functionName: 'deposit',
          args: [BigInt(pid), amount],
        });
        await confirmTx(hash, 'farm-deposit', 'Deposit failed on-chain');
        toast.success('Deposited!', { id: 'farm-deposit' });
        return hash;
      } catch (e: any) {
        if (!HANDLED_ERRORS.has(e?.message)) {
          toast.error(e?.shortMessage || e?.message || 'Deposit failed', { id: 'farm-deposit' });
        }
        throw e;
      }
    },
    [client, ensureAllowance, guard, confirmTx, writeContractAsync, FARMING_CONTRACT]
  );

  const withdraw = useCallback(
    async (pid: number, amount: bigint) => {
      try {
        assertValidPoolId(pid);
        assertPositiveAmount(amount);
        await guard('farm-withdraw');
        toast.loading('Withdrawing...', { id: 'farm-withdraw' });
        const hash = await writeContractAsync({
          address: FARMING_CONTRACT,
          abi: FARMING_ABI,
          functionName: 'withdraw',
          args: [BigInt(pid), amount],
        });
        await confirmTx(hash, 'farm-withdraw', 'Withdraw failed on-chain');
        toast.success('Withdrawn!', { id: 'farm-withdraw' });
        return hash;
      } catch (e: any) {
        if (!HANDLED_ERRORS.has(e?.message)) {
          toast.error(e?.shortMessage || e?.message || 'Withdraw failed', { id: 'farm-withdraw' });
        }
        throw e;
      }
    },
    [client, guard, confirmTx, writeContractAsync, FARMING_CONTRACT]
  );

  const harvest = useCallback(
    async (pid: number) => {
      // deposit(pid, 0) harvests pending reward
      try {
        assertValidPoolId(pid);
        await guard('farm-harvest');
        toast.loading('Harvesting...', { id: 'farm-harvest' });
        const hash = await writeContractAsync({
          address: FARMING_CONTRACT,
          abi: FARMING_ABI,
          functionName: 'deposit',
          args: [BigInt(pid), 0n],
        });
        await confirmTx(hash, 'farm-harvest', 'Harvest failed on-chain');
        toast.success('Harvested!', { id: 'farm-harvest' });
        return hash;
      } catch (e: any) {
        if (!HANDLED_ERRORS.has(e?.message)) {
          toast.error(e?.shortMessage || e?.message || 'Harvest failed', { id: 'farm-harvest' });
        }
        throw e;
      }
    },
    [client, guard, confirmTx, writeContractAsync, FARMING_CONTRACT]
  );

  const emergencyWithdraw = useCallback(
    async (pid: number) => {
      try {
        assertValidPoolId(pid);
        await guard('farm-emergency');
        toast.loading('Emergency withdrawing...', { id: 'farm-emergency' });
        const hash = await writeContractAsync({
          address: FARMING_CONTRACT,
          abi: FARMING_ABI,
          functionName: 'emergencyWithdraw',
          args: [BigInt(pid)],
        });
        await confirmTx(hash, 'farm-emergency', 'Emergency withdraw failed on-chain');
        toast.success('Emergency withdrawn (rewards forfeited)', { id: 'farm-emergency' });
        return hash;
      } catch (e: any) {
        if (!HANDLED_ERRORS.has(e?.message)) {
          toast.error(e?.shortMessage || e?.message || 'Emergency withdraw failed', { id: 'farm-emergency' });
        }
        throw e;
      }
    },
    [client, guard, confirmTx, writeContractAsync, FARMING_CONTRACT]
  );

  // Admin
  const addPool = useCallback(
    async (stakingToken: Address, rewardToken: Address, rewardPerBlock: bigint) => {
      try {
        if (!/^0x[a-fA-F0-9]{40}$/.test(stakingToken) || !/^0x[a-fA-F0-9]{40}$/.test(rewardToken)) {
          throw new Error('Invalid token contract address');
        }
        assertPositiveAmount(rewardPerBlock);
        await guard('farm-add');
        toast.loading('Adding pool...', { id: 'farm-add' });
        await client.simulateContract({
          account: address,
          address: FARMING_CONTRACT,
          abi: FARMING_ABI,
          functionName: 'addPool',
          args: [stakingToken, rewardToken, rewardPerBlock],
        });
        const hash = await writeContractAsync({
          address: FARMING_CONTRACT,
          abi: FARMING_ABI,
          functionName: 'addPool',
          args: [stakingToken, rewardToken, rewardPerBlock],
        });
        await confirmTx(hash, 'farm-add', 'Add pool failed on-chain');
        // The current farming contract ABI has no poolLength() getter; a
        // successful receipt confirms addPool completed on-chain.
        toast.success('Pool added!', { id: 'farm-add' });
        return hash;
      } catch (e: any) {
        if (!HANDLED_ERRORS.has(e?.message)) {
          const reason =
            e?.cause?.reason ||
            e?.cause?.shortMessage ||
            e?.details ||
            e?.shortMessage ||
            e?.message ||
            'Unknown wallet or contract error';
          toast.error(`Add pool failed: ${reason}`, { id: 'farm-add', duration: 12_000 });
        }
        throw e;
      }
    },
    [client, guard, confirmTx, writeContractAsync, FARMING_CONTRACT]
  );

  const updateRewardPerBlock = useCallback(
    async (pid: number, rewardPerBlock: bigint) => {
      try {
        assertValidPoolId(pid);
        assertPositiveAmount(rewardPerBlock);
        await guard('farm-upd');
        toast.loading('Updating reward...', { id: 'farm-upd' });
        const hash = await writeContractAsync({
          address: FARMING_CONTRACT,
          abi: FARMING_ABI,
          functionName: 'updateRewardPerBlock',
          args: [BigInt(pid), rewardPerBlock],
        });
        await confirmTx(hash, 'farm-upd', 'Update failed on-chain');
        toast.success('Reward updated!', { id: 'farm-upd' });
        return hash;
      } catch (e: any) {
        if (!HANDLED_ERRORS.has(e?.message)) {
          toast.error(e?.shortMessage || e?.message || 'Update failed', { id: 'farm-upd' });
        }
        throw e;
      }
    },
    [client, guard, confirmTx, writeContractAsync, FARMING_CONTRACT]
  );

  const massUpdatePools = useCallback(async () => {
    try {
      await guard('farm-mass');
      toast.loading('Mass updating pools...', { id: 'farm-mass' });
      const hash = await writeContractAsync({
        address: FARMING_CONTRACT,
        abi: FARMING_ABI,
        functionName: 'massUpdatePools',
      });
      await confirmTx(hash, 'farm-mass', 'Mass update failed on-chain');
      toast.success('All pools updated!', { id: 'farm-mass' });
      return hash;
    } catch (e: any) {
      if (!HANDLED_ERRORS.has(e?.message)) {
        toast.error(e?.shortMessage || e?.message || 'Failed', { id: 'farm-mass' });
      }
      throw e;
    }
  }, [client, guard, confirmTx, writeContractAsync, FARMING_CONTRACT]);

  const updatePool = useCallback(
    async (pid: number) => {
      try {
        assertValidPoolId(pid);
        await guard('farm-updp');
        toast.loading('Updating pool...', { id: 'farm-updp' });
        const hash = await writeContractAsync({
          address: FARMING_CONTRACT,
          abi: FARMING_ABI,
          functionName: 'updatePool',
          args: [BigInt(pid)],
        });
        await confirmTx(hash, 'farm-updp', 'Pool update failed on-chain');
        toast.success('Pool updated!', { id: 'farm-updp' });
        return hash;
      } catch (e: any) {
        if (!HANDLED_ERRORS.has(e?.message)) {
          toast.error(e?.shortMessage || e?.message || 'Failed', { id: 'farm-updp' });
        }
        throw e;
      }
    },
    [client, guard, confirmTx, writeContractAsync, FARMING_CONTRACT]
  );

  const transferOwnership = useCallback(
    async (newOwner: Address) => {
      try {
        if (!/^0x[a-fA-F0-9]{40}$/.test(newOwner) || /^0x0{40}$/i.test(newOwner)) {
          throw new Error('Invalid owner address');
        }
        await guard('farm-own');
        toast.loading('Transferring ownership...', { id: 'farm-own' });
        const hash = await writeContractAsync({
          address: FARMING_CONTRACT,
          abi: FARMING_ABI,
          functionName: 'transferOwnership',
          args: [newOwner],
        });
        await confirmTx(hash, 'farm-own', 'Transfer failed on-chain');
        toast.success('Ownership transferred', { id: 'farm-own' });
        return hash;
      } catch (e: any) {
        if (!HANDLED_ERRORS.has(e?.message)) {
          toast.error(e?.shortMessage || e?.message || 'Failed', { id: 'farm-own' });
        }
        throw e;
      }
    },
    [client, guard, confirmTx, writeContractAsync, FARMING_CONTRACT]
  );

  return {
    deposit,
    withdraw,
    harvest,
    emergencyWithdraw,
    addPool,
    updateRewardPerBlock,
    massUpdatePools,
    updatePool,
    transferOwnership,
  };
}

export function formatTokenAmount(amount: bigint, decimals: number, precision = 4) {
  const s = formatUnits(amount, decimals);
  const [int, dec = ''] = s.split('.');
  return dec ? `${int}.${dec.slice(0, precision)}` : int;
}

// QMS Testnet block time (approx). Used to estimate APR.
const BLOCKS_PER_YEAR = (365 * 24 * 60 * 60) / 2; // assuming ~2s blocks

/**
 * Calculate annual APR % for a farm pool.
 * stakedUsd & rewardUsd are unit prices (per 1 token) of staking and reward tokens.
 */
export function calculateAPR(
  pool: FarmPool,
  stakingTokenPriceUsd: number,
  rewardTokenPriceUsd: number,
  blocksPerYear: number = BLOCKS_PER_YEAR
): number | null {
  if (pool.totalStaked === 0n || stakingTokenPriceUsd <= 0) return null;
  const rewardPerYear =
    Number(formatUnits(pool.rewardPerBlock, pool.rewardDecimals)) * blocksPerYear;
  const totalStaked = Number(formatUnits(pool.totalStaked, pool.stakingDecimals));
  const rewardUsd = rewardPerYear * rewardTokenPriceUsd;
  const stakedUsd = totalStaked * stakingTokenPriceUsd;
  if (stakedUsd <= 0) return null;
  return (rewardUsd / stakedUsd) * 100;
}

export { BLOCKS_PER_YEAR };

export { parseUnits };
