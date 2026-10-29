/* eslint-disable @typescript-eslint/no-explicit-any */
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useReadContracts, useAccount, useChainId } from 'wagmi';
import { parseEther, formatEther, parseUnits, formatUnits, encodeFunctionData } from 'viem';
import { getContracts } from '@/config/contracts';
import { ROUTER_ABI, FACTORY_ABI, WETH_ABI, ERC20_ABI, PAIR_ABI, MULTICALL_ABI } from '@/config/abis';

// ============= ROUTER HOOKS =============
export function useRouter() {
  const chainId = useChainId();
  const C = getContracts(chainId);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const swapExactETHForTokens = (
    amountOutMin: bigint, 
    path: readonly `0x${string}`[], 
    to: `0x${string}`, 
    deadline: bigint, 
    value: bigint
  ) => {
    (writeContract as any)({
      address: C.ROUTER,
      abi: ROUTER_ABI,
      functionName: 'swapExactETHForTokens',
      args: [amountOutMin, [...path], to, deadline],
      value,
      gas: 300_000n, // Explicit gas limit - QMS Testnet gas estimation can fail for payable functions
    });
  };

  const swapExactTokensForETH = (
    amountIn: bigint,
    amountOutMin: bigint,
    path: readonly `0x${string}`[],
    to: `0x${string}`,
    deadline: bigint
  ) => {
    (writeContract as any)({
      address: C.ROUTER,
      abi: ROUTER_ABI,
      functionName: 'swapExactTokensForETH',
      args: [amountIn, amountOutMin, [...path], to, deadline],
      gas: 300_000n,
    });
  };

  const swapExactTokensForTokens = (
    amountIn: bigint,
    amountOutMin: bigint,
    path: readonly `0x${string}`[],
    to: `0x${string}`,
    deadline: bigint
  ) => {
    (writeContract as any)({
      address: C.ROUTER,
      abi: ROUTER_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [amountIn, amountOutMin, [...path], to, deadline],
    });
  };

  const addLiquidity = (
    tokenA: `0x${string}`,
    tokenB: `0x${string}`,
    amountADesired: bigint,
    amountBDesired: bigint,
    amountAMin: bigint,
    amountBMin: bigint,
    to: `0x${string}`,
    deadline: bigint
  ) => {
    (writeContract as any)({
      address: C.ROUTER,
      abi: ROUTER_ABI,
      functionName: 'addLiquidity',
      args: [tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, to, deadline],
    });
  };

  const addLiquidityETH = (
    token: `0x${string}`,
    amountTokenDesired: bigint,
    amountTokenMin: bigint,
    amountETHMin: bigint,
    to: `0x${string}`,
    deadline: bigint,
    value: bigint
  ) => {
    (writeContract as any)({
      address: C.ROUTER,
      abi: ROUTER_ABI,
      functionName: 'addLiquidityETH',
      args: [token, amountTokenDesired, amountTokenMin, amountETHMin, to, deadline],
      value,
      gas: 500_000n, // Explicit gas limit for payable function
    });
  };

  const removeLiquidity = (
    tokenA: `0x${string}`,
    tokenB: `0x${string}`,
    liquidity: bigint,
    amountAMin: bigint,
    amountBMin: bigint,
    to: `0x${string}`,
    deadline: bigint
  ) => {
    (writeContract as any)({
      address: C.ROUTER,
      abi: ROUTER_ABI,
      functionName: 'removeLiquidity',
      args: [tokenA, tokenB, liquidity, amountAMin, amountBMin, to, deadline],
    });
  };

  const removeLiquidityETH = (
    token: `0x${string}`,
    liquidity: bigint,
    amountTokenMin: bigint,
    amountETHMin: bigint,
    to: `0x${string}`,
    deadline: bigint
  ) => {
    (writeContract as any)({
      address: C.ROUTER,
      abi: ROUTER_ABI,
      functionName: 'removeLiquidityETH',
      args: [token, liquidity, amountTokenMin, amountETHMin, to, deadline],
      gas: 500_000n,
    });
  };

  return { 
    swapExactETHForTokens, 
    swapExactTokensForETH, 
    swapExactTokensForTokens,
    addLiquidity,
    addLiquidityETH,
    removeLiquidity,
    removeLiquidityETH,
    hash, 
    isPending, 
    isConfirming, 
    isSuccess, 
    error 
  };
}

