import React from 'react';
import { BarChart3, LayoutDashboard, MoreHorizontal, ReceiptText, Users } from 'lucide-react';

export type MainTab = 'dashboard' | 'transaksi' | 'pelanggan' | 'laporan' | 'lainnya';

interface BottomNavProps {
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
  activeOrderCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  activeOrderCount,
}) => {
  const tabs: { id: MainTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transaksi', label: 'Transaksi', icon: ReceiptText, badge: activeOrderCount },
    { id: 'pelanggan', label: 'Pelanggan', icon: Users },
    { id: 'laporan', label: 'Laporan', icon: BarChart3 },
    { id: 'lainnya', label: 'Lainnya', icon: MoreHorizontal },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe shadow-lg">
      <div className="max-w-md md:max-w-2xl mx-auto flex items-center justify-around px-2 py-1.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className="flex-1 flex flex-col items-center justify-center py-1 group focus:outline-hidden touch-manipulation"
            >
              {/* Material 3 Active Pill Indicator */}
              <div
                className={`relative px-4 py-1 rounded-full transition-all duration-200 flex items-center justify-center ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <IconComponent className="w-5 h-5" />

                {/* Badge if any */}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center shadow-xs ${
                      isActive ? 'bg-amber-400 text-slate-950' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[11px] mt-1 transition-colors ${
                  isActive ? 'font-bold text-blue-700' : 'font-medium text-slate-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
