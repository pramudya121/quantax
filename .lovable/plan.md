# Rencana Fase Berikutnya — Fitur Berdampak Tinggi

Berdasarkan audit `.lovable/plan.md`, memory proyek, dan file yang sudah ada, ini fitur penting yang **belum selesai** dan paling berdampak untuk user & konversi.

---

## Prioritas 1 — Notification Center (Real-time on-chain)

Toast live sudah aktif (`useLiveSwapNotifications`), tapi belum ada **pusat notifikasi persisten**.

- Komponen `NotificationCenter.tsx` sudah ada tapi belum di-wire ke header.
- Simpan event Swap/Mint/Burn user di `localStorage` (max 50 entri).
- Bell icon di `Header.tsx` + badge unread count.
- Panel dropdown: list notifikasi + link ke explorer + tombol "Mark all read".
- Dengarkan Mint & Burn (add/remove liquidity), bukan hanya Swap.

**Dampak:** User tidak kehilangan info transaksi saat pindah tab / refresh.

---

## Prioritas 2 — Halaman `/learn` (Educational Hub + SEO)

Belum ada. Berdampak besar untuk SEO organik dan onboarding user baru.

- Route baru `/learn` + sub-guide `/learn/what-is-a-dex`, `/learn/how-to-swap`, `/learn/providing-liquidity`, `/learn/farming-risks`, `/learn/impermanent-loss`.
- Konten markdown pendek + gambar/diagram.
- JSON-LD `Article` schema tiap halaman + breadcrumbs.
- Tambah ke `sitemap.xml` dan `llms.txt`.
- Link "Learn" di footer & docs.

**Dampak:** Traffic SEO, retensi user baru, kredibilitas.

---

## Prioritas 3 — Mobile UX Pass (375px)

Belum pernah dilakukan audit menyeluruh. Sebagian besar user Web3 mobile-first.

- Audit semua page di 375px viewport (Swap, Liquidity, Pools, Farming, Portfolio, Analytics, PairDetail).
- Tap target minimal 44x44px (button, tab, icon).
- Sticky bottom CTA di Swap & Liquidity ("Swap"/"Add Liquidity" fixed bottom).
- Bottom-sheet untuk `TokenSelector`, `WalletConnectModal`, `SwapConfirmModal` di mobile.
- Fix horizontal scroll akibat tab overflow (Portfolio/Analytics) → scrollable tabs.
- Test 3D globe di mobile: disable / low-poly fallback di <768px jika jank.

**Dampak:** Konversi mobile meningkat drastis.

---

## Prioritas 4 — Portfolio PNL & CSV Export

Sudah di-list `.lovable/plan.md` step 2e, belum dibangun.

- Hitung avg buy price per token dari swap history (localStorage).
- Kolom "PNL" di tab Assets: `(currentPrice - avgBuy) * balance`, warna hijau/merah.
- Tombol "Export CSV" di tab History → download `transactions_YYYY-MM-DD.csv`.

**Dampak:** User serius (whale, tax season) butuh ini.

---

## Prioritas 5 — Volume 24h & APR Nyata di Pools

Sekarang APR di Pools = statis / estimasi. Data volume swap sudah tersedia via `useSwapVolume`.

- Passing `perPool` volume ke `PoolCard`.
- APR = `(volume24h * 0.003 * 365) / TVL * 100`.
- Kolom "Vol 24h" di list view + sort by volume.
- Badge "🔥 Hot" untuk pool volume tertinggi.

**Dampak:** Data akurat = trust; sort by volume = discovery pool aktif.

---

## Prioritas 6 (Opsional) — Slippage Warning Modal & Swap Safety Round 2

Sebagian sudah ada (`PriceImpactWarning`, `SwapConfirmModal`). Yang belum:

- Double-confirm modal untuk swap > $10k equivalent (checkbox "I understand").
- Emergency withdraw farming: checkbox "I forfeit pending rewards" wajib dicentang.
- Rate-limit tombol tx: disable 3 detik setelah submit (cegah double-click).

---

## Urutan Eksekusi Rekomendasi

1. **Notification Center** (2–3 file, cepat, langsung terasa)
2. **Mobile UX Pass** (impact terbesar untuk user riil)
3. **Portfolio PNL + CSV** (fitur "power user")
4. **Volume/APR Pools** (data-driven trust)
5. **Learn hub** (SEO play, konten heavy)
6. **Safety hardening round 2** (defense-in-depth)

Tiap prioritas akan diverifikasi build & preview sebelum lanjut.

---

## Technical Notes

- Notification storage: `localStorage["dragondex:notifications"]` = `Array<{id, type, hash, message, ts, read}>`.
- Learn pages: MDX tidak dipakai — pakai TSX + komponen `<GuideLayout>` reusable.
- Mobile: pakai hook `use-mobile.tsx` yang sudah ada; sheet component dari shadcn.
- PNL: cost basis = weighted-average dari semua BUY swap; ignore SELL untuk basis.
- CSV: pakai `Blob` + `URL.createObjectURL`, tanpa library baru.
- Volume APR: sudah punya `stats.perPool` dari `useSwapVolume` — tinggal wire.

Konfirmasi urutan atau pilih prioritas mana yang mau dibangun duluan.
