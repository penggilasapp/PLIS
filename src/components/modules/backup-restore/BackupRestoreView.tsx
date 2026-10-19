import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileJson,
  RotateCcw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { dbService } from '../../../db/indexedDb';
import { formatDate } from '../../../shared/formatters';
import { AppUser, BackupDataPayload } from '../../../types';

interface BackupRestoreViewProps {
  currentUser: AppUser;
  onRefreshData: () => void;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({
  currentUser,
  onRefreshData,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [restorePayload, setRestorePayload] = useState<BackupDataPayload | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export JSON
  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      const payload = await dbService.createBackup();
      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const now = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `PLIS_BACKUP_${now}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setResultMessage({
        type: 'success',
        text: 'File backup JSON berhasil diunduh dan disimpan ke perangkat.',
      });
    } catch (err: any) {
      setResultMessage({ type: 'error', text: `Gagal membuat backup: ${err.message}` });
    } finally {
      setIsExporting(false);
    }
  };

  // Select file for restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResultMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.sourceApp || parsed.sourceApp !== 'PLIS_LAUNDRY_SYSTEM') {
          throw new Error('File ini bukan file backup resmi dari sistem PLIS!');
        }
        if (!parsed.data) {
          throw new Error('Struktur data backup tidak lengkap.');
        }
        setRestorePayload(parsed);
      } catch (err: any) {
        setResultMessage({
          type: 'error',
          text: `File tidak valid: ${err.message || 'Format JSON rusak'}`,
        });
        setRestorePayload(null);
      }
    };
    reader.readAsText(file);
  };

  // Confirm restore
  const handleConfirmRestore = async () => {
    if (!restorePayload) return;
    try {
      setIsRestoring(true);
      const res = await dbService.restoreBackup(restorePayload, currentUser);
      if (res.success) {
        setResultMessage({ type: 'success', text: res.message });
        setRestorePayload(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onRefreshData();
      } else {
        setResultMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setResultMessage({ type: 'error', text: `Gagal memulihkan data: ${err.message}` });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header Info */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">Backup & Restore Database</h3>
            <p className="text-[11px] text-slate-500">
              Penyimpanan lokal IndexedDB aman dalam format JSON terverifikasi
            </p>
          </div>
        </div>
      </div>

      {resultMessage && (
        <div
          className={`p-3 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
            resultMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {resultMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{resultMessage.text}</span>
        </div>
      )}

      {/* Backup Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-blue-600" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
            Cadangkan Data (Backup JSON)
          </h4>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Unduh seluruh data transaksi, pelanggan, master layanan, pembayaran, pengeluaran, dan audit log ke dalam satu file JSON untuk disimpan di Google Drive, memori HP, atau dipindahkan ke perangkat lain.
        </p>

        <button
          onClick={handleExportBackup}
          disabled={isExporting}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
        >
          <FileJson className="w-4 h-4" />
          <span>{isExporting ? 'Memproses Cadangan...' : 'Unduh File Backup Sekarang'}</span>
        </button>
      </div>

      {/* Restore Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-emerald-600" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
            Pulihkan Data (Restore File)
          </h4>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Pilih file backup (.json) sebelumnya. Aplikasi akan memvalidasi integritas data dan menampilkan ringkasan data sebelum proses pemulihan dijalankan.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="block w-full text-xs text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
        />

        {/* Restore Preview Modal Dialog */}
        {restorePayload && (
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-amber-800 font-bold">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Verifikasi Ringkasan Data File Backup:</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 bg-white p-2.5 rounded-lg border border-amber-100">
              <div>Waktu Ekspor: <strong>{formatDate(restorePayload.exportedAt, true)}</strong></div>
              <div>Versi Format: <strong>v{restorePayload.version}</strong></div>
              <div>Transaksi: <strong>{restorePayload.data.transactions?.length || 0} nota</strong></div>
              <div>Pelanggan: <strong>{restorePayload.data.customers?.length || 0} orang</strong></div>
              <div>Master Layanan: <strong>{restorePayload.data.services?.length || 0} item</strong></div>
              <div>Catatan Biaya: <strong>{restorePayload.data.expenses?.length || 0} entri</strong></div>
            </div>

            <div className="text-[11px] text-amber-800">
              ⚠️ <em>Catatan Keamanan:</em> Data saat ini akan digantikan dengan data yang ada di dalam file cadangan ini.
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setRestorePayload(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="flex-1 py-2 bg-white text-slate-700 font-semibold rounded-lg border border-slate-300"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isRestoring ? 'Memulihkan...' : 'Lanjutkan Pemulihan'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
