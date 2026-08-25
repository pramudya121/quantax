# Audit On-Chain + Penyelesaian Fitur + Peningkatan UI/UX

Hasil audit kode saat ini: multi-chain baru selesai di lapisan konfigurasi (chains, contracts, wagmi, NetworkSelector, portfolio). Seluruh logika trading masih memakai konstanta singleton OPN, sehingga di AEREDIUM Testnet swap/liquidity/farming/analytics belum benar-benar berfungsi. Rencana ini menuntaskan itu lalu naik ke perbaikan UI/UX per halaman.

## Fase 1 — Audit & Perbaikan On-Chain (prioritas tertinggi)

Temuan hardcode OPN yang harus dijadikan chain-aware (`const chainId = useChainId()` → `getContracts(chainId)` / `getTokenList(chainId)`):

| File | Masalah |
|---|---|
| `src/hooks/useContract.ts` | Semua read/write pakai `CONTRACTS.ROUTER` / `CONTRACTS.FACTORY` statis |
| `src/hooks/useLiquidityPools.ts` | Factory statis, query key tanpa `chainId` (cache bocor antar-chain) |
| `src/hooks/useSwapRouter.ts` | Router + path WOPN statis |
| `src/hooks/useFarming.ts` | Farm OPN statis, belum kenal MultiPoolFarm AEREDIUM |
| `src/hooks/usePrices.ts`, `useSwapVolume.ts`, `useLiveSwapNotifications.ts` | Token list & pair discovery statis, event watcher tak remount saat ganti chain |
| `src/components/swap/SwapCard.tsx`, `TokenSelector.tsx` | Default token dari `TOKEN_LIST[0]`, wrap/unwrap pakai `CONTRACTS.WETH` |
| `src/pages/Liquidity.tsx`, `Portfolio.tsx`, `Analytics.tsx` | Token & alamat OPN hardcode (Portfolio bahkan baca MON yang tak ada di AEREDIUM) |
| `src/components/pools/PoolStats.tsx`, `home/TokenGlobe3D.tsx` | Jumlah/logo token dari list OPN saja |

Tindakan:
1. Seluruh hook & komponen di atas membaca alamat lewat `getContracts(chainId)`, token lewat `getTokenList(chainId)`, wrapped native lewat `getWrappedNative(chainId)`.
2. Semua `queryKey` menyertakan `chainId` di depan; token state di Swap/Liquidity di-reset saat chain berubah.
3. Explorer link diambil dari metadata chain aktif (bukan hardcode `testnet.iopn.tech`).
4. Guard UI seragam: kalau chain di luar [984, 1237] → kartu "Switch Network".
5. Verifikasi on-chain nyata: baca `factory.allPairsLength`, `router.WETH()`, dan `factory` dari router pada kedua chain; tampilkan hasilnya di `/status` sebagai health check (bukan sekadar daftar alamat).

## Fase 2 — Fitur yang Belum Dibangun

1. **Farming di AEREDIUM** — MultiPoolFarm `0x3135…` belum terhubung; `useFarming` diperluas jadi map per-chain.
2. **Halaman `/faucet`** — kontrak Faucet AEREDIUM (`0xa12C…`) sudah ada tapi tanpa UI: klaim token testnet + cooldown.
3. **Multicall** — tersedia di kedua chain tapi belum dipakai; batch pembacaan reserves/balance untuk memangkas RPC call.
4. **Create Pool** — validasi pair sudah ada / token identik / approval ganda belum lengkap.
5. **Portfolio** — posisi LP per-chain, nilai USD, dan riwayat transaksi masih terbatas ke OPN.
6. **Analytics** — Activity feed & volume belum chain-aware; tambah filter token dan rentang waktu.

## Fase 3 — UI/UX

1. **Navigasi**: Farm/Status/Faucet belum konsisten di header & dock mobile; rapikan grup menu + indikator chain aktif berwarna.
2. **Empty & error states** konsisten di semua halaman (Pools, Farming, Portfolio, Analytics) — ikon, penjelasan, dan aksi lanjutan.
3. **Skeleton menyeluruh** untuk Pools, Farming, Portfolio (Analytics sudah punya).
4. **Feedback transaksi**: `TransactionLifecycleModal` dipakai di semua aksi on-chain (saat ini belum di Farming & Create Pool).
5. **Mobile**: sticky-CTA untuk Farming & Create Pool, target sentuh ≥44px, bottom-sheet konsisten.
6. **Performa**: turunkan polling agresif saat tab tidak aktif, memoisasi daftar pool, kurangi beban komponen 3D di perangkat low-end.

## Detail Teknis

- Tidak ada perubahan backend/database — seluruh data dari RPC on-chain.
- Refactor bersifat mekanis dan bertahap per file agar preview tetap hijau di tiap langkah.
- Kontrak OPN Testnet yang berjalan sekarang tidak berubah perilakunya.

## Urutan Eksekusi

Fase 1 dulu (tanpa ini AEREDIUM tidak bisa dipakai), lalu Fase 2, lalu Fase 3.
