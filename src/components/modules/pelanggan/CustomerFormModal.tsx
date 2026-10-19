import React, { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, Check, User, X } from 'lucide-react';
import { AppUser, Customer } from '../../../types';
import { customerService } from '../../../services/customerService';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: Customer | null;
  existingCustomers: Customer[];
  currentUser: AppUser;
  onSuccess: (c: Customer) => void;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  customerToEdit,
  existingCustomers,
  currentUser,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name);
      setPhone(customerToEdit.phone);
      setAddress(customerToEdit.address || '');
      setNotes(customerToEdit.notes || '');
      setDuplicateWarning(null);
    } else {
      setName('');
      setPhone('');
      setAddress('');
      setNotes('');
      setDuplicateWarning(null);
    }
  }, [customerToEdit, isOpen]);

  if (!isOpen) return null;

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    const clean = val.replace(/\D/g, '');
    if (clean.length >= 8) {
      const match = existingCustomers.find(
        (c) => c.phone.replace(/\D/g, '') === clean && (!customerToEdit || c.id !== customerToEdit.id)
      );
      if (match) {
        setDuplicateWarning(
          `Nomor telepon ini sudah terdaftar atas nama "${match.name}". Periksa kembali apakah pelanggan ini orang yang sama.`
        );
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Nama pelanggan wajib diisi!');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Nomor telepon wajib diisi!');
      return;
    }

    try {
      setIsSubmitting(true);
      if (customerToEdit) {
        const updated = await customerService.update(
          customerToEdit.id,
          {
            name: name.trim(),
            phone: phone.trim(),
            address: address.trim(),
            notes: notes.trim(),
          },
          currentUser
        );
        onSuccess(updated);
      } else {
        const { customer } = await customerService.create(
          {
            name: name.trim(),
            phone: phone.trim(),
            address: address.trim(),
            notes: notes.trim(),
          },
          currentUser
        );
        onSuccess(customer);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan data pelanggan');
    } finally {
      setIsSubmitting(false);
    }
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
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {customerToEdit ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">Data buku kontak & riwayat cucian</p>
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
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Pelanggan *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Ibu Rina Susanti"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nomor WhatsApp / Telepon *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="0812xxxxxxxx"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
              />
              {duplicateWarning && (
                <p className="mt-1.5 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>{duplicateWarning}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alamat Lengkap (Opsional)
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Jl. / Gang / No Rumah / Kost"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Catatan / Preferensi (Opsional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Misal: Suka parfum wangi tahan lama"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
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
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition shadow-xs hover:shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                {isSubmitting ? 'Menyimpan...' : 'Simpan Data'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
