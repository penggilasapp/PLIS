import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Coins,
  Package,
  Plus,
  Search,
  Sparkles,
  Trash2,
  User,
  UserPlus,
} from 'lucide-react';
import { PERFUME_OPTIONS } from '../../../shared/constants';
import { formatCurrency } from '../../../shared/formatters';
import {
  AppUser,
  Customer,
  LaundryService,
  PaymentMethod,
  ServiceCategory,
  Transaction,
} from '../../../types';
import {
  addDiscountChip,
  calculateDiscount,
  calculateFinalTotal,
  calculatePaymentDetails,
  calculateQuickDP,
  calculateSubtotal,
  validateInitialPayment,
} from '../../../shared/calculations';
import { customerService } from '../../../services/customerService';
import { CreateTransactionDTO, transactionService } from '../../../services/transactionService';

interface TransactionFormViewProps {
  customers: Customer[];
  services: LaundryService[];
  categories: ServiceCategory[];
  currentUser: AppUser;
  onCancel: () => void;
  onSuccess: (trx: Transaction) => void;
}

interface DraftItem {
  serviceId: string;
  serviceName: string;
  categoryName: string;
  classificationName: string;
  unitName: string;
  pricePerUnit: number;
  quantity: number;
  notes?: string;
}

export const TransactionFormView: React.FC<TransactionFormViewProps> = ({
  customers,
  services,
  categories,
  currentUser,
  onCancel,
  onSuccess,
}) => {
  // Step / Tab
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);

  // Quick Customer inputs
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [phoneDuplicateWarning, setPhoneDuplicateWarning] = useState<string | null>(null);

  // Items
  const [items, setItems] = useState<DraftItem[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [inputQuantity, setInputQuantity] = useState<string>('1');
  const [itemNotes, setItemNotes] = useState<string>('');

  // Discount & Payment
  const [discount, setDiscount] = useState<number>(0);
  const [paymentAmount, setPaymentAmount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TUNAI');
  const [perfume, setPerfume] = useState<string>('Ocean Fresh (Segar & Elegan)');
  const [specialNotes, setSpecialNotes] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState<boolean>(false);
  const [durationHours, setDurationHours] = useState<number>(24);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Active services
  const activeServices = services.filter((s) => s.isActive);

  // Phone duplication check
  const handlePhoneChange = (val: string) => {
    setNewCustPhone(val);
    const clean = val.replace(/\D/g, '');
    if (clean.length >= 8) {
      const match = customers.find((c) => c.phone.replace(/\D/g, '') === clean);
      if (match) {
        setPhoneDuplicateWarning(
          `Nomor telepon ini sudah terdaftar atas nama "${match.name}". Tetap lanjutkan atau pilih pelanggan yang sudah ada.`
        );
      } else {
        setPhoneDuplicateWarning(null);
      }
    } else {
      setPhoneDuplicateWarning(null);
    }
  };

  // Add Item to draft
  const handleAddItem = () => {
    if (!selectedServiceId) return;
    const srv = services.find((s) => s.id === selectedServiceId);
    if (!srv) return;

    const qty = parseFloat(inputQuantity);
    if (isNaN(qty) || qty <= 0) {
      alert('Jumlah harus lebih besar dari 0');
      return;
    }

    const newItem: DraftItem = {
      serviceId: srv.id,
      serviceName: srv.name,
      categoryName: srv.categoryName,
      classificationName: srv.classificationName,
      unitName: srv.unitName,
      pricePerUnit: srv.pricePerUnit,
      quantity: qty,
      notes: itemNotes.trim(),
    };

    setItems([...items, newItem]);
    // reset selection
    setInputQuantity('1');
    setItemNotes('');
  };

  const handleRemoveItem = (index: number) => {
    const nextItems = items.filter((_, i) => i !== index);
    setItems(nextItems);
    const newSubtotal = calculateSubtotal(nextItems);
    if (discount > newSubtotal) {
      setDiscount(newSubtotal);
    }
  };

  // Calculations using tested domain calculation functions
  const calculatedSubtotal = calculateSubtotal(items);
  const effectiveDiscount = calculateDiscount(calculatedSubtotal, discount);
  const calculatedTotal = calculateFinalTotal(calculatedSubtotal, effectiveDiscount);
  const paymentDetails = calculatePaymentDetails(calculatedTotal, paymentAmount);
  const enteredPay = paymentDetails.enteredPayment;
  const calculatedRemaining = paymentDetails.remainingAmount;
  const isOverpaid = paymentDetails.isOverpaid;

  // Set Pay Full
  const handlePayFull = () => {
    setPaymentAmount(calculatedTotal.toString());
  };

  // Set Pay DP 50%
  const handlePayDP = () => {
    setPaymentAmount(calculateQuickDP(calculatedTotal, 50).toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    let custId = selectedCustomerId;
    let custName = '';
    let custPhone = '';
    let custAddress = '';

    if (showNewCustomerForm) {
      if (!newCustName.trim()) {
        setErrorMessage('Nama pelanggan baru wajib diisi!');
        return;
      }
      if (!newCustPhone.trim()) {
        setErrorMessage('Nomor telepon pelanggan baru wajib diisi!');
        return;
      }

      try {
        const { customer } = await customerService.create(
          {
            name: newCustName.trim(),
            phone: newCustPhone.trim(),
            address: newCustAddress.trim(),
          },
          currentUser
        );
        custId = customer.id;
        custName = customer.name;
        custPhone = customer.phone;
        custAddress = customer.address || '';
      } catch (err: any) {
        setErrorMessage(err.message || 'Gagal menyimpan pelanggan baru');
        return;
      }
    } else {
      const selected = customers.find((c) => c.id === selectedCustomerId);
      if (!selected) {
        setErrorMessage('Silakan pilih pelanggan terlebih dahulu!');
        return;
      }
      custId = selected.id;
      custName = selected.name;
      custPhone = selected.phone;
      custAddress = selected.address || '';
    }

    if (items.length === 0) {
      setErrorMessage('Pilih minimal 1 item layanan cucian!');
      return;
    }

    const paymentValidation = validateInitialPayment(calculatedTotal, enteredPay);
    if (!paymentValidation.isValid) {
      setErrorMessage(paymentValidation.errorMessage || 'Pembayaran awal tidak boleh melebihi total tagihan!');
      return;
    }

    try {
      setIsSubmitting(true);
      const dto: CreateTransactionDTO = {
        customerId: custId,
        customerName: custName,
        customerPhone: custPhone,
        customerAddress: custAddress,
        items,
        discount: effectiveDiscount,
        initialPaymentAmount: enteredPay,
        initialPaymentMethod: paymentMethod,
        perfumePreference: perfume,
        specialNotes,
        isUrgent,
        estimatedCompletionHours: durationHours,
      };

      const created = await transactionService.create(dto, currentUser);
      onSuccess(created);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan transaksi');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered customer search
  const filteredCustomers = customerSearch.trim()
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.phone.includes(customerSearch)
      )
    : customers.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md p-4 sm:p-6 max-w-2xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            type="button"
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Transaksi Laundry Baru
            </h2>
            <p className="text-xs text-slate-500">
              Kasir: {currentUser.name} ({currentUser.role})
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-5">
        {/* SECTION 1: PELANGGAN */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-600" />
              1. Data Pelanggan
            </label>
            <button
              type="button"
              onClick={() => {
                setShowNewCustomerForm(!showNewCustomerForm);
                setSelectedCustomerId('');
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              {showNewCustomerForm ? (
                <span>← Pilih Dari Daftar</span>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Pelanggan Baru</span>
                </>
              )}
            </button>
          </div>

          {!showNewCustomerForm ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ketik nama atau nomor HP pelanggan..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1.5 pt-1">
                {filteredCustomers.map((c) => {
                  const isSelected = selectedCustomerId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCustomerId(c.id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/80 font-bold text-blue-900'
                          : 'border-slate-200 bg-white hover:bg-slate-100/70 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        <div className="text-[11px] text-slate-500">{c.phone}</div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 bg-white p-3 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="Contoh: Ibu Rina Susanti"
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  Nomor WhatsApp / HP *
                </label>
                <input
                  type="tel"
                  value={newCustPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="0812xxxxxxxx"
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                {phoneDuplicateWarning && (
                  <p className="mt-1 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-md border border-amber-200 flex items-start gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{phoneDuplicateWarning}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  Alamat (Opsional)
                </label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="Alamat rumah / kos / apartemen"
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: MASTER LAYANAN & ITEM CUCIAN */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-blue-600" />
            2. Pilih Layanan Laundry
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-7">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Layanan
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => {
                  setSelectedServiceId(e.target.value);
                  const found = services.find((s) => s.id === e.target.value);
                  if (found) {
                    setDurationHours(found.estimatedDurationHours);
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Pilih Layanan --</option>
                {activeServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.categoryName}] {s.name} - {formatCurrency(s.pricePerUnit)}/{s.unitName}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Jumlah Satuan
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                value={inputQuantity}
                onChange={(e) => setInputQuantity(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-center focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2 flex items-end">
              <button
                type="button"
                onClick={handleAddItem}
                disabled={!selectedServiceId}
                className="w-full py-2 bg-blue-600 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 hover:bg-blue-700 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Tambah
              </button>
            </div>
          </div>

          {/* Added Items Table */}
          {items.length > 0 && (
            <div className="mt-3 bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {items.map((it, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 truncate">{it.serviceName}</div>
                    <div className="text-[11px] text-slate-500">
                      {it.quantity} {it.unitName} × {formatCurrency(it.pricePerUnit)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-black text-slate-900">
                      {formatCurrency(Math.round(it.quantity * it.pricePerUnit))}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 3: PREFERENSI & ESTIMASI */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-600" />
            3. Preferensi & Catatan Khusus
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Pilihan Aroma Parfum
              </label>
              <select
                value={perfume}
                onChange={(e) => setPerfume(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {PERFUME_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Estimasi Selesai (Jam)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={durationHours}
                  onChange={(e) => setDurationHours(parseInt(e.target.value) || 24)}
                  className="w-20 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-center focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-500">
                  {durationHours >= 24 ? `(~${Math.round(durationHours / 24)} Hari)` : 'Jam'}
                </span>
                <label className="ml-auto flex items-center gap-1.5 cursor-pointer text-xs font-bold text-rose-700">
                  <input
                    type="checkbox"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600"
                  />
                  Prioritas Kilat
                </label>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Catatan Khusus Cucian (Bercak noda, kancing, dll)
              </label>
              <input
                type="text"
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                placeholder="Contoh: Kemeja putih ada noda tinta di kerah"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: PEMBAYARAN */}
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-blue-600" />
            4. Total & Pembayaran Awal
          </label>

          {/* Subtotal & Discount Row */}
          <div className="space-y-1.5 text-xs text-slate-700">
            <div className="flex justify-between">
              <span>Subtotal Item:</span>
              <span className="font-bold">{formatCurrency(calculatedSubtotal)}</span>
            </div>
            <div className="flex flex-col gap-1.5 pt-1 border-t border-blue-200/80">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-800">Diskon (Nominal Rp):</span>
                <div className="flex items-center gap-1 font-bold text-rose-600">
                  <span>- Rp</span>
                  <input
                    type="number"
                    min="0"
                    max={calculatedSubtotal}
                    value={discount || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                      setDiscount(calculateDiscount(calculatedSubtotal, val));
                    }}
                    placeholder="0"
                    className="w-28 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-right text-rose-600 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>
              <div className="flex gap-1 justify-end flex-wrap text-[10px]">
                {[5000, 10000, 20000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDiscount((prev) => addDiscountChip(prev, amt, calculatedSubtotal))}
                    className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                  >
                    +{formatCurrency(amt)}
                  </button>
                ))}
                {discount > 0 && (
                  <button
                    type="button"
                    onClick={() => setDiscount(0)}
                    className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold hover:bg-rose-200"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            <div className="pt-2 border-t border-blue-200/80 flex justify-between items-center text-sm font-black text-slate-900">
              <span>Total Tagihan:</span>
              <span className="text-base text-blue-700">{formatCurrency(calculatedTotal)}</span>
            </div>
          </div>

          {/* Payment input */}
          <div className="pt-2 border-t border-blue-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">Uang Diterima Sekarang:</label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handlePayFull}
                  className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition"
                >
                  Bayar Lunas
                </button>
                <button
                  type="button"
                  onClick={handlePayDP}
                  className="px-2 py-0.5 rounded-lg bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-700 transition"
                >
                  DP 50%
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <input
                  type="number"
                  min="0"
                  max={calculatedTotal}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0"
                  className={`w-full px-3 py-2 bg-white border rounded-xl text-base font-black text-slate-900 focus:outline-hidden focus:ring-2 ${
                    isOverpaid ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:ring-blue-500'
                  }`}
                />
              </div>

              <div>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TUNAI">Tunai (Cash)</option>
                  <option value="QRIS">QRIS</option>
                  <option value="TRANSFER_BANK">Transfer Bank</option>
                  <option value="E_WALLET">E-Wallet</option>
                </select>
              </div>
            </div>

            {/* Overpayment Warning */}
            {isOverpaid && (
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-1.5 text-xs text-rose-700 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>
                  Nominal pembayaran ({formatCurrency(enteredPay)}) melebihi total tagihan (Kelebihan {formatCurrency(paymentDetails.overpaidAmount)}).
                </span>
              </div>
            )}

            {/* Remaining amount badge */}
            <div className="flex justify-between items-center text-xs pt-1 font-semibold">
              <span className="text-slate-600">Sisa Tagihan (Piutang):</span>
              <span className={calculatedRemaining > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                {formatCurrency(calculatedRemaining)}{' '}
                {calculatedRemaining === 0 ? '(LUNAS)' : `(${paymentDetails.paymentStatus})`}
              </span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition"
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={isSubmitting || items.length === 0}
            className="flex-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            {isSubmitting ? 'Menyimpan...' : 'Simpan & Terbitkan Nota'}
          </button>
        </div>
      </form>
    </div>
  );
};