// ============= FACTORY HOOKS =============
export function useFactory() {
  const chainId = useChainId();
  const C = getContracts(chainId);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const createPair = (tokenA: `0x${string}`, tokenB: `0x${string}`) => {
    (writeContract as any)({
      address: C.FACTORY,
      abi: FACTORY_ABI,
      functionName: 'createPair',
      args: [tokenA, tokenB],
    });
  };

  return { createPair, hash, isPending, isConfirming, isSuccess, error };
}

export function useGetPair(tokenA: `0x${string}` | undefined, tokenB: `0x${string}` | undefined) {
  const chainId = useChainId();
  const C = getContracts(chainId);
  const result = useReadContract({
    address: C.FACTORY as `0x${string}`,
    abi: FACTORY_ABI as any,
    functionName: 'getPair',
    args: tokenA && tokenB ? [tokenA, tokenB] : undefined,
    query: { enabled: !!tokenA && !!tokenB },
  });
  return { ...result, data: result.data as `0x${string}` | undefined };
}

export function useAllPairs(index: number | undefined) {
  const chainId = useChainId();
  const C = getContracts(chainId);
  const result = useReadContract({
    address: C.FACTORY as `0x${string}`,
    abi: FACTORY_ABI as any,
    functionName: 'allPairs',
    args: index !== undefined ? [BigInt(index)] : undefined,
    query: { enabled: index !== undefined },
  });
  return { ...result, data: result.data as `0x${string}` | undefined };
}

export function useAllPairsLength() {
  const chainId = useChainId();
  const C = getContracts(chainId);
  const result = useReadContract({ 
    address: C.FACTORY as `0x${string}`, 
    abi: FACTORY_ABI as any, 
    functionName: 'allPairsLength' 
  });
  return { ...result, data: result.data as bigint | undefined };
}

// ============= PAIR HOOKS =============
export function usePairReserves(pairAddress: `0x${string}` | undefined) {
  const result = useReadContract({
    address: pairAddress,
    abi: PAIR_ABI as any,
    functionName: 'getReserves',
    query: { enabled: !!pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000' },
  });
  return { ...result, data: result.data as [bigint, bigint, number] | undefined };
}

export function usePairTokens(pairAddress: `0x${string}` | undefined) {
  const enabled = !!pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000';
  
  const token0Result = useReadContract({
    address: pairAddress,
    abi: PAIR_ABI as any,
    functionName: 'token0',
    query: { enabled },
  });

  const token1Result = useReadContract({
    address: pairAddress,
    abi: PAIR_ABI as any,
    functionName: 'token1',
    query: { enabled },
  });

  return {
    token0: token0Result.data as `0x${string}` | undefined,
    token1: token1Result.data as `0x${string}` | undefined,
    isLoading: token0Result.isLoading || token1Result.isLoading,
  };
}

export function usePairTotalSupply(pairAddress: `0x${string}` | undefined) {
  const result = useReadContract({
    address: pairAddress,
    abi: PAIR_ABI as any,
    functionName: 'totalSupply',
    query: { enabled: !!pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000' },
  });
  return { ...result, data: result.data as bigint | undefined };
}

export function usePairBalance(pairAddress: `0x${string}` | undefined, userAddress: `0x${string}` | undefined) {
  const result = useReadContract({
    address: pairAddress,
    abi: PAIR_ABI as any,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!pairAddress && !!userAddress && pairAddress !== '0x0000000000000000000000000000000000000000' },
  });
  return { ...result, data: result.data as bigint | undefined };
}

export function usePairAllowance(
  pairAddress: `0x${string}` | undefined, 
  ownerAddress: `0x${string}` | undefined
) {
  const chainId = useChainId();
  const C = getContracts(chainId);
  const result = useReadContract({
    address: pairAddress,
    abi: PAIR_ABI as any,
    functionName: 'allowance',
    args: ownerAddress ? [ownerAddress, C.ROUTER as `0x${string}`] : undefined,
    query: { enabled: !!pairAddress && !!ownerAddress && pairAddress !== '0x0000000000000000000000000000000000000000' },
  });
  return { ...result, data: result.data as bigint | undefined };
}

export function useApprovePair() {
  const chainId = useChainId();
  const C = getContracts(chainId);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = (pairAddress: `0x${string}`, amount: bigint) => {
    (writeContract as any)({
      address: pairAddress,
      abi: PAIR_ABI,
      functionName: 'approve',
      args: [C.ROUTER as `0x${string}`, amount],
    });
  };

  return { approve, hash, isPending, isConfirming, isSuccess, error };
}


// ============= ROUTER READ HOOKS =============
export function useRouterWETH() {
  const chainId = useChainId();
  const C = getContracts(chainId);
  const result = useReadContract({
    address: C.ROUTER as `0x${string}`,
    abi: ROUTER_ABI as any,
    functionName: 'WETH',
  });
  return { ...result, data: result.data as `0x${string}` | undefined };
}

export function useGetAmountsOut(amountIn: bigint | undefined, path: `0x${string}`[]) {
  const chainId = useChainId();
  const C = getContracts(chainId);
  const result = useReadContract({
    address: C.ROUTER as `0x${string}`,
    abi: ROUTER_ABI as any,
    functionName: 'getAmountsOut',
    args: amountIn && amountIn > 0n ? [amountIn, path] : undefined,
    query: { enabled: !!amountIn && amountIn > 0n && path.length >= 2 },
  });
  return { ...result, data: result.data as bigint[] | undefined };
}

export function useGetAmountsIn(amountOut: bigint | undefined, path: `0x${string}`[]) {
  const chainId = useChainId();
  const C = getContracts(chainId);
  const result = useReadContract({
    address: C.ROUTER as `0x${string}`,
    abi: ROUTER_ABI as any,
    functionName: 'getAmountsIn',
    args: amountOut && amountOut > 0n ? [amountOut, path] : undefined,
    query: { enabled: !!amountOut && amountOut > 0n && path.length >= 2 },
  });
  return { ...result, data: result.data as bigint[] | undefined };
}

// ============= WETH HOOKS =============
export function useWETH() {
  const chainId = useChainId();
  const C = getContracts(chainId);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  const deposit = (value: bigint) => {
    (writeContract as any)({ 
      address: C.WETH, 
      abi: WETH_ABI, 
      functionName: 'deposit', 
      value 
    });
  };
  
  const withdraw = (amount: bigint) => {
    (writeContract as any)({ 
      address: C.WETH, 
      abi: WETH_ABI, 
      functionName: 'withdraw', 
      args: [amount] 
    });
  };
  
  return { deposit, withdraw, hash, isPending, isConfirming, isSuccess, error };
}

// ============= ERC20 HOOKS =============
export function useTokenBalance(tokenAddress: `0x${string}` | undefined, userAddress: `0x${string}` | undefined) {
  const result = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI as any,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!tokenAddress && !!userAddress },
  });
  return { ...result, data: result.data as bigint | undefined };
}

