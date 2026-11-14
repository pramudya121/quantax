import { useCallback } from 'react';
import { useAccount, usePublicClient, useWriteContract, useChainId } from 'wagmi';
import { erc20Abi, parseUnits, type Address, type PublicClient } from 'viem';
import { ROUTER_ABI, WETH_ABI } from '@/config/abis';
import { getContracts, getTokenBySymbol } from '@/config/contracts';
import { QMS_CHAIN_ID } from '@/config/chains';
import { FARMING_ABI, getFarmingContract } from '@/config/farming';
import type { AgentAction } from '@/components/chat/agentTools';

const DEADLINE_SECS = 60 * 20;

function resolveToken(symbol: string) {
  const t = getTokenBySymbol(symbol);
  if (!t) throw new Error(`Unknown token: ${symbol}`);
  return t;
}

async function readTokenDecimals(client: PublicClient, token: Address): Promise<number> {
  const raw = await client.readContract({ address: token, abi: erc20Abi, functionName: 'decimals' });
  const decimals = Number(raw);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new Error('Token precision is unavailable; transaction canceled.');
  }
  return decimals;
}

/** Executes an agent action on-chain and returns the tx hash. */
export function useAgentExecutor() {
  const chainId = useChainId();
  const { address } = useAccount();
  const publicClient = usePublicClient() as any;
  const C = getContracts(chainId);
  const FARM = getFarmingContract(chainId);
  const { writeContractAsync } = useWriteContract();

  const ensureAllowance = useCallback(
    async (token: Address, spender: Address, amount: bigint) => {
      if (!address) throw new Error('Wallet not connected');
      const allowance = (await publicClient.readContract({
        address: token, abi: erc20Abi, functionName: 'allowance', args: [address, spender],
      })) as bigint;
      if (allowance < amount) {
        const hash = await (writeContractAsync as any)({
          address: token, abi: erc20Abi, functionName: 'approve', args: [spender, amount],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== 'success') throw new Error('Token approval transaction reverted.');
      }
    },
    [address, publicClient, writeContractAsync],
  );

  const execute = useCallback(
    async (action: AgentAction): Promise<string> => {
      if (!address) throw new Error('Wallet not connected');
      if (chainId !== QMS_CHAIN_ID) throw new Error('Switch to QMS Testnet before executing this action.');
      if (!publicClient) throw new Error('QMS Testnet RPC client is unavailable.');
      const deadline = BigInt(Math.floor(Date.now() / 1000) + DEADLINE_SECS);

      switch (action.type) {
        case 'wrap': {
          const value = parseUnits(action.amount, 18);
          const hash = await (writeContractAsync as any)({
            address: C.WETH as Address, abi: WETH_ABI,
            functionName: 'deposit', value,
          });
          return hash;
        }
        case 'unwrap': {
          const amount = parseUnits(action.amount, 18);
          const hash = await (writeContractAsync as any)({
            address: C.WETH as Address, abi: WETH_ABI,
            functionName: 'withdraw', args: [amount],
          });
          return hash;
        }
        case 'swap': {
          const from = resolveToken(action.fromSymbol);
          const to = resolveToken(action.toSymbol);
          const amountIn = parseUnits(action.amount, from.decimals);
          // Agent-generated swaps must not permit the extremely loose manual slippage ceiling.
          const slippage = Math.min(Math.max(action.slippage ?? 0.5, 0.01), 5);

          // QMS <-> WQMS: route to wrap/unwrap
          if (from.isNative && to.symbol === 'WQMS') return execute({ type: 'wrap', amount: action.amount });
          if (from.symbol === 'WQMS' && to.isNative) return execute({ type: 'unwrap', amount: action.amount });

          const fromAddr = (from.isNative ? C.WETH : from.address) as Address;
          const toAddr = (to.isNative ? C.WETH : to.address) as Address;
          const path: Address[] = [fromAddr, toAddr];

          // Quote
          const amounts = (await publicClient.readContract({
            address: C.ROUTER as Address, abi: ROUTER_ABI,
            functionName: 'getAmountsOut', args: [amountIn, path],
          })) as bigint[];
          const expectedOut = amounts[amounts.length - 1];
          const minOut = (expectedOut * BigInt(Math.floor((100 - slippage) * 100))) / 10000n;

          if (from.isNative) {
            const hash = await (writeContractAsync as any)({
              address: C.ROUTER as Address, abi: ROUTER_ABI,
              functionName: 'swapExactETHForTokens',
              args: [minOut, path, address, deadline],
              value: amountIn, gas: 300000n,
            });
            return hash;
          }
          if (to.isNative) {
            await ensureAllowance(fromAddr, C.ROUTER as Address, amountIn);
            const hash = await (writeContractAsync as any)({
              address: C.ROUTER as Address, abi: ROUTER_ABI,
              functionName: 'swapExactTokensForETH',
              args: [amountIn, minOut, path, address, deadline],
              gas: 300000n,
            });
            return hash;
          }
          await ensureAllowance(fromAddr, C.ROUTER as Address, amountIn);
          const hash = await (writeContractAsync as any)({
            address: C.ROUTER as Address, abi: ROUTER_ABI,
            functionName: 'swapExactTokensForTokens',
            args: [amountIn, minOut, path, address, deadline],
            gas: 300000n,
          });
          return hash;
        }
        case 'add_liquidity': {
          const a = resolveToken(action.tokenA);
          const b = resolveToken(action.tokenB);
          const amtA = parseUnits(action.amountA, a.decimals);
          const amtB = parseUnits(action.amountB, b.decimals);
          const minA = (amtA * 95n) / 100n;
          const minB = (amtB * 95n) / 100n;

          if (a.isNative || b.isNative) {
            const tokenSide = a.isNative ? b : a;
            const ethAmt = a.isNative ? amtA : amtB;
            const tokenAmt = a.isNative ? amtB : amtA;
            const tokenMin = a.isNative ? minB : minA;
            const ethMin = a.isNative ? minA : minB;
            await ensureAllowance(tokenSide.address as Address, C.ROUTER as Address, tokenAmt);
            const hash = await (writeContractAsync as any)({
              address: C.ROUTER as Address, abi: ROUTER_ABI,
              functionName: 'addLiquidityETH',
              args: [tokenSide.address as Address, tokenAmt, tokenMin, ethMin, address, deadline],
              value: ethAmt, gas: 500000n,
            });
            return hash;
          }
          await ensureAllowance(a.address as Address, C.ROUTER as Address, amtA);
          await ensureAllowance(b.address as Address, C.ROUTER as Address, amtB);
          const hash = await (writeContractAsync as any)({
            address: C.ROUTER as Address, abi: ROUTER_ABI,
            functionName: 'addLiquidity',
            args: [a.address as Address, b.address as Address, amtA, amtB, minA, minB, address, deadline],
            gas: 500000n,
          });
          return hash;
        }
        case 'remove_liquidity': {
          const a = resolveToken(action.tokenA);
          const b = resolveToken(action.tokenB);
          const lpAmount = parseUnits(action.lpAmount, 18);
          // Resolve pair address
          const pair = (await publicClient.readContract({
            address: C.FACTORY as Address,
            abi: [{ inputs: [{type: 'address'},{type: 'address'}], name: 'getPair', outputs: [{type:'address'}], stateMutability:'view', type:'function' }],
            functionName: 'getPair',
            args: [(a.isNative ? C.WETH : a.address) as Address, (b.isNative ? C.WETH : b.address) as Address],
          })) as Address;
          if (!pair || pair === '0x0000000000000000000000000000000000000000') throw new Error('Pair not found');
          await ensureAllowance(pair, C.ROUTER as Address, lpAmount);

          // Read pair reserves + totalSupply to compute MEV-safe minimums (1% slippage)
          const pairAbi = [
            { inputs: [], name: 'getReserves', outputs: [{type:'uint112'},{type:'uint112'},{type:'uint32'}], stateMutability:'view', type:'function' },
            { inputs: [], name: 'token0', outputs: [{type:'address'}], stateMutability:'view', type:'function' },
            { inputs: [], name: 'totalSupply', outputs: [{type:'uint256'}], stateMutability:'view', type:'function' },
          ] as const;
          const [reserves, token0, totalSupply] = await Promise.all([
            publicClient.readContract({ address: pair, abi: pairAbi, functionName: 'getReserves' }) as Promise<[bigint, bigint, number]>,
            publicClient.readContract({ address: pair, abi: pairAbi, functionName: 'token0' }) as Promise<Address>,
            publicClient.readContract({ address: pair, abi: pairAbi, functionName: 'totalSupply' }) as Promise<bigint>,
          ]);
          if (totalSupply === 0n) throw new Error('Pool has no liquidity');
          const aAddr = (a.isNative ? C.WETH : a.address).toLowerCase();
          const aIsToken0 = token0.toLowerCase() === aAddr;
          const reserveA = aIsToken0 ? reserves[0] : reserves[1];
          const reserveB = aIsToken0 ? reserves[1] : reserves[0];
          const expectedA = (reserveA * lpAmount) / totalSupply;
          const expectedB = (reserveB * lpAmount) / totalSupply;
          const minA = (expectedA * 99n) / 100n;
          const minB = (expectedB * 99n) / 100n;

          if (a.isNative || b.isNative) {
            const tokenSide = a.isNative ? b : a;
            const tokenMin = a.isNative ? minB : minA;
            const ethMin = a.isNative ? minA : minB;
            const hash = await (writeContractAsync as any)({
              address: C.ROUTER as Address, abi: ROUTER_ABI,
              functionName: 'removeLiquidityETH',
              args: [tokenSide.address as Address, lpAmount, tokenMin, ethMin, address, deadline],
              gas: 500000n,
            });
            return hash;
          }
          const hash = await (writeContractAsync as any)({
            address: C.ROUTER as Address, abi: ROUTER_ABI,
            functionName: 'removeLiquidity',
            args: [a.address as Address, b.address as Address, lpAmount, minA, minB, address, deadline],
            gas: 500000n,
          });
          return hash;
        }
        case 'farm_stake': {
          // Look up staking token from pool
          const info = (await publicClient.readContract({
            address: FARM, abi: FARMING_ABI,
            functionName: 'poolInfo', args: [BigInt(action.pid)],
          })) as any;
          const stakingToken = info[0] as Address;
          // Detect decimals
          const decimals = await readTokenDecimals(publicClient, stakingToken);
          const amount = parseUnits(action.amount, decimals);
          await ensureAllowance(stakingToken, FARM, amount);
          const hash = await (writeContractAsync as any)({
            address: FARM, abi: FARMING_ABI,
            functionName: 'deposit', args: [BigInt(action.pid), amount],
          });
          return hash;
        }
        case 'farm_unstake': {
          const info = (await publicClient.readContract({
            address: FARM, abi: FARMING_ABI,
            functionName: 'poolInfo', args: [BigInt(action.pid)],
          })) as any;
          const stakingToken = info[0] as Address;
          const decimals = await readTokenDecimals(publicClient, stakingToken);
          const amount = parseUnits(action.amount, decimals);
          const hash = await (writeContractAsync as any)({
            address: FARM, abi: FARMING_ABI,
            functionName: 'withdraw', args: [BigInt(action.pid), amount],
          });
          return hash;
        }
        case 'farm_harvest': {
          const hash = await (writeContractAsync as any)({
            address: FARM, abi: FARMING_ABI,
            functionName: 'deposit', args: [BigInt(action.pid), 0n],
          });
          return hash;
        }
        case 'farm_emergency': {
          const hash = await (writeContractAsync as any)({
            address: FARM, abi: FARMING_ABI,
            functionName: 'emergencyWithdraw', args: [BigInt(action.pid)],
          });
          return hash;
        }
      }
    },
    [address, ensureAllowance, publicClient, writeContractAsync, chainId],
  );

  return { execute, isConnected: !!address };
}
