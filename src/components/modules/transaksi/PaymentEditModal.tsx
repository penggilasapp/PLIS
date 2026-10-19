import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, CreditCard, DollarSign, X } from 'lucide-react';
import { PAYMENT_METHODS } from '../../../shared/constants';
import { formatCurrency } from '../../../shared/formatters';
import { AppUser, PaymentMethod, PaymentRecord, Transaction } from '../../../types';
import { paymentService } from '../../../services/paymentService';

interface PaymentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentRecord | null;
  transaction: Transaction | null;
  currentUser: AppUser;
  onSuccess: () => void;
}

export const PaymentEditModal: React.FC<PaymentEditModalProps> = ({
  isOpen,
  onClose,
  payment,
  transaction,
  currentUser,
  onSuccess,
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('TUNAI');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (payment) {
      setAmountStr(payment.amount.toString());
      setMethod(payment.method);
      setNotes(payment.notes || '');
      setErrorMsg('');
    }
  }, [payment, isOpen]);

  if (!isOpen || !payment || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const amt = parseFloat(amountStr);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Nominal pembayaran harus lebih besar dari Rp 0!');
      return;
    }

    try {
      setIsSubmitting(true);
      await paymentService.updatePayment(
        payment.id,
        amt,
        method,
        notes.trim(),
        currentUser
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memperbarui pembayaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-100 my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">Edit Pembayaran (ID Terbit)</h3>
            <span className="font-mono text-xs text-blue-600 font-bold">{payment.id}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nominal Pembayaran (Rp) *
              </label>
              <input
                type="number"
                min="1"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full px-3.5 py-2.5 text-lg font-black text-slate-900 border border-slate-300 rounded-xl focus:outline-hidden focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Metode Pembayaran</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="w-full px-3.5 py-2.5 text-sm font-semibold border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Catatan Koreksi (Opsional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Koreksi uang kembalian atau bukti transfer"
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
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Pembayaran'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
