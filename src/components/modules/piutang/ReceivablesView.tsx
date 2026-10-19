import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  DollarSign,
  MessageCircle,
  Phone,
  Receipt,
  Search,
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  formatPhone,
  toWhatsAppPhone,
} from '../../../shared/formatters';
import { AppUser, BusinessSettings, Transaction } from '../../../types';
import { PaymentModal } from '../transaksi/PaymentModal';

interface ReceivablesViewProps {
  transactions: Transaction[];
  currentUser: AppUser;
  settings: BusinessSettings;
  onRefreshData: () => void;
}

export const ReceivablesView: React.FC<ReceivablesViewProps> = ({
  transactions,
  currentUser,
  settings,
  onRefreshData,
}) => {
  const [search, setSearch] = useState('');
  const [selectedTrxForPay, setSelectedTrxForPay] = useState<Transaction | null>(null);

  // All unpaid transactions
  const unpaidTransactions = transactions.filter((t) => t.remainingAmount > 0);

  const filtered = unpaidTransactions.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.id.toLowerCase().includes(q) ||
      t.customerName.toLowerCase().includes(q) ||
      t.customerPhone.includes(q)
    );
  });

  const totalReceivables = filtered.reduce((acc, t) => acc + t.remainingAmount, 0);

  const handleSendReminderWA = (trx: Transaction) => {
    if (!trx.customerPhone) {
      alert('Nomor HP pelanggan tidak tersedia!');
      return;
    }
    const clean = toWhatsAppPhone(trx.customerPhone);
    const msg =
      `Halo Kak *${trx.customerName}*,\n\n` +
      `Mengingatkan informasi tagihan cucian di *${settings.storeName}*:\n` +
      `📋 No. Nota: *${trx.id}*\n` +
      `💰 Total Tagihan: ${formatCurrency(trx.finalAmount)}\n` +
      `💳 Telah Dibayar: ${formatCurrency(trx.paidAmount)}\n` +
      `⚠️ *Sisa Tagihan:* *${formatCurrency(trx.remainingAmount)}*\n\n` +
      `Pembayaran dapat dilakukan secara tunai di outlet kami atau transfer/QRIS. Terima kasih banyak ya Kak! 🙏`;

    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-3.5 pb-24">
      {/* Header Metric Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Buku Piutang & Pelunasan</h3>
              <p className="text-[11px] text-slate-500">
                {unpaidTransactions.length} nota laundry belum lunas
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-semibold block">Total Piutang:</span>
            <span className="text-base sm:text-lg font-black text-rose-600 block">
              {formatCurrency(totalReceivables)}
            </span>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pelanggan atau nomor nota yang berpiutang..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
          />
        </div>
      </div>

      {/* Unpaid Cards List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400 space-y-1">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-bold text-slate-700">Semua Tagihan Lunas!</p>
            <p>Tidak ada piutang yang tertunggak saat ini.</p>
          </div>
        ) : (
          filtered.map((trx) => (
            <div
              key={trx.id}
              className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{trx.customerName}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{formatPhone(trx.customerPhone)}</span>
                    <span>•</span>
                    <span>Nota: {trx.id}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-medium block">Sisa Tagihan:</span>
                  <span className="text-base font-black text-rose-600 block">
                    {formatCurrency(trx.remainingAmount)}
                  </span>
                </div>
              </div>

              {/* Progress Bar of Payment */}
              <div className="space-y-1">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (trx.paidAmount / trx.finalAmount) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Dibayar: {formatCurrency(trx.paidAmount)}</span>
                  <span>Total Nota: {formatCurrency(trx.finalAmount)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleSendReminderWA(trx)}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl flex items-center gap-1 transition"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Kirim Pengingat WA</span>
                </button>

                <button
                  onClick={() => setSelectedTrxForPay(trx)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1 shadow-xs transition"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Pelunasan / Bayar</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedTrxForPay && (
        <PaymentModal
          isOpen={!!selectedTrxForPay}
          onClose={() => setSelectedTrxForPay(null)}
          transaction={selectedTrxForPay}
          currentUser={currentUser}
          onPaymentSuccess={() => {
            onRefreshData();
            setSelectedTrxForPay(null);
          }}
        />
      )}
    </div>
  );
};
