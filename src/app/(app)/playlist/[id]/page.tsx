'use client';

import { use } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Video, Progress } from '@/lib/storage/db';
import { getPlaylist, getPlaylistVideos, getAllProgressForPlaylist, softDeletePlaylist } from '@/lib/storage/crud';
import { scheduleSync } from '@/lib/storage/sync';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, CheckCircle2, MoreVertical, Trash2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const playlist = useLiveQuery(() => getPlaylist(id), [id]);
  const videos = useLiveQuery(() => getPlaylistVideos(id), [id]);
  const progress = useLiveQuery(() => getAllProgressForPlaylist(id), [id]);

  if (playlist === undefined || videos === undefined || progress === undefined) {
    return <div className="text-zinc-500 animate-pulse">Loading playlist...</div>;
  }

  if (!playlist) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl text-zinc-300 mb-4">Playlist not found</h2>
        <Link href="/" className="text-blue-400 hover:underline">Return to Library</Link>
      </div>
    );
  }

  const progressMap = new Map<string, Progress>();
  progress.forEach(p => progressMap.set(p.video_id, p));

  const completedCount = progress.filter(p => p.completed).length;
  const progressPercent = playlist.video_count > 0 
    ? Math.round((completedCount / playlist.video_count) * 100) 
    : 0;

  // Find the first unwatched video to resume
  let nextVideoToWatch = videos[0];
  for (const v of videos) {
    const p = progressMap.get(v.video_id);
    if (!p || !p.completed) {
      nextVideoToWatch = v;
      break;
    }
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to remove this playlist from your library?')) {
      await softDeletePlaylist(id);
      scheduleSync(true);
      router.push('/');
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-50 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Library
      </Link>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 mb-8 flex flex-col md:flex-row gap-8 items-start">
        <div className="w-full md:w-64 aspect-video md:aspect-square bg-zinc-800 rounded-xl overflow-hidden shrink-0">
          {playlist.thumbnail_url && (
            <img src={playlist.thumbnail_url} alt={playlist.title} className="w-full h-full object-cover" />
          )}
        </div>
        
        <div className="flex-1 min-w-0 w-full">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-50 mb-2">{playlist.title}</h1>
              {playlist.channel && <p className="text-zinc-400 text-lg mb-4">{playlist.channel}</p>}
            </div>
            
            <button 
              onClick={handleDelete}
              className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              title="Delete Playlist"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-8">
            <div className="flex justify-between text-sm mb-2 text-zinc-400">
              <span>{completedCount} of {playlist.video_count} videos watched</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {nextVideoToWatch && (
            <Link 
              href={`/watch/${nextVideoToWatch.video_id}?list=${playlist.id}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <Play className="w-5 h-5 fill-current" />
              {completedCount === 0 ? 'Start watching' : 'Continue watching'}
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold mb-4 px-2 text-zinc-100">Videos</h2>
        {videos.map((video, index) => {
          const p = progressMap.get(video.video_id);
          const isCompleted = p?.completed;
          const isPartial = p && p.position_seconds > 0 && !isCompleted;
          
          return (
            <Link 
              key={video.video_id}
              href={`/watch/${video.video_id}?list=${playlist.id}`}
              className={cn(
                "group flex gap-4 p-3 rounded-xl transition-colors border border-transparent",
                isCompleted ? "opacity-60 hover:opacity-100" : "hover:bg-zinc-900 hover:border-zinc-800"
              )}
            >
              <div className="w-8 text-center shrink-0 mt-2 text-zinc-500 font-medium">
                {index + 1}
              </div>
              
              <div className="relative w-40 aspect-video bg-zinc-800 rounded-lg overflow-hidden shrink-0 border border-zinc-800">
                {video.thumbnail_url && (
                  <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                )}
                
                {isCompleted && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                )}
                
                {video.duration_seconds && (
                  <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-zinc-200 text-xs px-1.5 py-0.5 rounded font-medium">
                    {formatDuration(video.duration_seconds)}
                  </div>
                )}
                
                {isPartial && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-600">
                    <div 
                      className="h-full bg-blue-500" 
                      style={{ width: `${(p.position_seconds / (video.duration_seconds || 1)) * 100}%` }}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex-1 py-1 pr-4 min-w-0 flex flex-col justify-center">
                <h3 className={cn(
                  "font-medium line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors",
                  isCompleted ? "text-zinc-400" : "text-zinc-100"
                )}>
                  {video.title}
                </h3>
                {isPartial && (
                  <p className="text-sm text-zinc-500 mt-2">
                    {formatDuration(p.position_seconds)} / {formatDuration(video.duration_seconds || 0)}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

