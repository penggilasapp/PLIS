import React, { useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  DollarSign,
  Edit,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  Receipt,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  formatPhone,
  getLaundryStatusDetails,
  getPaymentStatusDetails,
  toWhatsAppPhone,
} from '../../../shared/formatters';
import { Customer, Transaction } from '../../../types';
import { customerService } from '../../../services/customerService';

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  transactions: Transaction[];
  onEditCustomer: (c: Customer) => void;
  onSelectTransaction: (trx: Transaction) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  onClose,
  customer,
  transactions,
  onEditCustomer,
  onSelectTransaction,
}) => {
  const [stats, setStats] = useState<{
    totalOrders: number;
    totalSpent: number;
    totalPaid: number;
    totalReceivable: number;
    lastOrderDate?: string;
  } | null>(null);

  useEffect(() => {
    if (customer) {
      customerService.getCustomerStats(customer.id).then(setStats);
    }
  }, [customer, transactions]);

  if (!isOpen || !customer) return null;

  const customerTransactions = transactions.filter((t) => t.customerId === customer.id);

  const handleOpenWhatsApp = () => {
    const clean = toWhatsAppPhone(customer.phone);
    const text = encodeURIComponent(
      `Halo Kak ${customer.name}, ini dari layanan PLIS Laundry. Ada yang bisa kami bantu?`
    );
    window.open(`https://wa.me/${clean}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 my-auto max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-lg">
              {customer.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">{customer.name}</h3>
              <p className="text-xs text-blue-100 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" />
                {formatPhone(customer.phone)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onClose();
                onEditCustomer(customer);
              }}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition"
              title="Edit Data Pelanggan"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Contact & Address Details */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            {customer.address && (
              <div className="flex items-start gap-2 text-slate-700">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>{customer.address}</span>
              </div>
            )}
            {customer.notes && (
              <div className="text-slate-600 italic bg-white p-2 rounded-lg border border-slate-100">
                Catatan: {customer.notes}
              </div>
            )}
            <div className="text-[11px] text-slate-400">
              Terdaftar sejak: {formatDate(customer.createdAt, false)}
            </div>
          </div>

          {/* Customer Statistics Card */}
          {stats && (
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 bg-blue-50/80 border border-blue-200/80 rounded-xl">
                <span className="text-[10px] text-blue-700 font-bold block">Total Order</span>
                <span className="text-base font-black text-blue-900 mt-0.5 block">
                  {stats.totalOrders} kali
                </span>
              </div>

              <div className="p-2.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl">
                <span className="text-[10px] text-emerald-700 font-bold block">Total Belanja</span>
                <span className="text-xs font-black text-emerald-900 mt-1 block truncate">
                  {formatCurrency(stats.totalSpent)}
                </span>
              </div>

              <div className="p-2.5 bg-rose-50/80 border border-rose-200/80 rounded-xl">
                <span className="text-[10px] text-rose-700 font-bold block">Sisa Piutang</span>
                <span className="text-xs font-black text-rose-700 mt-1 block truncate">
                  {formatCurrency(stats.totalReceivable)}
                </span>
              </div>
            </div>
          )}

          {/* WhatsApp Direct Chat Button */}
          <button
            onClick={handleOpenWhatsApp}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Kirim Pesan WhatsApp Langsung</span>
          </button>

          {/* Transaction History */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-blue-600" />
              Riwayat Cucian ({customerTransactions.length})
            </h4>

            {customerTransactions.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400">
                Belum ada transaksi untuk pelanggan ini
              </div>
            ) : (
              <div className="space-y-2">
                {customerTransactions.map((trx) => {
                  const laundryDetails = getLaundryStatusDetails(trx.laundryStatus);
                  const payDetails = getPaymentStatusDetails(trx.paymentStatus);

                  return (
                    <div
                      key={trx.id}
                      onClick={() => {
                        onClose();
                        onSelectTransaction(trx);
                      }}
                      className="p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 transition cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{trx.id}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${laundryDetails.color}`}>
                            {laundryDetails.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {formatDate(trx.createdAt, true)}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate mt-0.5">
                          {trx.items.map((i) => `${i.quantity} ${i.unitName} ${i.serviceName}`).join(', ')}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-black text-slate-900">
                          {formatCurrency(trx.finalAmount)}
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border mt-1 inline-block ${payDetails.color}`}>
                          {payDetails.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
