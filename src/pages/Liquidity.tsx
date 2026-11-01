import { SEO } from '@/components/seo/SEO';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Loader2, Check, ExternalLink, Droplets, Info, Calculator, TrendingUp, Wallet, Shield, AlertCircle } from 'lucide-react';
import { useAccount, useBalance } from 'wagmi';
import { useChainId } from 'wagmi';
import { parseEther, formatEther, parseUnits, formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTokenBalance, useRouter, useApprove, useTokenAllowance, useGetPair, usePairReserves, useApprovePair, usePairBalance, usePairAllowance, usePairTokens, usePairTotalSupply, useRouterWETH, useFactory } from '@/hooks/useContract';
import { useTransactionHistory } from '@/components/history/TransactionHistory';
import { getContracts, getTokenList, TokenInfo } from '@/config/contracts';
import { TokenSelector } from '@/components/swap/TokenSelector';
import { TextGenerateEffect } from '@/components/ui/aceternity/TextGenerateEffect';
import { MovingBorder } from '@/components/ui/aceternity/MovingBorder';
import { Spotlight } from '@/components/ui/magic/Spotlight';
import { GlowingStarsBackground } from '@/components/ui/aceternity/GlowingStars';
import { ParticleField } from '@/components/ui/premium/ParticleField';
import { GlowOrb } from '@/components/ui/premium/GlowOrb';
import { cn } from '@/lib/utils';
import { WalletConnectModal } from '@/components/wallet/WalletConnectModal';
import { toast } from 'sonner';
import { useWallet } from '@/hooks/useWallet';
import { sanitizeAmountInput, getSafeDeadline, getSafeApprovalAmount, sanitizeSlippage, validatePreTx } from '@/lib/inputValidation';
import { SlippageDeadlineControls } from '@/components/tx/SlippageDeadlineControls';

const MAX_UINT256 = 2n ** 256n - 1n; // Still needed for LP token approval only
const NATIVE_GAS_RESERVE = 0.01;

