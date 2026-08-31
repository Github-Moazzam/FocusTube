import { db, Playlist, Video, Progress } from './db';

export async function addPlaylistLocally(playlist: Playlist, videos: Video[]) {
  const now = new Date().toISOString();
  
  await db.transaction('rw', db.playlists, db.videos, async () => {
    const existing = await db.playlists.get(playlist.id);
    const enrichedPlaylist = {
      ...playlist,
      date_added: existing?.date_added || playlist.date_added || now,
      updated_at: now,
      deleted_at: null
    };
    
    await db.playlists.put(enrichedPlaylist as Playlist);
    await db.videos.bulkPut(videos);
  });
}

export async function updateVideoProgressLocally(
  videoId: string,
  playlistId: string,
  positionSeconds: number,
  durationSeconds: number | null
) {
  const isCompleted = durationSeconds !== null && positionSeconds >= durationSeconds * 0.95;
  
  await db.progress.put({
    video_id: videoId,
    playlist_id: playlistId,
    position_seconds: positionSeconds,
    duration_seconds: durationSeconds,
    completed: isCompleted,
    updated_at: new Date().toISOString()
  });
}

export async function getPlaylists() {
  return await db.playlists.filter(p => !p.deleted_at).sortBy('date_added');
}

export async function getPlaylist(id: string) {
  return await db.playlists.get(id);
}

export async function getPlaylistVideos(playlistId: string) {
  return await db.videos
    .where('playlist_id')
    .equals(playlistId)
    .sortBy('position');
}

export async function getProgress(videoId: string) {
  return await db.progress.get(videoId);
}

export async function getAllProgressForPlaylist(playlistId: string) {
  return await db.progress
    .where('playlist_id')
    .equals(playlistId)
    .toArray();
}

export async function softDeletePlaylist(playlistId: string) {
  const playlist = await db.playlists.get(playlistId);
  if (playlist) {
    await db.playlists.put({
      ...playlist,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
}

export async function clearAllLocalData() {
  await db.transaction('rw', db.playlists, db.videos, db.progress, async () => {
    await db.playlists.clear();
    await db.videos.clear();
    await db.progress.clear();
  });
}

