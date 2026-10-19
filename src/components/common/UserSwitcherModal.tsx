import React, { useState } from 'react';
import { Check, KeyRound, ShieldAlert, User, X } from 'lucide-react';
import { AppUser } from '../../types';

interface UserSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: AppUser[];
  currentUser: AppUser;
  onSwitchUser: (user: AppUser) => void;
}

export const UserSwitcherModal: React.FC<UserSwitcherModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onSwitchUser,
}) => {
  const [selectedUser, setSelectedUser] = useState<AppUser>(currentUser);
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSelectUser = (u: AppUser) => {
    setSelectedUser(u);
    setPinInput('');
    setErrorMsg('');
  };

  const handleConfirm = () => {
    // If switching to OWNER, verify PIN (default 1234)
    if (selectedUser.role === 'OWNER' && selectedUser.pin) {
      if (pinInput !== selectedUser.pin) {
        setErrorMsg('PIN Owner salah! (Default: 1234)');
        return;
      }
    }
    onSwitchUser(selectedUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-100 my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">Pilih Pengguna Aktif</h3>
              <p className="text-xs text-slate-500 font-medium">Ganti operator atau login sebagai Owner</p>
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
          <p className="text-xs text-slate-500">
            Setiap aktivitas transaksi, status cucian, dan pembayaran dicatat atas nama pengguna yang sedang aktif.
          </p>

          <div className="space-y-2">
          {users.map((u) => {
            const isSelected = selectedUser.id === u.id;
            return (
              <div
                key={u.id}
                onClick={() => handleSelectUser(u)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/70'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                      u.role === 'OWNER' ? 'bg-indigo-600' : 'bg-emerald-600'
                    }`}
                  >
                    {u.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{u.name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <span
                        className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          u.role === 'OWNER'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {u.role}
                      </span>
                      {u.role === 'OWNER' && '• Butuh PIN'}
                    </div>
                  </div>
                </div>
                {isSelected && <Check className="w-5 h-5 text-blue-600" />}
              </div>
            );
          })}
        </div>

        {selectedUser.role === 'OWNER' && selectedUser.id !== currentUser.id && (
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              Masukkan PIN Owner (Default: 1234)
            </label>
            <input
              type="password"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••"
              className="w-full px-3.5 py-2.5 text-center text-xl tracking-widest bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
            />
            {errorMsg && (
              <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1.5 font-semibold">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                {errorMsg}
              </p>
            )}
          </div>
        )}

        <div className="pt-2 flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition active:scale-[0.98]"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-xs hover:shadow-sm active:scale-[0.98]"
          >
            Gunakan
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};
