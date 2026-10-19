# PLIS (Penggilas Laundry Information System)

Aplikasi Web Mobile-First & Progressive Web App (PWA) Modern untuk Manajemen Operasional Usaha Laundry Kiloan dan Satuan.

## 🌟 Fitur Utama
1. **Dashboard Eksekutif Real-Time**: Omzet hari ini, kas masuk diterima, cucian diproses, siap diambil, piutang, dan ringkasan arus kas laci.
2. **Transaksi & Kasir Cepat**: Pembuatan nota dengan item bertingkat, perhitungan subtotal/diskon otomatis, alokasi ID permanen, pembayaran awal/DP, dan cetak nota instan.
3. **Master Layanan Bertingkat**: Hierarki data Kategori → Klasifikasi → Layanan, dengan master satuan (kg, pcs, m2, pasang, set).
4. **Buku Pelanggan & Anti-Duplikasi**: Pencarian instan nama/telepon, pencegahan duplikasi nomor HP, riwayat cucian per pelanggan, dan tombol kirim WhatsApp langsung.
5. **Pipeline Status Cucian**: Alur status Diterima → Diproses → Siap Diambil → Selesai dengan pencatatan waktu nyata dan notifikasi otomatis WhatsApp.
6. **Buku Piutang & Pembayaran Sebagian**: Pencatatan DP, angsuran bertahap, pelunasan sisa tagihan, dan riwayat kwitansi.
7. **Pencatatan Pengeluaran**: Biaya deterjen, operasional, listrik & air, gaji, dan perbaikan mesin yang terhubung ke rekap kas.
8. **Rekap Kas & Laci Kasir**: Modal saldo awal, kas masuk tunai, kas keluar tunai, saldo akhir harapan sistem, penghitungan fisik uang laci kasir, selisih kas, dan tutup buku harian.
9. **Nota Thermal 58 mm**: Pratinjau nota thermal, cetak dialog browser, pembagian otomatis ke nomor WhatsApp pelanggan, dan pengiriman raw ESC/POS via Web Bluetooth API.
10. **Laporan Keuangan & Rekap Kas**: Filter Hari Ini, Minggu Ini, Bulan Ini, dan Kustom; pemisahan omzet vs uang masuk riil; breakdown metode bayar dan layanan.
11. **Pusat Ekspor CSV**: Ekspor transaksi, pelanggan, pengeluaran, dan riwayat pembayaran dengan encoding UTF-8 BOM untuk Microsoft Excel & Google Sheets.
12. **Backup & Restore Tervalidasi**: Ekspor seluruh database ke file JSON tervalidasi dan pemulihan aman dengan pratinjau ringkasan data sebelum proses.
13. **Manajemen Pengguna & PIN**: Peran OWNER (kewenangan penuh) dan KARYAWAN (kasir), dengan PIN akses cepat dan pergantian pengguna aktif.
14. **Audit Aktivitas**: Rekam jejak seluruh operasi penting secara otomatis (transaksi, status, pembayaran, master, pengeluaran, backup/restore).

## 🚀 Teknologi
- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide Icons
- **Penyimpanan**: IndexedDB dengan fallback reaktif LocalStorage
- **PWA**: `vite-plugin-pwa`, Service Worker autoUpdate, Web App Manifest, Install Prompt
- **Hardware Integration**: Web Bluetooth API (GATT ESC/POS 58mm) & Browser Print Driver
