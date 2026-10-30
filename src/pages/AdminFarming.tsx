import { SEO } from '@/components/seo/SEO';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseUnits, type Address, isAddress } from 'viem';
import { Link } from 'react-router-dom';
import {
  Shield, ArrowLeft, Plus, RefreshCw, Loader2, Crown, Sprout, Zap, Edit3, Users, Settings,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Spotlight } from '@/components/ui/magic/Spotlight';
import { GlowOrb } from '@/components/ui/premium/GlowOrb';
import { toast } from 'sonner';

import { getFarmingContract } from '@/config/farming';
import { getTokenList, type TokenInfo } from '@/config/contracts';
import {
  formatTokenAmount,
  useFarmingActions,
  useFarmingOwner,
  useFarmingPools,
} from '@/hooks/useFarming';
import { useWallet } from '@/hooks/useWallet';
import { useChainId } from 'wagmi';
import { cn } from '@/lib/utils';

type Tab = 'add' | 'edit' | 'mass';

// ERC20 tokens available as staking/reward (exclude native QMS)
function useFarmTokens(): TokenInfo[] {
  const chainId = useChainId();
  return useMemo(() => getTokenList(chainId).filter((t) => !t.isNative), [chainId]);
}

function TokenChips({
  value,
  onPick,
}: {
  value: string;
  onPick: (addr: string) => void;
) {
  const FARM_TOKENS = useFarmTokens();
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {FARM_TOKENS.map((t) => {
        const active = value.toLowerCase() === t.address.toLowerCase();
        return (
          <button
            key={t.address}
            type="button"
            onClick={() => onPick(t.address)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold transition-all',
              active
                ? 'bg-primary/20 border-primary text-primary shadow-[0_0_12px_hsl(var(--primary)/0.4)]'
                : 'bg-card/60 border-border/50 text-foreground/80 hover:border-primary/40 hover:text-primary'
            )}
          >
            <img src={t.logoURI} alt="" className="w-4 h-4 rounded-full" />
            {t.symbol}
          </button>
        );
      })}
    </div>
  );
}

