<<<<<<< v0/compact-swap-form
# QUANTAX

**QUANTAX** is a non-custodial decentralized exchange (DEX) interface for the QMS Testnet. It brings token swaps, liquidity management, pool discovery, and on-chain portfolio tools together in a responsive web application.

> **Network notice:** QUANTAX is currently configured for **QMS Testnet only**. Use test tokens only. Testnet deployments and market data are not production services, and this software has not been represented as independently audited.

## Features

- **Token swaps** with wallet confirmation, route and price-impact information, and slippage controls.
- **Liquidity management** to add or remove liquidity, including LP-token approval handling.
- **Pool discovery** with pool details and pair views.
- **Portfolio and analytics** views backed by available on-chain data.
- **Wallet connectivity** for injected wallets such as MetaMask, OKX Wallet, Rabby, Bitget Wallet, and Coinbase Wallet. WalletConnect is available when configured.
- **QMS Testnet contract status** and in-app documentation and learning pages.

Availability of data and transactions depends on the selected wallet, the QMS Testnet RPC, and the deployed contracts.

## Network

| Property | Value |
| --- | --- |
| Network | QMS Testnet |
| Chain ID | `19480` |
| Native currency | QMS |
| RPC | [rpc.testnet.qms.finance](https://rpc.testnet.qms.finance) |
| Block explorer | [testnet.qmsscan.io](https://testnet.qmsscan.io) |

### Deployed contracts

These addresses are configured by the application for QMS Testnet.

| Contract | Address |
| --- | --- |
| Factory | [`0x97C305119f5D98aFd11bCD19a1ba8c27d68F3546`](https://testnet.qmsscan.io/address/0x97C305119f5D98aFd11bCD19a1ba8c27d68F3546) |
| Router | [`0x3A153e8BcDe02F4Cf6C5eeECD9c83bC0296FFbD3`](https://testnet.qmsscan.io/address/0x3A153e8BcDe02F4Cf6C5eeECD9c83bC0296FFbD3) |
| Wrapped QMS (WQMS) | [`0x9AA510295aC664A3d5A3182a3eFe959DE2B12c34`](https://testnet.qmsscan.io/address/0x9AA510295aC664A3d5A3182a3eFe959DE2B12c34) |
| Library | [`0x03D2D542100fa926de135a08B609c8538E45F6ee`](https://testnet.qmsscan.io/address/0x03D2D542100fa926de135a08B609c8538E45F6ee) |
| Multicall | [`0x8705875084c72C0cDC01c1Ac36A807808c8E5850`](https://testnet.qmsscan.io/address/0x8705875084c72C0cDC01c1Ac36A807808c8E5850) |

## Tech stack

- React 18, TypeScript, and Vite
- wagmi and viem for wallet and EVM interactions
- TanStack Query for asynchronous data and cache management
- Tailwind CSS, shadcn/ui, Radix UI, and Framer Motion
- Vitest and Testing Library for tests

## Getting started

### Requirements

- Node.js 20 or later
- npm
- A compatible EVM wallet for on-chain interactions

### Install and run

```bash
git clone https://github.com/pramudya121/quantax.git
cd quantax
npm ci
npm run dev
```

Vite prints the local development URL after the server starts.

### Environment variables

Create a local `.env.local` file in the project root. Do not commit credentials or private keys.

```dotenv
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
# Optional: enables WalletConnect in addition to injected wallets.
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

The Supabase values are used by the app's Supabase client and related features. WalletConnect is optional; injected wallets remain available without it. Never expose a wallet private key or server-side secret in a `VITE_` variable, because Vite embeds client-side variables in the browser bundle.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest test suite once |
| `npm run test:watch` | Run Vitest in watch mode |

## Project structure

```text
src/
├── components/     Shared interface and feature components
├── config/         Chain, contract, wallet, and ABI configuration
├── hooks/          Wallet and on-chain data/transaction hooks
├── integrations/   External service clients
├── lib/            Shared helpers and utilities
└── pages/          Swap, liquidity, pools, analytics, portfolio, and other routes
```

## Security and responsible use

- Review the active network and transaction details in your wallet before confirming.
- Contract addresses and RPC settings are network-specific; verify them against the intended network before use.
- Never share a seed phrase or private key, and never place one in application environment variables.
- QUANTAX is a testnet application. Do not use it to manage real funds or treat displayed estimates as financial advice.

## License

No license has been specified for this repository yet. All rights remain with the respective copyright holders unless a license is added.
=======

>>>>>>> main

