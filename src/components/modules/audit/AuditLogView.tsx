import React, { useEffect, useState } from 'react';
import { Clock, History, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { formatDate } from '../../../shared/formatters';
import { AuditLog } from '../../../types';
import { auditService } from '../../../services/settingsService';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const loadLogs = async () => {
    const list = await auditService.getAll();
    setLogs(list);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    if (filterType !== 'ALL' && l.actionType !== filterType) {
      return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.description.toLowerCase().includes(q) ||
      l.userName.toLowerCase().includes(q) ||
      l.entityId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 pb-24">
      {/* Top Header Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Audit Log & Rekam Jejak Aktivitas</h3>
              <p className="text-[11px] text-slate-500">
                Pencatatan waktu nyata untuk transaksi, koreksi, pembayaran, dan kas
              </p>
            </div>
          </div>

          <button
            onClick={loadLogs}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition"
            title="Refresh Log"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari aktivitas, nama pengguna, atau ID..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
          />
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-2">
        {filteredLogs.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            Tidak ada riwayat aktivitas ditemukan.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-1 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  {log.description}
                </span>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {formatDate(log.timestamp, true)}
                </span>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-0.5">
                <span className="font-semibold text-slate-700">Oleh: {log.userName}</span>
                <span>•</span>
                <span className="font-mono text-slate-400">ID: {log.entityId}</span>
                <span>•</span>
                <span className="bg-slate-100 px-1.5 py-0.2 rounded text-[10px] font-bold text-slate-600">
                  {log.actionType}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
