'use client';

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Playlist } from '@/lib/storage/db';
import { addPlaylistLocally, getAllProgressForPlaylist } from '@/lib/storage/crud';
import { parseYouTubeUrl } from '@/lib/youtube/extract';
import { scheduleSync } from '@/lib/storage/sync';
import Link from 'next/link';
import { Plus, Search, RefreshCw, Trash2, MoreVertical, PlayCircle, Library } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LibraryPage() {
  const [urlInput, setUrlInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [importError, setImportError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Use Dexie's useLiveQuery to automatically re-render when data changes
  const playlists = useLiveQuery(
    () => db.playlists.filter(p => !p.deleted_at).sortBy('date_added')
  );

  const filteredPlaylists = playlists?.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setImportError('');
    setIsImporting(true);
    setImportStatus('Parsing URL...');

    try {
      const parsed = parseYouTubeUrl(urlInput);
      if (!parsed) {
        throw new Error('Invalid YouTube URL');
      }

      setImportStatus('Fetching from YouTube API...');
      const res = await fetch('/api/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch playlist');
      }

      const { playlist, videos } = await res.json();
      
      setImportStatus(`Saving ${videos.length} videos...`);
      await addPlaylistLocally(playlist, videos);
      
      // Trigger sync
      scheduleSync(true);

      setUrlInput('');
      setImportStatus('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setImportError(err.message);
      } else {
        setImportError('An error occurred during import');
      }
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4 text-zinc-100">Add content</h2>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 max-w-2xl">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste YouTube playlist or video URL..."
            className="flex-1 px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors placeholder:text-zinc-500"
            disabled={isImporting}
          />
          <button
            type="submit"
            disabled={isImporting || !urlInput.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/50 disabled:text-zinc-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap sm:w-auto"
          >
            {isImporting ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            Add
          </button>
        </form>
        {importStatus && !importError && <p className="mt-3 text-sm text-blue-400">{importStatus}</p>}
        {importError && <p className="mt-3 text-sm text-red-400">{importError}</p>}
      </section>

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Your Library</h2>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search library..."
              className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {playlists === undefined ? (
          <div className="text-zinc-500">Loading library...</div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-20 px-4 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
            <Library className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-300 mb-1">Your library is empty</h3>
            <p className="text-zinc-500">Add a YouTube playlist URL above to get started.</p>
          </div>
        ) : filteredPlaylists.length === 0 ? (
          <div className="text-zinc-500">No playlists match your search.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPlaylists.map(playlist => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PlaylistCard({ playlist }: { playlist: Playlist }) {
  // We use useLiveQuery inside the component to reactively get progress
  const progressList = useLiveQuery(() => getAllProgressForPlaylist(playlist.id), [playlist.id]);
  
  const completedCount = progressList?.filter(p => p.completed).length || 0;
  const progressPercent = playlist.video_count > 0 
    ? Math.round((completedCount / playlist.video_count) * 100) 
    : 0;

  return (
    <Link href={`/playlist/${playlist.id}`} className="group block">
      <div className="aspect-video bg-zinc-900 rounded-xl overflow-hidden relative border border-zinc-800 group-hover:border-zinc-700 transition-colors">
        {playlist.thumbnail_url ? (
          <img 
            src={playlist.thumbnail_url} 
            alt={playlist.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800">
            <PlayCircle className="w-12 h-12 text-zinc-600" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
        
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div className="text-xs font-medium bg-black/60 backdrop-blur-md px-2 py-1 rounded text-zinc-200">
            {playlist.video_count} videos
          </div>
        </div>
      </div>
      
      <div className="mt-3 px-1">
        <h3 className="font-medium line-clamp-2 text-zinc-100 group-hover:text-blue-400 transition-colors">
          {playlist.title}
        </h3>
        {playlist.channel && (
          <p className="text-sm text-zinc-500 mt-1">{playlist.channel}</p>
        )}
        
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-medium text-zinc-400 min-w-[32px] text-right">
            {progressPercent}%
          </span>
        </div>
      </div>
    </Link>
  );
}
