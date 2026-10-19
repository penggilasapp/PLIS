import React from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageCircle,
  Phone,
  WashingMachine,
  X,
} from 'lucide-react';
import { getDeadlineInfo } from '../../shared/deadline';
import {
  formatCurrency,
  formatDate,
  formatPhone,
  toWhatsAppPhone,
} from '../../shared/formatters';
import { BusinessSettings, Transaction } from '../../types';

interface DeadlineNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  urgentTransactions: Transaction[];
  settings: BusinessSettings;
  onSelectTransaction: (trx: Transaction) => void;
}

export const DeadlineNotificationModal: React.FC<DeadlineNotificationModalProps> = ({
  isOpen,
  onClose,
  urgentTransactions,
  settings,
  onSelectTransaction,
}) => {
  if (!isOpen) return null;

  const handleNotifyWA = (trx: Transaction, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!trx.customerPhone) {
      alert('Nomor HP pelanggan tidak tersedia!');
      return;
    }
    const clean = toWhatsAppPhone(trx.customerPhone);
    const msg =
      `Halo Kak *${trx.customerName}*, cucian Anda (*${trx.id}*) sedang kami prioritaskan pengerjaannya di *${settings.storeName}*. Kami pastikan selesai secepatnya. Terima kasih! 🙏`;
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-100 my-auto max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Peringatan Tenggat Waktu</h3>
              <p className="text-[11px] text-slate-400">
                {urgentTransactions.length} cucian mendekati atau lewat estimasi pengerjaan
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-3.5 space-y-2.5 overflow-y-auto flex-1">
          {urgentTransactions.length === 0 ? (
            <div className="p-8 text-center text-xs space-y-2 text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="font-bold text-slate-800 text-sm">Semua Cucian Sesuai Jadwal!</p>
              <p className="text-[11px]">
                Tidak ada cucian aktif yang mendekati batas waktu atau terlambat.
              </p>
            </div>
          ) : (
            urgentTransactions.map((trx) => {
              const deadline = getDeadlineInfo(trx);
              const isOverdue = deadline.state === 'OVERDUE';

              return (
                <div
                  key={trx.id}
                  onClick={() => {
                    onClose();
                    onSelectTransaction(trx);
                  }}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer shadow-2xs space-y-2 ${
                    isOverdue
                      ? 'bg-rose-50/70 border-rose-200 hover:border-rose-400'
                      : 'bg-amber-50/70 border-amber-200 hover:border-amber-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-xs text-slate-900">{trx.id}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${deadline.badgeClass}`}
                    >
                      {deadline.label}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{trx.customerName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        <span>{formatPhone(trx.customerPhone)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                        {trx.laundryStatus}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 bg-white/80 p-2 rounded-xl border border-slate-100 truncate">
                    {trx.items.map((i) => `${i.quantity} ${i.unitName} ${i.serviceName}`).join(' • ')}
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-400">
                      Tenggat: {formatDate(trx.estimatedCompletionAt, true)}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleNotifyWA(trx, e)}
                        className="px-2 py-1 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-1"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>Chat WA</span>
                      </button>
                      <span className="font-bold text-blue-600 hover:underline">
                        Lihat Detail →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
