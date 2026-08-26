import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, CloudUpload } from 'lucide-react';
import { offlineSync } from '@/src/services/offlineSyncService';
import { useToast } from '@/src/contexts/ToastContext';

export default function OfflineStatusBar() {
  const [isOnline, setIsOnline] = useState(offlineSync.getOnlineStatus());
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const unsubscribe = offlineSync.subscribe((online, count) => {
      setIsOnline(online);
      setPendingCount(count);
    });
    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    if (!isOnline) {
      showToast('error', 'Offline Mode', 'Cannot sync while disconnected from network.');
      return;
    }
    setIsSyncing(true);
    const res = await offlineSync.autoSync();
    setIsSyncing(false);
    if (res.syncedCount > 0) {
      showToast('success', 'Offline Queue Synced', `Synced ${res.syncedCount} queued action(s) to PostgreSQL database.`);
    } else if (res.errors > 0) {
      showToast('error', 'Sync Warnings', `${res.errors} action(s) could not be synced.`);
    } else {
      showToast('info', 'All Synced', 'No pending offline actions.');
    }
  };

  // If online and no pending offline actions, do not clutter UI unless desired
  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[99990] animate-fadeIn select-none">
      <div
        className={`px-4 py-2.5 rounded-2xl border shadow-xl backdrop-blur-md flex items-center gap-3 transition-all ${
          !isOnline
            ? 'bg-amber-950/90 border-amber-500/40 text-amber-200 shadow-amber-950/40'
            : 'bg-indigo-950/90 border-indigo-500/40 text-indigo-200 shadow-indigo-950/40'
        }`}
      >
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></div>
          ) : (
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
          )}

          {!isOnline ? (
            <WifiOff className="w-4 h-4 text-amber-400" />
          ) : (
            <CloudUpload className="w-4 h-4 text-indigo-400" />
          )}

          <div className="text-xs">
            <span className="font-bold block">
              {!isOnline ? 'Offline Floor Mode Active' : 'Network Restored'}
            </span>
            <span className="text-[10px] text-slate-300">
              {pendingCount > 0
                ? `${pendingCount} scan/count action(s) cached locally`
                : 'All actions synchronized'}
            </span>
          </div>
        </div>

        {pendingCount > 0 && isOnline && (
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-md active:scale-95"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>
    </div>
  );
}
