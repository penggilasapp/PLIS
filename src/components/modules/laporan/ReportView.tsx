import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CreditCard,
  DollarSign,
  Download,
  FileSpreadsheet,
  Filter,
  PieChart,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { downloadCSV } from '../../../shared/csvExport';
import {
  formatCurrency,
  formatDate,
  getPaymentMethodLabel,
} from '../../../shared/formatters';
import { Expense, PaymentRecord, Transaction } from '../../../types';

interface ReportViewProps {
  transactions: Transaction[];
  payments: PaymentRecord[];
  expenses: Expense[];
}

type PeriodFilter = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM';

export const ReportView: React.FC<ReportViewProps> = ({
  transactions,
  payments,
  expenses,
}) => {
  const [period, setPeriod] = useState<PeriodFilter>('THIS_MONTH');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Date boundary calculations
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (period === 'TODAY') {
      return { startDate: todayStr, endDate: todayStr };
    }
    if (period === 'THIS_WEEK') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff));
      return {
        startDate: monday.toISOString().slice(0, 10),
        endDate: todayStr,
      };
    }
    if (period === 'THIS_MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        startDate: startOfMonth.toISOString().slice(0, 10),
        endDate: todayStr,
      };
    }
    return {
      startDate: customStartDate || '2026-01-01',
      endDate: customEndDate || todayStr,
    };
  }, [period, customStartDate, customEndDate]);

  // Filtered dataset
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const d = t.createdAt.slice(0, 10);
      return d >= startDate && d <= endDate;
    });
  }, [transactions, startDate, endDate]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const d = p.paymentDate.slice(0, 10);
      return d >= startDate && d <= endDate;
    });
  }, [payments, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const d = e.date.slice(0, 10);
      return d >= startDate && d <= endDate;
    });
  }, [expenses, startDate, endDate]);

  // Key KPI metrics
  const totalOmzet = filteredTransactions.reduce((acc, t) => acc + t.finalAmount, 0);
  const totalPaymentsReceived = filteredPayments.reduce((acc, p) => acc + p.amount, 0);
  const totalReceivables = filteredTransactions.reduce((acc, t) => acc + t.remainingAmount, 0);
  const totalExpense = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalPaymentsReceived - totalExpense;

  // Breakdown by Service
  const serviceBreakdown = useMemo(() => {
    const map: Record<string, { name: string; category: string; count: number; total: number; unit: string }> = {};

    filteredTransactions.forEach((trx) => {
      trx.items.forEach((item) => {
        const key = item.serviceName;
        if (!map[key]) {
          map[key] = {
            name: item.serviceName,
            category: item.categoryName,
            count: 0,
            total: 0,
            unit: item.unitName,
          };
        }
        map[key].count += item.quantity;
        map[key].total += item.subtotal;
      });
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredTransactions]);

  // Breakdown by Payment Method
  const methodBreakdown = useMemo(() => {
    const map: Record<string, { method: string; count: number; total: number }> = {};

    filteredPayments.forEach((p) => {
      const label = getPaymentMethodLabel(p.method);
      if (!map[label]) {
        map[label] = { method: label, count: 0, total: 0 };
      }
      map[label].count += 1;
      map[label].total += p.amount;
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredPayments]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'No. Transaksi',
      'Tanggal',
      'Pelanggan',
      'No. HP',
      'Layanan',
      'Total Omzet (Rp)',
      'Dibayar (Rp)',
      'Sisa Piutang (Rp)',
      'Status Bayar',
      'Status Cucian',
    ];

    const rows = filteredTransactions.map((t) => [
      t.id,
      formatDate(t.createdAt, true),
      t.customerName,
      t.customerPhone,
      t.items.map((i) => `${i.quantity} ${i.unitName} ${i.serviceName}`).join(' | '),
      t.finalAmount,
      t.paidAmount,
      t.remainingAmount,
      t.paymentStatus,
      t.laundryStatus,
    ]);

    downloadCSV(`Laporan_Laundry_PLIS_${startDate}_sd_${endDate}`, headers, rows);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Period Filter Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">Periode Laporan</h3>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>

        {/* Period Selector Tabs */}
        <div className="grid grid-cols-4 gap-1.5 text-xs font-semibold">
          <button
            onClick={() => setPeriod('TODAY')}
            className={`py-2 rounded-xl transition ${
              period === 'TODAY'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Hari Ini
          </button>
          <button
            onClick={() => setPeriod('THIS_WEEK')}
            className={`py-2 rounded-xl transition ${
              period === 'THIS_WEEK'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Minggu Ini
          </button>
          <button
            onClick={() => setPeriod('THIS_MONTH')}
            className={`py-2 rounded-xl transition ${
              period === 'THIS_MONTH'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Bulan Ini
          </button>
          <button
            onClick={() => setPeriod('CUSTOM')}
            className={`py-2 rounded-xl transition ${
              period === 'CUSTOM'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Kustom
          </button>
        </div>

        {period === 'CUSTOM' && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] text-slate-500 font-medium mb-1">Mulai</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 font-medium mb-1">Sampai</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden"
              />
            </div>
          </div>
        )}

        <div className="text-[11px] text-slate-400">
          Menampilkan rentang: {startDate} s/d {endDate} ({filteredTransactions.length} transaksi)
        </div>
      </div>

      {/* Main KPI Financial Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {/* Omzet Transaksi */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs text-slate-500 font-semibold">Total Omzet Order</div>
          <div className="text-lg sm:text-xl font-black text-slate-900 mt-1 truncate">
            {formatCurrency(totalOmzet)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Nilai seluruh nota dibuat
          </div>
        </div>

        {/* Kas Masuk Riil */}
        <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/90 shadow-2xs">
          <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
            Uang Masuk Diterima
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-700 mt-1 truncate">
            {formatCurrency(totalPaymentsReceived)}
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">
            Kas nyata yang sudah masuk
          </div>
        </div>

        {/* Piutang Tersisa */}
        <div className="bg-rose-50/60 p-3.5 rounded-2xl border border-rose-200/90 shadow-2xs">
          <div className="text-xs text-rose-800 font-semibold">Piutang Belum Lunas</div>
          <div className="text-lg sm:text-xl font-black text-rose-700 mt-1 truncate">
            {formatCurrency(totalReceivables)}
          </div>
          <div className="text-[10px] text-rose-600 mt-0.5">
            Tagihan menunggu bayar
          </div>
        </div>

        {/* Total Pengeluaran */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs text-slate-500 font-semibold flex items-center gap-1">
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
            Total Pengeluaran
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-600 mt-1 truncate">
            {formatCurrency(totalExpense)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {filteredExpenses.length} catatan biaya
          </div>
        </div>

        {/* Rekap Kas Bersih / Laba Bersih */}
        <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200/90 shadow-2xs sm:col-span-2">
          <div className="text-xs text-blue-900 font-bold flex items-center gap-1">
            <Wallet className="w-3.5 h-3.5 text-blue-600" />
            Kas Bersih (Uang Masuk - Pengeluaran)
          </div>
          <div className={`text-xl sm:text-2xl font-black mt-1 truncate ${netProfit >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
            {formatCurrency(netProfit)}
          </div>
          <div className="text-[10px] text-blue-700/80 mt-0.5">
            Surplus arus kas pada periode terpilih
          </div>
        </div>
      </div>

      {/* Breakdown by Payment Methods */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <CreditCard className="w-4 h-4 text-blue-600" />
          Ringkasan Uang Masuk per Metode Pembayaran
        </h4>

        {methodBreakdown.length === 0 ? (
          <div className="p-3 text-center text-xs text-slate-400">
            Belum ada pembayaran pada periode ini
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {methodBreakdown.map((item) => (
              <div key={item.method} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800">{item.method}</span>
                  <span className="text-slate-400 text-[11px] ml-2">
                    ({item.count} transaksi)
                  </span>
                </div>
                <div className="font-black text-slate-900">
                  {formatCurrency(item.total)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Breakdown by Services */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <PieChart className="w-4 h-4 text-blue-600" />
          Ringkasan Omzet Berdasarkan Layanan
        </h4>

        {serviceBreakdown.length === 0 ? (
          <div className="p-3 text-center text-xs text-slate-400">
            Belum ada transaksi pada periode ini
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {serviceBreakdown.map((item) => (
              <div key={item.name} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 truncate">{item.name}</div>
                  <div className="text-[11px] text-slate-500">
                    Volume: {item.count} {item.unit}
                  </div>
                </div>
                <div className="font-black text-slate-900 shrink-0 text-right">
                  {formatCurrency(item.total)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
