import { createConfig, http } from 'wagmi';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';
import { qmsTestnet, QMS_CHAIN_ID } from './chains';

export { qmsTestnet };

export const WALLETCONNECT_PROJECT_ID = String(
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || ''
).trim();

const QMS_RPC = 'https://rpc.testnet.qms.finance';

export const config = createConfig({
  chains: [qmsTestnet],
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
    ...(WALLETCONNECT_PROJECT_ID
      ? [walletConnect({
          projectId: WALLETCONNECT_PROJECT_ID,
          showQrModal: true,
          metadata: {
            name: 'QuantaX',
            description: 'The premier DEX on QMS Testnet — swap, provide liquidity, and farm on-chain.',
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
        })]
      : []),
    coinbaseWallet({
      appName: 'QuantaX',
      appLogoUrl: 'https://dragondex.lovable.app/favicon.ico',
    }),
  ],
  transports: {
    [QMS_CHAIN_ID]: http(QMS_RPC, { retryCount: 1, retryDelay: 250 }),
  },
});
