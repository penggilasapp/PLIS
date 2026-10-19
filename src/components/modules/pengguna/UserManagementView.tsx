import React, { useState } from 'react';
import { Check, KeyRound, ShieldAlert, ShieldCheck, UserCheck, Users } from 'lucide-react';
import { dbService } from '../../../db/indexedDb';
import { AppUser } from '../../../types';

interface UserManagementViewProps {
  users: AppUser[];
  currentUser: AppUser;
  onRefreshData: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  currentUser,
  onRefreshData,
}) => {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleStartEdit = (u: AppUser) => {
    setEditingUserId(u.id);
    setNewPin(u.pin);
    setNameInput(u.name);
    setPhoneInput(u.phone || '');
  };

  const handleSaveUser = async (u: AppUser) => {
    const updated: AppUser = {
      ...u,
      name: nameInput.trim() || u.name,
      pin: newPin.trim() || u.pin,
      phone: phoneInput.trim(),
    };

    await dbService.put('users', updated);
    setEditingUserId(null);
    setSuccessMsg(`Profil dan PIN untuk ${updated.name} berhasil diperbarui.`);
    setTimeout(() => setSuccessMsg(''), 3000);
    onRefreshData();
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">Manajemen Pengguna & Hak Akses</h3>
            <p className="text-[11px] text-slate-500">
              Peran: OWNER (Kewenangan Penuh) & KARYAWAN (Operasional Kasir)
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Users List */}
      <div className="space-y-2.5">
        {users.map((u) => {
          const isEditing = editingUserId === u.id;
          const isMe = currentUser.id === u.id;

          return (
            <div
              key={u.id}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm ${
                      u.role === 'OWNER' ? 'bg-indigo-600' : 'bg-emerald-600'
                    }`}
                  >
                    {u.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{u.name}</span>
                      {isMe && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700">
                          (Aktif Saat Ini)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`font-bold px-1.5 py-0.2 rounded text-[10px] uppercase ${
                          u.role === 'OWNER'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {u.role}
                      </span>
                      <span>•</span>
                      <span>No. HP: {u.phone || '-'}</span>
                    </div>
                  </div>
                </div>

                {!isEditing && (
                  <button
                    onClick={() => handleStartEdit(u)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition text-xs"
                  >
                    Ubah PIN / Profil
                  </button>
                )}
              </div>

              {isEditing && (
                <div className="pt-3 border-t border-slate-100 space-y-2.5 bg-slate-50 p-3 rounded-xl">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nama Tampilan *
                    </label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        No. HP
                      </label>
                      <input
                        type="text"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        PIN Akses (4-6 Angka)
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl font-black text-center focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingUserId(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition active:scale-[0.98]"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveUser(u)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition active:scale-[0.98]"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Permissions Matrix */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2 text-xs">
        <h4 className="font-bold uppercase tracking-wider text-slate-700">
          Matriks Kewenangan Peran
        </h4>
        <div className="divide-y divide-slate-100 text-[11px]">
          <div className="py-2 flex justify-between">
            <span className="text-slate-600">Catat Transaksi, Status & Pembayaran</span>
            <span className="font-bold text-emerald-600">OWNER & KARYAWAN</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-600">Catat Pengeluaran Operasional Harian</span>
            <span className="font-bold text-emerald-600">OWNER & KARYAWAN</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-600">Hapus Catatan Pengeluaran & Transaksi</span>
            <span className="font-bold text-indigo-700">HANYA OWNER</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-600">Pengaturan Usaha & Ketentuan Nota</span>
            <span className="font-bold text-indigo-700">HANYA OWNER</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-600">Backup & Restore Database</span>
            <span className="font-bold text-indigo-700">HANYA OWNER</span>
          </div>
        </div>
      </div>
    </div>
  );
};
