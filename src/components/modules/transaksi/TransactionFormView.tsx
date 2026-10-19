import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Edit2,
  Minus,
  Package,
  Plus,
  Receipt,
  Search,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Zap,
} from 'lucide-react';
import { PERFUME_OPTIONS } from '../../../shared/constants';
import { formatCurrency, formatDate, toWhatsAppPhone } from '../../../shared/formatters';
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
  calculateOrderEstimatedDuration,
  calculatePaymentDetails,
  calculateQuickDP,
  calculateSubtotal,
  calculateTargetCompletionDate,
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

export interface DraftItem {
  serviceId: string;
  serviceName: string;
  categoryName: string;
  classificationName: string;
  unitName: string;
  pricePerUnit: number;
  quantity: number;
  notes?: string;
}

type StepType = 1 | 2 | 3;

export const TransactionFormView: React.FC<TransactionFormViewProps> = ({
  customers,
  services,
  categories,
  currentUser,
  onCancel,
  onSuccess,
}) => {
  // Wizard Step state: 1: Detail Pesanan & Pelanggan, 2: Pilih Layanan & Timbangan, 3: Ringkasan & Pembayaran
  const [currentStep, setCurrentStep] = useState<StepType>(1);

  // Step 1: Customer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);

  // New Customer inline form
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [phoneDuplicateWarning, setPhoneDuplicateWarning] = useState<string | null>(null);

  // Step 1: Preferences & Priority
  const [perfume, setPerfume] = useState<string>('Ocean Fresh');
  const [isUrgent, setIsUrgent] = useState<boolean>(false);
  const [specialNotes, setSpecialNotes] = useState<string>('');

  // Step 2: Service & Items selection
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [serviceSearch, setServiceSearch] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [inputQuantity, setInputQuantity] = useState<string>('1');
  const [itemNotes, setItemNotes] = useState<string>('');
  const [items, setItems] = useState<DraftItem[]>([]);

  // Step 3: Discount & Payment
  const [discount, setDiscount] = useState<number>(0);
  const [paymentAmount, setPaymentAmount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TUNAI');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Filter active services
  const activeServices = services.filter((s) => s.isActive);

  // Filtered services for Step 2
  const filteredServices = activeServices.filter((s) => {
    const matchCategory =
      selectedCategoryFilter === 'ALL' || s.categoryId === selectedCategoryFilter;
    const matchSearch =
      !serviceSearch.trim() ||
      s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      s.categoryName.toLowerCase().includes(serviceSearch.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Selected customer object (if picking existing)
  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomerId);

  // Customer phone duplicate detection
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

  // --- ITEM SELECTION & CART LOGIC ---
  const handleSelectServiceCard = (srv: LaundryService) => {
    setSelectedServiceId(srv.id);
  };

  const handleAdjustQuantity = (delta: number) => {
    const current = parseFloat(inputQuantity) || 0;
    const next = Math.max(0.1, Math.round((current + delta) * 10) / 10);
    setInputQuantity(next.toString());
  };

  const handleSetPresetQuantity = (qty: number) => {
    setInputQuantity(qty.toString());
  };

  const handleAddItemToCart = () => {
    if (!selectedServiceId) return;
    const srv = services.find((s) => s.id === selectedServiceId);
    if (!srv) return;

    const qty = parseFloat(inputQuantity);
    if (isNaN(qty) || qty <= 0) {
      alert('Jumlah kuantitas cucian harus lebih dari 0!');
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
    // Reset quantity input to 1 for next item
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

  // --- CALCULATIONS (Tested Pure Domain Functions) ---
  const calculatedSubtotal = calculateSubtotal(items);
  const effectiveDiscount = calculateDiscount(calculatedSubtotal, discount);
  const calculatedTotal = calculateFinalTotal(calculatedSubtotal, effectiveDiscount);
  const paymentDetails = calculatePaymentDetails(calculatedTotal, paymentAmount);
  const enteredPay = paymentDetails.enteredPayment;
  const calculatedRemaining = paymentDetails.remainingAmount;
  const isOverpaid = paymentDetails.isOverpaid;

  // Pure automatic service-derived estimation (No manual input, follows Master Layanan)
  const orderEstimation = calculateOrderEstimatedDuration(items, services);
  const targetCompletionDate = calculateTargetCompletionDate(orderEstimation.durationHours);

  // Preset Payment Actions
  const handlePayFull = () => {
    setPaymentAmount(calculatedTotal.toString());
  };

  const handlePayDP = () => {
    setPaymentAmount(calculateQuickDP(calculatedTotal, 50).toString());
  };

  const handlePayLater = () => {
    setPaymentAmount('0');
  };

  // --- STEP TRANSITION VALIDATIONS ---
  const handleGoToStep2 = () => {
    setErrorMessage('');
    if (showNewCustomerForm) {
      if (!newCustName.trim()) {
        setErrorMessage('Nama pelanggan baru wajib diisi!');
        return;
      }
      if (!newCustPhone.trim()) {
        setErrorMessage('Nomor telepon / WhatsApp pelanggan baru wajib diisi!');
        return;
      }
    } else {
      if (!selectedCustomerId) {
        setErrorMessage('Silakan pilih salah satu pelanggan terlebih dahulu!');
        return;
      }
    }
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoToStep3 = () => {
    setErrorMessage('');
    if (items.length === 0) {
      setErrorMessage('Pilih minimal 1 item layanan cucian untuk melanjutkan ke pembayaran!');
      return;
    }
    // Default initial payment to full if first time reaching step 3
    if (paymentAmount === '0' && enteredPay === 0) {
      setPaymentAmount(calculatedTotal.toString());
    }
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- FINAL TRANSACTION SUBMIT ---
  const handleSubmitTransaction = async (e: React.FormEvent) => {
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
      setErrorMessage(
        paymentValidation.errorMessage || 'Pembayaran awal tidak boleh melebihi total tagihan!'
      );
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
        estimatedCompletionHours: orderEstimation.durationHours,
      };

      const created = await transactionService.create(dto, currentUser);
      onSuccess(created);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan transaksi');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered customer search list for Step 1
  const filteredCustomers = customerSearch.trim()
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.phone.includes(customerSearch)
      )
    : customers.slice(0, 6);

  const selectedActiveService = services.find((s) => s.id === selectedServiceId);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg overflow-hidden max-w-2xl mx-auto pb-24 animate-in fade-in duration-200">
      {/* HEADER: KASIR & TITLE */}
      <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            type="button"
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition active:scale-95"
            title="Batal & Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
              Transaksi Kasir Baru
            </h2>
            <p className="text-[11px] text-blue-100 font-medium">
              Operator: {currentUser.name} • {currentUser.role}
            </p>
          </div>
        </div>

        {/* Total Price preview pill */}
        {items.length > 0 && (
          <div className="bg-white/20 backdrop-blur-xs px-3 py-1 rounded-xl text-right shrink-0">
            <span className="text-[10px] text-blue-100 block font-medium leading-none">
              Subtotal ({items.length} Item)
            </span>
            <span className="font-black text-sm text-white">
              {formatCurrency(calculatedSubtotal)}
            </span>
          </div>
        )}
      </div>

      {/* MATERIAL STEPPER PROGRESS BAR (Step 1 -> Step 2 -> Step 3) */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
        <div className="grid grid-cols-3 gap-2">
          {/* STEP 1 TAB */}
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-2 p-2 rounded-2xl transition text-left ${
              currentStep === 1
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : currentStep > 1
                ? 'bg-blue-100/70 text-blue-800 font-semibold hover:bg-blue-200/70'
                : 'bg-white text-slate-500 border border-slate-200'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                currentStep === 1
                  ? 'bg-white text-blue-700'
                  : currentStep > 1
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {currentStep > 1 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '1'}
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] truncate leading-tight">1. Pelanggan</span>
              <span className="text-[9px] opacity-80 block truncate">
                {selectedCustomerObj
                  ? selectedCustomerObj.name.split(' ')[0]
                  : showNewCustomerForm && newCustName
                  ? newCustName.split(' ')[0]
                  : 'Pilih / Tambah'}
              </span>
            </div>
          </button>

          {/* STEP 2 TAB */}
          <button
            type="button"
            onClick={() => {
              if (selectedCustomerId || (showNewCustomerForm && newCustName)) {
                setCurrentStep(2);
              }
            }}
            disabled={!selectedCustomerId && !(showNewCustomerForm && newCustName)}
            className={`flex items-center gap-2 p-2 rounded-2xl transition text-left disabled:opacity-50 disabled:cursor-not-allowed ${
              currentStep === 2
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : currentStep > 2
                ? 'bg-blue-100/70 text-blue-800 font-semibold hover:bg-blue-200/70'
                : 'bg-white text-slate-500 border border-slate-200'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                currentStep === 2
                  ? 'bg-white text-blue-700'
                  : currentStep > 2
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {currentStep > 2 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '2'}
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] truncate leading-tight">2. Layanan</span>
              <span className="text-[9px] opacity-80 block truncate">
                {items.length > 0 ? `${items.length} Item` : 'Pilih Cuci'}
              </span>
            </div>
          </button>

          {/* STEP 3 TAB */}
          <button
            type="button"
            onClick={() => {
              if (items.length > 0) {
                setCurrentStep(3);
              }
            }}
            disabled={items.length === 0}
            className={`flex items-center gap-2 p-2 rounded-2xl transition text-left disabled:opacity-50 disabled:cursor-not-allowed ${
              currentStep === 3
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'bg-white text-slate-500 border border-slate-200'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                currentStep === 3
                  ? 'bg-white text-blue-700'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              3
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] truncate leading-tight">3. Pembayaran</span>
              <span className="text-[9px] opacity-80 block truncate">
                {items.length > 0 ? formatCurrency(calculatedTotal) : 'Selesai'}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* ERROR MESSAGE ALERT */}
      {errorMessage && (
        <div className="mx-4 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700 flex items-center gap-2 shadow-2xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: DATA PELANGGAN & PREFERENSI PESANAN                                */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="p-4 sm:p-6 space-y-5">
          {/* Section Pelanggan */}
          <div className="p-4 rounded-3xl bg-slate-50/90 border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" />
                <span>Pilih Pelanggan Laundry</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setShowNewCustomerForm(!showNewCustomerForm);
                  setSelectedCustomerId('');
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 transition flex items-center gap-1"
              >
                {showNewCustomerForm ? (
                  <span>← Pilih Dari Kontak</span>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Pelanggan Baru</span>
                  </>
                )}
              </button>
            </div>

            {/* If picking existing customer */}
            {!showNewCustomerForm ? (
              <div className="space-y-3">
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama atau nomor WhatsApp pelanggan..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>

                {/* Selected customer card badge */}
                {selectedCustomerObj ? (
                  <div className="p-3.5 bg-blue-50 border-2 border-blue-500 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                        {selectedCustomerObj.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-sm text-blue-950 truncate">
                          {selectedCustomerObj.name}
                        </div>
                        <div className="text-xs text-blue-700 font-semibold flex items-center gap-1 mt-0.5">
                          <span>WA: {selectedCustomerObj.phone}</span>
                        </div>
                        {selectedCustomerObj.address && (
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {selectedCustomerObj.address}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedCustomerId('')}
                      className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      Ganti
                    </button>
                  </div>
                ) : (
                  /* Customer Candidates Grid */
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                        Tidak ada pelanggan yang cocok. Silakan klik tombol <strong>+ Pelanggan Baru</strong> di atas.
                      </div>
                    ) : (
                      filteredCustomers.map((c) => {
                        const isSelected = selectedCustomerId === c.id;
                        return (
                          <div
                            key={c.id}
                            onClick={() => setSelectedCustomerId(c.id)}
                            className={`p-3 rounded-2xl border text-xs cursor-pointer flex items-center justify-between transition ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50 font-bold text-blue-900 shadow-2xs'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-slate-900 truncate">{c.name}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                                WA: {c.phone} {c.address ? `• ${c.address}` : ''}
                              </div>
                            </div>
                            <div className="shrink-0 ml-2">
                              {isSelected ? (
                                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                                  <Check className="w-4 h-4 stroke-[3]" />
                                </div>
                              ) : (
                                <span className="text-[11px] text-blue-600 font-bold px-2 py-0.5 rounded-lg bg-blue-50">
                                  Pilih
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* New Customer Input Form */
              <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nama Lengkap Pelanggan *
                  </label>
                  <input
                    type="text"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="Contoh: Ibu Rina Susanti"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nomor WhatsApp / Telepon *
                  </label>
                  <input
                    type="tel"
                    value={newCustPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition font-medium"
                  />
                  {phoneDuplicateWarning && (
                    <p className="mt-1.5 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-start gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                      <span>{phoneDuplicateWarning}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Alamat Lengkap (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    value={newCustAddress}
                    onChange={(e) => setNewCustAddress(e.target.value)}
                    placeholder="Alamat rumah, kos, apartemen atau nomor kamar"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition font-medium"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section Preferensi & Catatan Order */}
          <div className="p-4 rounded-3xl bg-slate-50/90 border border-slate-200 space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Detail & Preferensi Pengerjaan</span>
            </label>

            {/* Perfume Selection Chips */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Pilihan Aroma Parfum Laundry
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PERFUME_OPTIONS.map((p) => {
                  const isSelected = perfume === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPerfume(p)}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition text-left flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{p}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Automatic Service-Derived Estimation Card & Urgent Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/80">
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-blue-950 flex items-center gap-1.5">
                    <span>Estimasi Selesai Otomatis</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold bg-blue-200 text-blue-800">
                      Sesuai Layanan
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-800/90 mt-0.5 leading-relaxed">
                    Durasi selesai otomatis dihitung berdasarkan paket layanan yang Anda pilih pada Langkah 2 (Reguler 48 jam, Kilat 24 jam, Express 4 jam, dsb). Tidak perlu input manual.
                  </p>
                </div>
              </div>

              {/* Urgent Priority Checkbox */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Status Prioritas Antrean
                </label>
                <div
                  onClick={() => setIsUrgent(!isUrgent)}
                  className={`p-2.5 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                    isUrgent
                      ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Zap className={`w-4 h-4 ${isUrgent ? 'text-rose-600 fill-rose-600' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-bold text-xs">Prioritas Kilat / Mendesak</div>
                      <div className="text-[10px] text-slate-500">Tandai pesanan prioritas di antrean cucian</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-0"
                  />
                </div>
              </div>
            </div>

            {/* Special Notes */}
            <div className="pt-1 border-t border-slate-200/80">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Catatan Khusus Cucian (Noda, Kancing, Permintaan Khusus)
              </label>
              <input
                type="text"
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                placeholder="Contoh: Baju kemeja putih ada noda minyak di saku kanan"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>
          </div>

          {/* Navigation Buttons for Step 1 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition active:scale-[0.98]"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleGoToStep2}
              className="flex-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
            >
              <span>Lanjut ke Pilih Layanan (Step 2)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: PILIH LAYANAN LAUNDRY & TIMBANGAN                                */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="p-4 sm:p-6 space-y-5">
          {/* Category Filter Horizontal Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-600" />
                <span>Pilih Layanan Laundry</span>
              </label>
              <span className="text-xs font-semibold text-slate-500">
                {filteredServices.length} Paket Layanan
              </span>
            </div>

            {/* Horizontal category slider */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                  selectedCategoryFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua Kategori
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                    selectedCategoryFilter === cat.id
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Quick service search */}
            <div className="mt-2.5 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Ketik nama paket layanan..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-blue-600 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Service Cards Selection Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
            {filteredServices.map((srv) => {
              const isSelected = selectedServiceId === srv.id;
              return (
                <div
                  key={srv.id}
                  onClick={() => handleSelectServiceCard(srv)}
                  className={`p-3 rounded-2xl border text-xs cursor-pointer transition flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'border-2 border-blue-600 bg-blue-50/90 shadow-2xs font-semibold'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {srv.categoryName}
                      </span>
                      <div className="font-extrabold text-slate-900 text-sm mt-1 leading-snug">
                        {srv.name}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Est: {srv.estimatedDurationHours} Jam pengerjaan
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500">Tarif Satuan:</span>
                    <span className="font-black text-blue-700 text-sm">
                      {formatCurrency(srv.pricePerUnit)} / {srv.unitName}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ACTIVE SERVICE QUANTITY CALCULATOR PANEL */}
          {selectedActiveService ? (
            <div className="p-4 rounded-3xl bg-blue-50/80 border border-blue-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                    Input Kuantitas / Timbangan
                  </span>
                  <div className="font-black text-slate-900 text-sm sm:text-base">
                    {selectedActiveService.name}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-blue-700 font-semibold mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Durasi Layanan: {selectedActiveService.estimatedDurationHours} Jam pengerjaan</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-xs text-slate-500 block">Subtotal Item:</span>
                  <span className="font-black text-blue-700 text-base">
                    {formatCurrency(
                      Math.round(
                        (parseFloat(inputQuantity) || 0) * selectedActiveService.pricePerUnit
                      )
                    )}
                  </span>
                </div>
              </div>

              {/* Quantity Controller */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAdjustQuantity(-1)}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-300 text-slate-700 font-black text-base flex items-center justify-center hover:bg-slate-100 active:scale-95 shadow-2xs"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <div className="flex-1 relative">
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    value={inputQuantity}
                    onChange={(e) => setInputQuantity(e.target.value)}
                    className="w-full py-2.5 px-3 bg-white border border-slate-300 rounded-xl text-center font-black text-lg text-slate-900 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    {selectedActiveService.unitName}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleAdjustQuantity(1)}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-300 text-slate-700 font-black text-base flex items-center justify-center hover:bg-slate-100 active:scale-95 shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {[0.5, 1, 2, 3, 4, 5, 10].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSetPresetQuantity(preset)}
                    className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition shadow-2xs shrink-0"
                  >
                    {preset} {selectedActiveService.unitName}
                  </button>
                ))}
              </div>

              {/* Add to Cart Button */}
              <button
                type="button"
                onClick={handleAddItemToCart}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-sm font-bold transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Masukkan ke Daftar Cucian</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500">
              👈 Klik salah satu kartu paket layanan di atas untuk memasukkan kuantitas cucian.
            </div>
          )}

          {/* LIVE CART: DAFTAR ITEM CUCIAN TERPILIH */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>Keranjang Cucian ({items.length} Item)</span>
              </label>
              {items.length > 0 && (
                <span className="font-black text-sm text-slate-900">
                  Subtotal: {formatCurrency(calculatedSubtotal)}
                </span>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-3 bg-gradient-to-r from-blue-50 via-indigo-50/70 to-blue-50 border border-blue-200/90 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-blue-950 text-xs sm:text-sm">
                        Estimasi Selesai: {orderEstimation.formattedDuration}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-blue-200 text-blue-800">
                        Otomatis Layanan ({orderEstimation.longestServiceName})
                      </span>
                    </div>
                    <div className="text-[11px] text-blue-800/90 truncate mt-0.5">
                      Target Selesai: <span className="font-bold text-blue-950">{formatDate(targetCompletionDate.toISOString(), true)}</span>
                    </div>
                  </div>
                </div>
                {isUrgent && (
                  <span className="bg-rose-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider shadow-2xs">
                    Prioritas Kilat
                  </span>
                )}
              </div>
            )}

            {items.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                Keranjang cucian masih kosong. Pilih layanan dan klik &quot;+ Masukkan ke Daftar Cucian&quot;.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 shadow-2xs">
                {items.map((it, idx) => {
                  const itemSub = Math.round(it.quantity * it.pricePerUnit);
                  return (
                    <div
                      key={idx}
                      className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 text-sm truncate">
                          {it.serviceName}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {it.quantity} {it.unitName} × {formatCurrency(it.pricePerUnit)}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-black text-slate-900 text-sm">
                          {formatCurrency(itemSub)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Hapus Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Navigation Buttons for Step 2 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>

            <button
              type="button"
              onClick={handleGoToStep3}
              disabled={items.length === 0}
              className="flex-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-sm shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>Lanjut ke Pembayaran ({items.length} Item)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: RINGKASAN PESANAN & PEMBAYARAN KASIR                              */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <form onSubmit={handleSubmitTransaction} className="p-4 sm:p-6 space-y-5">
          {/* Ringkasan Header Card */}
          <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>Ringkasan Nota Cucian</span>
              </span>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Ubah</span>
              </button>
            </div>

            <div className="flex justify-between items-start text-xs">
              <div>
                <div className="font-extrabold text-sm text-slate-900">
                  {selectedCustomerObj
                    ? selectedCustomerObj.name
                    : showNewCustomerForm
                    ? newCustName
                    : 'Pelanggan'}
                </div>
                <div className="text-[11px] text-slate-500">
                  WA: {selectedCustomerObj ? selectedCustomerObj.phone : newCustPhone}
                </div>
              </div>

              <div className="text-right">
                <span className="font-bold text-[11px] text-slate-500 block">Aroma Parfum:</span>
                <span className="font-extrabold text-blue-700 text-xs">{perfume}</span>
              </div>
            </div>

            {/* List item items preview */}
            <div className="divide-y divide-slate-200/60 pt-2 border-t border-slate-200/80 text-xs">
              {items.map((it, idx) => (
                <div key={idx} className="py-1.5 flex justify-between items-center">
                  <span className="text-slate-700">
                    {it.serviceName} ({it.quantity} {it.unitName})
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(Math.round(it.quantity * it.pricePerUnit))}
                  </span>
                </div>
              ))}
            </div>

            {/* Automatic Service-Based Estimation & Target Date */}
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200/90 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                      Estimasi Selesai: {orderEstimation.formattedDuration}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-blue-200 text-blue-800">
                      Otomatis ({orderEstimation.longestServiceName})
                    </span>
                  </div>
                  <div className="text-[11px] text-blue-900 font-semibold truncate mt-0.5">
                    Target Selesai: {formatDate(targetCompletionDate.toISOString(), true)}
                  </div>
                </div>
              </div>

              {isUrgent ? (
                <span className="bg-rose-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase shadow-2xs">
                  Prioritas Kilat
                </span>
              ) : (
                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border border-emerald-200">
                  Reguler
                </span>
              )}
            </div>

            {/* Special Notes if provided */}
            {specialNotes && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-medium">
                <span className="font-bold">Catatan Khusus:</span> {specialNotes}
              </div>
            )}
          </div>

          {/* KALKULASI SUB-TOTAL, DISKON & TOTAL TAGIHAN */}
          <div className="p-4 rounded-3xl bg-blue-50/80 border border-blue-200/90 space-y-3.5">
            <label className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-blue-600" />
              <span>Kalkulasi Total & Potongan Diskon</span>
            </label>

            <div className="space-y-2 text-xs">
              {/* Subtotal */}
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-medium">Subtotal Cucian:</span>
                <span className="font-bold text-sm text-slate-900">
                  {formatCurrency(calculatedSubtotal)}
                </span>
              </div>

              {/* Diskon Input & Chips */}
              <div className="pt-2 border-t border-blue-200/80 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-800">Potongan Diskon (Rp):</span>
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
                      className="w-28 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-right text-rose-600 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                </div>

                {/* Quick Discount Chips */}
                <div className="flex gap-1.5 justify-end flex-wrap">
                  {[5000, 10000, 20000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() =>
                        setDiscount((prev) => addDiscountChip(prev, amt, calculatedSubtotal))
                      }
                      className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 text-[11px] font-bold shadow-2xs transition"
                    >
                      +{formatCurrency(amt)}
                    </button>
                  ))}
                  {discount > 0 && (
                    <button
                      type="button"
                      onClick={() => setDiscount(0)}
                      className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 font-bold hover:bg-rose-200 text-[11px] transition"
                    >
                      Reset Diskon
                    </button>
                  )}
                </div>
              </div>

              {/* Total Bersih */}
              <div className="pt-2.5 border-t border-blue-300 flex justify-between items-center text-sm font-black text-slate-900">
                <span className="text-slate-800">Total Tagihan Akhir:</span>
                <span className="text-xl text-blue-700">{formatCurrency(calculatedTotal)}</span>
              </div>
            </div>
          </div>

          {/* PEMBAYARAN AWAL (KASIR INPUT) */}
          <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Uang Pembayaran Diterima Sekarang
              </label>

              {/* Preset buttons */}
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handlePayFull}
                  className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition shadow-2xs"
                >
                  Bayar Lunas
                </button>
                <button
                  type="button"
                  onClick={handlePayDP}
                  className="px-2.5 py-1 rounded-xl bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-700 transition shadow-2xs"
                >
                  DP 50%
                </button>
                <button
                  type="button"
                  onClick={handlePayLater}
                  className="px-2.5 py-1 rounded-xl bg-slate-200 text-slate-700 text-[11px] font-bold hover:bg-slate-300 transition"
                >
                  Bayar Nanti
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nominal Diterima (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  max={calculatedTotal}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0"
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-lg font-black text-slate-900 focus:outline-hidden focus:ring-2 ${
                    isOverpaid
                      ? 'border-rose-400 focus:ring-rose-500/20'
                      : 'border-slate-300 focus:ring-blue-500/20'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Metode Pembayaran
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
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
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>
                  Nominal ({formatCurrency(enteredPay)}) melebihi tagihan. Kelebihan:{' '}
                  {formatCurrency(paymentDetails.overpaidAmount)}.
                </span>
              </div>
            )}

            {/* Remaining Balance & Status Badge */}
            <div className="p-3 bg-white rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-600">Sisa Tagihan (Piutang):</span>
              <span
                className={`font-black text-sm px-2.5 py-1 rounded-xl ${
                  calculatedRemaining === 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : enteredPay > 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {formatCurrency(calculatedRemaining)}{' '}
                {calculatedRemaining === 0 ? '• LUNAS' : `• ${paymentDetails.paymentStatus}`}
              </span>
            </div>
          </div>

          {/* FINAL SUBMIT BUTTONS */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ubah Layanan</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="flex-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-sm shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>{isSubmitting ? 'Menyimpan Transaksi...' : 'Simpan & Terbitkan Nota'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
