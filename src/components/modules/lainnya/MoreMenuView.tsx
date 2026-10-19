import React from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  Bluetooth,
  ChevronRight,
  Database,
  FileSpreadsheet,
  FolderTree,
  History,
  Lock,
  Printer,
  Settings,
  ShieldCheck,
  Store,
  Users,
  Wallet,
  WashingMachine,
} from 'lucide-react';
import { AppUser } from '../../../types';

export type SubMenuType =
  | 'status-cucian'
  | 'pengeluaran'
  | 'bluetooth'
  | 'rekap-kas'
  | 'piutang'
  | 'master-layanan'
  | 'backup-restore'
  | 'pengguna'
  | 'pengaturan'
  | 'audit'
  | 'ekspor';

interface MenuItem {
  id: SubMenuType;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  badge?: string;
  badgeColor?: string;
  ownerOnly?: boolean;
}

interface MenuGroup {
  groupTitle: string;
  items: MenuItem[];
}

interface MoreMenuViewProps {
  onSelectMenu: (menu: SubMenuType) => void;
  currentUser: AppUser;
  inProcessCount: number;
  unpaidCount: number;
}

export const MoreMenuView: React.FC<MoreMenuViewProps> = ({
  onSelectMenu,
  currentUser,
  inProcessCount,
  unpaidCount,
}) => {
  const menuGroups: MenuGroup[] = [
    {
      groupTitle: 'Operasional Kasir & Cucian',
      items: [
        {
          id: 'status-cucian' as SubMenuType,
          title: 'Status Cucian',
          subtitle: 'Pipeline pengerjaan: Diterima, Diproses, Siap Diambil, Selesai',
          icon: WashingMachine,
          iconColor: 'bg-blue-100 text-blue-700',
          badge: inProcessCount > 0 ? `${inProcessCount} Proses` : undefined,
          badgeColor: 'bg-blue-500 text-white',
        },
        {
          id: 'pengeluaran' as SubMenuType,
          title: 'Catat Pengeluaran',
          subtitle: 'Biaya deterjen, operasional harian, listrik & air, kuitansi',
          icon: ArrowDownRight,
          iconColor: 'bg-rose-100 text-rose-700',
        },
        {
          id: 'rekap-kas' as SubMenuType,
          title: 'Rekap Kas & Laci Kasir',
          subtitle: 'Hitung uang fisik laci kasir, selisih kas, dan tutup buku harian',
          icon: Wallet,
          iconColor: 'bg-emerald-100 text-emerald-700',
        },
        {
          id: 'piutang' as SubMenuType,
          title: 'Piutang & Pembayaran Sebagian',
          subtitle: 'Daftar tagihan yang belum lunas dan pencatatan angsuran',
          icon: AlertCircle,
          iconColor: 'bg-amber-100 text-amber-700',
          badge: unpaidCount > 0 ? `${unpaidCount} Nota` : undefined,
          badgeColor: 'bg-rose-500 text-white',
        },
      ],
    },
    {
      groupTitle: 'Peralatan & Konfigurasi Produk',
      items: [
        {
          id: 'bluetooth' as SubMenuType,
          title: 'Bluetooth Thermal Printer 58 mm',
          subtitle: 'Hubungkan printer struk mini Bluetooth via Web Bluetooth API',
          icon: Bluetooth,
          iconColor: 'bg-indigo-100 text-indigo-700',
        },
        {
          id: 'master-layanan' as SubMenuType,
          title: 'Master Layanan & Satuan',
          subtitle: 'Struktur: Kategori → Klasifikasi → Layanan, master kg, pcs, m2',
          icon: FolderTree,
          iconColor: 'bg-cyan-100 text-cyan-700',
        },
      ],
    },
    {
      groupTitle: 'Administrasi & Keamanan Data',
      items: [
        {
          id: 'pengguna' as SubMenuType,
          title: 'Manajemen Pengguna & PIN',
          subtitle: 'Kelola akun Owner dan Karyawan, PIN akses cepat',
          icon: Users,
          iconColor: 'bg-violet-100 text-violet-700',
        },
        {
          id: 'pengaturan' as SubMenuType,
          title: 'Pengaturan Usaha',
          subtitle: 'Profil outlet, nama laundry, alamat, ketentuan pada nota cetak',
          icon: Store,
          iconColor: 'bg-slate-100 text-slate-700',
          ownerOnly: true,
        },
        {
          id: 'audit' as SubMenuType,
          title: 'Audit Aktivitas',
          subtitle: 'Rekam jejak pembuatan transaksi, ubah status, pembayaran, edit',
          icon: ShieldCheck,
          iconColor: 'bg-blue-100 text-blue-700',
        },
        {
          id: 'backup-restore' as SubMenuType,
          title: 'Backup & Restore Database',
          subtitle: 'Ekspor database ke JSON tervalidasi dan pemulihan aman',
          icon: Database,
          iconColor: 'bg-teal-100 text-teal-700',
        },
        {
          id: 'ekspor' as SubMenuType,
          title: 'Pusat Ekspor Data CSV',
          subtitle: 'Unduh file spreadsheet transaksi, pelanggan, biaya, dan pembayaran',
          icon: FileSpreadsheet,
          iconColor: 'bg-emerald-100 text-emerald-700',
        },
      ],
    },
  ];

  return (
    <div className="space-y-4 pb-24">
      {menuGroups.map((grp, gIdx) => (
        <div key={gIdx} className="space-y-2">
          <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {grp.groupTitle}
          </h3>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {grp.items.map((item) => {
              const IconComp = item.icon;
              const isRestricted = item.ownerOnly && currentUser.role !== 'OWNER';

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (isRestricted) {
                      alert('Menu ini memerlukan hak akses OWNER.');
                      return;
                    }
                    onSelectMenu(item.id);
                  }}
                  className={`p-3.5 flex items-center justify-between gap-3 transition cursor-pointer ${
                    isRestricted ? 'opacity-60 bg-slate-50/50' : 'hover:bg-slate-50 active:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.iconColor}`}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 truncate">
                          {item.title}
                        </span>
                        {item.ownerOnly && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-indigo-100 text-indigo-700 uppercase">
                            Owner
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5 max-w-[240px] sm:max-w-md">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
