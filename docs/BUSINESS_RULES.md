# Business Rules - PLIS Laundry System

1. **Integritas Penomoran Transaksi**:
   - Nomor transaksi berformat `TRX-YYYYMMDD-XXXX` bersifat permanen dan sekuensial harian.
   - Nomor tidak boleh berubah ketika formulir dibuka, ditutup, atau diedit.

2. **Snapshot Master Layanan**:
   - Setiap item transaksi menyimpan snapshot: nama layanan, nama kategori, nama klasifikasi, satuan, dan harga per satuan pada saat transaksi dibuat.
   - Perubahan master layanan di masa mendatang tidak akan pernah mengubah nilai historis nota lama.

3. **Perhitungan Keuangan**:
   - Subtotal Item = `quantity * pricePerUnit` (dibulatkan ke integer terdekat).
   - Total Tagihan = `sum(subtotal) - discount`.
   - Sisa Tagihan (Piutang) = `max(0, finalAmount - paidAmount)`.
   - Status Pembayaran:
     - `LUNAS` jika `remainingAmount == 0` dan `paidAmount >= finalAmount`.
     - `SEBAGIAN` jika `paidAmount > 0` dan `remainingAmount > 0`.
     - `BELUM_DIBAYAR` jika `paidAmount == 0`.
   - Pembayaran tidak boleh bernilai negatif dan tidak boleh melebihi sisa tagihan.

4. **Alur Status Cucian**:
   - Status berjalan secara berurutan: `DITERIMA` → `DIPROSES` → `SIAP_DIAMBIL` → `SELESAI`.
   - Setiap perubahan status mencatat stempel waktu (timestamp), nama petugas yang mengubah, dan catatan opsional ke dalam status history dan audit log.
   - Status `SIAP_DIAMBIL` menyediakan integrasi WhatsApp siap kirim untuk mengabari pelanggan bahwa pakaian telah selesai di-packing.

5. **Pemisahan Omzet dan Kas Riil**:
   - Laporan membedakan total omzet (nilai pesanan dibuat) dengan uang pembayaran yang benar-benar diterima (kas masuk riil).
   - Pengeluaran mengurangi kas laci dan laporan laba bersih kasir.

6. **Hak Akses & Kewenangan (RBAC)**:
   - `OWNER`: Hak akses tak terbatas termasuk pengaturan profil usaha, penghapusan catatan, dan backup/restore database.
   - `KARYAWAN`: Akses operasional harian (input pesanan, ubah status cucian, terima pembayaran, catat biaya harian, cetak nota).
