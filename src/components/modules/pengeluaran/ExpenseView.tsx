import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  Calendar,
  Check,
  DollarSign,
  Edit,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../../../shared/constants';
import { formatCurrency, formatDate } from '../../../shared/formatters';
import { AppUser, Expense, ExpenseCategory, PaymentMethod } from '../../../types';
import { expenseService } from '../../../services/expenseService';

interface ExpenseViewProps {
  expenses: Expense[];
  currentUser: AppUser;
  onRefreshData: () => void;
}

export const ExpenseView: React.FC<ExpenseViewProps> = ({
  expenses,
  currentUser,
  onRefreshData,
}) => {
  const [filterPeriod, setFilterPeriod] = useState<'TODAY' | 'THIS_MONTH' | 'ALL'>('THIS_MONTH');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [search, setSearch] = useState('');

  // Add Form states
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('OPERASIONAL');
  const [method, setMethod] = useState<PaymentMethod>('TUNAI');
  const [notes, setNotes] = useState('');
  const [customDate, setCustomDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Edit Form states
  const [editDesc, setEditDesc] = useState('');
  const [editAmountStr, setEditAmountStr] = useState('');
  const [editCategory, setEditCategory] = useState<ExpenseCategory>('OPERASIONAL');
  const [editMethod, setEditMethod] = useState<PaymentMethod>('TUNAI');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editErrorMsg, setEditErrorMsg] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const thisMonthStr = todayStr.slice(0, 7);

  const filteredExpenses = expenses
    .filter((e) => {
      if (filterPeriod === 'TODAY') return e.date.startsWith(todayStr);
      if (filterPeriod === 'THIS_MONTH') return e.date.startsWith(thisMonthStr);
      return true;
    })
    .filter((e) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return e.description.toLowerCase().includes(q) || e.categoryLabel.toLowerCase().includes(q);
    });

  const totalExpenseAmount = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const amt = parseFloat(amountStr);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Nominal pengeluaran harus lebih besar dari Rp 0!');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Deskripsi pengeluaran wajib diisi!');
      return;
    }

    const catObj = EXPENSE_CATEGORIES.find((c) => c.id === category);

    try {
      setIsSubmitting(true);
      await expenseService.create(
        {
          category,
          categoryLabel: catObj ? catObj.label : category,
          description: description.trim(),
          amount: amt,
          paymentMethod: method,
          notes: notes.trim(),
          customDate: customDate ? new Date(customDate).toISOString() : undefined,
        },
        currentUser
      );
      onRefreshData();
      setShowAddModal(false);
      setDescription('');
      setAmountStr('');
      setNotes('');
      setCustomDate('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan pengeluaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setEditDesc(exp.description);
    setEditAmountStr(String(exp.amount));
    setEditCategory(exp.category);
    setEditMethod(exp.paymentMethod);
    setEditDate(exp.date ? exp.date.slice(0, 16) : '');
    setEditNotes(exp.notes || '');
    setEditErrorMsg('');
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    setEditErrorMsg('');

    const amt = parseFloat(editAmountStr);
    if (isNaN(amt) || amt <= 0) {
      setEditErrorMsg('Nominal pengeluaran harus lebih besar dari Rp 0!');
      return;
    }
    if (!editDesc.trim()) {
      setEditErrorMsg('Deskripsi pengeluaran wajib diisi!');
      return;
    }

    const catObj = EXPENSE_CATEGORIES.find((c) => c.id === editCategory);

    try {
      setIsEditSubmitting(true);
      await expenseService.update(
        editingExpense.id,
        {
          category: editCategory,
          categoryLabel: catObj ? catObj.label : editCategory,
          description: editDesc.trim(),
          amount: amt,
          paymentMethod: editMethod,
          notes: editNotes.trim(),
          date: editDate ? new Date(editDate).toISOString() : editingExpense.date,
        },
        currentUser
      );
      onRefreshData();
      setEditingExpense(null);
    } catch (err: any) {
      setEditErrorMsg(err.message || 'Gagal memperbarui pengeluaran');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus catatan pengeluaran ini?')) {
      await expenseService.delete(id, currentUser);
      onRefreshData();
    }
  };

  return (
    <div className="space-y-3.5 pb-24">
      {/* Search & Period Header */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowDownRight className="w-5 h-5 text-rose-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-900">Catatan Pengeluaran</h3>
              <p className="text-[11px] text-slate-500">
                Total Biaya: <strong className="text-rose-600">{formatCurrency(totalExpenseAmount)}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Biaya</span>
          </button>
        </div>

        {/* Period Selector */}
        <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
          <button
            onClick={() => setFilterPeriod('TODAY')}
            className={`py-1.5 rounded-xl transition ${
              filterPeriod === 'TODAY'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Hari Ini
          </button>
          <button
            onClick={() => setFilterPeriod('THIS_MONTH')}
            className={`py-1.5 rounded-xl transition ${
              filterPeriod === 'THIS_MONTH'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Bulan Ini
          </button>
          <button
            onClick={() => setFilterPeriod('ALL')}
            className={`py-1.5 rounded-xl transition ${
              filterPeriod === 'ALL'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Semua
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari deskripsi biaya atau kategori..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
          />
        </div>
      </div>

      {/* Expenses List */}
      <div className="space-y-2">
        {filteredExpenses.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            Belum ada catatan pengeluaran pada periode ini.
          </div>
        ) : (
          filteredExpenses.map((exp) => (
            <div
              key={exp.id}
              className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 text-xs"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 text-sm">{exp.description}</span>
                  <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {exp.categoryLabel}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                  <span>{formatDate(exp.date, true)}</span>
                  <span>•</span>
                  <span>Metode: {exp.paymentMethod}</span>
                  <span>•</span>
                  <span>Oleh: {exp.recordedByUserName}</span>
                </div>
                {exp.notes && (
                  <div className="text-[11px] text-slate-400 italic mt-0.5">{exp.notes}</div>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <div className="font-black text-rose-600 text-sm sm:text-base mr-1">
                  {formatCurrency(exp.amount)}
                </div>

                <button
                  onClick={() => handleStartEditExpense(exp)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Edit Pengeluaran (No ID Terbit)"
                >
                  <Edit className="w-4 h-4" />
                </button>

                {currentUser.role === 'OWNER' && (
                  <button
                    onClick={() => handleDeleteExpense(exp.id)}
                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Hapus Biaya"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-100 my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Catat Pengeluaran Baru</h3>
                  <p className="text-xs text-slate-500 font-medium">Beban operasional & belanja outlet</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleCreateExpense} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Kategori Pengeluaran *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 transition"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Deskripsi / Keperluan *
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Contoh: Beli Deterjen Matic 5L & Plastik Packing"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nominal Biaya (Rp) *
                  </label>
                  <input
                    type="number"
                    min="1000"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 text-lg font-black text-rose-600 border border-slate-300 rounded-xl focus:outline-hidden focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Metode Pembayaran
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 transition"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Catatan Tambahan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="No struk toko atau supplier"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 transition"
                  />
                </div>

                <div className="pt-2 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition active:scale-[0.98]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition shadow-xs hover:shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Biaya'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal (Preserves Issued ID) */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-100 my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">Edit Pengeluaran (ID Terbit)</h3>
                <span className="font-mono text-xs text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                  ID Terbit: {editingExpense.id}
                </span>
              </div>
              <button
                onClick={() => setEditingExpense(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {editErrorMsg && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{editErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleUpdateExpense} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Kategori Pengeluaran *
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 transition"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Deskripsi / Keperluan *
                  </label>
                  <input
                    type="text"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Deskripsi keperluan"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nominal Biaya (Rp) *
                  </label>
                  <input
                    type="number"
                    min="1000"
                    value={editAmountStr}
                    onChange={(e) => setEditAmountStr(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-lg font-black text-rose-600 border border-slate-300 rounded-xl focus:outline-hidden focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tanggal Pengeluaran
                  </label>
                  <input
                    type="datetime-local"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Metode Pembayaran
                  </label>
                  <select
                    value={editMethod}
                    onChange={(e) => setEditMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 transition"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Catatan Tambahan
                  </label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Catatan koreksi atau no struk"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 transition"
                  />
                </div>

                <div className="pt-2 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingExpense(null)}
                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition active:scale-[0.98]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isEditSubmitting}
                    className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition shadow-xs hover:shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{isEditSubmitting ? 'Memperbarui...' : 'Simpan Perubahan'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
