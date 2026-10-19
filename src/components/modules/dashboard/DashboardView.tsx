import React from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  DollarSign,
  PackageCheck,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Wallet,
  WashingMachine,
} from 'lucide-react';
import { PullToRefreshContainer } from '../../common/PullToRefreshContainer';
import {
  formatCurrency,
  formatDate,
  getLaundryStatusDetails,
  getPaymentStatusDetails,
} from '../../../shared/formatters';
import {
  Customer,
  Expense,
  PaymentRecord,
  Transaction,
} from '../../../types';

interface DashboardViewProps {
  transactions: Transaction[];
  customers: Customer[];
  payments: PaymentRecord[];
  expenses: Expense[];
  urgentTransactions?: Transaction[];
  onOpenDeadlineModal?: () => void;
  onOpenNewTransaction: () => void;
  onSelectTransaction: (trx: Transaction) => void;
  onNavigateTab: (tab: 'transaksi' | 'pelanggan' | 'laporan' | 'lainnya', subView?: string) => void;
  onRefreshData?: () => Promise<void> | void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  payments,
  expenses,
  urgentTransactions = [],
  onOpenDeadlineModal,
  onOpenNewTransaction,
  onSelectTransaction,
  onNavigateTab,
  onRefreshData,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. Calculations computed strictly from real records
  const todayTransactions = transactions.filter((t) => t.createdAt.startsWith(todayStr));
  const todayTransactionCount = todayTransactions.length;

  // Real cash/payment collected today (across any transaction)
  const todayPayments = payments.filter((p) => p.paymentDate.startsWith(todayStr));
  const todayRevenue = todayPayments.reduce((acc, p) => acc + p.amount, 0);

  // Today's expenses
  const todayExpenses = expenses.filter((e) => e.date.startsWith(todayStr));
  const todayTotalExpenses = todayExpenses.reduce((acc, e) => acc + e.amount, 0);

  // Net Cash Flow Today
  const todayNetCash = todayRevenue - todayTotalExpenses;

  // Operational pipeline counts
  const inProcessCount = transactions.filter((t) => t.laundryStatus === 'DIPROSES').length;
  const readyPickupCount = transactions.filter((t) => t.laundryStatus === 'SIAP_DIAMBIL').length;

  // Total outstanding receivables (piutang berjalan yang belum lunas)
  const totalUnpaidReceivables = transactions
    .filter((t) => t.paymentStatus !== 'LUNAS')
    .reduce((acc, t) => acc + t.remainingAmount, 0);

  // Recent 6 transactions
  const recentTransactions = transactions.slice(0, 6);