export function useTokenAllowance(
  tokenAddress: `0x${string}` | undefined, 
  ownerAddress: `0x${string}` | undefined, 
  spenderAddress: `0x${string}` | undefined
) {
  const result = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI as any,
    functionName: 'allowance',
    args: ownerAddress && spenderAddress ? [ownerAddress, spenderAddress] : undefined,
    query: { enabled: !!tokenAddress && !!ownerAddress && !!spenderAddress },
  });
  return { ...result, data: result.data as bigint | undefined };
}

export function useApprove() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  const approve = (tokenAddress: `0x${string}`, spender: `0x${string}`, amount: bigint) => {
    (writeContract as any)({ 
      address: tokenAddress, 
      abi: ERC20_ABI, 
      functionName: 'approve', 
      args: [spender, amount] 
    });
  };
  
  return { approve, hash, isPending, isConfirming, isSuccess, error, reset };
}

export function useTokenSymbol(tokenAddress: `0x${string}` | undefined) {
  const result = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI as any,
    functionName: 'symbol',
    query: { enabled: !!tokenAddress && tokenAddress !== '0x0000000000000000000000000000000000000000' },
  });
  return { ...result, data: result.data as string | undefined };
}

// ============= MULTICALL HOOKS =============
export function useMulticall() {
  const chainId = useChainId();
  const C = getContracts(chainId);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const aggregate = (calls: { target: `0x${string}`; callData: `0x${string}` }[]) => {
    (writeContract as any)({
      address: C.MULTICALL,
      abi: MULTICALL_ABI,
      functionName: 'aggregate',
      args: [calls],
    });
  };

  return { aggregate, hash, isPending, isConfirming, isSuccess, error };
}

export function useMulticallRead(calls: { address: `0x${string}`; abi: any; functionName: string; args?: any[] }[]) {
  const results = useReadContracts({
    contracts: calls.map(call => ({
      address: call.address,
      abi: call.abi,
      functionName: call.functionName,
      args: call.args,
    })),
  });
  return results;
}

// ============= UTILITY EXPORTS =============
export { parseEther, formatEther, parseUnits, formatUnits };
