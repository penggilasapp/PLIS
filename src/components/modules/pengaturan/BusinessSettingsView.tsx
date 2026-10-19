import React, { useState } from 'react';
import {
  Check,
  FileText,
  MessageCircle,
  Printer,
  Save,
  Store,
} from 'lucide-react';
import { AppUser, BusinessSettings } from '../../../types';
import { settingsService } from '../../../services/settingsService';

interface BusinessSettingsViewProps {
  settings: BusinessSettings;
  currentUser: AppUser;
  onRefreshData: () => void;
}

export const BusinessSettingsView: React.FC<BusinessSettingsViewProps> = ({
  settings,
  currentUser,
  onRefreshData,
}) => {
  const [storeName, setStoreName] = useState(settings.storeName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [terms, setTerms] = useState(settings.termsAndConditions);
  const [footerMsg, setFooterMsg] = useState(settings.receiptFooterMessage);
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(settings.printerPaperWidth || '58mm');
  const [waTemplate, setWaTemplate] = useState(settings.whatsappMessageTemplate);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      alert('Nama usaha wajib diisi!');
      return;
    }

    try {
      setIsSaving(true);
      const updated: BusinessSettings = {
        ...settings,
        storeName: storeName.trim(),
        tagline: tagline.trim(),
        phone: phone.trim(),
        address: address.trim(),
        termsAndConditions: terms.trim(),
        receiptFooterMessage: footerMsg.trim(),
        printerPaperWidth: paperWidth,
        whatsappMessageTemplate: waTemplate.trim(),
      };

      await settingsService.updateSettings(updated, currentUser);
      setSuccessMsg('Pengaturan usaha berhasil disimpan!');
      setTimeout(() => setSuccessMsg(''), 3000);
      onRefreshData();
    } catch (err: any) {
      alert(`Gagal menyimpan pengaturan: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header Info */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">Pengaturan Usaha Laundry</h3>
            <p className="text-[11px] text-slate-500">
              Profil toko, kop nota, ketentuan kebijakan, dan format pesan WhatsApp
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

      <form onSubmit={handleSave} className="space-y-4 text-xs">
        {/* Card 1: Profil Outlet */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <h4 className="font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Store className="w-4 h-4 text-blue-600" />
            1. Profil Usaha (Kop Nota)
          </h4>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Usaha / Toko *</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-bold border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Slogan / Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">No. WhatsApp / Telepon *</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lebar Kertas Printer Kasir</label>
              <select
                value={paperWidth}
                onChange={(e) => setPaperWidth(e.target.value as '58mm' | '80mm')}
                className="w-full px-3.5 py-2.5 text-sm font-semibold border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 bg-white transition"
              >
                <option value="58mm">Thermal 58 mm (Standar Mobile POS)</option>
                <option value="80mm">Thermal 80 mm (Printer Desktop)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Alamat Outlet *</label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
            />
          </div>
        </div>

        {/* Card 2: Ketentuan & Footer Nota */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <h4 className="font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-600" />
            2. Ketentuan & Kebijakan Laundry pada Nota
          </h4>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Ketentuan Laundry (Muncul di bagian bawah nota cetak)
            </label>
            <textarea
              rows={4}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full px-3.5 py-2.5 font-mono text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Pesan Penutup Nota (Footer)
            </label>
            <input
              type="text"
              value={footerMsg}
              onChange={(e) => setFooterMsg(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
            />
          </div>
        </div>

        {/* Card 3: Format Pesan WhatsApp */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <h4 className="font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            3. Template Pesan WhatsApp
          </h4>
          <p className="text-[11px] text-slate-500">
            Gunakan variabel: {'{customer_name}'}, {'{store_name}'}, {'{order_number}'}, {'{total_amount}'}, {'{paid_amount}'}, {'{remaining_amount}'}, {'{laundry_status}'}, {'{estimated_date}'}
          </p>

          <textarea
            rows={5}
            value={waTemplate}
            onChange={(e) => setWaTemplate(e.target.value)}
            className="w-full px-3.5 py-2.5 font-mono text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-xs hover:shadow-sm active:scale-[0.98]"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Menyimpan...' : 'Simpan Seluruh Pengaturan Usaha'}</span>
        </button>
      </form>
    </div>
  );
};
