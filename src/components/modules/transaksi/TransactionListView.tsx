import React, { useState } from 'react';
import {
  Calendar,
  Filter,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { PullToRefreshContainer } from '../../common/PullToRefreshContainer';
import { getDeadlineInfo } from '../../../shared/deadline';
import {
  formatCurrency,
  formatDate,
  getLaundryStatusDetails,
  getPaymentStatusDetails,
} from '../../../shared/formatters';
import { LaundryStatus, PaymentStatus, Transaction } from '../../../types';

interface TransactionListViewProps {
  transactions: Transaction[];
  onOpenNewTransaction: () => void;
  onSelectTransaction: (trx: Transaction) => void;
  onRefreshData?: () => Promise<void> | void;
}

export const TransactionListView: React.FC<TransactionListViewProps> = ({
  transactions,
  onOpenNewTransaction,
  onSelectTransaction,
  onRefreshData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');

  const todayStr = new Date().toISOString().slice(0, 10);

  // Filter logic
  const filteredTransactions = transactions.filter((trx) => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = trx.id.toLowerCase().includes(q);
      const matchName = trx.customerName.toLowerCase().includes(q);
      const matchPhone = trx.customerPhone.includes(q);
      if (!matchId && !matchName && !matchPhone) return false;
    }

    // Deadline filter
    if (statusFilter === 'DEADLINE_URGENT') {
      if (trx.laundryStatus === 'SELESAI') return false;
      const dl = getDeadlineInfo(trx);
      if (dl.state !== 'OVERDUE' && dl.state !== 'APPROACHING') return false;
    } else if (statusFilter !== 'ALL' && trx.laundryStatus !== statusFilter) {
      return false;
    }

    // Payment filter
    if (paymentFilter !== 'ALL' && trx.paymentStatus !== paymentFilter) {
      return false;
    }

    // Date filter
    if (dateFilter === 'TODAY' && !trx.createdAt.startsWith(todayStr)) {
      return false;
    }
    if (dateFilter === 'LAST_7_DAYS') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (new Date(trx.createdAt) < sevenDaysAgo) return false;
    }

    return true;
  });

  const totalFilteredAmount = filteredTransactions.reduce((acc, t) => acc + t.finalAmount, 0);
  const totalFilteredReceivables = filteredTransactions.reduce((acc, t) => acc + t.remainingAmount, 0);

  return (
    <PullToRefreshContainer onRefresh={onRefreshData || (() => {})}>
      <div className="space-y-3.5 pb-24">
        {/* Search Bar & Refresh Trigger */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari No. Nota, Pelanggan, atau No. HP..."
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {onRefreshData && (
            <button
              type="button"
              onClick={() => onRefreshData()}
              className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 active:text-blue-600 border border-slate-200 rounded-2xl transition shadow-2xs active:scale-95 shrink-0"
              title="Muat Ulang Transaksi (Tarik ke bawah pada HP)"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

      {/* Filter Horizontal Scroll Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          onClick={() => {
            setStatusFilter('ALL');
            setPaymentFilter('ALL');
            setDateFilter('ALL');
          }}
          className={`px-3 py-1.5 rounded-full whitespace-nowrap font-semibold border transition ${
            statusFilter === 'ALL' && paymentFilter === 'ALL' && dateFilter === 'ALL'
              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Semua ({transactions.length})
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'DEADLINE_URGENT' ? 'ALL' : 'DEADLINE_URGENT')}
          className={`px-3 py-1.5 rounded-full whitespace-nowrap font-semibold border transition flex items-center gap-1 ${
            statusFilter === 'DEADLINE_URGENT'
              ? 'bg-rose-600 text-white border-rose-600 shadow-2xs animate-pulse'
              : 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50'
          }`}
        >
          <span>⏰ Tenggat Mendesak</span>
        </button>

        <button
          onClick={() => setDateFilter(dateFilter === 'TODAY' ? 'ALL' : 'TODAY')}
          className={`px-3 py-1.5 rounded-full whitespace-nowrap font-semibold border transition flex items-center gap-1 ${
            dateFilter === 'TODAY'
              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-3 h-3" />
          Hari Ini
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'DIPROSES' ? 'ALL' : 'DIPROSES')}
          className={`px-3 py-1.5 rounded-full whitespace-nowrap font-semibold border transition ${
            statusFilter === 'DIPROSES'
              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Diproses
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'SIAP_DIAMBIL' ? 'ALL' : 'SIAP_DIAMBIL')}
          className={`px-3 py-1.5 rounded-full whitespace-nowrap font-semibold border transition ${
            statusFilter === 'SIAP_DIAMBIL'
              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Siap Diambil
        </button>

        <button
          onClick={() => setPaymentFilter(paymentFilter === 'BELUM_DIBAYAR' ? 'ALL' : 'BELUM_DIBAYAR')}
          className={`px-3 py-1.5 rounded-full whitespace-nowrap font-semibold border transition ${
            paymentFilter === 'BELUM_DIBAYAR'
              ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Belum Lunas
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'SELESAI' ? 'ALL' : 'SELESAI')}
          className={`px-3 py-1.5 rounded-full whitespace-nowrap font-semibold border transition ${
            statusFilter === 'SELESAI'
              ? 'bg-slate-700 text-white border-slate-700 shadow-2xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Selesai
        </button>
      </div>

      {/* Summary Filter Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100 rounded-xl text-xs text-slate-600 font-medium">
        <span>Menampilkan {filteredTransactions.length} transaksi</span>
        <div className="flex items-center gap-2">
          <span>Total: <strong>{formatCurrency(totalFilteredAmount)}</strong></span>
          {totalFilteredReceivables > 0 && (
            <span className="text-rose-600 font-semibold">
              Piutang: {formatCurrency(totalFilteredReceivables)}
            </span>
          )}
        </div>
      </div>

      {/* Transaction Cards List */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
          <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-slate-600 font-semibold text-sm">Tidak ada transaksi ditemukan</p>
          <p className="text-xs text-slate-400">
            Coba ubah kata kunci pencarian atau bersihkan filter di atas.
          </p>
          <button
            onClick={onOpenNewTransaction}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-xs hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Buat Transaksi Baru
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTransactions.map((trx) => {
            const laundryDetails = getLaundryStatusDetails(trx.laundryStatus);
            const payDetails = getPaymentStatusDetails(trx.paymentStatus);
            const deadline = getDeadlineInfo(trx);
            const isOverdue = trx.laundryStatus !== 'SELESAI' && deadline.state === 'OVERDUE';
            const isApproaching = trx.laundryStatus !== 'SELESAI' && deadline.state === 'APPROACHING';

            const cardBorderClass = isOverdue
              ? 'border-l-4 border-l-rose-500 border-t border-r border-b border-rose-200 bg-rose-50/20'
              : isApproaching
              ? 'border-l-4 border-l-amber-500 border-t border-r border-b border-amber-200 bg-amber-50/20'
              : 'border border-slate-200/90 bg-white';

            return (
              <div
                key={trx.id}
                onClick={() => onSelectTransaction(trx)}
                className={`${cardBorderClass} p-4 rounded-2xl shadow-2xs hover:border-blue-400 hover:shadow-xs transition cursor-pointer active:scale-[0.99] touch-manipulation`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                      {trx.id}
                    </span>
                    {trx.isUrgent && (
                      <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase">
                        KILAT
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {trx.laundryStatus !== 'SELESAI' && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getDeadlineInfo(trx).badgeClass}`}>
                        {getDeadlineInfo(trx).label}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${laundryDetails.color}`}
                    >
                      {laundryDetails.label}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${payDetails.color}`}
                    >
                      {payDetails.label}
                    </span>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="mt-2 flex items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm truncate">
                      {trx.customerName}
                    </h4>
                    <p className="text-xs text-slate-500 truncate">
                      {trx.customerPhone}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-black text-base text-slate-900">
                      {formatCurrency(trx.finalAmount)}
                    </div>
                    {trx.remainingAmount > 0 && (
                      <div className="text-xs font-bold text-rose-600">
                        Sisa: {formatCurrency(trx.remainingAmount)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Summary & Perfume */}
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 gap-2">
                  <div className="truncate">
                    {trx.items.map((i) => `${i.quantity} ${i.unitName} ${i.serviceName}`).join(', ')}
                  </div>
                  <div className="shrink-0 text-slate-400 font-medium">
                    {formatDate(trx.createdAt, true)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

        {/* Floating Action Button (FAB) for New Transaction */}
        <button
          onClick={onOpenNewTransaction}
          className="fixed bottom-20 right-4 sm:right-8 z-30 flex items-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm rounded-full shadow-xl transition touch-manipulation"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
          <span className="hidden xs:inline">Transaksi Baru</span>
        </button>
      </div>
    </PullToRefreshContainer>
  );
};
