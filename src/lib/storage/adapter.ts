import { Playlist, Video, Progress } from './db';

export interface SyncPayload {
  playlists: Playlist[];
  videos: Video[];
  progress: Progress[];
}

export async function pullSyncData(): Promise<SyncPayload> {
  const res = await fetch('/api/sync', { method: 'GET' });
  if (!res.ok) {
    throw new Error('Failed to pull sync data');
  }
  return await res.json();
}

export async function pushSyncData(payload: SyncPayload): Promise<SyncPayload> {
  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error('Failed to push sync data');
  }
  return await res.json();
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch('/api/sync?health=1', { method: 'GET' });
    return res.ok;
  } catch (err) {
    return false;
  }
}

