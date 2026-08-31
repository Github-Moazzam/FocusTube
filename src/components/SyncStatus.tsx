'use client';

import { useEffect, useState } from 'react';
import { onSyncStatusChange, SyncState, initialPull } from '@/lib/storage/sync';
import { Cloud, CloudOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SyncStatus() {
  const [status, setStatus] = useState<SyncState>('idle');

  useEffect(() => {
    // Initial pull on mount
    initialPull();
    
    // Subscribe to status changes
    const unsubscribe = onSyncStatusChange(setStatus);
    return unsubscribe;
  }, []);

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
      status === 'idle' ? "bg-zinc-900 text-zinc-400" :
      status === 'syncing' ? "bg-blue-500/10 text-blue-400" :
      status === 'offline' ? "bg-amber-500/10 text-amber-500" :
      "bg-red-500/10 text-red-500"
    )}>
      {status === 'idle' && (
        <>
          <Cloud className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Synced</span>
        </>
      )}
      {status === 'syncing' && (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="hidden sm:inline">Syncing...</span>
        </>
      )}
      {status === 'offline' && (
        <>
          <CloudOff className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Offline</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Error</span>
        </>
      )}
    </div>
  );
}