  return (
    <PullToRefreshContainer onRefresh={onRefreshData || (() => {})}>
      <div className="space-y-4 pb-20">
        {/* Deadline Alert Banner (if any) */}
        {urgentTransactions.length > 0 && (
          <div
            onClick={onOpenDeadlineModal}
            className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md flex items-center justify-between gap-3 cursor-pointer hover:opacity-95 transition"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-white/20 rounded-xl shrink-0">
                <AlertCircle className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-xs sm:text-sm tracking-tight truncate">
                  Peringatan: {urgentTransactions.length} Cucian Mendekati / Lewat Tenggat!
                </h4>
                <p className="text-[11px] text-white/90 truncate">
                  Berdasarkan estimasi master layanan. Klik untuk melihat daftar cucian mendesak.
                </p>
              </div>
            </div>
            <button className="px-3 py-1.5 bg-white text-rose-700 rounded-xl text-xs font-bold shrink-0 shadow-xs">
              Periksa →
            </button>
          </div>
        )}

        {/* Hero Welcome & Quick Action Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-5 text-white shadow-md">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-blue-100 text-xs font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Operasional Hari Ini • {formatDate(new Date().toISOString(), false)}
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
                {formatCurrency(todayRevenue)}
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Uang Masuk Diterima Hari Ini ({todayPayments.length} Pembayaran)
              </p>
            </div>

            <div className="flex items-center gap-2">
              {onRefreshData && (
                <button
                  type="button"
                  onClick={() => onRefreshData()}
                  className="p-3 bg-white/20 hover:bg-white/30 text-white rounded-xl transition flex items-center justify-center active:scale-95 shrink-0"
                  title="Muat Ulang Data (Tarik ke bawah pada HP)"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={onOpenNewTransaction}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white text-blue-700 hover:bg-blue-50 active:scale-95 rounded-xl font-bold text-sm shadow-md transition touch-manipulation flex-1 sm:flex-initial"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Buat Transaksi Baru</span>
              </button>
            </div>
          </div>

          {/* Decorative background circle */}
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        </div>

      {/* Main KPI Stats Grid (Android Material Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Card 1: Transaksi Hari Ini */}
        <div
          onClick={() => onNavigateTab('transaksi')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-blue-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Order Hari Ini</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
            {todayTransactionCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 truncate">
            {todayTransactions.reduce((acc, t) => acc + t.items.length, 0)} item cucian
          </div>
        </div>

        {/* Card 2: Sedang Dikerjakan */}
        <div
          onClick={() => onNavigateTab('lainnya', 'status-cucian')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-amber-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Diproses</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <WashingMachine className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 tracking-tight">
            {inProcessCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Antrean mesin cuci</div>
        </div>

        {/* Card 3: Siap Diambil */}
        <div
          onClick={() => onNavigateTab('lainnya', 'status-cucian')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-emerald-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Siap Ambil</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 tracking-tight">
            {readyPickupCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Menunggu pelanggan</div>
        </div>

        {/* Card 4: Sisa Piutang */}
        <div
          onClick={() => onNavigateTab('lainnya', 'piutang')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-rose-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Belum Lunas</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-black text-rose-600 truncate">
            {formatCurrency(totalUnpaidReceivables)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Total piutang aktif</div>
        </div>
      </div>

      {/* Cash Flow Summary Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">Arus Kas Hari Ini</h3>
          </div>
          <button
            onClick={() => onNavigateTab('lainnya', 'rekap-kas')}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
          >
            Lihat Laci Kas →
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
              Kas Masuk
            </div>
            <div className="mt-1 text-xs sm:text-sm font-bold text-emerald-600 truncate">
              {formatCurrency(todayRevenue)}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-medium">
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
              Pengeluaran
            </div>
            <div className="mt-1 text-xs sm:text-sm font-bold text-rose-600 truncate">
              {formatCurrency(todayTotalExpenses)}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-medium">
              <Wallet className="w-3.5 h-3.5 text-blue-600" />
              Kas Bersih
            </div>
            <div
              className={`mt-1 text-xs sm:text-sm font-bold truncate ${
                todayNetCash >= 0 ? 'text-blue-700' : 'text-rose-700'
              }`}
            >
              {formatCurrency(todayNetCash)}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Menu Tiles (Android Expressive) */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => onNavigateTab('lainnya', 'status-cucian')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:bg-slate-50 transition active:scale-95"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-1.5">
            <WashingMachine className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">
            Status Cucian
          </span>
        </button>

        <button
          onClick={() => onNavigateTab('lainnya', 'pengeluaran')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:bg-slate-50 transition active:scale-95"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-1.5">
            <ArrowDownRight className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">
            Pengeluaran
          </span>
        </button>

        <button
          onClick={() => onNavigateTab('lainnya', 'bluetooth')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:bg-slate-50 transition active:scale-95"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-1.5">
            <Printer className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">
            Printer 58mm
          </span>
        </button>

        <button
          onClick={() => onNavigateTab('lainnya', 'rekap-kas')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:bg-slate-50 transition active:scale-95"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1.5">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">
            Rekap Kas
          </span>
        </button>
      </div>

      {/* Recent Transactions List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-sm text-slate-900">Transaksi Terbaru</h3>
          </div>
          <button
            onClick={() => onNavigateTab('transaksi')}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
          >
            Lihat Semua ({transactions.length}) →
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Belum ada transaksi. Klik "Buat Transaksi Baru" untuk memulai!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTransactions.map((trx) => {
              const laundryDetails = getLaundryStatusDetails(trx.laundryStatus);
              const payDetails = getPaymentStatusDetails(trx.paymentStatus);

              return (
                <div
                  key={trx.id}
                  onClick={() => onSelectTransaction(trx)}
                  className="p-3.5 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900">{trx.id}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${laundryDetails.color}`}
                      >
                        {laundryDetails.label}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${payDetails.color}`}
                      >
                        {payDetails.label}
                      </span>
                    </div>

                    <div className="mt-1 text-sm font-semibold text-slate-800 truncate">
                      {trx.customerName}
                    </div>

                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {trx.items.map((i) => `${i.quantity} ${i.unitName} ${i.serviceName}`).join(' • ')}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm text-slate-900">
                      {formatCurrency(trx.finalAmount)}
                    </div>
                    {trx.remainingAmount > 0 && (
                      <div className="text-[10px] font-semibold text-rose-600">
                        Sisa: {formatCurrency(trx.remainingAmount)}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {formatDate(trx.createdAt, true)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </PullToRefreshContainer>
);
};
