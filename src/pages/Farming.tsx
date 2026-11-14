import { SEO } from '@/components/seo/SEO';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { formatUnits, parseUnits, type Address } from 'viem';
import { useAccount, usePublicClient, useReadContract, useChainId, useSwitchChain } from 'wagmi';
import { erc20Abi } from 'viem';
import {
  Sprout, TrendingUp, Lock, Gift, AlertTriangle, Loader2, RefreshCw, Settings,
  Coins, Percent, Flame, ExternalLink, Search, SlidersHorizontal,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Spotlight } from '@/components/ui/magic/Spotlight';
import { GlowOrb } from '@/components/ui/premium/GlowOrb';
import { Meteors } from '@/components/ui/magic/Meteors';
import { ParticleField } from '@/components/ui/premium/ParticleField';
import { FarmCrystal3D } from '@/components/farming/FarmCrystal3D';

import {
  FarmPool,
  calculateAPR,
  formatTokenAmount,
  useFarmingActions,
  useFarmingOwner,
  useFarmingPools,
  useUserFarmInfo,
} from '@/hooks/useFarming';
import { getFarmingContract } from '@/config/farming';
import { useTokenPrices } from '@/hooks/usePrices';
import { getTokenByAddress } from '@/config/contracts';
import { QMS_CHAIN_ID, getExplorerUrl } from '@/config/chains';
import { getTokenPrice } from '@/lib/pricing';

function TokenLogo({ address, symbol, size = 32 }: { address: string; symbol: string; size?: number }) {
  const meta = getTokenByAddress(address);
  const src = meta?.logoURI;
  if (src) {
    return (
      <img
        src={src}
        alt={symbol}
        className="rounded-full border-2 border-background object-cover bg-card"
        style={{ width: size, height: size }}
        onError={(e) => { (e.target as HTMLImageElement).src = '/tokens/qms.svg'; }}
      />
    );
  }
  return (
    <div
      className="rounded-full border-2 border-background flex items-center justify-center bg-gradient-to-br from-primary/40 to-accent/40 font-bold text-foreground"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {symbol.charAt(0)}
    </div>
  );
}

function formatWqms(v: number) {
  if (!Number.isFinite(v) || v <= 0) return '0 WQMS';
  if (v < 0.01) return '<0.01 WQMS';
  return `${v.toLocaleString(undefined, { maximumFractionDigits: 2 })} WQMS est.`;
}

