import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient, useWriteContract, useReadContract, useChainId } from 'wagmi';
import { parseUnits, formatUnits, erc20Abi, type Address } from 'viem';
import { getFarmingContract, FARMING_ABI } from '@/config/farming';
import { QMS_CHAIN_ID } from '@/config/chains';
import { getExplorerTxUrl } from '@/config/chains';
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

async function fetchTokenMeta(client: any, addr: Address, chainId?: number) {
  const known = getTokenByAddress(addr, chainId);
  if (known) return { symbol: known.symbol, decimals: known.decimals };
  try {
    const [symbol, decimals] = await Promise.all([
      client.readContract({ address: addr, abi: erc20Abi, functionName: 'symbol' }),
      client.readContract({ address: addr, abi: erc20Abi, functionName: 'decimals' }),
    ]);
    return { symbol: String(symbol), decimals: Number(decimals) };
  } catch {
    return { symbol: '???', decimals: 18 };
  }
}

export function useFarmingOwner() {
  const chainId = useChainId();
  const FARMING_CONTRACT = getFarmingContract(chainId);
  const { data: owner } = useReadContract({
    address: FARMING_CONTRACT,
    abi: FARMING_ABI,
    functionName: 'owner',
  });
  const { address } = useAccount();
  const isAdmin = !!(owner && address && (owner as string).toLowerCase() === address.toLowerCase());
  return { owner: owner as Address | undefined, isAdmin };
}

export function useFarmingPools() {
  const chainId = useChainId();
  const FARMING_CONTRACT = getFarmingContract(chainId);
  const client = usePublicClient() as any;
  const [pools, setPools] = useState<FarmPool[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Discover pools by probing poolInfo(pid) until it reverts
        const found: FarmPool[] = [];
        for (let pid = 0; pid < 50; pid++) {
          try {
            const info = (await client.readContract({
              address: FARMING_CONTRACT,
              abi: FARMING_ABI,
              functionName: 'poolInfo',
              args: [BigInt(pid)],
            })) as readonly [Address, Address, bigint, bigint, bigint, bigint];

            const [stakingToken, rewardToken, lastRewardBlock, accRewardPerShare, rewardPerBlock, totalStaked] = info;
            const [sMeta, rMeta] = await Promise.all([
              fetchTokenMeta(client, stakingToken),
              fetchTokenMeta(client, rewardToken),
            ]);
            found.push({
              pid,
              stakingToken,
              rewardToken,
              stakingSymbol: sMeta.symbol,
              rewardSymbol: rMeta.symbol,
              stakingDecimals: sMeta.decimals,
              rewardDecimals: rMeta.decimals,
              rewardPerBlock,
              totalStaked,
              lastRewardBlock,
              accRewardPerShare,
            });
          } catch {
            break;
          }
        }
        if (!cancelled) setPools(found);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, refreshKey]);

  return { pools, loading, refresh };
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
    if (!client || pid === null || !address) {
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
        if (!cancelled) setInfo({ amount: 0n, rewardDebt: 0n, pending: 0n });
      }
    };
    fetchInfo();
    // Auto-refresh every 8s for live pending rewards
    const interval = setInterval(fetchInfo, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [client, pid, address, refreshKey]);

  return { info, refresh };
}

