import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  DollarSign,
  Package,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { LAUNDRY_STATUS_FLOW, PERFUME_OPTIONS } from '../../../shared/constants';
import { formatCurrency, formatDate, getLaundryStatusDetails } from '../../../shared/formatters';
import { calculateOrderEstimatedDuration } from '../../../shared/calculations';
import {
  AppUser,
  LaundryService,
  LaundryStatus,
  Transaction,
  TransactionItem,
} from '../../../types';
import { transactionService } from '../../../services/transactionService';

interface TransactionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  services: LaundryService[];
  currentUser: AppUser;
  onSuccess: () => void;
}

export const TransactionEditModal: React.FC<TransactionEditModalProps> = ({
  isOpen,
  onClose,
  transaction,
  services,
  currentUser,
  onSuccess,
}) => {
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [discountNominal, setDiscountNominal] = useState<number>(0);
  const [status, setStatus] = useState<LaundryStatus>('DIPROSES');
  const [perfume, setPerfume] = useState('Ocean Fresh');
  const [specialNotes, setSpecialNotes] = useState('');
  const [editReason, setEditReason] = useState('');

  // Add Item inline selector
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [addQty, setAddQty] = useState('1');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (transaction) {
      setItems(JSON.parse(JSON.stringify(transaction.items)));
      setDiscountNominal(transaction.discount || 0);
      setStatus(transaction.laundryStatus);
      setPerfume(transaction.perfumePreference || 'Ocean Fresh');
      setSpecialNotes(transaction.specialNotes || '');
      setEditReason('');
      setErrorMsg('');
    }
  }, [transaction, isOpen]);

  if (!isOpen || !transaction) return null;

  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    const next = [...items];
    next[index].quantity = newQty;
    next[index].subtotal = Math.round(newQty * next[index].pricePerUnit);
    setItems(next);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('Transaksi harus memiliki minimal 1 item layanan.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleAddServiceItem = () => {
    if (!selectedServiceId) return;
    const srv = services.find((s) => s.id === selectedServiceId);
    if (!srv) return;

    const qty = parseFloat(addQty) || 1;
    const newItem: TransactionItem = {
      id: `ITEM-${Date.now()}-${items.length}`,
      serviceId: srv.id,
      serviceName: srv.name,
      categoryName: srv.categoryName,
      classificationName: srv.classificationName,
      unitName: srv.unitName,
      pricePerUnit: srv.pricePerUnit,
      quantity: qty,
      subtotal: Math.round(qty * srv.pricePerUnit),
    };

    setItems([...items, newItem]);
    setSelectedServiceId('');
    setAddQty('1');
  };

  // Calculations
  const calculatedSubtotal = items.reduce((acc, it) => acc + it.subtotal, 0);
  const finalTotal = Math.max(0, calculatedSubtotal - discountNominal);
  const orderEstimation = calculateOrderEstimatedDuration(items, services);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (items.length === 0) {
      setErrorMsg('Pilih minimal satu item layanan!');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Update items, discount nominal & notes
      await transactionService.updateTransactionDetails(
        transaction.id,
        items,
        discountNominal,
        specialNotes.trim(),
        perfume,
        currentUser,
        editReason.trim() || 'Koreksi item/diskon/catatan nota'
      );

      // 2. If status was changed, update status
      if (status !== transaction.laundryStatus) {
        await transactionService.updateStatus(
          transaction.id,
          status,
          currentUser,
          `Status diubah saat edit nota: ${transaction.laundryStatus} -> ${status}`
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan perubahan transaksi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-100 my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">Edit Transaksi (No. ID Terbit)</span>
              <span className="bg-blue-600 font-mono text-xs px-2 py-0.5 rounded font-bold">
                {transaction.id}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Pelanggan: {transaction.customerName} ({transaction.customerPhone})
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section: Status Cucian (Bisa di-edit bebas) */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <label className="block font-bold text-slate-800 uppercase tracking-wider">
              Status Pengerjaan Cucian
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LaundryStatus)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {LAUNDRY_STATUS_FLOW.map((st) => (
                <option key={st} value={st}>
                  {getLaundryStatusDetails(st).label} ({st})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">
              Status dapat diubah atau dikembalikan ke tahap sebelumnya jika terjadi kesalahan input kasir.
            </p>
          </div>

          {/* Section: Item Cucian & Kuantitas */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 uppercase tracking-wider">
                Daftar Item Layanan Cucian
              </label>
            </div>

            {/* Existing Items */}
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div
                  key={it.id || idx}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 truncate">{it.serviceName}</div>
                    <div className="text-[11px] text-slate-500">
                      @ {formatCurrency(it.pricePerUnit)} / {it.unitName}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="any"
                        min="0.1"
                        value={it.quantity}
                        onChange={(e) =>
                          handleUpdateItemQty(idx, parseFloat(e.target.value) || 1)
                        }
                        className="w-16 px-2 py-1 text-center font-bold border border-slate-300 rounded-lg text-xs"
                      />
                      <span className="text-[11px] text-slate-500 font-semibold">{it.unitName}</span>
                    </div>

                    <span className="font-black text-slate-900 text-xs min-w-[70px] text-right">
                      {formatCurrency(it.subtotal)}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                      title="Hapus Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Inline Add Item */}
            <div className="pt-2 border-t border-slate-200 flex gap-2">
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
              >
                <option value="">+ Tambah Layanan Lain...</option>
                {services.filter((s) => s.isActive).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({formatCurrency(s.pricePerUnit)}/{s.unitName})
                  </option>
                ))}
              </select>

              <input
                type="number"
                step="any"
                min="0.1"
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
                placeholder="Qty"
                className="w-16 px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-center font-bold"
              />

              <button
                type="button"
                onClick={handleAddServiceItem}
                disabled={!selectedServiceId}
                className="px-3 py-1.5 bg-blue-600 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-xs"
              >
                + Tambah
              </button>
            </div>

            {/* Live Service Estimation Info */}
            <div className="p-2.5 bg-blue-100/60 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-950">
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <div className="truncate">
                  <span className="font-bold">Estimasi Otomatis Layanan:</span>{' '}
                  <span className="font-extrabold text-blue-700">{orderEstimation.formattedDuration}</span>{' '}
                  <span className="text-[11px] text-blue-800 opacity-90">({orderEstimation.longestServiceName})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Diskon Nominal & Kalkulasi */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
            <label className="block font-bold text-blue-900 uppercase tracking-wider">
              Diskon & Kalkulasi Keuangan
            </label>

            <div className="space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between">
                <span>Subtotal Item:</span>
                <span className="font-bold">{formatCurrency(calculatedSubtotal)}</span>
              </div>

              {/* Diskon Nominal Input */}
              <div className="pt-1 border-t border-blue-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-800">Potongan Diskon (Nominal Rp):</span>
                  <div className="flex items-center gap-1 font-bold text-rose-600">
                    <span>- Rp</span>
                    <input
                      type="number"
                      min="0"
                      max={calculatedSubtotal}
                      value={discountNominal}
                      onChange={(e) =>
                        setDiscountNominal(Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-right focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Quick Nominal Discount Buttons */}
                <div className="flex flex-wrap gap-1 text-[10px] pt-1">
                  {[0, 5000, 10000, 15000, 20000, 50000].map((nom) => (
                    <button
                      key={nom}
                      type="button"
                      onClick={() => setDiscountNominal(Math.min(calculatedSubtotal, nom))}
                      className={`px-2 py-0.5 rounded-md font-bold transition border ${
                        discountNominal === nom
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {nom === 0 ? 'Tanpa Diskon' : `Rp ${nom.toLocaleString('id-ID')}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between font-black text-sm text-slate-900 pt-2 border-t border-blue-200">
                <span>Total Tagihan Baru:</span>
                <span className="text-blue-700">{formatCurrency(finalTotal)}</span>
              </div>

              <div className="flex justify-between text-[11px] text-slate-600">
                <span>Telah Dibayar (Pembayaran Sah):</span>
                <span className="font-semibold">{formatCurrency(transaction.paidAmount)}</span>
              </div>

              <div className="flex justify-between font-bold text-xs pt-1 border-t border-blue-200">
                <span>Sisa Tagihan Sekarang:</span>
                <span
                  className={
                    Math.max(0, finalTotal - transaction.paidAmount) > 0
                      ? 'text-rose-600 font-black'
                      : 'text-emerald-700 font-black'
                  }
                >
                  {formatCurrency(Math.max(0, finalTotal - transaction.paidAmount))}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Preferensi & Catatan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pilihan Parfum</label>
              <select
                value={perfume}
                onChange={(e) => setPerfume(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
              >
                {PERFUME_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Catatan Khusus</label>
              <input
                type="text"
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                placeholder="Noda, kancing, permintaan khusus"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Alasan Perubahan / Koreksi Nota *
            </label>
            <input
              type="text"
              required
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="Contoh: Koreksi berat timbangan atau salah pilih paket"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl font-medium focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2.5 pt-2">
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
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition shadow-xs hover:shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