function FarmCard({
  pool,
  prices,
  onAction,
  onPositionChange,
}: {
  pool: FarmPool;
  prices: Record<string, number>;
  onAction: () => void;
  onPositionChange: (pid: number, amount: bigint, pending: bigint) => void;
}) {
  const { address } = useAccount();
  const FARMING_CONTRACT = getFarmingContract(useChainId());
  const client = usePublicClient();
  const { info, refresh } = useUserFarmInfo(pool.pid);
  const { deposit, withdraw, harvest, emergencyWithdraw } = useFarmingActions();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [emergencyAck, setEmergencyAck] = useState(false);

  const { data: balanceRaw } = useReadContract({
    address: pool.stakingToken,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 12000 },
  });
  const balance = (balanceRaw as bigint | undefined) ?? 0n;

  // Track allowance live
  useEffect(() => {
    if (!address || !client) return;
    let cancelled = false;
    const fetch = async () => {
      try {
        const a = (await client.readContract({
          address: pool.stakingToken,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, FARMING_CONTRACT],
        })) as bigint;
        if (!cancelled) setAllowance(a);
      } catch {
        if (!cancelled) setAllowance(0n);
      }
    };
    fetch();
    const id = setInterval(fetch, 12000);
    return () => { cancelled = true; clearInterval(id); };
  }, [address, client, pool.stakingToken, FARMING_CONTRACT]);

  const handle = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      refresh();
      onAction();
      setAmount('');
    } catch {
      // The contract action hook already reports wallet and transaction errors.
    }
    setBusy(false);
  };

  const staked = info?.amount ?? 0n;
  const pending = info?.pending ?? 0n;

  useEffect(() => {
    onPositionChange(pool.pid, staked, pending);
  }, [onPositionChange, pool.pid, staked, pending]);

  // Derived numbers
  const stakingPrice = getTokenPrice(prices, pool.stakingToken);
  const rewardPrice = getTokenPrice(prices, pool.rewardToken);
  const apr = calculateAPR(pool, stakingPrice, rewardPrice);
  const totalStakedNum = Number(formatUnits(pool.totalStaked, pool.stakingDecimals));
  const userStakedNum = Number(formatUnits(staked, pool.stakingDecimals));
  const userSharePct = totalStakedNum > 0 ? (userStakedNum / totalStakedNum) * 100 : 0;
  const userStakedWqms = userStakedNum * stakingPrice;
  const pendingNum = Number(formatUnits(pending, pool.rewardDecimals));
  const pendingWqms = pendingNum * rewardPrice;
  const tvlWqms = totalStakedNum * stakingPrice;

  const parsedAmt = (() => {
    try { return amount ? parseUnits(amount, pool.stakingDecimals) : 0n; }
    catch { return 0n; }
  })();
  const needsApproval = parsedAmt > 0n && allowance < parsedAmt;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 200 }}
    >
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/20 blur-3xl" />

        <div className="relative p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Dual token logos */}
              <div className="flex -space-x-2 shrink-0">
                <TokenLogo address={pool.stakingToken} symbol={pool.stakingSymbol} size={40} />
                <TokenLogo address={pool.rewardToken} symbol={pool.rewardSymbol} size={40} />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-base font-bold truncate flex items-center gap-1.5">
                  <Sprout className="w-3.5 h-3.5 text-primary shrink-0" />
                  Stake {pool.stakingSymbol}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  Earn <span className="text-accent font-semibold">{pool.rewardSymbol}</span>
                  {pool.rewardPerBlock === 0n && (
                    <span className="ml-1 px-1 py-0.5 rounded text-[8px] bg-destructive/15 text-destructive">PAUSED</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="px-2 py-1 rounded-md text-[10px] uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                PID #{pool.pid}
              </span>
              {apr !== null && (
                <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-gradient-to-r from-success/20 to-accent/20 text-success border border-success/30 inline-flex items-center gap-1">
                  <Percent className="w-2.5 h-2.5" />
                  {apr.toLocaleString(undefined, { maximumFractionDigits: 2 })}% APR
                </span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg p-2.5 bg-background/40 border border-border/40">
              <div className="text-[9px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-2.5 h-2.5" /> RPB
              </div>
              <div className="font-mono text-xs font-bold text-accent mt-1 truncate">
                {formatTokenAmount(pool.rewardPerBlock, pool.rewardDecimals, 3)}
              </div>
            </div>
            <div className="rounded-lg p-2.5 bg-background/40 border border-border/40">
              <div className="text-[9px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Staked
              </div>
              <div className="font-mono text-xs font-bold mt-1 truncate">
                {totalStakedNum.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="rounded-lg p-2.5 bg-background/40 border border-border/40">
              <div className="text-[9px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Coins className="w-2.5 h-2.5" /> TVL
              </div>
              <div className="font-mono text-xs font-bold mt-1 truncate">{formatWqms(tvlWqms)}</div>
            </div>
          </div>

          {/* User position */}
          {address && (
            <div className="rounded-xl p-3 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Your Stake</span>
                <span className="text-right">
                  <div className="font-mono font-semibold">
                    {formatTokenAmount(staked, pool.stakingDecimals)} {pool.stakingSymbol}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatWqms(userStakedWqms)} · {userSharePct.toFixed(2)}% share
                  </div>
                </span>
              </div>
              <div className="flex justify-between text-xs items-center">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Gift className="w-3 h-3 text-accent" /> Pending
                </span>
                <span className="text-right">
                  <motion.div
                    key={pending.toString()}
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 1 }}
                    className="font-mono font-semibold text-accent"
                  >
                    {formatTokenAmount(pending, pool.rewardDecimals, 6)} {pool.rewardSymbol}
                  </motion.div>
                  <div className="text-[10px] text-muted-foreground">{formatWqms(pendingWqms)}</div>
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-1 border-accent/40 text-accent hover:bg-accent/10"
                disabled={busy || pending === 0n}
                onClick={() => handle(() => harvest(pool.pid))}
              >
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : (<><Gift className="w-3 h-3 mr-1" /> Harvest</>)}
              </Button>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="stake">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="stake">Stake</TabsTrigger>
              <TabsTrigger value="unstake">Unstake</TabsTrigger>
            </TabsList>
            <TabsContent value="stake" className="space-y-2 pt-3">
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pr-16 font-mono"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30"
                  onClick={() => setAmount(formatUnits(balance, pool.stakingDecimals))}
                >
                  MAX
                </button>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{needsApproval ? 'Approval needed' : 'Approved ✓'}</span>
                <span>Balance: {formatTokenAmount(balance, pool.stakingDecimals)}</span>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                disabled={busy || !address || !amount || Number(amount) <= 0 || parsedAmt > balance}
                onClick={() => handle(() => deposit(pool.pid, parsedAmt, pool.stakingToken))}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> :
                  parsedAmt > balance ? 'Insufficient Balance' :
                  needsApproval ? `Approve & Stake ${pool.stakingSymbol}` :
                  `Stake ${pool.stakingSymbol}`}
              </Button>
            </TabsContent>
            <TabsContent value="unstake" className="space-y-2 pt-3">
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pr-16 font-mono"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30"
                  onClick={() => setAmount(formatUnits(staked, pool.stakingDecimals))}
                >
                  MAX
                </button>
              </div>
              <div className="text-[10px] text-muted-foreground text-right">
                Staked: {formatTokenAmount(staked, pool.stakingDecimals)} {pool.stakingSymbol}
              </div>
              <Button
                className="w-full"
                variant="secondary"
                disabled={busy || !address || !amount || Number(amount) <= 0 || parsedAmt > staked}
                onClick={() => handle(() => withdraw(pool.pid, parsedAmt))}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> :
                  parsedAmt > staked ? 'Exceeds Staked' : 'Unstake'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full min-h-11 text-destructive hover:bg-destructive/10"
                disabled={busy || staked === 0n}
                onClick={() => { setEmergencyAck(false); setEmergencyOpen(true); }}
              >
                <AlertTriangle className="w-3 h-3 mr-1" /> Emergency Withdraw (forfeit rewards)
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        <Dialog open={emergencyOpen} onOpenChange={setEmergencyOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Emergency Withdraw
              </DialogTitle>
              <DialogDescription className="text-left space-y-2 pt-2">
                <span className="block">
                  This will immediately unstake <b>{formatTokenAmount(staked, 18, 6)} LP</b> from the farm.
                </span>
                <span className="block text-destructive font-medium">
                  All pending rewards ({formatTokenAmount(pending, pool.rewardDecimals, 6)} {pool.rewardSymbol}) will be forfeited.
                </span>
                <span className="block text-muted-foreground text-xs">
                  Use this only if the farm contract is misbehaving or you need funds instantly. Prefer "Harvest" + "Unstake" for normal exits.
                </span>
              </DialogDescription>
            </DialogHeader>
            <label className="flex items-start gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5 cursor-pointer">
              <Checkbox
                checked={emergencyAck}
                onCheckedChange={(v) => setEmergencyAck(v === true)}
                className="mt-0.5"
              />
              <span className="text-xs leading-relaxed">
                I understand I will <b>forfeit all pending rewards</b> and cannot recover them.
              </span>
            </label>
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setEmergencyOpen(false)} className="min-h-11">
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!emergencyAck || busy}
                className="min-h-11"
                onClick={async () => {
                  setEmergencyOpen(false);
                  await handle(() => emergencyWithdraw(pool.pid));
                }}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                Confirm Emergency Withdraw
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    </motion.div>
  );
}

