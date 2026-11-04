# Roadmap — Fix dari hasil audit (Nov 2026)

Prioritas urut:

- [ ] 1. Decimals token: fetch decimals asli untuk token custom (bukan default 18); izinkan token 0 desimal saat impor. Terapkan di Pools, Pair Detail, Add Liquidity, Create Pool.
- [ ] 2. Approval guard: tombol transaksi (swap/add/remove liquidity) disabled sampai allowance terbaca & valid (tidak memakai state loading/gagal).
- [ ] 3. Farming: reward rate admin pakai decimals token reward asli (bukan 18); laporan sukses tx farming hanya setelah receipt status === 1.
- [ ] 4. Data USD jujur: hapus asumsi WQMS = $1; tampilkan estimasi berbasis QMS atau "—" bila tidak ada harga USD.
- [ ] 5. Grafik harga Pair Detail: hapus riwayat acak buatan; hanya data on-chain (event Swap).
- [ ] 6. Volume 24 jam: perluas rentang blok + auto-refresh; tampilkan loading, bukan 0 saat masih memuat.
- [ ] 7. Riwayat transaksi Portfolio: key penyimpanan lokal per chain + per akun.
