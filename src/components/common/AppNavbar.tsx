import React, { useState } from 'react';
import { Bell, Database, Menu, Sparkles, UserCheck } from 'lucide-react';
import { AppUser, BusinessSettings } from '../../types';
import { PWAInstallButton } from './PWAInstallButton';
import { UserSwitcherModal } from './UserSwitcherModal';

interface AppNavbarProps {
  settings: BusinessSettings;
  currentUser: AppUser;
  users: AppUser[];
  onSwitchUser: (user: AppUser) => void;
  activeTabTitle: string;
  urgentDeadlineCount?: number;
  onOpenDeadlineModal?: () => void;
  onOpenSideMenu?: () => void;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({
  settings,
  currentUser,
  users,
  onSwitchUser,
  activeTabTitle,
  urgentDeadlineCount = 0,
  onOpenDeadlineModal,
  onOpenSideMenu,
}) => {
  const [showUserModal, setShowUserModal] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
          {/* Brand Info & Clickable Side Drawer Trigger */}
          <div className="flex items-center gap-2 min-w-0">
            {/* Top Icon Trigger */}
            <button
              type="button"
              onClick={onOpenSideMenu}
              className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0 hover:shadow-md hover:scale-[1.02] active:scale-95 transition cursor-pointer relative group"
              title="Klik gambar icon atau slide touchpad ke kanan untuk buka menu samping"
            >
              <Menu className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 border-2 border-white rounded-full"></span>
            </button>

            <div
              onClick={onOpenSideMenu}
              className="min-w-0 cursor-pointer group"
              title="Klik atau slide touchpad ke kanan untuk membuka menu samping"
            >
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-sm text-slate-900 tracking-tight truncate group-hover:text-blue-600 transition">
                  {settings.storeName || 'PLIS Laundry'}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
                  <Database className="w-2.5 h-2.5" />
                  IDB
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1">
                <span>{activeTabTitle}</span>
                <span className="text-[10px] text-blue-600 font-bold hidden xs:inline">• Slide Menu ⫸</span>
              </p>
            </div>
          </div>

          {/* Right Action Controls: Deadline Bell, PWA Install & User Role Pill */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Deadline Notification Bell */}
            <button
              onClick={onOpenDeadlineModal}
              className={`relative p-2 rounded-full transition ${
                urgentDeadlineCount > 0
                  ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
              title="Notifikasi Tenggat Waktu Cucian"
            >
              <Bell className={`w-4 h-4 ${urgentDeadlineCount > 0 ? 'animate-bounce' : ''}`} />
              {urgentDeadlineCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-extrabold text-[9px] px-1.5 py-0.2 rounded-full min-w-[17px] text-center shadow-xs">
                  {urgentDeadlineCount}
                </span>
              )}
            </button>

            <PWAInstallButton />

            {/* Active User Switcher Pill */}
            <button
              onClick={() => setShowUserModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 transition text-xs text-slate-700"
              title="Ganti Pengguna / Role"
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                  currentUser.role === 'OWNER' ? 'bg-indigo-600' : 'bg-emerald-600'
                }`}
              >
                {currentUser.name.slice(0, 1)}
              </div>
              <span className="font-semibold hidden xs:inline max-w-[80px] sm:max-w-[120px] truncate">
                {currentUser.name.split(' ')[0]}
              </span>
              <span
                className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                  currentUser.role === 'OWNER'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {currentUser.role}
              </span>
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      <UserSwitcherModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        users={users}
        currentUser={currentUser}
        onSwitchUser={onSwitchUser}
      />
    </>
  );
};