export default function Farming() {
  const { pools, loading, refresh, wrongNetwork } = useFarmingPools();
  const { isAdmin } = useFarmingOwner();
  const { switchChain, isPending: switchingNetwork } = useSwitchChain();
  const { prices } = useTokenPrices();
  const { address } = useAccount();
  const [search, setSearch] = useState('');
  const [positionsOnly, setPositionsOnly] = useState(false);
  const [positions, setPositions] = useState<Record<number, { amount: bigint; pending: bigint }>>({});

  const reportPosition = useCallback((pid: number, amount: bigint, pending: bigint) => {
    setPositions((current) => {
      const existing = current[pid];
      if (existing?.amount === amount && existing?.pending === pending) return current;
      return { ...current, [pid]: { amount, pending } };
    });
  }, []);

  const filteredPools = useMemo(() => {
    const term = search.trim().toLowerCase();
    return pools.filter((pool) => {
      const matchesQuery = !term || `${pool.stakingSymbol} ${pool.rewardSymbol} ${pool.pid}`.toLowerCase().includes(term);
      const hasPosition = (positions[pool.pid]?.amount ?? 0n) > 0n;
      return matchesQuery && (!positionsOnly || hasPosition);
    });
  }, [pools, positions, positionsOnly, search]);

  const personalRewards = useMemo(() => {
    const totals = new Map<string, { symbol: string; decimals: number; amount: bigint }>();
    for (const pool of pools) {
      const pending = positions[pool.pid]?.pending ?? 0n;
      if (pending <= 0n) continue;
      const key = pool.rewardToken.toLowerCase();
      const current = totals.get(key);
      totals.set(key, {
        symbol: pool.rewardSymbol,
        decimals: pool.rewardDecimals,
        amount: (current?.amount ?? 0n) + pending,
      });
    }
    return [...totals.values()];
  }, [pools, positions]);
  const positionsCount = pools.filter((pool) => (positions[pool.pid]?.amount ?? 0n) > 0n).length;

  // Aggregate stats
  const summary = useMemo(() => {
    let totalTvl = 0;
    let activePools = 0;
    let bestApr = 0;
    for (const p of pools) {
      const stakeP = getTokenPrice(prices, p.stakingToken);
      const rewardP = getTokenPrice(prices, p.rewardToken);
      const staked = Number(formatUnits(p.totalStaked, p.stakingDecimals));
      totalTvl += staked * stakeP;
      if (p.totalStaked > 0n) activePools += 1;
      const apr = calculateAPR(p, stakeP, rewardP);
      if (apr && apr > bestApr) bestApr = apr;
    }
    return { totalTvl, activePools, bestApr };
  }, [pools, prices]);

  return (
    <div className="relative min-h-[calc(100vh-80px)] pb-24 lg:pb-12 overflow-hidden">

    <SEO title="Yield Farming — QUANTAX" description="Stake LP tokens in QUANTAX farms to earn QTX rewards on QMS Testnet." path="/farming" />
      <Spotlight className="hidden md:block" />
      <ParticleField particleCount={14} colorScheme="dragon" className="opacity-10" />
      <Meteors number={6} className="opacity-15" />
      <GlowOrb color="primary" size="xl" className="-top-20 -left-40 opacity-20" />
      <GlowOrb color="accent" size="lg" className="bottom-10 -right-20 opacity-15" />

      <div className="relative z-10 container mx-auto px-4 pt-6">
        {/* Hero */}
        <div className="text-center mb-8">
          <FarmCrystal3D />
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="ember-pill mb-3 mt-4">
              <Sprout className="w-3.5 h-3.5" />
              <span>Dragon Farms</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold gradient-text mb-2">
              Stake. Earn. Forge.
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Lock tokens in QuantaX farms and earn rewards every block on QMS Testnet.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={refresh}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
              </Button>
              {isAdmin && (
                <Link to="/admin/farming">
                  <Button size="sm" className="bg-gradient-to-r from-primary to-accent">
                    <Settings className="w-3.5 h-3.5 mr-1.5" /> Admin Panel
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        </div>

        {wrongNetwork && (
          <Card role="alert" className="mx-auto mb-8 flex max-w-3xl flex-col gap-4 border-amber-500/30 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" aria-hidden="true" />
              <div>
                <h2 className="font-semibold">Wrong network</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Farming pools and transactions are available on QMS Testnet only. Switch networks before staking or withdrawing.
                </p>
                <a
                  href={getExplorerUrl(QMS_CHAIN_ID, `address/${getFarmingContract(QMS_CHAIN_ID)}`)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                >
                  View farming contract <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              </div>
            </div>
            <Button
              className="shrink-0"
              disabled={switchingNetwork}
              onClick={() => switchChain({ chainId: QMS_CHAIN_ID })}
            >
              {switchingNetwork && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
              Switch to QMS Testnet
            </Button>
          </Card>
        )}

        {/* Summary stats */}
        {pools.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-3 max-w-3xl mx-auto mb-8"
          >
            {[
              { label: 'Total TVL (WQMS est.)', value: formatWqms(summary.totalTvl), icon: Coins, color: 'text-primary' },
              { label: 'Active Farms', value: `${summary.activePools} / ${pools.length}`, icon: Coins, color: 'text-accent' },
              { label: 'Best APR estimate', value: summary.bestApr > 0 ? `${summary.bestApr.toFixed(1)}%` : '—', icon: Flame, color: 'text-success' },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label} className="p-3 sm:p-4 bg-card/60 backdrop-blur-xl border-border/40 text-center">
                  <Icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
                  <div className={`font-mono font-bold text-sm sm:text-base mt-1 ${s.color}`}>{s.value}</div>
                </Card>
              );
            })}
          </motion.div>
        )}

        {address && pools.length > 0 && (
          <Card className="mx-auto mb-8 max-w-5xl border-primary/20 bg-card/70 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Your farming overview</p>
                <p className="mt-1 text-2xl font-bold">{positionsCount} <span className="text-base font-medium text-muted-foreground">{positionsCount === 1 ? 'active position' : 'active positions'}</span></p>
              </div>
              <div className="flex flex-wrap gap-2">
                {personalRewards.length > 0 ? personalRewards.map((reward) => (
                  <div key={reward.symbol} className="rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Unclaimed {reward.symbol}</p>
                    <p className="font-mono text-sm font-semibold text-accent">{formatTokenAmount(reward.amount, reward.decimals, 6)}</p>
                  </div>
                )) : <p className="self-center text-sm text-muted-foreground">No rewards waiting to harvest</p>}
              </div>
            </div>
          </Card>
        )}

        {/* Pools grid */}
        <div className="mx-auto mb-5 flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">Explore farms</h2>
            <p className="mt-1 text-xs text-muted-foreground">Choose a pool to stake, manage your position, or harvest rewards.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                aria-label="Search farms by token or pool ID"
                placeholder="Search token or pool ID"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              type="button"
              variant={positionsOnly ? 'default' : 'outline'}
              aria-pressed={positionsOnly}
              disabled={!address}
              onClick={() => setPositionsOnly((value) => !value)}
              className="shrink-0"
            >
              <SlidersHorizontal className="mr-2 size-4" aria-hidden="true" />
              {positionsOnly ? 'Your farms' : 'All farms'}
            </Button>
          </div>
        </div>
        <p className="mx-auto mb-3 max-w-7xl text-xs text-muted-foreground" aria-live="polite">
          Showing {filteredPools.length} of {pools.length} {pools.length === 1 ? 'farm' : 'farms'}
        </p>
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        {!loading && !wrongNetwork && pools.length === 0 && (
          <Card className="p-12 text-center max-w-md mx-auto">
            <Sprout className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No farms available yet.</p>
            {isAdmin && (
              <Link to="/admin/farming">
                <Button className="mt-4">Create First Pool</Button>
              </Link>
            )}
          </Card>
        )}
        {!loading && pools.length > 0 && filteredPools.length === 0 && (
          <Card className="mx-auto max-w-xl p-8 text-center">
            <Search className="mx-auto mb-3 size-8 text-muted-foreground" aria-hidden="true" />
            <h3 className="font-semibold">No matching farms</h3>
            <p className="mt-1 text-sm text-muted-foreground">Try another token or switch back to all farms.</p>
            <Button className="mt-4" variant="outline" onClick={() => { setSearch(''); setPositionsOnly(false); }}>
              Clear filters
            </Button>
          </Card>
        )}
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredPools.map((pool) => (
            <FarmCard
              key={pool.pid}
              pool={pool}
              prices={prices}
              onAction={refresh}
              onPositionChange={reportPosition}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
