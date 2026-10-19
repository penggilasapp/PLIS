import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, Check, RefreshCw } from 'lucide-react';

interface PullToRefreshContainerProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  pullThreshold?: number; // Distance in px to trigger refresh (default 65)
  maxPullDistance?: number; // Max distance in px (default 110)
  disabled?: boolean;
}

export const PullToRefreshContainer: React.FC<PullToRefreshContainerProps> = ({
  onRefresh,
  children,
  className = '',
  pullThreshold = 65,
  maxPullDistance = 110,
  disabled = false,
}) => {
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const startYRef = useRef<number>(0);
  const startXRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if page or container is scrolled to the very top
  const isAtTop = useCallback(() => {
    if (typeof window === 'undefined') return true;
    const windowScrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const containerScrollTop = containerRef.current ? containerRef.current.scrollTop : 0;
    return windowScrollTop <= 1 && containerScrollTop <= 1;
  }, []);

  const triggerRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setIsSuccess(false);

    // Haptic feedback on modern mobile devices
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {
        // ignore
      }
    }

    const startTime = Date.now();
    try {
      await onRefresh();
    } catch (err) {
      console.error('Pull-to-refresh failed', err);
    } finally {
      // Keep refreshing indicator visible for at least 500ms for smooth perception
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, 550 - elapsed);

      setTimeout(() => {
        setIsRefreshing(false);
        setIsSuccess(true);

        // Show success state briefly then snap back
        setTimeout(() => {
          setIsSuccess(false);
          setPullDistance(0);
        }, 500);
      }, remainingTime);
    }
  }, [isRefreshing, onRefresh]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    if (isAtTop()) {
      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
      isDraggingRef.current = true;
    } else {
      isDraggingRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || disabled || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const deltaY = currentY - startYRef.current;
    const deltaX = Math.abs(currentX - startXRef.current);

    // If gesture is more horizontal than vertical, ignore to let normal swipe happen
    if (deltaX > deltaY) {
      isDraggingRef.current = false;
      setPullDistance(0);
      return;
    }

    // Only pull down if at top
    if (deltaY > 0 && isAtTop()) {
      // Damped resistance formula
      const damped = Math.min(maxPullDistance, Math.pow(deltaY, 0.82) * 1.8);
      setPullDistance(damped);

      // Prevent native pull-to-reload on supported webviews
      if (e.cancelable && damped > 10) {
        e.preventDefault();
      }
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current || disabled) return;
    isDraggingRef.current = false;

    if (pullDistance >= pullThreshold && !isRefreshing) {
      triggerRefresh();
    } else if (!isRefreshing) {
      setPullDistance(0);
    }
  };

  // Determine current active visual height
  const activeDistance = isRefreshing || isSuccess ? 54 : pullDistance;
  const progressRatio = Math.min(1, pullDistance / pullThreshold);
  const isPastThreshold = pullDistance >= pullThreshold;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`relative select-none ${className}`}
      style={{ touchAction: isDraggingRef.current && pullDistance > 0 ? 'none' : 'auto' }}
    >
      {/* Pull-to-refresh Indicator Banner */}
      <div
        className="w-full flex items-center justify-center overflow-hidden transition-all duration-200 pointer-events-none z-20"
        style={{
          height: `${activeDistance}px`,
          opacity: activeDistance > 8 ? 1 : 0,
        }}
      >
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-xs transition-all border ${
            isSuccess
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : isRefreshing
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : isPastThreshold
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-slate-600 border-slate-200 shadow-2xs'
          }`}
          style={{
            transform: `scale(${isRefreshing || isSuccess ? 1 : 0.85 + progressRatio * 0.15})`,
          }}
        >
          {isSuccess ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
              <span>Data Berhasil Diperbarui</span>
            </>
          ) : isRefreshing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
              <span>Memperbarui data PLIS...</span>
            </>
          ) : isPastThreshold ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-white" />
              <span>Lepaskan untuk memuat ulang</span>
            </>
          ) : (
            <>
              <ArrowDown
                className="w-3.5 h-3.5 text-slate-500 transition-transform duration-100"
                style={{
                  transform: `rotate(${progressRatio * 180}deg)`,
                }}
              />
              <span>Tarik ke bawah untuk memuat ulang</span>
            </>
          )}
        </div>
      </div>

      {/* Main Content with smooth translation during pull */}
      <div
        style={{
          transform: isDraggingRef.current && pullDistance > 0 ? `translateY(${pullDistance * 0.25}px)` : 'none',
          transition: isDraggingRef.current ? 'none' : 'transform 0.25s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
};