export function useFarmingActions() {
  const chainId = useChainId();
  const FARMING_CONTRACT = getFarmingContract(chainId);
  const { writeContractAsync: writeRaw } = useWriteContract();
  const writeContractAsync = writeRaw as any;
  const { address } = useAccount();
  const client = usePublicClient() as any;

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
        await client.waitForTransactionReceipt({ hash });
      }
    },
    [address, client, writeContractAsync]
  );

  const deposit = useCallback(
    async (pid: number, amount: bigint, stakingToken: Address) => {
      try {
        toast.loading('Approving...', { id: 'farm-deposit' });
        await ensureAllowance(stakingToken, amount);
        toast.loading('Depositing...', { id: 'farm-deposit' });
        const hash = await writeContractAsync({
          address: FARMING_CONTRACT,
          abi: FARMING_ABI,
          functionName: 'deposit',
          args: [BigInt(pid), amount],
        });
        if (client) await client.waitForTransactionReceipt({ hash });
        toast.success('Deposited!', { id: 'farm-deposit' });
        return hash;
      } catch (e: any) {
        toast.error(e?.shortMessage || e?.message || 'Deposit failed', { id: 'farm-deposit' });
        throw e;
      }
    },
    [client, ensureAllowance, writeContractAsync]
  );

  const withdraw = useCallback(
    async (pid: number, amount: bigint) => {
      try {
        toast.loading('Withdrawing...', { id: 'farm-withdraw' });
        const hash = await writeContractAsync({
          address: FARMING_CONTRACT,
          abi: FARMING_ABI,
          functionName: 'withdraw',
          args: [BigInt(pid), amount],
        });
        if (client) await client.waitForTransactionReceipt({ hash });
        toast.success('Withdrawn!', { id: 'farm-withdraw' });
        return hash;
      } catch (e: any) {
        toast.error(e?.shortMessage || e?.message || 'Withdraw failed', { id: 'farm-withdraw' });
        throw e;
      }
    },
    [client, writeContractAsync]
  );

  const harvest = useCallback(
    async (pid: number) => {
      // deposit(pid, 0) harvests pending reward
      try {
        toast.loading('Harvesting...', { id: 'farm-harvest' });
        const hash = await writeContractAsync({
          address: FARMING_CONTRACT,
          abi: FARMING_ABI,
          functionName: 'deposit',
          args: [BigInt(pid), 0n],
        });
        if (client) await client.waitForTransactionReceipt({ hash });
        toast.success('Harvested!', { id: 'farm-harvest' });
        return hash;
      } catch (e: any) {
        toast.error(e?.shortMessage || e?.message || 'Harvest failed', { id: 'farm-harvest' });
        throw e;
      }
    },
    [client, writeContractAsync]
  );

  const emergencyWithdraw = useCallback(
    async (pid: number) => {
      try {
        toast.loading('Emergency withdrawing...', { id: 'farm-emergency' });
        const hash = await writeContractAsync({
          address: FARMING_CONTRACT,
          abi: FARMING_ABI,
          functionName: 'emergencyWithdraw',
          args: [BigInt(pid)],
        });
        if (client) await client.waitForTransactionReceipt({ hash });
        toast.success('Emergency withdrawn (rewards forfeited)', { id: 'farm-emergency' });
        return hash;
      } catch (e: any) {
        toast.error(e?.shortMessage || e?.message || 'Emergency withdraw failed', { id: 'farm-emergency' });
        throw e;
      }
    },
    [client, writeContractAsync]
  );

  // Admin
  const addPool = useCallback(
    async (stakingToken: Address, rewardToken: Address, rewardPerBlock: bigint) => {
      try {
        toast.loading('Adding pool...', { id: 'farm-add' });
        const hash = await writeContractAsync({
          address: FARMING_CONTRACT,
          abi: FARMING_ABI,
          functionName: 'addPool',
          args: [stakingToken, rewardToken, rewardPerBlock],
        });
        if (client) await client.waitForTransactionReceipt({ hash });
        toast.success('Pool added!', { id: 'farm-add' });
        return hash;
      } catch (e: any) {
        toast.error(e?.shortMessage || e?.message || 'Add pool failed', { id: 'farm-add' });
        throw e;
      }
    },
    [client, writeContractAsync]
  );

  const updateRewardPerBlock = useCallback(
    async (pid: number, rewardPerBlock: bigint) => {
      try {
        toast.loading('Updating reward...', { id: 'farm-upd' });
        const hash = await writeContractAsync({
          address: FARMING_CONTRACT,
          abi: FARMING_ABI,
          functionName: 'updateRewardPerBlock',
          args: [BigInt(pid), rewardPerBlock],
        });
        if (client) await client.waitForTransactionReceipt({ hash });
        toast.success('Reward updated!', { id: 'farm-upd' });
        return hash;
      } catch (e: any) {
        toast.error(e?.shortMessage || e?.message || 'Update failed', { id: 'farm-upd' });
        throw e;
      }
    },
    [client, writeContractAsync]
  );

  const massUpdatePools = useCallback(async () => {
    try {
      toast.loading('Mass updating pools...', { id: 'farm-mass' });
      const hash = await writeContractAsync({
        address: FARMING_CONTRACT,
        abi: FARMING_ABI,
        functionName: 'massUpdatePools',
      });
      if (client) await client.waitForTransactionReceipt({ hash });
      toast.success('All pools updated!', { id: 'farm-mass' });
      return hash;
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || 'Failed', { id: 'farm-mass' });
      throw e;
    }
  }, [client, writeContractAsync]);

  const updatePool = useCallback(
    async (pid: number) => {
      try {
        toast.loading('Updating pool...', { id: 'farm-updp' });
        const hash = await writeContractAsync({
          address: FARMING_CONTRACT,
          abi: FARMING_ABI,
          functionName: 'updatePool',
          args: [BigInt(pid)],
        });
        if (client) await client.waitForTransactionReceipt({ hash });
        toast.success('Pool updated!', { id: 'farm-updp' });
        return hash;
      } catch (e: any) {
        toast.error(e?.shortMessage || e?.message || 'Failed', { id: 'farm-updp' });
        throw e;
      }
    },
    [client, writeContractAsync]
  );

  const transferOwnership = useCallback(
    async (newOwner: Address) => {
      try {
        toast.loading('Transferring ownership...', { id: 'farm-own' });
        const hash = await writeContractAsync({
          address: FARMING_CONTRACT,
          abi: FARMING_ABI,
          functionName: 'transferOwnership',
          args: [newOwner],
        });
        if (client) await client.waitForTransactionReceipt({ hash });
        toast.success('Ownership transferred', { id: 'farm-own' });
        return hash;
      } catch (e: any) {
        toast.error(e?.shortMessage || e?.message || 'Failed', { id: 'farm-own' });
        throw e;
      }
    },
    [client, writeContractAsync]
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

