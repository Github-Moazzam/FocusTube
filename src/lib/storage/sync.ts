import { db } from './db';
import { pullSyncData, pushSyncData } from './adapter';

let syncTimeout: NodeJS.Timeout | null = null;
let isSyncing = false;

export type SyncState = 'idle' | 'syncing' | 'error' | 'offline';
type SyncStatusCallback = (state: SyncState) => void;

const listeners = new Set<SyncStatusCallback>();

export function onSyncStatusChange(cb: SyncStatusCallback) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function notifyStatus(state: SyncState) {
  listeners.forEach(cb => cb(state));
}

// Debounced sync call. We accumulate writes locally and flush every 30s.
export function scheduleSync(immediate = false) {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  if (immediate) {
    executeSync();
  } else {
    syncTimeout = setTimeout(() => {
      executeSync();
    }, 30000); // 30 seconds
  }
}

async function executeSync() {
  if (isSyncing || typeof window === 'undefined' || !navigator.onLine) {
    if (!navigator.onLine) notifyStatus('offline');
    return;
  }
  
  isSyncing = true;
  notifyStatus('syncing');

  try {
    // 1. Gather all local data
    const localPlaylists = await db.playlists.toArray();
    const localVideos = await db.videos.toArray();
    const localProgress = await db.progress.toArray();

    // 2. Push to server and get merged result back
    const serverResult = await pushSyncData({
      playlists: localPlaylists,
      videos: localVideos,
      progress: localProgress,
    });

    // 3. Write merged result back to local DB
    await db.transaction('rw', db.playlists, db.videos, db.progress, async () => {
      await db.playlists.bulkPut(serverResult.playlists);
      await db.videos.bulkPut(serverResult.videos);
      await db.progress.bulkPut(serverResult.progress);
    });

    notifyStatus('idle');
  } catch (error) {
    console.error('Sync failed', error);
    notifyStatus('error');
  } finally {
    isSyncing = false;
  }
}

// Initial pull on app load
export async function initialPull() {
  if (typeof window === 'undefined' || !navigator.onLine) return;
  
  try {
    notifyStatus('syncing');
    const serverResult = await pullSyncData();
    
    await db.transaction('rw', db.playlists, db.videos, db.progress, async () => {
      await db.playlists.bulkPut(serverResult.playlists);
      await db.videos.bulkPut(serverResult.videos);
      await db.progress.bulkPut(serverResult.progress);
    });
    notifyStatus('idle');
  } catch (error) {
    console.error('Initial pull failed', error);
    notifyStatus('error');
  }
}
