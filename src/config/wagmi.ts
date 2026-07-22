import { createConfig, http, fallback } from 'wagmi';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';
import { opnTestnet, aerediumTestnet, OPN_CHAIN_ID, AER_CHAIN_ID } from './chains';

export { opnTestnet, aerediumTestnet };

export const WALLETCONNECT_PROJECT_ID =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'a8e1e5e4f0a3a4b6c7d8e9f0a1b2c3d4';

const OPN_PRIMARY = 'https://testnet-rpc.iopn.tech';
const OPN_BACKUP = 'https://testnet-rpc2.iopn.tech';
const AER_RPC = 'https://testnet.rpc.aeredium.io';

export const config = createConfig({
  chains: [opnTestnet, aerediumTestnet],
  connectors: [
    injected({ target: 'metaMask' }),
    injected({
      target: {
        id: 'okxWallet',
        name: 'OKX Wallet',
        provider: (window: any) => window.okxwallet,
      },
    }),
    injected({
      target: {
        id: 'rabby',
        name: 'Rabby Wallet',
        provider: (window: any) => window.rabby,
      },
    }),
    injected({
      target: {
        id: 'bitget',
        name: 'Bitget Wallet',
        provider: (window: any) => window.bitkeep?.ethereum,
      },
    }),
    walletConnect({
      projectId: WALLETCONNECT_PROJECT_ID,
      showQrModal: true,
      metadata: {
        name: 'DragonDEX',
        description: 'The premier multi-chain DEX (OPN & AEREDIUM Testnet)',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://dragondex.lovable.app',
        icons: ['https://dragondex.lovable.app/favicon.ico'],
      },
      qrModalOptions: {
        themeMode: 'dark',
        themeVariables: {
          '--wcm-z-index': '1000',
          '--wcm-accent-color': '#ef4444',
          '--wcm-background-color': '#0a0a0a',
        },
      },
    }),
    coinbaseWallet({
      appName: 'DragonDEX',
      appLogoUrl: 'https://dragondex.lovable.app/favicon.ico',
    }),
  ],
  transports: {
    [OPN_CHAIN_ID]: fallback([
      http(OPN_PRIMARY, { retryCount: 1, retryDelay: 250 }),
      http(OPN_BACKUP, { retryCount: 1, retryDelay: 250 }),
    ]),
    [AER_CHAIN_ID]: http(AER_RPC, { retryCount: 1, retryDelay: 250 }),
  },
});
