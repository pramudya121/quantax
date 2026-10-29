import { defineChain } from 'viem';

export const QMS_CHAIN_ID = 19480;

export const qmsTestnet = defineChain({
  id: QMS_CHAIN_ID,
  name: 'QMS Testnet',
  nativeCurrency: { name: 'QMS', symbol: 'QMS', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.qms.finance'] },
    public: { http: ['https://rpc.testnet.qms.finance'] },
  },
  blockExplorers: {
    default: { name: 'QMS Explorer', url: 'https://testnet.qmsscan.io' },
  },
  testnet: true,
});

export const SUPPORTED_CHAINS = [qmsTestnet] as const;
export const SUPPORTED_CHAIN_IDS = [QMS_CHAIN_ID] as const;

export function isSupportedChain(id?: number): boolean {
  return !!id && (SUPPORTED_CHAIN_IDS as readonly number[]).includes(id);
}

export function getChainMeta(id?: number) {
  return qmsTestnet;
}

export function getExplorerUrl(chainId: number | undefined, path: string): string {
  const base = getChainMeta(chainId).blockExplorers.default.url;
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}
