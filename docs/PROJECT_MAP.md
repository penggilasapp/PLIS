# Project Map & Source Mapping - PLIS

## Struktur Modul & Sumber Kode

| Modul | File Komponen | Service Terkait | Deskripsi |
|---|---|---|---|
| **Dashboard** | `src/components/modules/dashboard/DashboardView.tsx` | `dbService` | Real-time KPI, arus kas hari ini, transaksi terkini |
| **Transaksi** | `src/components/modules/transaksi/TransactionListView.tsx`, `TransactionFormView.tsx`, `TransactionDetailModal.tsx` | `transactionService.ts` | Alur kasir, kalkulasi otomatis, item bertingkat, status stepper |
| **Pembayaran** | `src/components/modules/transaksi/PaymentModal.tsx` | `paymentService.ts` | Pembayaran awal, DP, pelunasan, pencatatan metode tunai/QRIS/bank |
| **Pelanggan** | `src/components/modules/pelanggan/CustomerListView.tsx`, `CustomerFormModal.tsx`, `CustomerDetailModal.tsx` | `customerService.ts` | Validasi duplikasi nomor HP, riwayat order pelanggan, tombol WhatsApp |
| **Status Cucian** | `src/components/modules/status-cucian/LaundryStatusBoardView.tsx` | `transactionService.ts` | Pipeline Kanban: Diterima → Diproses → Siap Diambil → Selesai |
| **Pengeluaran** | `src/components/modules/pengeluaran/ExpenseView.tsx` | `expenseService.ts` | Catat biaya deterjen, operasional, listrik & air, gaji, perbaikan mesin |
| **Rekap Kas Laci** | `src/components/modules/rekap-kas/CashRecapView.tsx` | `cashRegisterService.ts` | Saldo modal awal, rekonsiliasi fisik uang laci, selisih kas, tutup buku |
| **Buku Piutang** | `src/components/modules/piutang/ReceivablesView.tsx` | `paymentService.ts` | Daftar piutang belum lunas, pengingat WhatsApp tagihan, pelunasan cepat |
| **Master Layanan** | `src/components/modules/master-layanan/ServiceMasterView.tsx` | `serviceMasterService.ts` | Hierarki Kategori → Klasifikasi → Layanan, Master Satuan (kg, pcs, m2) |
| **Printer Bluetooth** | `src/components/modules/bluetooth/BluetoothPrinterView.tsx` | `bluetoothPrinterService.ts` | Web Bluetooth API, generator ESC/POS 58mm, uji cetak |
| **Nota Thermal** | `src/components/modules/nota/ReceiptModal.tsx` | `bluetoothPrinterService.ts` | Pratinjau nota 58mm & A4, cetak browser dialog, share WhatsApp otomatis |
| **Laporan** | `src/components/modules/laporan/ReportView.tsx` | `dbService` | Filter periode, omzet vs kas riil masuk, breakdown metode & layanan, CSV |
| **Pengguna** | `src/components/modules/pengguna/UserManagementView.tsx` | `dbService` | Pengaturan akun OWNER & KARYAWAN, PIN akses cepat |
| **Pengaturan** | `src/components/modules/pengaturan/BusinessSettingsView.tsx` | `settingsService.ts` | Profil outlet, kop nota, ketentuan kebijakan laundry, template WhatsApp |
| **Audit Log** | `src/components/modules/audit/AuditLogView.tsx` | `settingsService.ts` | Rekam jejak aktivitas transaksi, perubahan status, dan pembayaran |
| **Ekspor CSV** | `src/components/modules/ekspor/ExportDataView.tsx` | `csvExport.ts` | Ekspor CSV UTF-8 BOM untuk transaksi, pelanggan, pengeluaran, pembayaran |
| **PWA & Offline** | `src/components/common/PWAInstallButton.tsx`, `OfflineIndicator.tsx` | `usePWAInstall.ts` | Tombol instalasi PWA, panduan iOS Safari, indikator offline |
| **Penyimpanan DB** | `src/db/indexedDb.ts` | IndexedDB Browser API | Penyimpanan persisten lokal tanpa kehilangan data saat refresh |