export default function Liquidity() {
  const { address, isConnected } = useAccount();
  const { isCorrectNetwork, switchToQMS } = useWallet();
  const { addTransaction } = useTransactionHistory();
  const { data: routerWETH } = useRouterWETH();
  const chainId = useChainId();
  const C = getContracts(chainId);
  const tokenList = useMemo(() => getTokenList(chainId), [chainId]);
  const wethAddress = useMemo(() => (routerWETH || C.WETH) as `0x${string}`, [routerWETH, C.WETH]);
  const [activeTab, setActiveTab] = useState('add');
  const [showWalletModal, setShowWalletModal] = useState(false);
  
  // Add Liquidity state
  const [tokenA, setTokenA] = useState<TokenInfo | null>(tokenList[1]); // wrapped native
  const [tokenB, setTokenB] = useState<TokenInfo | null>(tokenList[2]); // QTX
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [isAutoCalculating, setIsAutoCalculating] = useState(false);
  const [lastEditedField, setLastEditedField] = useState<'A' | 'B' | null>(null);
  
  // Remove Liquidity state
  const [removePercent, setRemovePercent] = useState(25);

  // Reset selection when the active network changes.
  useEffect(() => {
    setTokenA(tokenList[1] ?? null);
    setTokenB(tokenList[2] ?? null);
    setAmountA('');
    setAmountB('');
  }, [chainId, tokenList]);

  // Slippage & deadline controls (shared by Add / Remove)
  const [slippage, setSlippage] = useState(0.5); // percent
  const [deadlineMinutes, setDeadlineMinutes] = useState(30);
  const slippageBps = useMemo(() => BigInt(Math.floor((100 - sanitizeSlippage(slippage)) * 100)), [slippage]);
  
  
  // Token balances
  const { data: tokenABalance } = useTokenBalance(
    tokenA && !tokenA.isNative ? (tokenA.address as `0x${string}`) : undefined,
    address
  );
  const { data: tokenBBalance } = useTokenBalance(
    tokenB && !tokenB.isNative ? (tokenB.address as `0x${string}`) : undefined,
    address
  );
  
  // Native balance for QMS
  const { data: nativeOPNBalance } = useBalance({ address });
  
  const getSpendableNativeBalance = () => {
    const nativeBalance = nativeOPNBalance ? parseFloat(formatEther(nativeOPNBalance.value)) : 0;
    return Math.max(nativeBalance - NATIVE_GAS_RESERVE, 0).toFixed(4);
  };

  const getTokenADisplayBalance = () => {
    if (!tokenA) return '0';
    if (tokenA.isNative) {
      return nativeOPNBalance ? parseFloat(formatEther(nativeOPNBalance.value)).toFixed(4) : '0';
    }
    return tokenABalance ? parseFloat(formatUnits(tokenABalance, tokenA.decimals)).toFixed(4) : '0';
  };
  
  const getTokenBDisplayBalance = () => {
    if (!tokenB) return '0';
    if (tokenB.isNative) {
      return nativeOPNBalance ? parseFloat(formatEther(nativeOPNBalance.value)).toFixed(4) : '0';
    }
    return tokenBBalance ? parseFloat(formatUnits(tokenBBalance, tokenB.decimals)).toFixed(4) : '0';
  };
  
  // Allowances for add liquidity
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
  
  // Get pair info
  const tokenAAddr = useMemo(
    () => ((tokenA && !tokenA.isNative ? tokenA.address : wethAddress) as `0x${string}`),
    [tokenA, wethAddress]
  );
  const tokenBAddr = useMemo(
    () => ((tokenB && !tokenB.isNative ? tokenB.address : wethAddress) as `0x${string}`),
    [tokenB, wethAddress]
  );

  const isSameUnderlyingPair = useMemo(
    () => tokenAAddr.toLowerCase() === tokenBAddr.toLowerCase(),
    [tokenAAddr, tokenBAddr]
  );

  const { data: pairAddress, refetch: refetchPair, isLoading: isPairLoading } = useGetPair(
    isSameUnderlyingPair ? undefined : tokenAAddr,
    isSameUnderlyingPair ? undefined : tokenBAddr
  );
  const validPair = pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000' ? pairAddress : undefined;
  const { data: reserves, refetch: refetchReserves, isLoading: isReservesLoading } = usePairReserves(validPair);
  const { token0: pairToken0 } = usePairTokens(validPair);
  const { data: lpBalance, refetch: refetchLpBalance } = usePairBalance(validPair, address);
  const { data: lpAllowance, refetch: refetchLpAllowance } = usePairAllowance(validPair, address);
  const { data: lpTotalSupply } = usePairTotalSupply(validPair);
  
  const isPoolDataLoading = isSameUnderlyingPair ? false : (isPairLoading || (!!validPair && isReservesLoading));

  // Refetch data periodically for freshness
  useEffect(() => {
    const interval = setInterval(() => {
      if (isSameUnderlyingPair) return;

      refetchPair();
      if (validPair) {
        refetchReserves();
        refetchLpBalance();
        refetchLpAllowance();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [refetchPair, refetchReserves, refetchLpBalance, refetchLpAllowance, validPair, isSameUnderlyingPair]);
  
  // Determine if tokenA is token0 in the pair (reserves are ordered by token0/token1)
  const isTokenAToken0 = useMemo(() => {
    if (!pairToken0 || !tokenAAddr) return true;
    return pairToken0.toLowerCase() === tokenAAddr.toLowerCase();
  }, [pairToken0, tokenAAddr]);
  
  // Map reserves correctly: reserveA = reserve for tokenA, reserveB = reserve for tokenB
  const reserveA = useMemo(() => {
    if (!reserves) return 0n;
    return isTokenAToken0 ? reserves[0] : reserves[1];
  }, [reserves, isTokenAToken0]);
  
  const reserveB = useMemo(() => {
    if (!reserves) return 0n;
    return isTokenAToken0 ? reserves[1] : reserves[0];
  }, [reserves, isTokenAToken0]);
  
  // Router hook
  const router = useRouter();
  // Factory hook (creates the pair on-chain when it does not exist yet)
  const factory = useFactory();
  const [creatingPool, setCreatingPool] = useState(false);
  
  // Separate approve hooks for token A and token B
  const { 
    approve: approveTokenA, 
    isPending: approveAPending, 
    isSuccess: approveASuccess, 
    hash: approveAHash,
    isConfirming: approveAConfirming 
  } = useApprove();
  
  const { 
    approve: approveTokenB, 
    isPending: approveBPending, 
    isSuccess: approveBSuccess, 
    hash: approveBHash,
    isConfirming: approveBConfirming 
  } = useApprove();
  
  // LP token approve hook
  const { 
    approve: approvePairFn, 
    isPending: pairApprovePending, 
    isSuccess: pairApproveSuccess, 
    hash: pairApproveHash,
    isConfirming: pairApproveConfirming 
  } = useApprovePair();

  // Check if approvals needed for add liquidity
  const amountABigInt = amountA ? parseUnits(amountA, tokenA?.decimals || 18) : 0n;
  const amountBBigInt = amountB ? parseUnits(amountB, tokenB?.decimals || 18) : 0n;
  const needsApprovalA = tokenA && !tokenA.isNative && amountABigInt > 0n && allowanceA !== undefined && allowanceA < amountABigInt;
  const needsApprovalB = tokenB && !tokenB.isNative && amountBBigInt > 0n && allowanceB !== undefined && allowanceB < amountBBigInt;

  // Watch approve A success
  useEffect(() => {
    if (approveASuccess && approveAHash) {
      toast.dismiss('approve-a');
      toast.success(`${tokenA?.symbol} Approved!`, {
        description: `${tokenA?.symbol} has been approved for liquidity`,
        action: {
          label: 'View TX',
          onClick: () => window.open(`https://testnet.qmsscan.io/tx/${approveAHash}`, '_blank'),
        },
      });
      setTimeout(() => refetchAllowanceA(), 1000);
    }
  }, [approveASuccess, approveAHash]);

  // Watch approve B success
  useEffect(() => {
    if (approveBSuccess && approveBHash) {
      toast.dismiss('approve-b');
      toast.success(`${tokenB?.symbol} Approved!`, {
        description: `${tokenB?.symbol} has been approved for liquidity`,
        action: {
          label: 'View TX',
          onClick: () => window.open(`https://testnet.qmsscan.io/tx/${approveBHash}`, '_blank'),
        },
      });
      setTimeout(() => refetchAllowanceB(), 1000);
    }
  }, [approveBSuccess, approveBHash]);

  // Watch LP approve success
  useEffect(() => {
    if (pairApproveSuccess && pairApproveHash) {
      toast.dismiss('approve-lp');
      toast.success('LP Tokens Approved!', {
        description: 'LP tokens approved for removal',
        action: {
          label: 'View TX',
          onClick: () => window.open(`https://testnet.qmsscan.io/tx/${pairApproveHash}`, '_blank'),
        },
      });
      setTimeout(() => refetchLpAllowance(), 1000);
    }
  }, [pairApproveSuccess, pairApproveHash]);

  // Watch router success (add/remove liquidity)
  useEffect(() => {
    if (router.isSuccess && router.hash) {
      const txType = activeTab === 'add' ? 'add_liquidity' : 'remove_liquidity';
      toast.success(activeTab === 'add' ? 'Liquidity Added!' : 'Liquidity Removed!', {
        description: `Transaction confirmed on-chain`,
        action: {
          label: 'View TX',
          onClick: () => window.open(`https://testnet.qmsscan.io/tx/${router.hash}`, '_blank'),
        },
      });
      addTransaction({
        hash: router.hash,
        type: txType as any,
        status: 'success',
        details: {
          tokenA: tokenA?.symbol,
          tokenB: tokenB?.symbol,
          amountA,
          amountB,
        },
      });
      setAmountA('');
      setAmountB('');
      refetchLpBalance();
      refetchLpAllowance();
    }
  }, [router.isSuccess, router.hash, activeTab, refetchLpBalance, refetchLpAllowance]);

  // Watch router error
  useEffect(() => {
    if (router.error) {
      toast.error('Transaction Failed', {
        description: router.error.message.slice(0, 100),
      });
    }
  }, [router.error]);

  // Auto-calculate the second token amount based on correctly-mapped reserves
  const calculateOptimalAmount = useCallback((inputAmount: string, isTokenA: boolean): string => {
    if (!inputAmount || parseFloat(inputAmount) === 0) return '';
    if (reserveA === 0n || reserveB === 0n) return ''; // New pool, no ratio to calc
    
    try {
      const inputDecimals = isTokenA ? (tokenA?.decimals || 18) : (tokenB?.decimals || 18);
      const outputDecimals = isTokenA ? (tokenB?.decimals || 18) : (tokenA?.decimals || 18);
      const inputBigInt = parseUnits(inputAmount, inputDecimals);
      
      let optimalAmount: bigint;
      if (isTokenA) {
        // User entered tokenA amount, calculate tokenB: amountB = amountA * reserveB / reserveA
        optimalAmount = (inputBigInt * reserveB) / reserveA;
      } else {
        // User entered tokenB amount, calculate tokenA: amountA = amountB * reserveA / reserveB
        optimalAmount = (inputBigInt * reserveA) / reserveB;
      }
      
      return parseFloat(formatUnits(optimalAmount, outputDecimals)).toFixed(6);
    } catch {
      return '';
    }
  }, [reserveA, reserveB, tokenA, tokenB]);

  // Re-calculate when reserves load or change
  useEffect(() => {
    if (reserveA > 0n && reserveB > 0n) {
      if (amountA && lastEditedField === 'A') {
        const calculatedB = calculateOptimalAmount(amountA, true);
        if (calculatedB) setAmountB(calculatedB);
      } else if (amountB && lastEditedField === 'B') {
        const calculatedA = calculateOptimalAmount(amountB, false);
        if (calculatedA) setAmountA(calculatedA);
      }
    }
  }, [reserveA, reserveB]); // Only trigger when reserves change

  const handleAmountAChange = (value: string) => {
    setAmountA(sanitizeAmountInput(value));
    setLastEditedField('A');
    
    if (value && reserveA > 0n && reserveB > 0n) {
      setIsAutoCalculating(true);
      const calculatedB = calculateOptimalAmount(value, true);
      if (calculatedB) setAmountB(calculatedB);
      setTimeout(() => setIsAutoCalculating(false), 300);
    }
  };

  const handleAmountBChange = (value: string) => {
    setAmountB(sanitizeAmountInput(value));
    setLastEditedField('B');
    
    if (value && reserveA > 0n && reserveB > 0n) {
      setIsAutoCalculating(true);
      const calculatedA = calculateOptimalAmount(value, false);
      if (calculatedA) setAmountA(calculatedA);
      setTimeout(() => setIsAutoCalculating(false), 300);
    }
  };

  const priceRatio = useMemo(() => {
    if (reserveA === 0n || reserveB === 0n) return null;
    const resA = parseFloat(formatUnits(reserveA, tokenA?.decimals || 18));
    const resB = parseFloat(formatUnits(reserveB, tokenB?.decimals || 18));
    return { aPerB: resA / resB, bPerA: resB / resA };
  }, [reserveA, reserveB, tokenA, tokenB]);

  const poolShare = useMemo(() => {
    if (!amountA || !amountB || reserveA === 0n) return null;
    const inputA = parseFloat(amountA);
    const currentA = parseFloat(formatUnits(reserveA, tokenA?.decimals || 18));
    return ((inputA / (currentA + inputA)) * 100).toFixed(2);
  }, [amountA, amountB, reserveA, tokenA]);

  // Handlers - approve with MAX_UINT256 so user doesn't need to re-approve
  const handleApproveA = () => {
    if (!tokenA || tokenA.isNative) return;
    toast.loading(`Approving ${tokenA.symbol}...`, { id: 'approve-a' });
    approveTokenA(tokenA.address as `0x${string}`, C.ROUTER, getSafeApprovalAmount(amountABigInt));
  };

  const handleApproveB = () => {
    if (!tokenB || tokenB.isNative) return;
    toast.loading(`Approving ${tokenB.symbol}...`, { id: 'approve-b' });
    approveTokenB(tokenB.address as `0x${string}`, C.ROUTER, getSafeApprovalAmount(amountBBigInt));
  };

  const executeAddLiquidity = useCallback(() => {
    if (!address || !tokenA || !tokenB || !amountA || !amountB) return;

    toast.loading('Adding liquidity...', { id: 'add-liq' });
    const deadline = getSafeDeadline(deadlineMinutes);

    if (tokenA.isNative || tokenB.isNative) {
      const token = tokenA.isNative ? tokenB : tokenA;
      const tokenAmount = tokenA.isNative ? amountBBigInt : amountABigInt;
      const ethAmount = tokenA.isNative ? amountABigInt : amountBBigInt;

      router.addLiquidityETH(
        token.address as `0x${string}`,
        tokenAmount,
        (tokenAmount * slippageBps) / 10000n,
        (ethAmount * slippageBps) / 10000n,
        address,
        deadline,
        ethAmount
      );
    } else {
      router.addLiquidity(
        tokenA.address as `0x${string}`,
        tokenB.address as `0x${string}`,
        amountABigInt,
        amountBBigInt,
        (amountABigInt * slippageBps) / 10000n,
        (amountBBigInt * slippageBps) / 10000n,
        address,
        deadline
      );
    }
  }, [address, tokenA, tokenB, amountA, amountB, amountABigInt, amountBBigInt, slippageBps, deadlineMinutes, router]);

  const handleAddLiquidity = () => {
    if (!address || !tokenA || !tokenB || !amountA || !amountB) return;

    if (isSameUnderlyingPair) {
      toast.error('Pair tidak valid untuk liquidity', {
        description: 'QMS dan WQMS memiliki underlying yang sama. Gunakan menu Swap untuk Wrap/Unwrap.',
      });
      return;
    }

    // Strict pre-transaction validation for both sides
    const vA = validatePreTx({
      amount: amountA, decimals: tokenA.decimals, balance: getTokenADisplayBalance(),
      isNative: tokenA.isNative, gasReserve: NATIVE_GAS_RESERVE, symbol: tokenA.symbol,
    });
    if (!vA.ok) { toast.error(vA.title || 'Cannot Add', { description: vA.error }); return; }
    const vB = validatePreTx({
      amount: amountB, decimals: tokenB.decimals, balance: getTokenBDisplayBalance(),
      isNative: tokenB.isNative, gasReserve: NATIVE_GAS_RESERVE, symbol: tokenB.symbol,
    });
    if (!vB.ok) { toast.error(vB.title || 'Cannot Add', { description: vB.error }); return; }

    // New pair: create the pool on-chain first, then add liquidity automatically.
    if (!validPair && !creatingPool) {
      setCreatingPool(true);
      toast.loading(`Creating pool ${tokenA.symbol}/${tokenB.symbol}...`, { id: 'add-liq' });
      factory.createPair(tokenAAddr, tokenBAddr);
      return;
    }

    executeAddLiquidity();
  };

  // Once the pool is created, continue straight into adding liquidity.
  useEffect(() => {
    if (!creatingPool || !factory.isSuccess || !factory.hash) return;
    setCreatingPool(false);
    toast.dismiss('add-liq');
    toast.success('Pool created!', {
      description: 'Pool baru berhasil dibuat. Lanjut menambahkan likuiditas...',
      action: {
        label: 'View TX',
        onClick: () => window.open(`https://testnet.qmsscan.io/tx/${factory.hash}`, '_blank'),
      },
    });
    refetchPair();
    executeAddLiquidity();
  }, [creatingPool, factory.isSuccess, factory.hash, executeAddLiquidity]);

  // If pool creation fails, allow the user to retry.
  useEffect(() => {
    if (creatingPool && factory.error) {
      setCreatingPool(false);
      toast.dismiss('add-liq');
      toast.error('Gagal membuat pool', {
        description: factory.error.message.slice(0, 100),
      });
    }
  }, [creatingPool, factory.error]);

  const handleApproveLPTokens = () => {
    if (!validPair || !lpBalance) return;
    toast.loading('Approving LP tokens...', { id: 'approve-lp' });
    approvePairFn(validPair, MAX_UINT256);
  };

  const handleRemoveLiquidity = () => {
    if (!address || !tokenA || !tokenB || !lpBalance || !validPair) return;

    if (isSameUnderlyingPair) {
      toast.error('Pair tidak valid untuk remove liquidity');
      return;
    }

    if (!lpTotalSupply || lpTotalSupply === 0n || reserveA === 0n || reserveB === 0n) {
      toast.error('Reserves belum siap, coba lagi sebentar');
      return;
    }

    toast.loading('Removing liquidity...', { id: 'remove-liq' });
    const liquidityToRemove = (lpBalance * BigInt(removePercent)) / 100n;
    const deadline = getSafeDeadline(deadlineMinutes);

    // Compute expected token amounts and apply slippage tolerance (MEV protection)
    const expectedA = (reserveA * liquidityToRemove) / lpTotalSupply;
    const expectedB = (reserveB * liquidityToRemove) / lpTotalSupply;
    const minA = (expectedA * slippageBps) / 10000n;
    const minB = (expectedB * slippageBps) / 10000n;

    if (tokenA.isNative || tokenB.isNative) {
      const token = tokenA.isNative ? tokenB : tokenA;
      const tokenMin = tokenA.isNative ? minB : minA;
      const ethMin = tokenA.isNative ? minA : minB;
      router.removeLiquidityETH(token.address as `0x${string}`, liquidityToRemove, tokenMin, ethMin, address, deadline);
    } else {
      router.removeLiquidity(tokenA.address as `0x${string}`, tokenB.address as `0x${string}`, liquidityToRemove, minA, minB, address, deadline);
    }
  };

  const liquidityToRemove = lpBalance ? (lpBalance * BigInt(removePercent)) / 100n : 0n;
  const needsLPApproval = lpBalance && lpBalance > 0n && removePercent > 0 && lpAllowance !== undefined && lpAllowance < liquidityToRemove;
  const isLoading = router.isPending || router.isConfirming;
  const tokenABalanceFloat = parseFloat(tokenA?.isNative ? getSpendableNativeBalance() : getTokenADisplayBalance());
  const tokenBBalanceFloat = parseFloat(tokenB?.isNative ? getSpendableNativeBalance() : getTokenBDisplayBalance());
  const insufficientTokenA = !!amountA && parseFloat(amountA) > tokenABalanceFloat;
  const insufficientTokenB = !!amountB && parseFloat(amountB) > tokenBBalanceFloat;

  return (
    <main 
      className="container mx-auto px-4 py-8 pb-24 lg:pb-8 relative min-h-[calc(100vh-80px)]"
      role="main"
      aria-label="Liquidity Management"
    >

    <SEO title="Provide Liquidity — QUANTAX" description="Add or remove liquidity on QUANTAX pools and earn 0.3% trading fees from every swap." path="/liquidity" />
      <Spotlight className="hidden md:block" />
      <GlowingStarsBackground starCount={30} className="opacity-20" />
      <ParticleField particleCount={30} colorScheme="dragon" className="opacity-30" />
      <GlowOrb color="primary" size="xl" className="top-20 -left-20 opacity-30" />
      <GlowOrb color="accent" size="lg" className="bottom-40 -right-10 opacity-20" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
        className="max-w-xl mx-auto relative z-10"
      >
        <header className="text-center mb-8">
          <motion.span
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="ember-pill inline-flex items-center gap-2 text-xs mb-4"
          >
            <Droplets className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="uppercase tracking-[0.18em]">Liquidity Management</span>
          </motion.span>
          <h1 className="font-display text-3xl md:text-5xl font-bold gradient-text mb-3 tracking-tight">
            Manage Liquidity
          </h1>
          <TextGenerateEffect 
            words="Provide liquidity and earn 0.3% on every trade. Auto-calculation ensures perfect token ratios."
            className="text-sm md:text-base text-muted-foreground font-normal"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-1.5 mt-4 px-3 py-1 rounded-full bg-success/10 text-success text-xs"
          >
            <Shield className="w-3 h-3" aria-hidden="true" />
            <span className="uppercase tracking-[0.14em]">Secure & Audited</span>
          </motion.div>
        </header>


        <MovingBorder duration={4000} borderRadius="1.5rem">
          <div className="p-6 bg-card/95 backdrop-blur-sm rounded-3xl">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full mb-6 bg-muted/50 grid grid-cols-2 h-12 rounded-xl p-1">
                <TabsTrigger 
                  value="add" 
                  className="flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="remove" 
                  className="flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground transition-all"
                >
                  <Minus className="w-4 h-4" />
                  <span>Remove</span>
                </TabsTrigger>
              </TabsList>

              {/* ============ ADD LIQUIDITY TAB ============ */}
              <TabsContent value="add" className="mt-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="add"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Plus className="w-5 h-5 text-primary" />
                        Add Liquidity
                        {isAutoCalculating && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full"
                          >
                            <Calculator className="w-3 h-3 animate-pulse" />
                            Auto
                          </motion.span>
                        )}
                      </h3>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full">
                        <Info className="w-3 h-3" />
                        Earn 0.3% fees
                      </span>
                    </div>

                    <SlippageDeadlineControls
                      slippage={slippage} setSlippage={setSlippage}
                      deadline={deadlineMinutes} setDeadline={setDeadlineMinutes}
                    />

                    {/* Pool Rate Info */}
                    {isPoolDataLoading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-muted/30 rounded-xl p-4 text-center"
                      >
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                        <p className="text-sm text-muted-foreground">Loading pool data...</p>
                      </motion.div>
                    )}
                    {!isPoolDataLoading && priceRatio && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-primary/5 border border-primary/20 rounded-xl p-4"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">Current Pool Rate</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-background/60 rounded-lg p-3 text-center">
                            <p className="text-xs text-muted-foreground mb-1">1 {tokenA?.symbol} =</p>
                            <p className="font-bold text-sm">{priceRatio.bPerA.toFixed(4)} {tokenB?.symbol}</p>
                          </div>
                          <div className="bg-background/60 rounded-lg p-3 text-center">
                            <p className="text-xs text-muted-foreground mb-1">1 {tokenB?.symbol} =</p>
                            <p className="font-bold text-sm">{priceRatio.aPerB.toFixed(4)} {tokenA?.symbol}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {isSameUnderlyingPair && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-warning/10 border border-warning/30 rounded-xl p-4"
                      >
                        <p className="text-sm font-medium text-warning mb-1">Pair QMS/WQMS tidak bisa jadi liquidity pair</p>
                        <p className="text-xs text-muted-foreground">
                          QMS dan WQMS menggunakan underlying address yang sama. Gunakan fitur Swap untuk Wrap/Unwrap.
                        </p>
                      </motion.div>
                    )}

                    {/* New Pair Info Indicator */}
                    {!isSameUnderlyingPair && !isPoolDataLoading && tokenA && tokenB && !validPair && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-primary/5 border border-primary/25 rounded-xl p-4"
                      >
                        <p className="text-sm font-medium text-primary mb-1 flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          Pool Baru — {tokenA.symbol}/{tokenB.symbol}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Pair ini belum ada. Pool akan dibuat otomatis saat kamu menambahkan likuiditas pertama — tidak perlu ke halaman Create Pool.
                          Atur rasio harga awal dengan mengisi jumlah kedua token.
                        </p>
                        {amountA && amountB && parseFloat(amountA) > 0 && parseFloat(amountB) > 0 && (
                          <p className="text-xs text-foreground mt-2 font-medium">
                            Harga awal: 1 {tokenA.symbol} = {(parseFloat(amountB) / parseFloat(amountA)).toFixed(6)} {tokenB.symbol}
                          </p>
                        )}
                      </motion.div>
                    )}
                    
                    {/* Token A Input */}
                    <div className={cn(
                      "bg-muted/30 rounded-xl p-4 border-2 transition-all duration-200",
                      lastEditedField === 'A' ? "border-primary/50" : "border-transparent"
                    )}>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm text-muted-foreground">First Token</span>
                        <button 
                          onClick={() => handleAmountAChange(tokenA?.isNative ? getSpendableNativeBalance() : getTokenADisplayBalance())}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                        >
                          <Wallet className="w-3 h-3" />
                          {tokenA?.isNative ? `Spendable: ${getSpendableNativeBalance()}` : `Balance: ${getTokenADisplayBalance()}`}
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <Input 
                          type="number" 
                          placeholder="0.0" 
                          value={amountA} 
                          onChange={(e) => handleAmountAChange(e.target.value)} 
                          className="flex-1 text-2xl font-bold bg-transparent border-none p-0 h-auto focus-visible:ring-0" 
                        />
                        <TokenSelector selectedToken={tokenA} onSelect={setTokenA} disabledToken={tokenB} />
                      </div>
                    </div>
                    
                    {/* Plus Icon Separator */}
                    <div className="flex justify-center relative py-1">
                      <motion.div 
                        animate={{ rotate: isAutoCalculating ? 180 : 0 }}
                        className={cn(
                          "p-2.5 rounded-full bg-muted border-4 border-background transition-colors z-10",
                          isAutoCalculating && "bg-primary/20"
                        )}
                      >
                        <Plus className={cn(
                          "w-5 h-5 transition-colors",
                          isAutoCalculating ? "text-primary" : "text-muted-foreground"
                        )} />
                      </motion.div>
                      {priceRatio && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-muted-foreground flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full">
                          <Calculator className="w-3 h-3" />
                          Auto-sync
                        </div>
                      )}
                    </div>
                    
                    {/* Token B Input */}
                    <div className={cn(
                      "bg-muted/30 rounded-xl p-4 border-2 transition-all duration-200",
                      lastEditedField === 'B' ? "border-primary/50" : "border-transparent"
                    )}>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm text-muted-foreground">Second Token</span>
                        <button 
                          onClick={() => handleAmountBChange(tokenB?.isNative ? getSpendableNativeBalance() : getTokenBDisplayBalance())}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                        >
                          <Wallet className="w-3 h-3" />
                          {tokenB?.isNative ? `Spendable: ${getSpendableNativeBalance()}` : `Balance: ${getTokenBDisplayBalance()}`}
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <Input 
                          type="number" 
                          placeholder="0.0" 
                          value={amountB} 
                          onChange={(e) => handleAmountBChange(e.target.value)} 
                          className="flex-1 text-2xl font-bold bg-transparent border-none p-0 h-auto focus-visible:ring-0" 
                        />
                        <TokenSelector selectedToken={tokenB} onSelect={setTokenB} disabledToken={tokenA} />
                      </div>
                    </div>

                    {/* Pool Share Preview */}
                    {poolShare && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 text-center"
                      >
                        <p className="text-xs text-muted-foreground mb-1">Your Pool Share</p>
                        <p className="text-2xl font-bold text-primary">{poolShare}%</p>
                      </motion.div>
                    )}

                    {/* Approval Steps for Add Liquidity */}
                    {isConnected && (needsApprovalA || needsApprovalB) && (
                      <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 space-y-3">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-warning" />
                          Token Approval Required
                        </p>
                        {/* Step Indicator */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                              !needsApprovalA && !needsApprovalB ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground"
                            )}>
                              {!needsApprovalA && !needsApprovalB ? <Check className="w-3.5 h-3.5" /> : '1'}
                            </div>
                            <span className="text-xs font-medium">Approve</span>
                          </div>
                          <div className="flex-1 h-px bg-border" />
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-muted text-muted-foreground">
                              2
                            </div>
                            <span className="text-xs text-muted-foreground">Add Liquidity</span>
                          </div>
                        </div>
                        <div className="grid gap-2">
                          {needsApprovalA && (
                            <Button 
                              onClick={handleApproveA} 
                              variant="outline" 
                              size="sm"
                              className="w-full"
                              disabled={approveAPending || approveAConfirming}
                            >
                              {approveAPending || approveAConfirming ? (
                                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Approving {tokenA?.symbol}...</>
                              ) : (
                                <>Approve {tokenA?.symbol}</>
                              )}
                            </Button>
                          )}
                          {needsApprovalB && (
                            <Button 
                              onClick={handleApproveB} 
                              variant="outline" 
                              size="sm"
                              className="w-full"
                              disabled={approveBPending || approveBConfirming}
                            >
                              {approveBPending || approveBConfirming ? (
                                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Approving {tokenB?.symbol}...</>
                              ) : (
                                <>Approve {tokenB?.symbol}</>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Add Liquidity Button */}
                    {!isConnected ? (
                      <Button onClick={() => setShowWalletModal(true)} className="w-full h-12 text-base btn-dragon">
                        <Wallet className="w-5 h-5 mr-2" />
                        Connect Wallet
                      </Button>
                    ) : !isCorrectNetwork ? (
                      <Button onClick={switchToQMS} className="w-full h-12 text-base" variant="destructive">
                        Switch to QMS Network
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleAddLiquidity}
                        className="w-full h-12 text-base btn-dragon sticky-cta"
                        disabled={isLoading || creatingPool || !amountA || !amountB || !!needsApprovalA || !!needsApprovalB || isSameUnderlyingPair || insufficientTokenA || insufficientTokenB || isPoolDataLoading}

                      >
                        {creatingPool ? (
                          <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Creating Pool...</>
                        ) : isLoading ? (
                          <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Adding Liquidity...</>
                        ) : isSameUnderlyingPair ? (
                          <>Invalid Pair (Use Swap Wrap/Unwrap)</>
                        ) : !validPair && tokenA && tokenB ? (
                          <>Create Pool & Add Liquidity</>
                        ) : insufficientTokenA || insufficientTokenB ? (
                          <>{tokenA?.isNative || tokenB?.isNative ? 'Insufficient balance (keep gas)' : 'Insufficient token balance'}</>
                        ) : (
                          <><Plus className="w-5 h-5 mr-2" /> Add Liquidity</>
                        )}
                      </Button>
                    )}
                  </motion.div>
                </AnimatePresence>
              </TabsContent>

              {/* ============ REMOVE LIQUIDITY TAB ============ */}
              <TabsContent value="remove" className="mt-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="remove"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Minus className="w-5 h-5 text-destructive" />
                      <h3 className="font-semibold text-lg">Remove Liquidity</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Withdraw your liquidity position and reclaim tokens</p>

                    <SlippageDeadlineControls
                      slippage={slippage} setSlippage={setSlippage}
                      deadline={deadlineMinutes} setDeadline={setDeadlineMinutes}
                    />
                    
                    {/* Token Pair Selection */}
                    <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-medium">Select Pair</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <TokenSelector selectedToken={tokenA} onSelect={setTokenA} disabledToken={tokenB} />
                        </div>
                        <div className="flex items-center gap-2">
                          <TokenSelector selectedToken={tokenB} onSelect={setTokenB} disabledToken={tokenA} />
                        </div>
                      </div>
                    </div>
                    
                    {/* LP Balance Info */}
                    <div className="bg-muted/30 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm text-muted-foreground">Your LP Tokens</span>
                        <div className="flex items-center gap-2">
                          {tokenA && <img src={tokenA.logoURI} alt={tokenA.symbol} className="w-5 h-5 rounded-full" />}
                          {tokenB && <img src={tokenB.logoURI} alt={tokenB.symbol} className="w-5 h-5 rounded-full -ml-2" />}
                        </div>
                      </div>
                      <p className="text-2xl font-bold">
                        {lpBalance ? parseFloat(formatEther(lpBalance)).toFixed(6) : '0.000000'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{tokenA?.symbol}/{tokenB?.symbol} LP</p>
                    </div>

                    {/* Amount Slider */}
                    <div className="bg-muted/30 rounded-xl p-4">
                      <p className="text-sm text-muted-foreground mb-4">Amount to Remove</p>
                      <div className="text-center mb-6">
                        <span className="text-5xl font-bold text-destructive">{removePercent}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={removePercent} 
                        onChange={(e) => setRemovePercent(Number(e.target.value))}
                        className="w-full accent-destructive h-2 rounded-full cursor-pointer"
                      />
                      <div className="flex justify-between mt-4 gap-2">
                        {[25, 50, 75, 100].map((p) => (
                          <button
                            key={p}
                            onClick={() => setRemovePercent(p)}
                            className={cn(
                              "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all",
                              removePercent === p 
                                ? "bg-destructive text-destructive-foreground shadow-lg" 
                                : "bg-muted hover:bg-muted/80"
                            )}
                          >
                            {p}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Expected Output Preview */}
                    {lpBalance && lpBalance > 0n && removePercent > 0 && lpTotalSupply && lpTotalSupply > 0n && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-muted/20 rounded-xl p-4"
                      >
                        <p className="text-sm text-muted-foreground mb-3">You will receive (estimated)</p>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              {tokenA && <img src={tokenA.logoURI} alt={tokenA.symbol} className="w-5 h-5 rounded-full" />}
                              <span className="text-sm">{tokenA?.symbol}</span>
                            </div>
                            <span className="font-medium">~{(parseFloat(formatUnits(reserveA, tokenA?.decimals || 18)) * (removePercent / 100) * parseFloat(formatEther(lpBalance)) / parseFloat(formatEther(lpTotalSupply))).toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              {tokenB && <img src={tokenB.logoURI} alt={tokenB.symbol} className="w-5 h-5 rounded-full" />}
                              <span className="text-sm">{tokenB?.symbol}</span>
                            </div>
                            <span className="font-medium">~{(parseFloat(formatUnits(reserveB, tokenB?.decimals || 18)) * (removePercent / 100) * parseFloat(formatEther(lpBalance)) / parseFloat(formatEther(lpTotalSupply))).toFixed(4)}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* LP Token Approval for Remove */}
                    {isConnected && needsLPApproval && (
                      <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 space-y-3">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-warning" />
                          LP Token Approval Required
                        </p>
                        <p className="text-xs text-muted-foreground">
                          You must approve LP tokens before removing liquidity for the first time.
                        </p>
                        <Button 
                          onClick={handleApproveLPTokens}
                          variant="outline" 
                          className="w-full h-12"
                          disabled={pairApprovePending || pairApproveConfirming}
                        >
                          {pairApprovePending || pairApproveConfirming ? (
                            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Approving LP Tokens...</>
                          ) : (
                            <>Approve LP Tokens</>
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Remove Button */}
                    {!isConnected ? (
                      <Button onClick={() => setShowWalletModal(true)} className="w-full h-12 text-base">
                        <Wallet className="w-5 h-5 mr-2" />
                        Connect Wallet
                      </Button>
                    ) : !isCorrectNetwork ? (
                      <Button onClick={switchToQMS} className="w-full h-12 text-base" variant="destructive">
                        Switch to QMS Network
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleRemoveLiquidity}
                        className="w-full h-12 text-base sticky-cta"
                        variant="destructive"
                        disabled={isLoading || !lpBalance || lpBalance === 0n || removePercent === 0 || !!needsLPApproval || isSameUnderlyingPair}

                      >
                        {isLoading ? (
                          <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Removing Liquidity...</>
                        ) : (
                          <><Minus className="w-5 h-5 mr-2" /> Remove Liquidity</>
                        )}
                      </Button>
                    )}
                  </motion.div>
                </AnimatePresence>
              </TabsContent>

            </Tabs>
          </div>
        </MovingBorder>

        {/* Transaction Hash Display */}
        {router.hash && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
            <a 
              href={`https://testnet.qmsscan.io/tx/${router.hash}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-success bg-success/10 py-3 px-4 rounded-xl"
            >
              <Check className="w-4 h-4" /> Transaction Submitted <ExternalLink className="w-3 h-3" />
            </a>
          </motion.div>
        )}
      </motion.div>

      <WalletConnectModal isOpen={showWalletModal} onClose={() => setShowWalletModal(false)} />
    </main>
  );
}
