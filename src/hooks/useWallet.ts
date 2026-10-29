import { useAccount, useBalance, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { qmsTestnet } from '@/config/wagmi';
import { SUPPORTED_CHAINS } from '@/config/chains';

export function useWallet() {
  const { address, isConnected, isConnecting, connector } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const { data: balance } = useBalance({
    address: address,
  });

  // Any supported network (QMS Testnet) is valid.
  const isCorrectNetwork = SUPPORTED_CHAINS.some((c) => c.id === chainId);
  const activeChain = SUPPORTED_CHAINS.find((c) => c.id === chainId) ?? qmsTestnet;

  const switchToQMS = () => {
    if (switchChain) {
      switchChain({ chainId: qmsTestnet.id });
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return {
    address,
    isConnected,
    isConnecting: isConnecting || isPending,
    connector,
    connectors,
    connect,
    disconnect,
    error,
    balance,
    chainId,
    isCorrectNetwork,
    activeChain,
    switchToQMS,
    formatAddress,
  };
}
