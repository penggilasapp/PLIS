import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  MessageCircle,
  PackageCheck,
  Search,
  WashingMachine,
} from 'lucide-react';
import { getDeadlineInfo } from '../../../shared/deadline';
import {
  formatCurrency,
  formatDate,
  formatPhone,
  getLaundryStatusDetails,
  toWhatsAppPhone,
} from '../../../shared/formatters';
import { AppUser, BusinessSettings, LaundryStatus, Transaction } from '../../../types';
import { PullToRefreshContainer } from '../../common/PullToRefreshContainer';
import { transactionService } from '../../../services/transactionService';

interface LaundryStatusBoardViewProps {
  transactions: Transaction[];
  currentUser: AppUser;
  settings: BusinessSettings;
  onSelectTransaction: (trx: Transaction) => void;
  onRefreshData: () => void;
}

export const LaundryStatusBoardView: React.FC<LaundryStatusBoardViewProps> = ({
  transactions,
  currentUser,
  settings,
  onSelectTransaction,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<LaundryStatus>('DIPROSES');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const columns: { status: LaundryStatus; title: string; count: number }[] = [
    {
      status: 'DITERIMA',
      title: 'Diterima (Antrean)',
      count: transactions.filter((t) => t.laundryStatus === 'DITERIMA').length,
    },
    {
      status: 'DIPROSES',
      title: 'Sedang Dicuci/Setrika',
      count: transactions.filter((t) => t.laundryStatus === 'DIPROSES').length,
    },
    {
      status: 'SIAP_DIAMBIL',
      title: 'Siap Diambil di Rak',
      count: transactions.filter((t) => t.laundryStatus === 'SIAP_DIAMBIL').length,
    },
    {
      status: 'SELESAI',
      title: 'Selesai / Diserahkan',
      count: transactions.filter((t) => t.laundryStatus === 'SELESAI').length,
    },
  ];

  const handleAdvanceStatus = async (
    trx: Transaction,
    nextStatus: LaundryStatus,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      setUpdatingId(trx.id);
      await transactionService.updateStatus(
        trx.id,
        nextStatus,
        currentUser,
        `Pengerjaan dinaikkan ke ${nextStatus}`
      );
      onRefreshData();
    } catch (err: any) {
      alert(`Gagal memperbarui status: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleNotifyPickup = (trx: Transaction, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!trx.customerPhone) {
      alert('Nomor telepon pelanggan tidak tersedia!');
      return;
    }
    const cleanPhone = toWhatsAppPhone(trx.customerPhone);
    const msg =
      `Halo Kak *${trx.customerName}*,\n\n` +
      `Pakaian cucian Anda dengan Nomor Nota *${trx.id}* sudah *SELESAI & SIAP DIAMBIL* di *${settings.storeName}*! ✨\n\n` +
      `Total Tagihan: ${formatCurrency(trx.finalAmount)}\n` +
      `Sisa Pembayaran: ${formatCurrency(trx.remainingAmount)}\n\n` +
      `Harap membawa nota saat pengambilan pakaian ya Kak. Terima kasih! 🙏`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const currentList = transactions
    .filter((t) => t.laundryStatus === activeTab)
    .filter((t) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        t.id.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.customerPhone.includes(q)
      );
    });

  return (
    <PullToRefreshContainer onRefresh={onRefreshData}>
      <div className="space-y-3.5 pb-24">
        {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari transaksi pada status ini..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
        />
      </div>

      {/* Pipeline Status Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
        {columns.map((c) => {
          const isActive = activeTab === c.status;
          return (
            <button
              key={c.status}
              onClick={() => setActiveTab(c.status)}
              className={`p-2.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] truncate">{c.title}</span>
                <span
                  className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {c.count}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Orders in Active Status List */}
      <div className="space-y-2.5">
        {currentList.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400 space-y-1">
            <WashingMachine className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-600">Tidak ada cucian dalam status ini</p>
            <p>Pilih tab status lain di atas untuk melihat cucian lainnya.</p>
          </div>
        ) : (
          currentList.map((trx) => {
            const deadline = getDeadlineInfo(trx);
            const isOverdue = trx.laundryStatus !== 'SELESAI' && deadline.state === 'OVERDUE';
            const isApproaching = trx.laundryStatus !== 'SELESAI' && deadline.state === 'APPROACHING';

            const cardBorderClass = isOverdue
              ? 'border-l-4 border-l-rose-500 border-t border-r border-b border-rose-200 bg-rose-50/15'
              : isApproaching
              ? 'border-l-4 border-l-amber-500 border-t border-r border-b border-amber-200 bg-amber-50/15'
              : 'border border-slate-200 bg-white';

            return (
              <div
                key={trx.id}
                onClick={() => onSelectTransaction(trx)}
                className={`${cardBorderClass} p-4 rounded-2xl shadow-2xs hover:border-blue-400 transition cursor-pointer space-y-2.5`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-slate-900">{trx.id}</span>
                    {trx.isUrgent && (
                      <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase">
                        KILAT
                      </span>
                    )}
                    {trx.laundryStatus !== 'SELESAI' && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${deadline.badgeClass}`}>
                        {deadline.label}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Est: {formatDate(trx.estimatedCompletionAt, true)}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">{trx.customerName}</h4>
                    <p className="text-xs text-slate-500">{formatPhone(trx.customerPhone)}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sm text-slate-900">
                      {formatCurrency(trx.finalAmount)}
                    </span>
                    {trx.remainingAmount > 0 && (
                      <div className="text-[10px] font-bold text-rose-600">
                        Sisa: {formatCurrency(trx.remainingAmount)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items summary */}
                <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center justify-between">
                  <span className="truncate">
                    {trx.items.map((i) => `${i.quantity} ${i.unitName} ${i.serviceName}`).join(' • ')}
                  </span>
                  {trx.perfumePreference && (
                    <span className="text-blue-600 font-semibold shrink-0 ml-2">
                      Parfum: {trx.perfumePreference.split(' ')[0]}
                    </span>
                  )}
                </div>

                {/* Action Buttons based on status */}
                <div className="pt-1 flex items-center justify-end gap-2 text-xs">
                  {trx.laundryStatus === 'DITERIMA' && (
                    <button
                      onClick={(e) => handleAdvanceStatus(trx, 'DIPROSES', e)}
                      disabled={updatingId === trx.id}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs"
                    >
                      <span>Mulai Cuci (Diproses)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {trx.laundryStatus === 'DIPROSES' && (
                    <button
                      onClick={(e) => handleAdvanceStatus(trx, 'SIAP_DIAMBIL', e)}
                      disabled={updatingId === trx.id}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Siap Diambil</span>
                    </button>
                  )}

                  {trx.laundryStatus === 'SIAP_DIAMBIL' && (
                    <>
                      <button
                        onClick={(e) => handleNotifyPickup(trx, e)}
                        className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center gap-1 transition"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Kirim WA Siap Ambil</span>
                      </button>

                      <button
                        onClick={(e) => handleAdvanceStatus(trx, 'SELESAI', e)}
                        disabled={updatingId === trx.id}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold flex items-center gap-1 shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Serahkan ke Pelanggan</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
    </PullToRefreshContainer>
  );
};