export default function AdminFarming() {
  const FARM_TOKENS = useFarmTokens();
  const FARMING_CONTRACT = getFarmingContract(useChainId());
  const { isAdmin, owner } = useFarmingOwner();
  const { isConnected, address } = useWallet();
  const { pools, loading, refresh } = useFarmingPools();
  const { addPool, updateRewardPerBlock, updatePool, massUpdatePools, transferOwnership } = useFarmingActions();

  const [tab, setTab] = useState<Tab>('add');
  const [busy, setBusy] = useState(false);

  // Add pool form
  const [stakingToken, setStakingToken] = useState('');
  const [rewardToken, setRewardToken] = useState('');
  const [rewardPerBlock, setRewardPerBlock] = useState('0.01');

  // Edit pool form
  const [editPid, setEditPid] = useState<number | null>(null);
  const [editRpb, setEditRpb] = useState('');

  // Transfer ownership
  const [newOwner, setNewOwner] = useState('');

  const stakingSymbol = useMemo(
    () => FARM_TOKENS.find((t) => t.address.toLowerCase() === stakingToken.toLowerCase())?.symbol,
    [stakingToken, FARM_TOKENS]
  );
  const rewardSymbol = useMemo(
    () => FARM_TOKENS.find((t) => t.address.toLowerCase() === rewardToken.toLowerCase())?.symbol,
    [rewardToken, FARM_TOKENS]
  );

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
      <SEO title="Farming Admin — QUANTAX" description="Administer QUANTAX yield farming pools — create farms, adjust allocations, manage rewards." path="/admin/farming" />
        <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Connect Wallet</h1>
        <p className="text-muted-foreground">Connect your wallet to access the admin panel.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-lg">
        <Shield className="w-16 h-16 mx-auto text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-2">Only the contract owner can access this panel.</p>
        <p className="text-xs text-muted-foreground font-mono break-all">
          Owner: {owner ?? '...'}<br />
          You: {address}
        </p>
        <Link to="/farming">
          <Button variant="outline" className="mt-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Farms
          </Button>
        </Link>
      </div>
    );
  }

  const handle = async (fn: () => Promise<unknown>, onSuccess?: () => void) => {
    setBusy(true);
    try {
      await fn();
      onSuccess?.();
      refresh();
    } catch {}
    setBusy(false);
  };

  const handleAddPool = () => {
    if (!isAddress(stakingToken) || !isAddress(rewardToken)) {
      toast.error('Pilih staking & reward token');
      return;
    }
    if (!rewardPerBlock || Number(rewardPerBlock) <= 0) {
      toast.error('Reward per block tidak valid');
      return;
    }
    const rpb = parseUnits(rewardPerBlock, 18);
    handle(
      () => addPool(stakingToken as Address, rewardToken as Address, rpb),
      () => {
        setStakingToken('');
        setRewardToken('');
        setRewardPerBlock('0.01');
      }
    );
  };

  const handleEditPool = () => {
    if (editPid === null) {
      toast.error('Pilih pool dulu');
      return;
    }
    if (!editRpb || Number(editRpb) < 0) {
      toast.error('Reward tidak valid');
      return;
    }
    const rpb = parseUnits(editRpb, 18);
    handle(() => updateRewardPerBlock(editPid, rpb), () => setEditRpb(''));
  };

  const handleTransfer = () => {
    if (!isAddress(newOwner)) {
      toast.error('Address tidak valid');
      return;
    }
    handle(() => transferOwnership(newOwner as Address), () => setNewOwner(''));
  };

  const tabs: { id: Tab; label: string; icon: typeof Plus }[] = [
    { id: 'add', label: 'Add Pool', icon: Plus },
    { id: 'edit', label: 'Edit Pool', icon: Edit3 },
    { id: 'mass', label: 'Mass Update', icon: Zap },
  ];

  return (
    <div className="relative min-h-[calc(100vh-80px)] pb-24 lg:pb-12 overflow-hidden">
      <Spotlight className="hidden md:block" />
      <GlowOrb color="primary" size="xl" className="-top-20 -left-40 opacity-20" />
      <GlowOrb color="accent" size="lg" className="bottom-10 -right-20 opacity-15" />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Link to="/farming" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Farms
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/40 shadow-[0_0_30px_hsl(var(--primary)/0.3)]">
              <Settings className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold gradient-text">
                Farming Admin
              </h1>
              <p className="text-xs text-muted-foreground">Owner-only controls</p>
            </div>
          </div>
        </motion.div>

        {/* Tabbed panel */}
        <Card className="p-5 sm:p-6 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border-primary/20 mb-8">
          <div className="grid grid-cols-3 gap-2 mb-6">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all',
                    active
                      ? 'bg-gradient-to-r from-primary/30 to-accent/30 border border-primary/50 text-primary shadow-[0_0_20px_hsl(var(--primary)/0.25)]'
                      : 'bg-card/40 border border-border/40 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {tab === 'add' && (
              <motion.div
                key="add"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-4"
              >
                <div>
                  <Label className="text-[11px] tracking-wider text-muted-foreground uppercase">
                    Staking Token Address
                  </Label>
                  <Input
                    placeholder="0x..."
                    value={stakingToken}
                    onChange={(e) => setStakingToken(e.target.value)}
                    className="font-mono text-xs mt-1"
                  />
                  <TokenChips value={stakingToken} onPick={setStakingToken} />
                </div>

                <div>
                  <Label className="text-[11px] tracking-wider text-muted-foreground uppercase">
                    Reward Token Address
                  </Label>
                  <Input
                    placeholder="0x..."
                    value={rewardToken}
                    onChange={(e) => setRewardToken(e.target.value)}
                    className="font-mono text-xs mt-1"
                  />
                  <TokenChips value={rewardToken} onPick={setRewardToken} />
                </div>

                <div>
                  <Label className="text-[11px] tracking-wider text-muted-foreground uppercase">
                    Reward Per Block (in Reward-Token Units)
                  </Label>
                  <Input
                    type="number"
                    placeholder="0.01"
                    value={rewardPerBlock}
                    onChange={(e) => setRewardPerBlock(e.target.value)}
                    className="font-mono mt-1"
                  />
                  {stakingSymbol && rewardSymbol && (
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Pool: <span className="text-primary font-semibold">Stake {stakingSymbol}</span> →{' '}
                      <span className="text-accent font-semibold">Earn {rewardSymbol}</span>
                    </p>
                  )}
                </div>

                <Button
                  className="w-full h-12 bg-gradient-to-r from-primary to-accent text-base font-bold"
                  disabled={busy}
                  onClick={handleAddPool}
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : (<><Plus className="w-4 h-4 mr-2" /> Add Pool</>)}
                </Button>
              </motion.div>
            )}

            {tab === 'edit' && (
              <motion.div
                key="edit"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-4"
              >
                <div>
                  <Label className="text-[11px] tracking-wider text-muted-foreground uppercase">
                    Select Pool
                  </Label>
                  {pools.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No pools yet. Create one in Add Pool tab.</p>
                  ) : (
                    <div className="grid gap-2 mt-2 max-h-64 overflow-y-auto pr-1">
                      {pools.map((p) => (
                        <button
                          key={p.pid}
                          onClick={() => {
                            setEditPid(p.pid);
                            setEditRpb(formatTokenAmount(p.rewardPerBlock, p.rewardDecimals, 6));
                          }}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-lg border text-left transition-all',
                            editPid === p.pid
                              ? 'bg-primary/10 border-primary/60'
                              : 'bg-card/40 border-border/40 hover:border-primary/30'
                          )}
                        >
                          <div>
                            <div className="flex items-center gap-2 text-sm font-semibold">
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/20 text-primary font-mono">
                                #{p.pid}
                              </span>
                              Stake {p.stakingSymbol} → Earn {p.rewardSymbol}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              RPB: {formatTokenAmount(p.rewardPerBlock, p.rewardDecimals, 6)} ·
                              Total: {formatTokenAmount(p.totalStaked, p.stakingDecimals, 2)}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-[11px] tracking-wider text-muted-foreground uppercase">
                    New Reward Per Block
                  </Label>
                  <Input
                    type="number"
                    placeholder="0.01"
                    value={editRpb}
                    onChange={(e) => setEditRpb(e.target.value)}
                    className="font-mono mt-1"
                    disabled={editPid === null}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    disabled={busy || editPid === null}
                    onClick={() => handle(() => updatePool(editPid!))}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh Pool
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-primary to-accent font-bold"
                    disabled={busy || editPid === null}
                    onClick={handleEditPool}
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : (<><Edit3 className="w-4 h-4 mr-2" /> Save</>)}
                  </Button>
                </div>
              </motion.div>
            )}

            {tab === 'mass' && (
              <motion.div
                key="mass"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-5"
              >
                <div className="p-4 rounded-lg bg-card/40 border border-border/40">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-accent" />
                    <h3 className="font-bold text-sm">Mass Update All Pools</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Recalculate accRewardPerShare for every pool in one transaction.
                  </p>
                  <Button
                    className="w-full bg-gradient-to-r from-primary to-accent font-bold"
                    disabled={busy}
                    onClick={() => handle(() => massUpdatePools())}
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : (<><RefreshCw className="w-4 h-4 mr-2" /> Run Mass Update</>)}
                  </Button>
                </div>

                <div className="p-4 rounded-lg bg-card/40 border border-destructive/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-destructive" />
                    <h3 className="font-bold text-sm">Transfer Ownership</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Hand over admin rights to another address. This action is irreversible.
                  </p>
                  <Input
                    placeholder="0x... new owner address"
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    className="font-mono text-xs mb-2"
                  />
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={busy}
                    onClick={handleTransfer}
                  >
                    Transfer Ownership
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Pool list */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <Sprout className="w-5 h-5 text-primary" /> Managed Pools ({pools.length})
          </h2>
          <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : pools.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">No pools yet. Create one above.</Card>
        ) : (
          <div className="space-y-3">
            {pools.map((p) => (
              <Card key={p.pid} className="p-4 bg-card/60 backdrop-blur-xl border-border/40">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-primary/20 text-primary border border-primary/30 font-mono">
                        PID #{p.pid}
                      </span>
                      <span className="font-display font-bold">
                        Stake {p.stakingSymbol} → Earn {p.rewardSymbol}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono break-all">
                      Stake: {p.stakingToken}<br />
                      Reward: {p.rewardToken}
                    </div>
                    <div className="flex gap-4 text-xs mt-2">
                      <span>
                        <span className="text-muted-foreground">RPB:</span>{' '}
                        <span className="font-mono text-accent">
                          {formatTokenAmount(p.rewardPerBlock, p.rewardDecimals, 6)}
                        </span>
                      </span>
                      <span>
                        <span className="text-muted-foreground">Total Staked:</span>{' '}
                        <span className="font-mono">
                          {formatTokenAmount(p.totalStaked, p.stakingDecimals, 2)}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTab('edit');
                        setEditPid(p.pid);
                        setEditRpb(formatTokenAmount(p.rewardPerBlock, p.rewardDecimals, 6));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      <Edit3 className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => handle(() => updatePool(p.pid))}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Update
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground font-mono mt-6 text-center break-all">
          Contract: {FARMING_CONTRACT}
        </p>
      </div>
    </div>
  );
}
