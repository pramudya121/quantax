import { defineChain } from 'viem';

export const OPN_CHAIN_ID = 984;
export const AER_CHAIN_ID = 1237;

export const opnTestnet = defineChain({
  id: OPN_CHAIN_ID,
  name: 'OPN Testnet',
  nativeCurrency: { name: 'OPN', symbol: 'OPN', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.iopn.tech', 'https://testnet-rpc2.iopn.tech'] },
    public: { http: ['https://testnet-rpc.iopn.tech', 'https://testnet-rpc2.iopn.tech'] },
  },
  blockExplorers: {
    default: { name: 'OPN Explorer', url: 'https://testnet.iopn.tech' },
  },
  testnet: true,
});

export const aerediumTestnet = defineChain({
  id: AER_CHAIN_ID,
  name: 'AEREDIUM Testnet',
  nativeCurrency: { name: 'AER', symbol: 'AER', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet.rpc.aeredium.io'] },
    public: { http: ['https://testnet.rpc.aeredium.io'] },
  },
  blockExplorers: {
    default: { name: 'AEREDIUM Explorer', url: 'https://testnet.explorer.aeredium.io' },
  },
  testnet: true,
});

export const SUPPORTED_CHAINS = [opnTestnet, aerediumTestnet] as const;
export const SUPPORTED_CHAIN_IDS = [OPN_CHAIN_ID, AER_CHAIN_ID] as const;

export function isSupportedChain(id?: number): boolean {
  return !!id && (SUPPORTED_CHAIN_IDS as readonly number[]).includes(id);
}

export function getChainMeta(id?: number) {
  if (id === AER_CHAIN_ID) return aerediumTestnet;
  return opnTestnet;
}

export function getExplorerUrl(chainId: number | undefined, path: string): string {
  const base = getChainMeta(chainId).blockExplorers.default.url;
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}
