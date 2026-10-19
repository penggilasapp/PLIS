import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  DollarSign,
  Lock,
  RotateCcw,
  Save,
  Wallet,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../../shared/formatters';
import { AppUser, CashRegisterSession } from '../../../types';
import { cashRegisterService } from '../../../services/cashRegisterService';

interface CashRecapViewProps {
  currentUser: AppUser;
  onRefreshData: () => void;
}

export const CashRecapView: React.FC<CashRecapViewProps> = ({
  currentUser,
  onRefreshData,
}) => {
  const [session, setSession] = useState<CashRegisterSession | null>(null);
  const [startingCashInput, setStartingCashInput] = useState('');
  const [actualCashInput, setActualCashInput] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [isEditingStarting, setIsEditingStarting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadSession = async () => {
    const s = await cashRegisterService.getTodaySession();
    setSession(s);
    setStartingCashInput(s.startingCash.toString());
    if (s.actualEndingCash !== undefined) {
      setActualCashInput(s.actualEndingCash.toString());
    }
    if (s.notes) {
      setClosingNotes(s.notes);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  if (!session) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Memuat data rekap laci kas...
      </div>
    );
  }

  const handleUpdateStartingCash = async () => {
    const amt = parseFloat(startingCashInput);
    if (isNaN(amt) || amt < 0) return;
    const updated = await cashRegisterService.updateStartingCash(amt);
    setSession(updated);
    setIsEditingStarting(false);
    setSuccessMsg('Saldo awal kas laci berhasil disimpan.');
    setTimeout(() => setSuccessMsg(''), 3000);
    onRefreshData();
  };

  const handleCloseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const actual = parseFloat(actualCashInput);
    if (isNaN(actual)) {
      alert('Masukkan jumlah uang fisik di laci kas!');
      return;
    }
    const updated = await cashRegisterService.closeSession(actual, closingNotes, currentUser);
    setSession(updated);
    setSuccessMsg('Tutup buku laci kasir hari ini berhasil disimpan!');
    setTimeout(() => setSuccessMsg(''), 4000);
    onRefreshData();
  };

  const countedActual = parseFloat(actualCashInput) || 0;
  const currentDiff = countedActual - session.expectedEndingCash;

  return (
    <div className="space-y-4 pb-24">
      {/* Header Info */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-900">Rekap Kas & Laci Kasir</h3>
              <p className="text-[11px] text-slate-500">
                Tanggal: {formatDate(new Date().toISOString(), false)} • Operator: {currentUser.name}
              </p>
            </div>
          </div>

          <button
            onClick={loadSession}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition"
            title="Refresh Hitungan"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {session.isClosed && (
          <div className="p-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Kasir hari ini telah DITUTUP oleh {session.closedByUserId}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Calculations Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        {/* Saldo Awal */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-semibold">1. Modal Saldo Awal (Uang Kembalian)</span>
            {!session.isClosed && (
              <button
                onClick={() => setIsEditingStarting(!isEditingStarting)}
                className="text-[11px] text-blue-600 font-bold hover:underline"
              >
                {isEditingStarting ? 'Batal' : 'Ubah'}
              </button>
            )}
          </div>

          {isEditingStarting ? (
            <div className="mt-2 flex gap-2">
              <input
                type="number"
                value={startingCashInput}
                onChange={(e) => setStartingCashInput(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold"
              />
              <button
                onClick={handleUpdateStartingCash}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold"
              >
                Simpan
              </button>
            </div>
          ) : (
            <div className="mt-1 text-lg font-black text-slate-900">
              {formatCurrency(session.startingCash)}
            </div>
          )}
        </div>

        {/* Kas Masuk Tunai */}
        <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/90 shadow-2xs">
          <span className="text-emerald-800 font-semibold flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
            2. Kas Masuk Tunai Hari Ini
          </span>
          <div className="mt-1 text-lg font-black text-emerald-700">
            {formatCurrency(session.totalCashReceived)}
          </div>
        </div>

        {/* Kas Keluar Tunai */}
        <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200/90 shadow-2xs">
          <span className="text-rose-800 font-semibold flex items-center gap-1">
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
            3. Pengeluaran Tunai Hari Ini
          </span>
          <div className="mt-1 text-lg font-black text-rose-700">
            {formatCurrency(session.totalCashExpense)}
          </div>
        </div>

        {/* Saldo Akhir Harapan Sistem */}
        <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200/90 shadow-2xs">
          <span className="text-blue-900 font-bold flex items-center gap-1">
            <Calculator className="w-3.5 h-3.5 text-blue-600" />
            4. Saldo Akhir Seharusnya (Sistem)
          </span>
          <div className="mt-1 text-lg sm:text-xl font-black text-blue-700">
            {formatCurrency(session.expectedEndingCash)}
          </div>
          <div className="text-[10px] text-blue-600 mt-0.5">
            = Saldo Awal + Kas Masuk - Pengeluaran
          </div>
        </div>
      </div>

      {/* Drawer Reconciliation & Physical Count Form */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
          Penghitungan Fisik Laci & Tutup Kas
        </h4>

        <form onSubmit={handleCloseRegister} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Jumlah Uang Fisik yang Dihitung di Laci (Rp) *
            </label>
            <input
              type="number"
              min="0"
              value={actualCashInput}
              onChange={(e) => setActualCashInput(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 text-base font-black text-slate-900 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Difference Calculation Result */}
          {actualCashInput !== '' && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                currentDiff === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : currentDiff > 0
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <span>
                {currentDiff === 0
                  ? 'Kas Cocok (Tidak Ada Selisih)'
                  : currentDiff > 0
                  ? 'Kelebihan Uang Fisik (Surplus):'
                  : 'Kekurangan Uang Fisik (Minus):'}
              </span>
              <span className="font-black text-sm">
                {currentDiff >= 0 ? `+${formatCurrency(currentDiff)}` : formatCurrency(currentDiff)}
              </span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Catatan Rekonsiliasi Tutup Kas (Opsional)
            </label>
            <input
              type="text"
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              placeholder="Contoh: Selisih Rp 500 karena pembulatan koin kembalian"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm transition shadow-xs flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Rekonsiliasi & Tutup Kas Hari Ini</span>
          </button>
        </form>
      </div>
    </div>
  );
};
