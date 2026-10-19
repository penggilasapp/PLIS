# Changelog & Conversion Summary - PLIS Laundry System

## Versi 1.0.0 (Release)
- Inisialisasi arsitektur mobile-first Android Material 3 dan PWA.
- Implementasi penyimpanan lokal IndexedDB dengan reaktivitas event dan fallback localStorage.
- Modul Dashboard dengan kalkulasi statistik real-time: transaksi hari ini, kas masuk riil, cucian diproses, siap diambil, piutang tertunggak, pengeluaran harian, dan arus kas bersih.
- Modul Master Layanan bertingkat: Kategori → Klasifikasi → Layanan, dengan master satuan (kg, pcs, m2, pasang, set).
- Modul Pelanggan dengan deteksi duplikasi nomor telepon, ringkasan belanja, dan riwayat pesanan.
- Modul Transaksi dengan alur multi-item, alokasi ID unik sekuensial permanen `TRX-YYYYMMDD-XXXX`, snapshot harga historis, pembayaran awal/DP, dan integrasi nota.
- Modul Status Cucian dengan pipeline Diterima → Diproses → Siap Diambil → Selesai, pencatatan waktu otomatis, dan notifikasi WhatsApp instan.
- Modul Buku Piutang & Pembayaran Sebagian dengan pencatatan angsuran dan pelunasan bertahap.
- Modul Pengeluaran dengan kategori operasional, listrik & air, deterjen/parfum, gaji, dan perbaikan mesin.
- Modul Rekap Kas & Laci Kasir dengan rekonsiliasi uang fisik, selisih kas, dan tutup buku harian.
- Modul Nota Thermal 58mm dengan pratinjau, dialog cetak browser, adapter Web Bluetooth API (raw ESC/POS 32 kolom), dan tombol WhatsApp dengan format pesan otomatis.
- Modul Laporan dengan filter periode (Hari Ini, Minggu Ini, Bulan Ini, Kustom), perbandingan omzet vs kas masuk riil, dan breakdown metode bayar serta layanan.
- Modul Pusat Ekspor CSV dengan encoding UTF-8 BOM untuk Microsoft Excel & Google Sheets.
- Modul Backup & Restore Database dengan verifikasi JSON, dialog pratinjau ringkasan data sebelum pemulihan, dan pencegahan duplikasi.
- Modul Manajemen Pengguna dengan peran OWNER dan KARYAWAN, PIN akses cepat, dan pencatat nama operator aktif.
- Modul Pengaturan Usaha untuk mengelola nama toko, alamat, kontak, ketentuan laundry pada nota, dan template WhatsApp.
- Modul Audit Aktivitas yang mencatat rekam jejak operasi penting secara otomatis.
- Pengujian otomatis 19 skenario logika dan penyimpanan dengan hasil kelulusan 100%.
