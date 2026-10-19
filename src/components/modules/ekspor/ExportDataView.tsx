import React from 'react';
import {
  CreditCard,
  Download,
  FileSpreadsheet,
  Receipt,
  TrendingDown,
  Users,
} from 'lucide-react';
import { downloadCSV } from '../../../shared/csvExport';
import { formatDate } from '../../../shared/formatters';
import { Customer, Expense, PaymentRecord, Transaction } from '../../../types';

interface ExportDataViewProps {
  transactions: Transaction[];
  customers: Customer[];
  expenses: Expense[];
  payments: PaymentRecord[];
}

export const ExportDataView: React.FC<ExportDataViewProps> = ({
  transactions,
  customers,
  expenses,
  payments,
}) => {
  const now = new Date().toISOString().slice(0, 10);

  const handleExportTransactions = () => {
    const headers = [
      'No. Transaksi',
      'Tanggal Dibuat',
      'ID Pelanggan',
      'Nama Pelanggan',
      'Nomor HP',
      'Daftar Layanan',
      'Total Tagihan (Rp)',
      'Diskon (Rp)',
      'Total Akhir (Rp)',
      'Telah Dibayar (Rp)',
      'Sisa Piutang (Rp)',
      'Status Bayar',
      'Status Cucian',
      'Estimasi Selesai',
      'Kasir / Pembuat',
    ];

    const rows = transactions.map((t) => [
      t.id,
      formatDate(t.createdAt, true),
      t.customerId,
      t.customerName,
      t.customerPhone,
      t.items.map((i) => `${i.quantity} ${i.unitName} ${i.serviceName}`).join(' | '),
      t.totalAmount,
      t.discount,
      t.finalAmount,
      t.paidAmount,
      t.remainingAmount,
      t.paymentStatus,
      t.laundryStatus,
      formatDate(t.estimatedCompletionAt, true),
      t.createdByUserName,
    ]);

    downloadCSV(`Ekspor_Transaksi_PLIS_${now}`, headers, rows);
  };

  const handleExportCustomers = () => {
    const headers = [
      'ID Pelanggan',
      'Nama Lengkap',
      'Nomor WhatsApp / HP',
      'Alamat',
      'Catatan',
      'Tanggal Mendaftar',
    ];

    const rows = customers.map((c) => [
      c.id,
      c.name,
      c.phone,
      c.address || '',
      c.notes || '',
      formatDate(c.createdAt, true),
    ]);

    downloadCSV(`Ekspor_Pelanggan_PLIS_${now}`, headers, rows);
  };

  const handleExportExpenses = () => {
    const headers = [
      'ID Pengeluaran',
      'Tanggal',
      'Kategori',
      'Deskripsi Keperluan',
      'Nominal (Rp)',
      'Metode Bayar',
      'Catatan',
      'Dicatat Oleh',
    ];

    const rows = expenses.map((e) => [
      e.id,
      formatDate(e.date, true),
      e.categoryLabel,
      e.description,
      e.amount,
      e.paymentMethod,
      e.notes || '',
      e.recordedByUserName,
    ]);

    downloadCSV(`Ekspor_Pengeluaran_PLIS_${now}`, headers, rows);
  };

  const handleExportPayments = () => {
    const headers = [
      'ID Pembayaran',
      'No. Nota Transaksi',
      'Tanggal Bayar',
      'Nominal Diterima (Rp)',
      'Metode Bayar',
      'No. Referensi',
      'Catatan',
      'Kasir Penerima',
    ];

    const rows = payments.map((p) => [
      p.id,
      p.transactionId,
      formatDate(p.paymentDate, true),
      p.amount,
      p.method,
      p.referenceNumber || '',
      p.notes || '',
      p.recordedByUserName,
    ]);

    downloadCSV(`Ekspor_Riwayat_Pembayaran_PLIS_${now}`, headers, rows);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header Info */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">Pusat Ekspor Data (CSV Excel)</h3>
            <p className="text-[11px] text-slate-500">
              Format UTF-8 kompatibel dengan Microsoft Excel, Google Sheets, dan LibreOffice
            </p>
          </div>
        </div>
      </div>

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Card 1: Transaksi */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-bold">
              <Receipt className="w-4 h-4" />
              <span>Ekspor Seluruh Transaksi Laundry</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Data lengkap nota, nama pelanggan, daftar item layanan, nominal harga, diskon, pembayaran, dan status cucian ({transactions.length} baris).
            </p>
          </div>
          <button
            onClick={handleExportTransactions}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Unduh CSV Transaksi</span>
          </button>
        </div>

        {/* Card 2: Pelanggan */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 font-bold">
              <Users className="w-4 h-4" />
              <span>Ekspor Buku Pelanggan</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Daftar seluruh kontak pelanggan, nomor WhatsApp, alamat tempat tinggal, dan catatan khusus ({customers.length} kontak).
            </p>
          </div>
          <button
            onClick={handleExportCustomers}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Unduh CSV Pelanggan</span>
          </button>
        </div>

        {/* Card 3: Pengeluaran */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-rose-600 font-bold">
              <TrendingDown className="w-4 h-4" />
              <span>Ekspor Buku Pengeluaran Biaya</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Rincian biaya operasional, deterjen, listrik, gaji, perawatan mesin, dan catatan kuitansi toko ({expenses.length} catatan biaya).
            </p>
          </div>
          <button
            onClick={handleExportExpenses}
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Unduh CSV Pengeluaran</span>
          </button>
        </div>

        {/* Card 4: Riwayat Pembayaran */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold">
              <CreditCard className="w-4 h-4" />
              <span>Ekspor Riwayat Kas Masuk (Pembayaran)</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Catatan setiap transaksi kas masuk sah (Tunai, QRIS, Bank, E-Wallet) dan nama kasir yang menerima ({payments.length} pembayaran).
            </p>
          </div>
          <button
            onClick={handleExportPayments}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Unduh CSV Pembayaran</span>
          </button>
        </div>
      </div>
    </div>
  );
};
