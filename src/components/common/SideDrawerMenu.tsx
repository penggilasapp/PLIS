import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bluetooth,
  ChevronRight,
  FolderTree,
  LogOut,
  Menu,
  MousePointer,
  MoveRight,
  Printer,
  Scale,
  Settings,
  Sparkles,
  Touchpad,
  User,
  UserCheck,
  WashingMachine,
  X,
} from 'lucide-react';
import { AppUser, BusinessSettings } from '../../types';

export type DrawerMenuDestination =
  | 'profile'
  | 'status-cucian'
  | 'master-layanan'
  | 'master-satuan'
  | 'master-print'
  | 'bluetooth';

export interface SideDrawerMenuProps {
  isOpen: boolean;
  onOpen?: () => void;
  onClose: () => void;
  currentUser: AppUser;
  settings: BusinessSettings;
  inProcessCount: number;
  onNavigate: (dest: DrawerMenuDestination) => void;
  onOpenSwitchUser: () => void;
}

export const SideDrawerMenu: React.FC<SideDrawerMenuProps> = ({
  isOpen,
  onOpen,
  onClose,
  currentUser,
  settings,
  inProcessCount,
  onNavigate,
  onOpenSwitchUser,
}) => {
  // Drawer width reference (standard responsive drawer)
  const [drawerWidth, setDrawerWidth] = useState<number>(340);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Dragging & gesture states
  const [isDragging, setIsDragging] = useState(false);
  const [dragTranslateX, setDragTranslateX] = useState<number | null>(null);

  // Refs for tracking drag position without re-render lags
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const dragModeRef = useRef<'opening' | 'closing'>('opening');
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedDeltaXRef = useRef<number>(0);

  // Update dynamic drawer width on resize
  useEffect(() => {
    const updateWidth = () => {
      const width = Math.min(384, Math.floor(window.innerWidth * 0.85));
      setDrawerWidth(width);
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // 1. TOUCHPAD 2-FINGER HORIZONTAL SWIPE (WHEEL EVENT LISTENER)
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);

      // Must be predominantly horizontal gesture (typical for touchpad swipe)
      if (absX < 8 || absX <= absY * 1.1) {
        return;
      }

      if (!isOpen) {
        // When drawer is closed:
        // Moving fingers to the right on trackpad generates negative deltaX (natural scrolling)
        // Check if pointer is on the left half of the screen
        const isLeftHalf = e.clientX <= window.innerWidth * 0.6;
        if (isLeftHalf) {
          // Swiping right: deltaX is negative
          if (e.deltaX < -10) {
            accumulatedDeltaXRef.current += e.deltaX;
            if (accumulatedDeltaXRef.current <= -28) {
              onOpen?.();
              accumulatedDeltaXRef.current = 0;
            }
          }
        }
      } else {
        // When drawer is open:
        // Moving fingers to the left generates positive deltaX
        if (e.deltaX > 10) {
          accumulatedDeltaXRef.current += e.deltaX;
          if (accumulatedDeltaXRef.current >= 28) {
            onClose();
            accumulatedDeltaXRef.current = 0;
          }
        }
      }

      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
      wheelTimeoutRef.current = setTimeout(() => {
        accumulatedDeltaXRef.current = 0;
      }, 200);
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleWheel);
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
    };
  }, [isOpen, onOpen, onClose]);

  // 2. WINDOW-LEVEL TOUCH & POINTER SWIPE (MOBILE & TOUCHSCREEN / TOUCHPAD GESTURES)
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let isTrackingTouch = false;

    const handleWindowTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!isOpen) {
        // Started within left 45px of screen
        if (touch.clientX <= 45) {
          touchStartX = touch.clientX;
          touchStartY = touch.clientY;
          isTrackingTouch = true;
          isDraggingRef.current = true;
          dragModeRef.current = 'opening';
          dragStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
          setIsDragging(true);
        }
      } else {
        // Drawer is open, track if touch starts on drawer or backdrop
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        if (touch.clientX <= drawerWidth + 30) {
          isTrackingTouch = true;
          isDraggingRef.current = true;
          dragModeRef.current = 'closing';
          dragStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
          setIsDragging(true);
        }
      }
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (!isTrackingTouch) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = Math.abs(touch.clientY - touchStartY);

      if (dragModeRef.current === 'opening') {
        if (deltaX > 0 && deltaX > deltaY) {
          // Slide in from left
          const trans = Math.min(0, -drawerWidth + deltaX);
          setDragTranslateX(trans);
        }
      } else {
        if (deltaX < 0 && Math.abs(deltaX) > deltaY) {
          // Slide out to left
          const trans = Math.min(0, deltaX);
          setDragTranslateX(trans);
        }
      }
    };

    const handleWindowTouchEnd = (e: TouchEvent) => {
      if (!isTrackingTouch) return;
      isTrackingTouch = false;
      isDraggingRef.current = false;
      setIsDragging(false);

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const elapsed = Date.now() - dragStartRef.current.time;
      const velocity = deltaX / Math.max(1, elapsed);

      if (dragModeRef.current === 'opening') {
        if (deltaX > 60 || velocity > 0.25) {
          onOpen?.();
        }
      } else {
        if (deltaX < -50 || velocity < -0.25) {
          onClose();
        }
      }

      setDragTranslateX(null);
    };

    window.addEventListener('touchstart', handleWindowTouchStart, { passive: true });
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: true });
    window.addEventListener('touchend', handleWindowTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleWindowTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleWindowTouchStart);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchEnd);
    };
  }, [isOpen, drawerWidth, onOpen, onClose]);

  // 3. KEYBOARD SHORTCUTS (Escape to close, Ctrl+M to toggle)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        if (isOpen) onClose();
        else onOpen?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onOpen, onClose]);

  // Pointer drag handler for Edge Handle / Left Strip
  const handleEdgePointerDown = (e: React.PointerEvent) => {
    dragStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    isDraggingRef.current = true;
    dragModeRef.current = 'opening';
    setIsDragging(true);
    setDragTranslateX(-drawerWidth + e.clientX);

    const onPointerMove = (ev: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = ev.clientX - dragStartRef.current.x;
      if (deltaX > 0) {
        const trans = Math.min(0, -drawerWidth + deltaX);
        setDragTranslateX(trans);
      }
    };

    const onPointerUp = (ev: PointerEvent) => {
      isDraggingRef.current = false;
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      const deltaX = ev.clientX - dragStartRef.current.x;
      const elapsed = Date.now() - dragStartRef.current.time;
      const velocity = deltaX / Math.max(1, elapsed);

      if (deltaX > 60 || velocity > 0.25) {
        onOpen?.();
      }
      setDragTranslateX(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  // Pointer drag handler for Closing Drawer from inside
  const handleDrawerPointerDown = (e: React.PointerEvent) => {
    // Only start closing drag if started near top bar or right edge of drawer
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select')) {
      return;
    }

    dragStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    isDraggingRef.current = true;
    dragModeRef.current = 'closing';
    setIsDragging(true);

    const onPointerMove = (ev: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = ev.clientX - dragStartRef.current.x;
      if (deltaX < 0) {
        setDragTranslateX(deltaX);
      }
    };

    const onPointerUp = (ev: PointerEvent) => {
      isDraggingRef.current = false;
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      const deltaX = ev.clientX - dragStartRef.current.x;
      const elapsed = Date.now() - dragStartRef.current.time;
      const velocity = deltaX / Math.max(1, elapsed);

      if (deltaX < -60 || velocity < -0.25) {
        onClose();
      }
      setDragTranslateX(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  // Calculate panel transform
  let panelTransform = isOpen ? 'translateX(0%)' : 'translateX(-100%)';
  if (isDragging && dragTranslateX !== null) {
    panelTransform = `translateX(${dragTranslateX}px)`;
  }

  // Calculate backdrop opacity
  let backdropOpacity = isOpen ? 1 : 0;
  if (isDragging && dragTranslateX !== null) {
    const fraction = (drawerWidth + dragTranslateX) / drawerWidth;
    backdropOpacity = Math.max(0, Math.min(1, fraction));
  }

  return (
    <>
      {/* 1. FLOATING LEFT EDGE SLIDE HANDLE & TOUCHPAD ZONE (Visible when drawer is closed) */}
      {!isOpen && (
        <div
          className="fixed left-0 top-0 bottom-0 w-8 z-30 pointer-events-auto touch-none flex items-center group cursor-ew-resize select-none"
          onPointerDown={handleEdgePointerDown}
          title="Slide touchpad atau geser ke kanan untuk buka menu samping"
        >
          {/* Subtle hit zone highlight on hover */}
          <div className="absolute inset-y-0 left-0 w-2.5 bg-blue-500/10 group-hover:bg-blue-500/25 transition-colors" />

          {/* Interactive Floating Pill Tab */}
          <button
            type="button"
            onClick={onOpen}
            className="relative -left-0.5 flex flex-col items-center gap-1.5 py-3 px-1.5 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 text-white rounded-r-2xl shadow-lg border-y border-r border-blue-400/40 hover:pl-2.5 transition-all text-[11px] font-bold group-hover:scale-105 active:scale-95 group-hover:shadow-blue-500/30 cursor-pointer"
            aria-label="Buka Menu Samping (Slide ke kanan)"
          >
            <ChevronRight className="w-4 h-4 text-white animate-pulse" />
            <span className="[writing-mode:vertical-lr] text-[10px] tracking-widest uppercase font-extrabold text-blue-100 group-hover:text-white drop-shadow-xs">
              Slide Menu
            </span>
          </button>
        </div>
      )}

      {/* 2. DRAWER CONTAINER OVERLAY */}
      <div
        className={`fixed inset-0 z-50 flex ${
          isOpen || isDragging ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        {/* Backdrop overlay */}
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200"
          style={{
            opacity: backdropOpacity,
            pointerEvents: isOpen ? 'auto' : 'none',
            transition: isDragging ? 'none' : 'opacity 250ms ease-out',
          }}
          onClick={onClose}
        />

        {/* Slide Drawer Panel (Slides in from Left) */}
        <div
          ref={drawerRef}
          onPointerDown={handleDrawerPointerDown}
          className="relative w-[85vw] max-w-xs sm:max-w-sm h-full bg-white shadow-2xl z-10 flex flex-col overflow-hidden will-change-transform"
          style={{
            transform: panelTransform,
            transition: isDragging ? 'none' : 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Top Drawer Header with Store Branding & Slide Hint */}
          <div className="px-5 py-3.5 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white font-black text-lg shrink-0 shadow-inner">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-extrabold text-sm tracking-tight truncate leading-tight">
                  {settings.storeName || 'PLIS Laundry'}
                </h2>
                <div className="flex items-center gap-1.5 text-[11px] text-blue-100 font-medium truncate mt-0.5">
                  <Touchpad className="w-3 h-3 shrink-0" />
                  <span>Menu Slide Samping</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition active:scale-95"
              title="Tutup Menu (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Gesture Info Banner */}
          <div className="px-4 py-1.5 bg-blue-50 border-b border-blue-100/70 text-blue-800 text-[10px] font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1">
              <MoveRight className="w-3 h-3 text-blue-600" />
              <span>Slide touchpad / geser layar ke kanan/kiri</span>
            </span>
            <span className="text-[9px] bg-blue-200/60 px-1.5 py-0.5 rounded text-blue-900 font-mono">
              Esc / Swipe
            </span>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {/* MENU A: PROFIL PENGGUNA AKTIF */}
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl border border-slate-200 p-3.5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Profil Pengguna Aktif
                </span>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    currentUser.role === 'OWNER'
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {currentUser.role === 'OWNER' ? 'Owner / Pemilik' : 'Operator Kasir'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-xs shrink-0 ${
                    currentUser.role === 'OWNER' ? 'bg-indigo-600' : 'bg-emerald-600'
                  }`}
                >
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-slate-900 truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {currentUser.phone ? currentUser.phone : 'ID: ' + currentUser.id}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Sedang Aktif Bertugas</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onOpenSwitchUser();
                }}
                className="w-full py-2 px-3 bg-white hover:bg-slate-50 active:scale-[0.98] border border-slate-300 rounded-xl font-bold text-slate-700 text-xs flex items-center justify-center gap-1.5 shadow-2xs transition"
              >
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Ganti Pengguna / Masuk PIN</span>
              </button>
            </div>

            {/* MENU STATIS: SLIDE MENU SAMPING */}
            <div className="space-y-1.5">
              <h3 className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Menu Layar Samping
              </h3>

              {/* B: STATUS CUCIAN */}
              <div
                onClick={() => {
                  onClose();
                  onNavigate('status-cucian');
                }}
                className="p-3 bg-white hover:bg-blue-50/70 active:bg-blue-100/50 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 cursor-pointer transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <WashingMachine className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900">Status Cucian</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      Pelacakan alur pengerjaan cucian
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {inProcessCount > 0 && (
                    <span className="bg-blue-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-2xs">
                      {inProcessCount}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* C: MASTER LAYANAN (BISA DI EDIT) */}
              <div
                onClick={() => {
                  onClose();
                  onNavigate('master-layanan');
                }}
                className="p-3 bg-white hover:bg-cyan-50/70 active:bg-cyan-100/50 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 cursor-pointer transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">
                    <FolderTree className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-900">Master Layanan</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-100 text-emerald-800">
                        Bisa di-edit
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      Kategori, paket cuci, tarif harga & durasi
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </div>

              {/* D: MASTER SATUAN (BISA DI EDIT) */}
              <div
                onClick={() => {
                  onClose();
                  onNavigate('master-satuan');
                }}
                className="p-3 bg-white hover:bg-amber-50/70 active:bg-amber-100/50 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 cursor-pointer transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-900">Master Satuan</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-100 text-emerald-800">
                        Bisa di-edit
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      Satuan hitung: kg, pcs, meter, pasang
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </div>

              {/* E: MASTER PRINT OUT */}
              <div
                onClick={() => {
                  onClose();
                  onNavigate('master-print');
                }}
                className="p-3 bg-white hover:bg-purple-50/70 active:bg-purple-100/50 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 cursor-pointer transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900">Master Print Out</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      Format nota thermal 58mm/80mm, kop & WA
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </div>

              {/* F: BLUETOOTH */}
              <div
                onClick={() => {
                  onClose();
                  onNavigate('bluetooth');
                }}
                className="p-3 bg-white hover:bg-indigo-50/70 active:bg-indigo-100/50 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 cursor-pointer transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Bluetooth className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900">Bluetooth Printer</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      Koneksi & uji cetak printer thermal nirkabel
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-500">
            <p className="font-bold text-slate-700">PLIS • Sistem Manajemen Laundry</p>
            <p className="text-[9px] text-slate-400 mt-0.5">
              Slide touchpad ke kiri untuk menutup • Esc
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
