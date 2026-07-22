# Multi-Chain Support: AEREDIUM Testnet

Menambahkan AEREDIUM Testnet (Chain ID 1237) sebagai jaringan kedua di DragonDEX, di samping OPN Testnet yang sudah ada. User bisa switch antar-jaringan lewat dropdown Network Selector di header, dan seluruh saldo, harga, pool, farming, serta swap otomatis mengikuti jaringan aktif.

## Arsitektur Multi-Chain

Refactor konfigurasi dari singleton (`CONTRACTS`, `TOKENS`, `TOKEN_LIST`) menjadi map per-chain, lalu semua hook membaca alamat dari `useChainId()`.

```text
src/config/
  chains.ts          → daftar chain (OPN, AEREDIUM) + metadata
  contracts.ts       → CONTRACTS_BY_CHAIN[chainId] = {FACTORY, ROUTER, WETH, …}
  tokens.ts          → TOKEN_LIST_BY_CHAIN[chainId] = TokenInfo[]
  farming.ts         → FARMING_BY_CHAIN[chainId]
  abis.ts            → tambah FAUCET_ABI, MULTIPOOL_FARM_ABI
```

## Perubahan Utama

1. **`src/config/chains.ts`** (baru) — export `opnTestnet` + `aerediumTestnet` (id 1237, RPC `https://testnet.rpc.aeredium.io`, explorer `https://testnet.explorer.aeredium.io`, native `AER`).
2. **`src/config/wagmi.ts`** — `chains: [opnTestnet, aerediumTestnet]`, transports untuk kedua chain.
3. **`src/config/contracts.ts`** — refactor jadi `CONTRACTS_BY_CHAIN` + helper `getContracts(chainId)`, `getTokenList(chainId)`, `getTokenByAddress(chainId, addr)`. Isi alamat AEREDIUM sesuai input user (Factory, WAER, Router, Library, Multicall, Farm, Faucet, BNB/HYPE/UNI/ETH/XRP/DRAGON).
4. **`src/config/abis.ts`** — tambah `FAUCET_ABI`, `MULTIPOOL_FARM_ABI` (WAER pakai `WETH_ABI` yang sudah ada; Factory/Router ABI kompatibel).
5. **Aset logo AER/WAER** — upload gambar berlian biru dari user ke `src/assets/aer.jpg.asset.json` via `lovable-assets`, dipakai untuk symbol `AER` (native) dan `WAER`.
6. **`src/components/layout/NetworkSelector.tsx`** (baru) — dropdown di Header. Menampilkan chain aktif + logo, klik → `switchChain({ chainId })`. Jika wallet belum add jaringan, panggil `wallet_addEthereumChain` fallback.
7. **`src/components/layout/Header.tsx`** — mount `NetworkSelector` di sebelah `WalletButton`.
8. **Semua hook on-chain** (`useContract`, `useLiquidityPools`, `useSwapRouter`, `useFarming`, `usePrices`, `useSwapVolume`, `useLiveSwapNotifications`, `useWalletPortfolio`, `useTokenSafety`, `useAgentExecutor`) — ganti import konstanta jadi `getContracts(chainId)` / `getTokenList(chainId)` dengan `chainId = useChainId()`. Query keys sertakan `chainId` supaya cache tidak bocor antar-chain.
9. **UI enforcement** — komponen `SwapCard`, `Liquidity`, `Farming` cek `chainId ∈ [984, 1237]`; kalau bukan, tampilkan tombol "Switch Network" dengan pilihan default OPN.
10. **`src/pages/ContractStatus.tsx`** & **`Docs`** — tampilkan status untuk kedua chain.
11. **Native/wrap mapping** — `getWrappedNative(chainId)` (WOPN utk 984, WAER utk 1237) menggantikan konstanta `TOKENS.WOPN` di logika wrap/unwrap swap.

## Detail Teknis

- Chain-aware React Query: setiap `queryKey` sekarang array dengan `chainId` di depan (`['pools', chainId]`, `['prices', chainId, …]`).
- `useLiveSwapNotifications` & `useWatchContractEvent` di-mount ulang saat chain berubah (dependency `chainId`).
- Transaction explorer link diambil dari `chain.blockExplorers.default.url` (bukan hardcode `testnet.iopn.tech`).
- Faucet AEREDIUM (`0xa12C…`) diekspose sebagai halaman opsional `/faucet` hanya aktif saat `chainId === 1237` (di luar scope inti, akan disiapkan hook `useFaucet` tapi UI minimal — bisa dilanjut nanti kalau diminta).
- WalletConnect metadata tetap; connector tidak berubah karena wagmi handle multi-chain per connector.

## Yang TIDAK Diubah

- Wallet list & modal koneksi (MetaMask, Rabby, OKX, Bitget, Phantom, WalletConnect, Coinbase) — sudah universal EVM.
- Desain visual/tema Dragon.
- Kontrak OPN Testnet yang existing tetap berjalan penuh.
