import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit,
  ExternalLink,
  MessageCircle,
  Package,
  Phone,
  Printer,
  Share2,
  Sparkles,
  Trash2,
  User,
  WashingMachine,
  X,
} from 'lucide-react';
import { LAUNDRY_STATUS_FLOW } from '../../../shared/constants';
import { getDeadlineInfo } from '../../../shared/deadline';
import {
  formatCurrency,
  formatDate,
  formatPhone,
  getLaundryStatusDetails,
  getPaymentMethodLabel,
  getPaymentStatusDetails,
  toWhatsAppPhone,
} from '../../../shared/formatters';
import {
  AppUser,
  BusinessSettings,
  LaundryService,
  LaundryStatus,
  PaymentRecord,
  Transaction,
} from '../../../types';
import { paymentService } from '../../../services/paymentService';
import { transactionService } from '../../../services/transactionService';
import { PaymentModal } from './PaymentModal';
import { PaymentEditModal } from './PaymentEditModal';
import { TransactionEditModal } from './TransactionEditModal';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  payments: PaymentRecord[];
  services: LaundryService[];
  currentUser: AppUser;
  settings: BusinessSettings;
  onOpenReceipt: (trx: Transaction) => void;
  onRefreshData: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  onClose,
  transaction,
  payments,
  services,
  currentUser,
  settings,
  onOpenReceipt,
  onRefreshData,
}) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditTrxModal, setShowEditTrxModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [showCustomStatusPrompt, setShowCustomStatusPrompt] = useState(false);
  const [targetStatus, setTargetStatus] = useState<LaundryStatus>('DIPROSES');

  if (!isOpen || !transaction) return null;

  const laundryDetails = getLaundryStatusDetails(transaction.laundryStatus);
  const paymentDetails = getPaymentStatusDetails(transaction.paymentStatus);
  const deadline = getDeadlineInfo(transaction);
  const trxPayments = payments.filter((p) => p.transactionId === transaction.id);

  // Status index
  const currentIndex = LAUNDRY_STATUS_FLOW.indexOf(transaction.laundryStatus);
  const nextStatus = currentIndex < LAUNDRY_STATUS_FLOW.length - 1 ? LAUNDRY_STATUS_FLOW[currentIndex + 1] : null;

  const handleUpdateStatus = async (newStatus: LaundryStatus, note?: string) => {
    try {
      setIsUpdatingStatus(true);
      await transactionService.updateStatus(transaction.id, newStatus, currentUser, note);
      onRefreshData();
      setShowCustomStatusPrompt(false);
      setStatusNote('');
    } catch (err: any) {
      alert(`Gagal mengubah status: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteTransaction = async () => {
    const confirmText = prompt(
      `Peringatan: Transaksi ${transaction.id} dan seluruh catatan pembayarannya akan dihapus secara permanen.\n\nKetik "HAPUS" untuk mengonfirmasi:`
    );
    if (confirmText === 'HAPUS') {
      try {
        await transactionService.deleteTransaction(transaction.id, currentUser, 'Dihapus oleh kasir/owner');
        alert(`Transaksi ${transaction.id} berhasil dihapus.`);
        onClose();
        onRefreshData();
      } catch (e: any) {
        alert(`Gagal menghapus transaksi: ${e.message}`);
      }
    }
  };

  const handleDeletePayment = async (payId: string) => {
    if (confirm(`Yakin ingin menghapus catatan pembayaran ${payId}? Status nota akan dihitung ulang secara otomatis.`)) {
      try {
        await paymentService.deletePayment(payId, currentUser);
        onRefreshData();
      } catch (e: any) {
        alert(`Gagal menghapus pembayaran: ${e.message}`);
      }
    }
  };

  // WhatsApp share
  const handleShareWhatsApp = () => {
    if (!transaction.customerPhone) {
      alert('Peringatan: Nomor telepon pelanggan tidak tersedia untuk nota ini!');
      return;
    }

    const waPhone = toWhatsAppPhone(transaction.customerPhone);
    const messageTemplate =
      settings.whatsappMessageTemplate ||
      'Halo Kak {customer_name}, terima kasih telah mencuci di {store_name}.\n' +
      'No. Nota: {order_number}\n' +
      'Total: {total_amount}\n' +
      'Sisa: {remaining_amount}\n' +
      'Status: {laundry_status}';

    const formattedMsg = messageTemplate
      .replace(/{customer_name}/g, transaction.customerName)
      .replace(/{store_name}/g, settings.storeName)
      .replace(/{order_number}/g, transaction.id)
      .replace(/{total_amount}/g, formatCurrency(transaction.finalAmount))
      .replace(/{paid_amount}/g, formatCurrency(transaction.paidAmount))
      .replace(/{remaining_amount}/g, formatCurrency(transaction.remainingAmount))
      .replace(/{laundry_status}/g, laundryDetails.label)
      .replace(/{estimated_date}/g, formatDate(transaction.estimatedCompletionAt, true));

    const encoded = encodeURIComponent(formattedMsg);
    const waUrl = `https://wa.me/${waPhone}?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
        <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-blue-300">
                  {transaction.id}
                </span>
                {transaction.isUrgent && (
                  <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase">
                    KILAT
                  </span>
                )}
                {/* Deadline Badge */}
                {transaction.laundryStatus !== 'SELESAI' && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${deadline.badgeClass}`}>
                    {deadline.label}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Dibuat: {formatDate(transaction.createdAt, true)} oleh {transaction.createdByUserName}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowEditTrxModal(true)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 transition"
                title="Edit Transaksi Ini"
              >
                <Edit className="w-4 h-4" />
              </button>

              <button
                onClick={handleDeleteTransaction}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900 text-rose-300 transition"
                title="Hapus Transaksi Ini"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={onClose}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* Status & Customer Summary Card */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">
                    {transaction.customerName}
                  </h4>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatPhone(transaction.customerPhone)}</span>
                  </div>
                  {transaction.customerAddress && (
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {transaction.customerAddress}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${laundryDetails.color}`}>
                    {laundryDetails.label}
                  </div>
                  <div className={`mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${paymentDetails.color}`}>
                    {paymentDetails.label}
                  </div>
                </div>
              </div>

              {/* Status Pipeline & Edit Bebas Status */}
              <div className="pt-2 border-t border-slate-200">
                <div className="text-[11px] font-bold text-slate-600 mb-2 flex items-center justify-between">
                  <span>Pilih / Edit Status Cucian:</span>
                  {nextStatus && (
                    <button
                      onClick={() => handleUpdateStatus(nextStatus, `Status dinaikkan ke ${nextStatus}`)}
                      disabled={isUpdatingStatus}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 underline"
                    >
                      Lanjut ke: {getLaundryStatusDetails(nextStatus).label} →
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                  {LAUNDRY_STATUS_FLOW.map((st, idx) => {
                    const isCurrent = transaction.laundryStatus === st;
                    const stDetails = getLaundryStatusDetails(st);

                    return (
                      <button
                        key={st}
                        onClick={() => {
                          setTargetStatus(st);
                          setShowCustomStatusPrompt(true);
                        }}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center transition ${
                          isCurrent
                            ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="w-2 h-2 rounded-full mb-1 bg-current" />
                        <span className="truncate w-full">{stDetails.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Note Prompt */}
              {showCustomStatusPrompt && (
                <div className="mt-2 p-2.5 bg-white rounded-xl border border-blue-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800">
                    Ubah Status ke: {getLaundryStatusDetails(targetStatus).label}
                  </div>
                  <input
                    type="text"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Catatan perubahan status (misal: Selesai di-packing di rak C-2)"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setShowCustomStatusPrompt(false)}
                      className="flex-1 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(targetStatus, statusNote)}
                      disabled={isUpdatingStatus}
                      className="flex-1 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold"
                    >
                      Simpan Status
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Items Breakdown Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-bold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-600" />
                  Rincian Item Cucian
                </h5>
                <button
                  onClick={() => setShowEditTrxModal(true)}
                  className="text-blue-600 hover:underline font-bold text-xs flex items-center gap-1"
                >
                  <Edit className="w-3 h-3" />
                  Edit Item / Diskon
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden text-xs">
                {transaction.items.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800">{item.serviceName}</div>
                      <div className="text-[11px] text-slate-500">
                        {item.quantity} {item.unitName} × {formatCurrency(item.pricePerUnit)}
                      </div>
                      {item.notes && (
                        <div className="text-[10px] text-amber-700 italic mt-0.5">
                          Ket: {item.notes}
                        </div>
                      )}
                    </div>
                    <div className="font-black text-slate-900">
                      {formatCurrency(item.subtotal)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({transaction.items.length} item):</span>
                <span>{formatCurrency(transaction.totalAmount)}</span>
              </div>
              {transaction.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Potongan Diskon (Nominal):</span>
                  <span>- {formatCurrency(transaction.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-blue-200">
                <span>Total Tagihan:</span>
                <span className="text-blue-700">{formatCurrency(transaction.finalAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-700">
                <span>Total Telah Dibayar:</span>
                <span className="text-emerald-700">{formatCurrency(transaction.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-blue-200">
                <span className="text-slate-800">Sisa Piutang:</span>
                <span className={transaction.remainingAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                  {formatCurrency(transaction.remainingAmount)} {transaction.remainingAmount === 0 ? '(LUNAS)' : ''}
                </span>
              </div>
            </div>

            {/* Payment Records History (Bisa di-edit & dihapus) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-bold text-xs uppercase tracking-wider text-slate-600">
                  Riwayat Pembayaran Sah ({trxPayments.length})
                </h5>
                {transaction.remainingAmount > 0 && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="text-emerald-600 hover:text-emerald-700 font-bold capitalize text-xs"
                  >
                    + Catat Pembayaran
                  </button>
                )}
              </div>

              {trxPayments.length === 0 ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                  Belum ada pembayaran sah tercatat
                </div>
              ) : (
                <div className="space-y-1.5">
                  {trxPayments.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{formatCurrency(p.amount)}</span>
                          <span className="font-mono text-[10px] text-slate-400">({p.id})</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {getPaymentMethodLabel(p.method)} • {formatDate(p.paymentDate, true)}
                        </div>
                        {p.notes && <div className="text-[10px] text-slate-400">{p.notes}</div>}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingPayment(p)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded"
                          title="Edit Pembayaran"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePayment(p.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Hapus Pembayaran"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status History Audit Log */}
            <div>
              <h5 className="font-bold text-xs uppercase tracking-wider text-slate-600 mb-2">
                Riwayat Perubahan Status
              </h5>
              <div className="space-y-1 text-xs">
                {transaction.statusHistory.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800">
                        {getLaundryStatusDetails(h.status).label}
                      </span>
                      <span className="text-[11px] text-slate-500 ml-1.5">
                        ({formatDate(h.timestamp, true)} - {h.updatedByUserName})
                      </span>
                      {h.note && <div className="text-[11px] text-slate-500 mt-0.5">{h.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="p-4 bg-slate-50/90 border-t border-slate-200 shrink-0 flex flex-wrap gap-2.5">
            <button
              onClick={() => {
                onOpenReceipt(transaction);
              }}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-1.5 shadow-xs hover:shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Nota Thermal 58mm</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-1.5 shadow-xs hover:shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Kirim WhatsApp</span>
            </button>

            {transaction.remainingAmount > 0 && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-1.5 shadow-xs hover:shadow-sm"
              >
                <DollarSign className="w-4 h-4" />
                <span>Pelunasan Tagihan ({formatCurrency(transaction.remainingAmount)})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        transaction={transaction}
        currentUser={currentUser}
        onPaymentSuccess={() => {
          onRefreshData();
        }}
      />

      {/* Edit Payment Modal */}
      <PaymentEditModal
        isOpen={!!editingPayment}
        onClose={() => setEditingPayment(null)}
        payment={editingPayment}
        transaction={transaction}
        currentUser={currentUser}
        onSuccess={() => {
          onRefreshData();
        }}
      />

      {/* Edit Transaction Modal */}
      <TransactionEditModal
        isOpen={showEditTrxModal}
        onClose={() => setShowEditTrxModal(false)}
        transaction={transaction}
        services={services}
        currentUser={currentUser}
        onSuccess={() => {
          onRefreshData();
        }}
      />
    </>
  );
};
