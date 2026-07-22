import { useAccount, useBalance, useChainId, useReadContracts } from 'wagmi';
import { getTokenList } from '@/config/contracts';
import { formatUnits } from 'viem';

const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export function useWalletPortfolio() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const { data: nativeBalance } = useBalance({ address, chainId });

  const tokens = getTokenList(chainId).filter((t) => !t.isNative);

  const { data: tokenBalances } = useReadContracts({
    contracts: address
      ? tokens.map((t) => ({
          address: t.address as `0x${string}`,
          abi: ERC20_BALANCE_ABI,
          functionName: 'balanceOf' as const,
          args: [address],
          chainId,
        }))
      : [],
    query: { enabled: !!address, refetchInterval: 15000 },
  });

  const getPortfolioSummary = (): string => {
    if (!isConnected || !address) return 'Wallet not connected';

    const lines: string[] = [`Wallet: ${address}`, `Chain: ${chainId}`];

    if (nativeBalance) {
      const bal = parseFloat(formatUnits(nativeBalance.value, nativeBalance.decimals));
      lines.push(`${nativeBalance.symbol} (native): ${bal.toFixed(4)}`);
    }

    if (tokenBalances) {
      tokenBalances.forEach((result, i) => {
        if (result.status === 'success' && result.result) {
          const bal = parseFloat(formatUnits(result.result as bigint, tokens[i].decimals));
          if (bal > 0) {
            lines.push(`${tokens[i].symbol}: ${bal.toFixed(4)}`);
          }
        }
      });
    }

    return lines.join('\n');
  };

  return { isConnected, address, chainId, getPortfolioSummary };
}
