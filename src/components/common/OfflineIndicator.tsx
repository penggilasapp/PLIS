import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="bg-amber-500 text-white text-xs px-3 py-1 text-center font-medium flex items-center justify-center gap-1.5 shadow-xs sticky top-0 z-50">
      <WifiOff className="w-3.5 h-3.5 animate-pulse" />
      <span>Mode Offline — Data tersimpan aman di IndexedDB perangkat ini</span>
    </div>
  );
};
