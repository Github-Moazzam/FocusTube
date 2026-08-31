import Dexie, { type Table } from 'dexie';

export interface Playlist {
  id: string;
  title: string;
  channel: string | null;
  thumbnail_url: string | null;
  video_count: number;
  date_added: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Video {
  video_id: string;
  playlist_id: string;
  title: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  position: number;
}

export interface Progress {
  video_id: string;
  playlist_id: string;
  position_seconds: number;
  duration_seconds: number | null;
  completed: boolean;
  updated_at: string;
}

export class FocusTubeDB extends Dexie {
  playlists!: Table<Playlist, string>;
  videos!: Table<Video, [string, string]>; // [playlist_id, video_id]
  progress!: Table<Progress, string>; // video_id

  constructor() {
    super('FocusTubeDB');
    this.version(1).stores({
      playlists: 'id, title, updated_at, deleted_at',
      videos: '[playlist_id+video_id], playlist_id, video_id',
      progress: 'video_id, playlist_id, updated_at, completed'
    });
  }
}

export const db = new FocusTubeDB();

