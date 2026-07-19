import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownUp, Settings, Loader2, ExternalLink, Check, Info, X, Flame, Wallet, RotateCw, Route, Zap, Clock, ChevronDown, RefreshCw, Sparkles } from 'lucide-react';
import { useAccount, useBalance } from 'wagmi';
import { parseUnits, formatUnits, formatEther, parseEther } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { TokenSelector } from './TokenSelector';
import { PriceImpactWarning } from './PriceImpactWarning';
import { SwapPriceChart } from './SwapPriceChart';
import { TOKEN_LIST, TokenInfo, CONTRACTS } from '@/config/contracts';
import { useRouter, useApprove, useTokenBalance, useTokenAllowance, useGetPair, usePairReserves, usePairTokens, useWETH, useRouterWETH } from '@/hooks/useContract';
import { useBestRoute } from '@/hooks/useSwapRouter';
import { RouteComparison } from './RouteComparison';
import { useWallet } from '@/hooks/useWallet';
import { usePriceImpact, useTokenPrices } from '@/hooks/usePrices';
import { parseTransactionError, getErrorToastConfig } from '@/lib/transactionErrors';
import { sanitizeAmountInput, sanitizeSlippage, getSafeDeadline, calculateMinOutput, getSafeApprovalAmount } from '@/lib/inputValidation';
import { WalletConnectModal } from '@/components/wallet/WalletConnectModal';
import { SwapConfirmModal } from './SwapConfirmModal';
import { useTransactionHistory } from '@/components/history/TransactionHistory';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function SwapCard() {
  const { address, isConnected } = useAccount();
  const { isCorrectNetwork, switchToOPN } = useWallet();

  const [fromToken, setFromToken] = useState<TokenInfo | null>(TOKEN_LIST[0]);
  const [toToken, setToToken] = useState<TokenInfo | null>(TOKEN_LIST[2]);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastSwapParams, setLastSwapParams] = useState<{ from: string; to: string } | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [autoSlippage, setAutoSlippage] = useState(true);
  const [processedHash, setProcessedHash] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);

  const NATIVE_GAS_RESERVE = 0.01;

  const router = useRouter();
  const weth = useWETH();
  const { data: routerWETH } = useRouterWETH();
  const { prices, getPrice } = useTokenPrices();
  const { approve, isPending: isApproving, isSuccess: approveSuccess, hash: approveHash, error: approveError } = useApprove();
  const { addTransaction, updateTransaction } = useTransactionHistory();

  // Detect if this is a wrap/unwrap (OPN <-> WOPN)
  const isWrapUnwrap = useMemo(() => {
    if (!fromToken || !toToken) return false;
    const fromIsNative = fromToken.isNative;
    const toIsNative = toToken.isNative;
    const fromIsWOPN = fromToken.symbol === 'WOPN';
    const toIsWOPN = toToken.symbol === 'WOPN';
    return (fromIsNative && toIsWOPN) || (fromIsWOPN && toIsNative);
  }, [fromToken, toToken]);

  const isWrapping = fromToken?.isNative && toToken?.symbol === 'WOPN';
  const isUnwrapping = fromToken?.symbol === 'WOPN' && toToken?.isNative;

  const { data: nativeBalance } = useBalance({ address });
  const { data: tokenBalance } = useTokenBalance(
    fromToken && !fromToken.isNative ? (fromToken.address as `0x${string}`) : undefined,
    address
  );

  // Use router's actual WETH address if available, fallback to configured
  const wethAddress = useMemo(() => {
    return (routerWETH || CONTRACTS.WETH) as `0x${string}`;
  }, [routerWETH]);

  // Log WETH mismatch for debugging
  useEffect(() => {
    if (routerWETH && routerWETH.toLowerCase() !== CONTRACTS.WETH.toLowerCase()) {
      console.warn(`⚠️ WETH mismatch! Router: ${routerWETH}, Config: ${CONTRACTS.WETH}`);
    }
  }, [routerWETH]);

  // Get pair for price impact calculation
  const fromAddr = useMemo(() => {
    if (!fromToken) return undefined;
    return (fromToken.isNative ? wethAddress : fromToken.address) as `0x${string}`;
  }, [fromToken, wethAddress]);
  const toAddr = useMemo(() => {
    if (!toToken) return undefined;
    return (toToken.isNative ? wethAddress : toToken.address) as `0x${string}`;
  }, [toToken, wethAddress]);

  const amountIn = useMemo(() => {
    if (!fromAmount || !fromToken) return undefined;
    try {
      const num = parseFloat(fromAmount);
      if (isNaN(num) || num <= 0) return undefined;
      return parseUnits(fromAmount, fromToken.decimals || 18);
    } catch {
      return undefined;
    }
  }, [fromAmount, fromToken]);

  // Multi-hop routing: find best path automatically
  const { bestRoute, allRoutes, allQuotes, isLoading: isRouteLoading, hasRoute } = useBestRoute(
    isWrapUnwrap ? undefined : fromAddr,
    isWrapUnwrap ? undefined : toAddr,
    isWrapUnwrap ? undefined : amountIn
  );

  const swapPath = useMemo(() => {
    if (isWrapUnwrap || !bestRoute) return [];
    return bestRoute.route.path;
  }, [bestRoute, isWrapUnwrap]);

  const amountsOut = bestRoute?.amountsOut;
  const isQuoting = isRouteLoading;
  const isMultiHop = bestRoute ? bestRoute.route.hops > 1 : false;

  // Direct pair for price impact — only fetch for direct (single-hop) swaps
  // For multi-hop, reserves from the first hop don't represent the overall exchange rate
  const directPairToken0 = !isMultiHop && swapPath.length >= 2 ? swapPath[0] : undefined;
  const directPairToken1 = !isMultiHop && swapPath.length >= 2 ? swapPath[1] : undefined;
  const { data: pairAddress, refetch: refetchPair, isLoading: isPairLoading } = useGetPair(
    isWrapUnwrap ? undefined : directPairToken0,
    isWrapUnwrap ? undefined : directPairToken1
  );
  const validPairAddress = pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000' ? pairAddress : undefined;
  const { data: reserves, refetch: refetchReserves, isLoading: isReservesLoading } = usePairReserves(validPairAddress);
  const { token0: pairToken0 } = usePairTokens(validPairAddress);

  const { data: allowance, refetch: refetchAllowance } = useTokenAllowance(
    fromToken && !fromToken.isNative ? (fromToken.address as `0x${string}`) : undefined,
    address,
    CONTRACTS.ROUTER as `0x${string}`
  );

  const needsApproval = useMemo(() => {
    if (!fromToken || fromToken.isNative || !amountIn || isWrapUnwrap) return false;
    return allowance !== undefined && allowance < amountIn;
  }, [fromToken, allowance, amountIn, isWrapUnwrap]);

  // Check if route has liquidity
  const hasLiquidity = useMemo(() => {
    if (isWrapUnwrap) return true;
    return hasRoute && !!bestRoute;
  }, [hasRoute, bestRoute, isWrapUnwrap]);

  const isPoolDataLoading = isWrapUnwrap ? false : isRouteLoading;

  // Auto-slippage: adjust based on price impact
  useEffect(() => {
    if (!autoSlippage) return;
    if (isWrapUnwrap) {
      setSlippage(0.1);
    } else if (priceImpact > 5) {
      setSlippage(Math.min(priceImpact + 2, 49));
    } else if (priceImpact > 2) {
      setSlippage(1.0);
    } else {
      setSlippage(0.5);
    }
  }, [autoSlippage, isWrapUnwrap]);

  // Refetch pair and reserves periodically to keep data fresh
  useEffect(() => {
    const interval = setInterval(() => {
      refetchPair();
      if (validPairAddress) refetchReserves();
    }, 10000);
    return () => clearInterval(interval);
  }, [refetchPair, refetchReserves, validPairAddress]);

  // Watch for approval success → auto-proceed to swap
  useEffect(() => {
    if (approveSuccess && approveHash) {
      toast.dismiss('approve');
      toast.success('Token Approved!', {
        description: `${fromToken?.symbol} approved — you can now swap`,
        action: {
          label: 'View TX',
          onClick: () => window.open(`https://testnet.iopn.tech/tx/${approveHash}`, '_blank'),
        },
      });
      addTransaction({
        hash: approveHash,
        type: 'approve',
        status: 'success',
        details: { fromToken: fromToken?.symbol },
      });
      setTimeout(() => refetchAllowance(), 1500);
    }
  }, [approveSuccess, approveHash, fromToken, refetchAllowance]);

  // Watch for approval errors
  useEffect(() => {
    if (approveError) {
      toast.dismiss('approve');
      const parsed = parseTransactionError(approveError);
      if (parsed.type === 'user_rejected') {
        toast.info(parsed.title, { description: parsed.description });
      } else {
        toast.error('Approval Failed', {
          description: `${parsed.description}\n💡 ${parsed.suggestion}`,
        });
      }
    }
  }, [approveError]);

  // Watch for swap success
  useEffect(() => {
    if (router.isSuccess && router.hash && router.hash !== processedHash) {
      setProcessedHash(router.hash);
      const savedFrom = fromAmount;
      const savedTo = toAmount;
      toast.dismiss('swap');
      toast.success('Swap Successful! 🔥', {
        description: `Swapped ${savedFrom} ${fromToken?.symbol} → ${savedTo} ${toToken?.symbol}`,
        action: {
          label: 'View',
          onClick: () => window.open(`https://testnet.iopn.tech/tx/${router.hash}`, '_blank'),
        },
      });
      addTransaction({
        hash: router.hash,
        type: 'swap',
        status: 'success',
        details: { fromToken: fromToken?.symbol, toToken: toToken?.symbol, fromAmount: savedFrom, toAmount: savedTo },
      });
      setFromAmount('');
      setToAmount('');
    }
  }, [router.isSuccess, router.hash, processedHash]);

  // Watch for wrap/unwrap success
  useEffect(() => {
    if (weth.isSuccess && weth.hash && weth.hash !== processedHash) {
      setProcessedHash(weth.hash);
      const savedFrom = fromAmount;
      const savedTo = toAmount;
      toast.dismiss('swap');
      const action = isWrapping ? 'Wrapped' : 'Unwrapped';
      toast.success(`${action} Successfully! 🔥`, {
        description: `${action} ${savedFrom} ${fromToken?.symbol} → ${savedTo} ${toToken?.symbol}`,
        action: {
          label: 'View',
          onClick: () => window.open(`https://testnet.iopn.tech/tx/${weth.hash}`, '_blank'),
        },
      });
      addTransaction({
        hash: weth.hash,
        type: 'swap',
        status: 'success',
        details: { fromToken: fromToken?.symbol, toToken: toToken?.symbol, fromAmount: savedFrom, toAmount: savedTo },
      });
      setFromAmount('');
      setToAmount('');
    }
  }, [weth.isSuccess, weth.hash, processedHash]);

  // Watch for errors with decoded revert reasons
  useEffect(() => {
    if (router.error) {
      toast.dismiss('swap');
      const parsed = parseTransactionError(router.error);
      const config = getErrorToastConfig(parsed);
      
      if (parsed.type === 'user_rejected') {
        toast.info(parsed.title, {
          description: parsed.description,
          duration: config.duration,
        });
      } else {
        toast.error(parsed.title, {
          description: `${parsed.description}\n💡 ${parsed.suggestion}`,
          duration: config.duration,
          action: parsed.canRetry && lastSwapParams ? {
            label: 'Retry',
            onClick: () => handleSwap(),
          } : undefined,
        });
      }
    }
  }, [router.error]);

  useEffect(() => {
    if (weth.error) {
      toast.dismiss('swap');
      const parsed = parseTransactionError(weth.error);
      const config = getErrorToastConfig(parsed);
      
      if (parsed.type === 'user_rejected') {
        toast.info(parsed.title, {
          description: parsed.description,
          duration: config.duration,
        });
      } else {
        toast.error(parsed.title, {
          description: `${parsed.description}\n💡 ${parsed.suggestion}`,
          duration: config.duration,
          action: parsed.canRetry ? {
            label: 'Retry',
            onClick: () => handleSwap(),
          } : undefined,
        });
      }
    }
  }, [weth.error]);

  // Record pending swap transaction
  useEffect(() => {
    if (router.isPending && router.hash) {
      addTransaction({
        hash: router.hash, type: 'swap', status: 'pending',
        details: { fromToken: fromToken?.symbol, toToken: toToken?.symbol, fromAmount, toAmount },
      });
    }
  }, [router.isPending, router.hash]);

  // For wrap/unwrap, output = input (1:1 ratio)
  useEffect(() => {
    if (isWrapUnwrap) {
      setToAmount(fromAmount);
    } else if (amountsOut && amountsOut.length > 1) {
      const outputAmount = formatUnits(amountsOut[amountsOut.length - 1], toToken?.decimals || 18);
      setToAmount(parseFloat(outputAmount).toFixed(6));
    } else if (!fromAmount) {
      setToAmount('');
    }
  }, [amountsOut, toToken, fromAmount, isWrapUnwrap]);

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleSwap = useCallback(async () => {
    if (!address || !fromToken || !toToken || !fromAmount) return;
    if (cooldown) {
      toast.info('Please wait…', { description: 'Cooldown active to prevent double-submit.' });
      return;
    }
    setCooldown(true);
    setTimeout(() => setCooldown(false), 3000);


    if (fromToken.isNative) {
      const nativeBal = nativeBalance ? parseFloat(formatEther(nativeBalance.value)) : 0;
      const spendable = Math.max(nativeBal - NATIVE_GAS_RESERVE, 0);
      if (parseFloat(fromAmount) > spendable) {
        toast.error('Insufficient OPN for swap + gas', {
          description: `Sisakan minimal ${NATIVE_GAS_RESERVE} OPN untuk biaya gas.`,
        });
        return;
      }
    }
    
    setLastSwapParams({ from: fromAmount, to: toAmount });
    
    // Handle wrap/unwrap
    if (isWrapUnwrap) {
      toast.loading(isWrapping ? 'Wrapping OPN...' : 'Unwrapping WOPN...', { id: 'swap' });
      if (isWrapping) {
        weth.deposit(parseEther(fromAmount));
      } else {
        weth.withdraw(parseUnits(fromAmount, 18));
      }
      return;
    }

    if (!amountsOut) return;
    
    toast.loading('Confirming swap...', { id: 'swap' });
    
    const deadline = getSafeDeadline(30);
    const minOutput = calculateMinOutput(amountsOut[amountsOut.length - 1], slippage);
    
    console.log('🔥 Swap params:', { 
      native: fromToken.isNative, 
      path: swapPath.map(p => p.slice(0, 10)), 
      minOutput: minOutput.toString(),
      value: fromToken.isNative ? parseEther(fromAmount).toString() : undefined,
    });

    if (fromToken.isNative) {
      const ethPath = swapPath[0].toLowerCase() === wethAddress.toLowerCase() 
        ? swapPath 
        : [wethAddress, ...swapPath.slice(1)];
      router.swapExactETHForTokens(minOutput, ethPath, address, deadline, parseEther(fromAmount));
    } else if (toToken.isNative) {
      const ethPath = swapPath[swapPath.length - 1].toLowerCase() === wethAddress.toLowerCase()
        ? swapPath
        : [...swapPath.slice(0, -1), wethAddress];
      router.swapExactTokensForETH(amountIn!, minOutput, ethPath, address, deadline);
    } else {
      router.swapExactTokensForTokens(amountIn!, minOutput, swapPath, address, deadline);
    }
  }, [address, fromToken, toToken, fromAmount, toAmount, isWrapUnwrap, isWrapping, amountsOut, slippage, swapPath, amountIn, nativeBalance, wethAddress, cooldown]);

  const handleApprove = async () => {
    if (!fromToken || fromToken.isNative) return;
    toast.loading(`Approving ${fromToken.symbol}...`, { id: 'approve' });
    const safeAmount = getSafeApprovalAmount(amountIn || 0n);
    approve(fromToken.address as `0x${string}`, CONTRACTS.ROUTER as `0x${string}`, safeAmount);
  };

  const fromBalance = useMemo(() => {
    if (fromToken?.isNative) return nativeBalance ? formatEther(nativeBalance.value) : '0';
    return tokenBalance ? formatUnits(tokenBalance, fromToken?.decimals || 18) : '0';
  }, [fromToken, nativeBalance, tokenBalance]);

  const maxSpendableFromBalance = useMemo(() => {
    if (!fromToken?.isNative) return fromBalance;
    const spendable = Math.max(parseFloat(fromBalance) - NATIVE_GAS_RESERVE, 0);
    return spendable.toString();
  }, [fromToken, fromBalance]);

  const isLoading = router.isPending || router.isConfirming || weth.isPending || weth.isConfirming;

  // Calculate price impact using reserves with correct token ordering
  // Only use on-chain reserves for single-hop; for multi-hop use AMM estimation
  const reservePair = !isMultiHop && reserves ? [reserves[0], reserves[1]] as [bigint, bigint] : undefined;
  const { priceImpact, severity } = usePriceImpact(
    fromToken, 
    toToken, 
    fromAmount, 
    toAmount,
    reservePair,
    !isMultiHop ? pairToken0 : undefined
  );

  // Calculate minimum received
  const minReceived = useMemo(() => {
    if (!toAmount) return '0';
    return (parseFloat(toAmount) * (1 - slippage / 100)).toFixed(6);
  }, [toAmount, slippage]);

  // Calculate USD values
  const fromUsdValue = useMemo(() => {
    if (!fromToken || !fromAmount) return 0;
    return parseFloat(fromAmount) * getPrice(fromToken.symbol);
  }, [fromToken, fromAmount, getPrice]);

  const toUsdValue = useMemo(() => {
    if (!toToken || !toAmount) return 0;
    return parseFloat(toAmount) * getPrice(toToken.symbol);
  }, [toToken, toAmount, getPrice]);

  // High slippage warning
  const isHighImpact = severity === 'high';
  const showImpactWarning = severity !== 'low' && priceImpact > 1;

  // Rate display
  const rate = useMemo(() => {
    if (!fromAmount || !toAmount || parseFloat(fromAmount) === 0) return null;
    return parseFloat(toAmount) / parseFloat(fromAmount);
  }, [fromAmount, toAmount]);

  return (
    <div className="w-full max-w-[440px] mx-auto">
      {/* Main Card */}
      <div className="relative group">
        {/* Outer glow */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-secondary/10 to-primary/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative bg-card/90 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl overflow-hidden">
          {/* Top gradient line */}
          <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          
          <div className="p-4 sm:p-5 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Flame className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold leading-tight">Swap</h2>
                  {isWrapUnwrap && (
                    <span className="text-[10px] text-primary font-medium">
                      {isWrapping ? 'Wrap Mode' : 'Unwrap Mode'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Refresh */}
                <motion.button
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => { refetchPair(); if (validPairAddress) refetchReserves(); }}
                  className="p-2 rounded-lg hover:bg-muted/80 transition-colors"
                  title="Refresh prices"
                  aria-label="Refresh prices"
                >
                  <RefreshCw className="w-4 h-4 text-muted-foreground" />
                </motion.button>
                {/* Settings */}
                <motion.button
                  whileHover={{ rotate: 90 }}
                  onClick={() => setShowSettings(!showSettings)}
                  aria-label="Swap settings"
                  aria-expanded={showSettings}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    showSettings ? "bg-primary/20 text-primary" : "hover:bg-muted/80 text-muted-foreground"
                  )}
                >
                  <Settings className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 sm:p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Slippage Tolerance</span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setAutoSlippage(!autoSlippage)}
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors",
                            autoSlippage ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Sparkles className="w-3 h-3 inline mr-0.5" />
                          Auto
                        </button>
                        <button onClick={() => setShowSettings(false)} aria-label="Close settings">
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-1.5 sm:gap-2">
                      {[0.1, 0.5, 1.0, 3.0].map((s) => (
                        <button
                          key={s}
                          onClick={() => { setSlippage(s); setAutoSlippage(false); }}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all",
                            slippage === s && !autoSlippage 
                              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                              : "bg-muted/60 hover:bg-muted/80 text-muted-foreground"
                          )}
                        >
                          {s}%
                        </button>
                      ))}
                      <Input
                        type="number"
                        value={autoSlippage ? '' : slippage}
                        onChange={(e) => { setSlippage(sanitizeSlippage(parseFloat(e.target.value))); setAutoSlippage(false); }}
                        min={0.01}
                        max={50}
                        className="w-16 sm:w-20 text-center text-xs h-9 bg-muted/60 border-border/40"
                        placeholder={autoSlippage ? 'Auto' : '0.5'}
                      />
                    </div>
                    {slippage > 5 && (
                      <p className="text-[10px] text-warning flex items-center gap-1">
                        <Info className="w-3 h-3" /> High slippage may result in unfavorable trade
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* From Token Input */}
            <div className="rounded-xl bg-muted/30 border border-border/40 p-3 sm:p-4 transition-all duration-200 focus-within:border-primary/40 focus-within:bg-muted/40 focus-within:shadow-[0_0_20px_-10px_hsl(var(--primary)/0.3)]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground font-medium">You Pay</span>
                <button 
                  onClick={() => setFromAmount(maxSpendableFromBalance)}
                  className="text-[10px] sm:text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                >
                  <Wallet className="w-3 h-3" />
                  {fromToken?.isNative ? `${parseFloat(maxSpendableFromBalance).toFixed(4)}` : `${parseFloat(fromBalance).toFixed(4)}`}
                  <span className="text-primary font-medium ml-0.5">MAX</span>
                </button>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <Input 
                    type="number" 
                    placeholder="0.0" 
                    value={fromAmount} 
                    onChange={(e) => setFromAmount(sanitizeAmountInput(e.target.value))} 
                    className="text-xl sm:text-2xl font-bold bg-transparent border-none p-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/30" 
                  />
                  {fromUsdValue > 0 && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      ≈ ${fromUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
                <TokenSelector selectedToken={fromToken} onSelect={setFromToken} disabledToken={toToken} />
              </div>
              
              {/* Quick percentage buttons */}
              {isConnected && parseFloat(fromBalance) > 0 && (
                <div className="flex gap-1.5 mt-2.5">
                  {[25, 50, 75, 100].map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        const bal = p === 100 ? maxSpendableFromBalance : (parseFloat(fromBalance) * p / 100).toString();
                        setFromAmount(bal);
                      }}
                      className={cn(
                        "flex-1 py-1 text-[10px] sm:text-xs rounded-md font-medium transition-all",
                        fromAmount && Math.abs(parseFloat(fromAmount) / parseFloat(fromBalance) * 100 - p) < 1
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      )}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Swap Direction Button */}
            <div className="flex justify-center -my-1.5 relative z-10">
              <motion.button 
                whileHover={{ scale: 1.15 }} 
                whileTap={{ scale: 0.9, rotate: 180 }}
                onClick={handleSwapTokens} 
                aria-label="Swap token direction"
                className="p-2.5 rounded-xl bg-card border-2 border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all shadow-lg group/swap"
              >
                <ArrowDownUp className="w-4 h-4 text-muted-foreground group-hover/swap:text-primary transition-colors" />
              </motion.button>
            </div>

            {/* To Token Input */}
            <div className="rounded-xl bg-muted/30 border border-border/40 p-3 sm:p-4 transition-all duration-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground font-medium">You Receive</span>
                {rate && !isWrapUnwrap && (
                  <span className="text-[10px] text-muted-foreground">
                    1 {fromToken?.symbol} ≈ {rate.toFixed(4)} {toToken?.symbol}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  {isQuoting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Finding best rate...</span>
                    </div>
                  ) : (
                    <>
                      <div className={cn(
                        "text-xl sm:text-2xl font-bold transition-colors",
                        toAmount ? "text-foreground" : "text-muted-foreground/30"
                      )}>
                        {toAmount || '0.0'}
                      </div>
                      {toUsdValue > 0 && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                          ≈ ${toUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <TokenSelector selectedToken={toToken} onSelect={setToToken} disabledToken={fromToken} />
              </div>
            </div>

            {/* Price Impact Warning */}
            <AnimatePresence>
              {showImpactWarning && (
                <PriceImpactWarning priceImpact={priceImpact} severity={severity} />
              )}
            </AnimatePresence>

            {/* Trade Details - Collapsible */}
            {fromAmount && toAmount && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-border/30 overflow-hidden"
              >
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      1 {fromToken?.symbol} = <span className="text-foreground font-medium">{rate?.toFixed(4)}</span> {toToken?.symbol}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-medium",
                      severity === 'high' ? 'bg-destructive/10 text-destructive' : 
                      severity === 'medium' ? 'bg-warning/10 text-warning' : 
                      'bg-success/10 text-success'
                    )}>
                      {priceImpact.toFixed(2)}%
                    </span>
                    <ChevronDown className={cn(
                      "w-3.5 h-3.5 text-muted-foreground transition-transform",
                      showDetails && "rotate-180"
                    )} />
                  </div>
                </button>
                
                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 space-y-2 border-t border-border/20 pt-2">
                        <DetailRow label="Price Impact" value={`${priceImpact.toFixed(2)}%`} valueClassName={cn(
                          severity === 'high' ? 'text-destructive' : severity === 'medium' ? 'text-warning' : 'text-success'
                        )} />
                        <DetailRow label="Min. Received" value={`${minReceived} ${toToken?.symbol}`} />
                        <DetailRow 
                          label="Slippage" 
                          value={`${slippage}%`} 
                          extra={autoSlippage ? <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary">Auto</span> : undefined}
                        />
                        {bestRoute && (
                          <DetailRow 
                            label="Route" 
                            value={
                              <span className="flex items-center gap-1 flex-wrap justify-end">
                                {bestRoute.route.pathSymbols.map((sym, i) => (
                                  <span key={i} className="flex items-center gap-0.5">
                                    {i > 0 && <span className="text-muted-foreground">→</span>}
                                    <span className={isMultiHop && i > 0 && i < bestRoute.route.pathSymbols.length - 1 ? 'text-primary' : ''}>
                                      {sym}
                                    </span>
                                  </span>
                                ))}
                                {isMultiHop && (
                                  <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary ml-1">Multi</span>
                                )}
                              </span>
                            } 
                          />
                        )}
                        <DetailRow label="Network Fee" value="~0.001 OPN" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Price Chart */}
            {fromToken && toToken && fromAmount && toAmount && parseFloat(toAmount) > 0 && (
              <SwapPriceChart
                fromSymbol={fromToken.symbol}
                toSymbol={toToken.symbol}
                currentPrice={parseFloat(toAmount) / parseFloat(fromAmount)}
              />
            )}

            {/* Route Comparison Panel */}
            {!isWrapUnwrap && fromAmount && bestRoute && allRoutes.length > 1 && (
              <RouteComparison
                bestRoute={bestRoute}
                allRoutes={allRoutes}
                allQuotes={allQuotes}
                toDecimals={toToken?.decimals || 18}
                toSymbol={toToken?.symbol || ''}
              />
            )}

            {/* Action Button */}
            <div className="pt-1 space-y-2">
              {!isConnected ? (
                <Button 
                  onClick={() => setShowWalletModal(true)}
                  className="w-full btn-dragon h-12 sm:h-14 text-sm sm:text-base font-semibold rounded-xl"
                >
                  <Wallet className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Connect Wallet
                </Button>
              ) : !isCorrectNetwork ? (
                <Button onClick={switchToOPN} className="w-full h-11 sm:h-12 rounded-xl text-sm" variant="destructive">
                  Switch to OPN Network
                </Button>
              ) : needsApproval ? (
                <>
                  {/* Step Indicator */}
                  <div className="flex items-center gap-2 px-1">
                    <div className="flex items-center gap-1.5">
                      <div className={cn(
                        "w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-colors",
                        approveSuccess ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground"
                      )}>
                        {approveSuccess ? <Check className="w-3 h-3" /> : '1'}
                      </div>
                      <span className="text-[10px] sm:text-xs font-medium">Approve</span>
                    </div>
                    <div className="flex-1 h-px bg-border" />
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold bg-muted text-muted-foreground">
                        2
                      </div>
                      <span className="text-[10px] sm:text-xs text-muted-foreground">Swap</span>
                    </div>
                  </div>
                  <Button 
                    onClick={handleApprove} 
                    className="w-full btn-dragon h-11 sm:h-12 rounded-xl text-sm" 
                    disabled={isApproving}
                  >
                    {isApproving ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Approving {fromToken?.symbol}...</>
                    ) : (
                      <>Approve {fromToken?.symbol}</>
                    )}
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => setShowConfirm(true)} 
                  className={cn(
                    "w-full h-11 sm:h-12 rounded-xl text-sm font-semibold",
                    isHighImpact ? "bg-destructive hover:bg-destructive/90" : "btn-dragon"
                  )}
                  disabled={
                    !fromAmount || 
                    isLoading || 
                    (!isWrapUnwrap && isPoolDataLoading) || 
                    parseFloat(fromAmount) > parseFloat(maxSpendableFromBalance) || 
                    (!isWrapUnwrap && !hasLiquidity && !isPoolDataLoading) || 
                    (!isWrapUnwrap && !amountsOut && hasLiquidity && !!fromAmount)
                  }
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {isWrapUnwrap ? (isWrapping ? 'Wrapping...' : 'Unwrapping...') : 'Swapping...'}</>
                  ) : !fromAmount ? (
                    'Enter Amount'
                  ) : !isWrapUnwrap && isPoolDataLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Finding Route...</>
                  ) : !isWrapUnwrap && !hasLiquidity && !isPoolDataLoading && fromToken && toToken ? (
                    'No Route Found'
                  ) : parseFloat(fromAmount) > parseFloat(maxSpendableFromBalance) ? (
                    <>{fromToken?.isNative ? 'Insufficient OPN' : `Insufficient ${fromToken?.symbol}`}</>
                  ) : isWrapUnwrap ? (
                    <>{isWrapping ? '🔥 Wrap OPN → WOPN' : '🔥 Unwrap WOPN → OPN'}</>
                  ) : isHighImpact ? (
                    '⚠️ Swap Anyway (High Impact)'
                  ) : (
                    <><Zap className="w-4 h-4 mr-1.5" /> Swap {isMultiHop ? '(Multi-hop)' : ''}</>
                  )}
                </Button>
              )}
            </div>

            {/* Transaction Link */}
            {(router.hash || weth.hash) && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <a 
                  href={`https://testnet.iopn.tech/tx/${router.hash || weth.hash}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-2 text-xs sm:text-sm text-success justify-center hover:underline py-1"
                >
                  <Check className="w-3.5 h-3.5" /> View transaction <ExternalLink className="w-3 h-3" />
                </a>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Wallet Connect Modal */}
      <WalletConnectModal 
        isOpen={showWalletModal} 
        onClose={() => setShowWalletModal(false)} 
      />

      {/* Swap Confirmation Modal */}
      <SwapConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => { handleSwap(); }}
        fromToken={fromToken}
        toToken={toToken}
        fromAmount={fromAmount}
        toAmount={toAmount}
        rate={rate}
        minReceived={minReceived}
        slippage={slippage}
        priceImpact={priceImpact}
        severity={severity}
        isWrapUnwrap={isWrapUnwrap}
        isWrapping={isWrapping}
        isProcessing={isLoading}
        txHash={router.hash || weth.hash || undefined}
        isSuccess={(router.isSuccess || weth.isSuccess) && !isLoading && !!(router.hash || weth.hash)}
      />
    </div>
  );
}

// Detail row component
function DetailRow({ label, value, valueClassName, extra }: { 
  label: string; 
  value: React.ReactNode; 
  valueClassName?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {extra}
        <span className={cn("font-medium", valueClassName)}>{value}</span>
      </div>
    </div>
  );
}
