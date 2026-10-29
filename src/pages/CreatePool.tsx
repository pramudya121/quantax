import { SEO } from '@/components/seo/SEO';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2, ExternalLink, AlertCircle, Check, ArrowRight } from 'lucide-react';
import { useAccount, useBalance } from 'wagmi';
import { useChainId } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TokenSelector } from '@/components/swap/TokenSelector';
import { getTokenList, TokenInfo, getContracts } from '@/config/contracts';
import { useFactory, useGetPair, useApprove, useTokenAllowance, useTokenBalance, useRouter } from '@/hooks/useContract';
import { MovingBorder } from '@/components/ui/aceternity/MovingBorder';
import { BackgroundGradient } from '@/components/ui/aceternity/BackgroundGradient';
import { Spotlight } from '@/components/ui/magic/Spotlight';
import { toast } from 'sonner';
import { formatUnits, parseUnits, formatEther, parseEther } from 'viem';
import { cn } from '@/lib/utils';

const NATIVE_GAS_RESERVE = 0.01;

export default function CreatePool() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const C = getContracts(chainId);
  const tokenList = getTokenList(chainId);
  const [tokenA, setTokenA] = useState<TokenInfo | null>(null);
  const [tokenB, setTokenB] = useState<TokenInfo | null>(null);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [step, setStep] = useState<'select' | 'create' | 'approve' | 'add-liquidity' | 'done'>('select');

  const factory = useFactory();
  const router = useRouter();
  const { approve: approveA, isPending: approvingA, isSuccess: approvedA, hash: approveAHash } = useApprove();
  const { approve: approveB, isPending: approvingB, isSuccess: approvedB, hash: approveBHash } = useApprove();

  // Native balance
  const { data: nativeBalance } = useBalance({ address });

  // Check if pair exists
  const tokenAForPair = tokenA ? (tokenA.isNative ? C.WETH : tokenA.address) : undefined;
  const tokenBForPair = tokenB ? (tokenB.isNative ? C.WETH : tokenB.address) : undefined;

  const { data: pairAddress, refetch: refetchPair } = useGetPair(
    tokenAForPair as `0x${string}` | undefined,
    tokenBForPair as `0x${string}` | undefined
  );

  // Get balances
  const { data: balanceA } = useTokenBalance(
    tokenA && !tokenA.isNative ? (tokenA.address as `0x${string}`) : undefined,
    address
  );
  const { data: balanceB } = useTokenBalance(
    tokenB && !tokenB.isNative ? (tokenB.address as `0x${string}`) : undefined,
    address
  );

  // Get allowances
  const { data: allowanceA, refetch: refetchAllowanceA } = useTokenAllowance(
    tokenA && !tokenA.isNative ? (tokenA.address as `0x${string}`) : undefined,
    address,
    C.ROUTER
  );
  const { data: allowanceB, refetch: refetchAllowanceB } = useTokenAllowance(
    tokenB && !tokenB.isNative ? (tokenB.address as `0x${string}`) : undefined,
    address,
    C.ROUTER
  );

  const pairExists = pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000';
  
  const amountABigInt = amountA ? parseUnits(amountA, tokenA?.decimals || 18) : 0n;
  const amountBBigInt = amountB ? parseUnits(amountB, tokenB?.decimals || 18) : 0n;
  
  const needsApprovalA = tokenA && !tokenA.isNative && allowanceA !== undefined && amountABigInt > 0n && allowanceA < amountABigInt;
  const needsApprovalB = tokenB && !tokenB.isNative && allowanceB !== undefined && amountBBigInt > 0n && allowanceB < amountBBigInt;

  const isSameUnderlyingPair = !!tokenAForPair && !!tokenBForPair && tokenAForPair.toLowerCase() === tokenBForPair.toLowerCase();
  const canProceed = tokenA && tokenB && !isSameUnderlyingPair;
  const hasAmounts = amountA && amountB && parseFloat(amountA) > 0 && parseFloat(amountB) > 0;

  // Balance helpers
  const getBalanceA = () => {
    if (!tokenA) return '0';
    if (tokenA.isNative) return nativeBalance ? formatEther(nativeBalance.value) : '0';
    return balanceA ? formatUnits(balanceA, tokenA.decimals) : '0';
  };
  const getBalanceB = () => {
    if (!tokenB) return '0';
    if (tokenB.isNative) return nativeBalance ? formatEther(nativeBalance.value) : '0';
    return balanceB ? formatUnits(balanceB, tokenB.decimals) : '0';
  };

  // After pair is created, move to approve/add-liquidity step
  useEffect(() => {
    if (factory.isSuccess && factory.hash) {
      toast.dismiss('create-pool');
      toast.success('Pool Created!', {
        description: 'Now add initial liquidity to activate the pool.',
        action: {
          label: 'View TX',
          onClick: () => window.open(`https://testnet.iopn.tech/tx/${factory.hash}`, '_blank'),
        },
      });
      // Refetch pair after creation
      setTimeout(() => refetchPair(), 2000);
      
      if (needsApprovalA || needsApprovalB) {
        setStep('approve');
      } else if (hasAmounts) {
        setStep('add-liquidity');
      }
    }
  }, [factory.isSuccess, factory.hash]);

  // After approval A
  useEffect(() => {
    if (approvedA && approveAHash) {
      toast.dismiss('approve-a');
      toast.success(`${tokenA?.symbol} Approved!`);
      setTimeout(() => refetchAllowanceA(), 1000);
    }
  }, [approvedA, approveAHash]);

  // After approval B
  useEffect(() => {
    if (approvedB && approveBHash) {
      toast.dismiss('approve-b');
      toast.success(`${tokenB?.symbol} Approved!`);
      setTimeout(() => refetchAllowanceB(), 1000);
    }
  }, [approvedB, approveBHash]);

  // After liquidity added
  useEffect(() => {
    if (router.isSuccess && router.hash) {
      toast.dismiss('add-liq');
      toast.success('Initial Liquidity Added! 🎉', {
        description: 'Your pool is now active and ready for trading.',
        action: {
          label: 'View TX',
          onClick: () => window.open(`https://testnet.iopn.tech/tx/${router.hash}`, '_blank'),
        },
      });
      setStep('done');
    }
  }, [router.isSuccess, router.hash]);

  // Watch router error
  useEffect(() => {
    if (router.error) {
      toast.dismiss('add-liq');
      toast.error('Failed to add liquidity', {
        description: router.error.message?.slice(0, 120),
      });
    }
  }, [router.error]);

  // Auto-advance from approve to add-liquidity when approvals are done
  useEffect(() => {
    if (step === 'approve' && !needsApprovalA && !needsApprovalB && hasAmounts) {
      setStep('add-liquidity');
    }
  }, [step, needsApprovalA, needsApprovalB, hasAmounts]);

  const handleCreatePair = () => {
    if (!tokenA || !tokenB) return;
    const addressA = tokenA.isNative ? C.WETH : tokenA.address;
    const addressB = tokenB.isNative ? C.WETH : tokenB.address;
    toast.loading('Creating pool...', { id: 'create-pool' });
    setStep('create');
    factory.createPair(addressA as `0x${string}`, addressB as `0x${string}`);
  };

  const handleApproveA = () => {
    if (!tokenA || tokenA.isNative) return;
    toast.loading(`Approving ${tokenA.symbol}...`, { id: 'approve-a' });
    approveA(tokenA.address as `0x${string}`, C.ROUTER, parseUnits('999999999', tokenA.decimals));
  };

  const handleApproveB = () => {
    if (!tokenB || tokenB.isNative) return;
    toast.loading(`Approving ${tokenB.symbol}...`, { id: 'approve-b' });
    approveB(tokenB.address as `0x${string}`, C.ROUTER, parseUnits('999999999', tokenB.decimals));
  };

  const handleAddLiquidity = () => {
    if (!address || !tokenA || !tokenB || !amountA || !amountB) return;

    toast.loading('Adding initial liquidity...', { id: 'add-liq' });
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);

    if (tokenA.isNative || tokenB.isNative) {
      // One token is native QMS → use addLiquidityETH
      const token = tokenA.isNative ? tokenB : tokenA;
      const tokenAmount = tokenA.isNative ? amountBBigInt : amountABigInt;
      const ethAmount = tokenA.isNative ? amountABigInt : amountBBigInt;

      router.addLiquidityETH(
        token.address as `0x${string}`,
        tokenAmount,
        (tokenAmount * 95n) / 100n,
        (ethAmount * 95n) / 100n,
        address,
        deadline,
        ethAmount
      );
    } else {
      // Both ERC20 tokens
      router.addLiquidity(
        tokenA.address as `0x${string}`,
        tokenB.address as `0x${string}`,
        amountABigInt,
        amountBBigInt,
        (amountABigInt * 95n) / 100n,
        (amountBBigInt * 95n) / 100n,
        address,
        deadline
      );
    }
  };

  const currentStepIndex = step === 'select' ? 0 : step === 'create' ? 0 : step === 'approve' ? 1 : step === 'add-liquidity' ? 2 : 3;
  const isCreating = factory.isPending || factory.isConfirming;
  const isAddingLiquidity = router.isPending || router.isConfirming;

  return (
    <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8 max-w-2xl relative">

    <SEO title="Create Pool — QUANTAX" description="Launch a new liquidity pool on QUANTAX. Set the initial price and bootstrap trading on QMS Testnet." path="/create-pool" />
      <Spotlight className="hidden md:block" />
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Create Pool</h1>
          <p className="text-muted-foreground">Create a new liquidity pool and add initial liquidity</p>
        </div>

        <MovingBorder duration={3000} borderRadius="1.5rem">
          <div className="p-6 space-y-6">
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-4 mb-6">
              {['Select & Create', 'Approve', 'Add Liquidity'].map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                    i <= currentStepIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    i < currentStepIndex && "bg-success text-success-foreground"
                  )}>
                    {i < currentStepIndex ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className="text-sm hidden sm:block">{label}</span>
                  {i < 2 && <ArrowRight className="w-4 h-4 text-muted-foreground hidden sm:block" />}
                </div>
              ))}
            </div>

            {/* Token Selection */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="token-input">
                <label className="block text-sm text-muted-foreground mb-2">First Token</label>
                <TokenSelector 
                  selectedToken={tokenA} 
                  onSelect={setTokenA} 
                  disabledToken={tokenB}
                />
                {tokenA && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Balance: {parseFloat(getBalanceA()).toFixed(4)} {tokenA.symbol}
                  </p>
                )}
              </div>

              <div className="token-input">
                <label className="block text-sm text-muted-foreground mb-2">Second Token</label>
                <TokenSelector 
                  selectedToken={tokenB} 
                  onSelect={setTokenB} 
                  disabledToken={tokenA}
                />
                {tokenB && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Balance: {parseFloat(getBalanceB()).toFixed(4)} {tokenB.symbol}
                  </p>
                )}
              </div>
            </div>

            {/* Pair Status */}
            {tokenA && tokenB && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={cn(
                  "p-4 rounded-xl border",
                  isSameUnderlyingPair
                    ? "bg-warning/10 border-warning/30"
                    : pairExists 
                      ? "bg-success/10 border-success/30" 
                      : "bg-primary/10 border-primary/30"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <img src={tokenA.logoURI} alt={tokenA.symbol} className="w-8 h-8 rounded-full border-2 border-background" />
                    <img src={tokenB.logoURI} alt={tokenB.symbol} className="w-8 h-8 rounded-full border-2 border-background" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{tokenA.symbol}/{tokenB.symbol}</p>
                    {isSameUnderlyingPair ? (
                      <p className="text-sm text-warning flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> QMS/WQMS adalah underlying yang sama. Gunakan fitur Swap untuk Wrap/Unwrap.
                      </p>
                    ) : pairExists && step === 'select' ? (
                      <p className="text-sm text-success flex items-center gap-1">
                        <Check className="w-3 h-3" /> Pool exists - go to Liquidity page to add more
                      </p>
                    ) : pairExists ? (
                      <p className="text-sm text-success flex items-center gap-1">
                        <Check className="w-3 h-3" /> Pool created - now add initial liquidity
                      </p>
                    ) : (
                      <p className="text-sm text-primary">New pool - you'll set the initial price</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Initial Amounts */}
            {canProceed && !isSameUnderlyingPair && (
              <div className="space-y-4">
                <h3 className="font-semibold">Set Initial Liquidity</h3>
                <p className="text-sm text-muted-foreground">
                  The ratio of tokens you provide will set the initial price
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="token-input">
                    <label className="block text-sm text-muted-foreground mb-2">{tokenA?.symbol} Amount</label>
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={amountA}
                      onChange={(e) => setAmountA(e.target.value)}
                      className="text-lg"
                    />
                  </div>
                  <div className="token-input">
                    <label className="block text-sm text-muted-foreground mb-2">{tokenB?.symbol} Amount</label>
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={amountB}
                      onChange={(e) => setAmountB(e.target.value)}
                      className="text-lg"
                    />
                  </div>
                </div>

                {hasAmounts && (
                  <div className="p-3 rounded-lg bg-muted/50 text-sm">
                    <p className="text-muted-foreground">Initial Rate:</p>
                    <p className="font-medium">
                      1 {tokenA?.symbol} = {(parseFloat(amountB) / parseFloat(amountA)).toFixed(6)} {tokenB?.symbol}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Approval Buttons (step: approve) */}
            {(step === 'approve' || (pairExists && (needsApprovalA || needsApprovalB))) && (needsApprovalA || needsApprovalB) && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  Token Approvals Required
                </h3>
                
                {needsApprovalA && (
                  <Button onClick={handleApproveA} variant="outline" className="w-full" disabled={approvingA}>
                    {approvingA ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Approving {tokenA?.symbol}...</>
                    ) : (
                      <>Approve {tokenA?.symbol}</>
                    )}
                  </Button>
                )}

                {needsApprovalB && (
                  <Button onClick={handleApproveB} variant="outline" className="w-full" disabled={approvingB}>
                    {approvingB ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Approving {tokenB?.symbol}...</>
                    ) : (
                      <>Approve {tokenB?.symbol}</>
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {step === 'done' ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-center">
                  <Check className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="font-semibold text-success">Pool Created & Liquidity Added!</p>
                  <p className="text-sm text-muted-foreground mt-1">Your pool is now active for trading</p>
                </div>
                {router.hash && (
                  <a 
                    href={`https://testnet.iopn.tech/tx/${router.hash}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
                  >
                    View Transaction <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </motion.div>
            ) : (step === 'add-liquidity' || (pairExists && hasAmounts && !needsApprovalA && !needsApprovalB && step !== 'select')) ? (
              <Button
                onClick={handleAddLiquidity}
                className="w-full btn-dragon"
                disabled={isAddingLiquidity || !hasAmounts}
              >
                {isAddingLiquidity ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Adding Liquidity...</>
                ) : (
                  <><Plus className="w-4 h-4 mr-2" /> Add Initial Liquidity</>
                )}
              </Button>
            ) : !pairExists ? (
              <Button
                onClick={handleCreatePair}
                className="w-full btn-dragon"
                disabled={!canProceed || isCreating || !hasAmounts || isSameUnderlyingPair}
              >
                {isCreating ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating Pool...</>
                ) : isSameUnderlyingPair ? (
                  <>Invalid Pair (Use Swap Wrap/Unwrap)</>
                ) : !canProceed ? (
                  <>Select Tokens</>
                ) : !hasAmounts ? (
                  <>Enter Amounts</>
                ) : (
                  <><Plus className="w-4 h-4 mr-2" /> Create Pool & Add Liquidity</>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  if (needsApprovalA || needsApprovalB) {
                    setStep('approve');
                  } else if (hasAmounts) {
                    setStep('add-liquidity');
                  }
                }}
                className="w-full btn-dragon"
                disabled={!hasAmounts}
              >
                {!hasAmounts ? <>Enter Amounts</> : <>Continue to Add Liquidity</>}
              </Button>
            )}

            {/* Factory TX Hash */}
            {factory.hash && step !== 'done' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <a 
                  href={`https://testnet.iopn.tech/tx/${factory.hash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-sm text-success"
                >
                  <Check className="w-4 h-4" /> Pair Created! <ExternalLink className="w-3 h-3" />
                </a>
              </motion.div>
            )}
          </div>
        </MovingBorder>

        {/* Info Card */}
        <BackgroundGradient containerClassName="mt-6">
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-3">Creating a Pool</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Step 1: Create the pair on-chain (empty pool)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Step 2: Approve tokens for the router (if ERC20)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Step 3: Add initial liquidity - the ratio sets the price
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                You'll earn 0.3% of all trades on this pair
              </li>
            </ul>
          </div>
        </BackgroundGradient>
      </motion.div>
    </div>
  );
}
