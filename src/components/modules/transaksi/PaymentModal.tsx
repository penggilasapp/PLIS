import React, { useState } from 'react';
import { AlertCircle, Check, CreditCard, DollarSign, X } from 'lucide-react';
import { PAYMENT_METHODS } from '../../../shared/constants';
import { formatCurrency } from '../../../shared/formatters';
import { AppUser, PaymentMethod, Transaction } from '../../../types';
import { paymentService } from '../../../services/paymentService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  currentUser: AppUser;
  onPaymentSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  transaction,
  currentUser,
  onPaymentSuccess,
}) => {
  const [amountStr, setAmountStr] = useState<string>(transaction.remainingAmount.toString());
  const [method, setMethod] = useState<PaymentMethod>('TUNAI');
  const [notes, setNotes] = useState<string>('');
  const [refNumber, setRefNumber] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handlePayFull = () => {
    setAmountStr(transaction.remainingAmount.toString());
  };

  const handlePayHalf = () => {
    setAmountStr(Math.round(transaction.remainingAmount / 2).toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const amt = parseFloat(amountStr);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Nominal pembayaran harus lebih besar dari Rp 0!');
      return;
    }

    if (amt > transaction.remainingAmount) {
      setErrorMsg(
        `Nominal (${formatCurrency(amt)}) melebihi sisa tagihan (${formatCurrency(
          transaction.remainingAmount
        )})!`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await paymentService.recordPayment(
        transaction.id,
        amt,
        method,
        currentUser,
        notes,
        refNumber
      );
      onPaymentSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mencatat pembayaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-100 my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">Catat Pembayaran</h3>
              <p className="text-xs text-slate-500 font-medium">Pembayaran tunai / non-tunai kasir</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">No. Nota:</span>
              <span className="font-mono font-bold text-slate-900">{transaction.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Pelanggan:</span>
              <span className="font-semibold text-slate-800">{transaction.customerName}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-slate-200/80 items-center">
              <span className="font-bold text-slate-700">Sisa Tagihan:</span>
              <span className="font-black text-rose-600 text-base">
                {formatCurrency(transaction.remainingAmount)}
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Nominal Bayar (Rp) *</label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handlePayFull}
                    className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold hover:bg-emerald-200 transition"
                  >
                    Lunaskan
                  </button>
                  <button
                    type="button"
                    onClick={handlePayHalf}
                    className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold hover:bg-amber-200 transition"
                  >
                    Bayar 50%
                  </button>
                </div>
              </div>
              <input
                type="number"
                min="1"
                max={transaction.remainingAmount}
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full px-3.5 py-2.5 text-lg font-black text-slate-900 border border-slate-300 rounded-xl focus:outline-hidden focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Metode Pembayaran
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="w-full px-3.5 py-2.5 text-sm font-semibold border border-slate-300 rounded-xl focus:outline-hidden focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-white transition"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {method !== 'TUNAI' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  No. Referensi / ID Transaksi Bank (Opsional)
                </label>
                <input
                  type="text"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  placeholder="Contoh: REF-92831093"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Catatan Pembayaran (Opsional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Dibayar saat serah terima pakaian"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition"
              />
            </div>

            <div className="pt-2 flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition active:scale-[0.98]"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition shadow-xs hover:shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                {isSubmitting ? 'Menyimpan...' : 'Konfirmasi Bayar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
