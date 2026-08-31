'use client';

import { use, useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import YouTube, { YouTubeProps, YouTubePlayer } from 'react-youtube';
import { useLiveQuery } from 'dexie-react-hooks';
import { getPlaylistVideos, getProgress, updateVideoProgressLocally } from '@/lib/storage/crud';
import { scheduleSync } from '@/lib/storage/sync';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WatchPage({ params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = use(params);
  return (
    <Suspense fallback={<div className="text-zinc-500 animate-pulse">Loading player...</div>}>
      <WatchContent videoId={videoId} />
    </Suspense>
  );
}

function WatchContent({ videoId }: { videoId: string }) {
  const searchParams = useSearchParams();
  const playlistId = searchParams.get('list');
  const router = useRouter();

  const videos = useLiveQuery(() => playlistId ? getPlaylistVideos(playlistId) : [], [playlistId]);
  const progress = useLiveQuery(() => getProgress(videoId), [videoId]);

  const [player, setPlayer] = useState<YouTubePlayer>(null);
  const [showToast, setShowToast] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const lastSavedPosition = useRef(0);
  const hasResumed = useRef(false);

  const currentIndex = videos ? videos.findIndex(v => v.video_id === videoId) : -1;
  const currentVideo = currentIndex !== -1 && videos ? videos[currentIndex] : null;
  const prevVideo = videos && currentIndex > 0 ? videos[currentIndex - 1] : null;
  const nextVideo = videos && currentIndex !== -1 && currentIndex < videos.length - 1 ? videos[currentIndex + 1] : null;

  useEffect(() => {
    // Start tracking interval
    const interval = setInterval(async () => {
      if (player && typeof player.getCurrentTime === 'function' && currentVideo && playlistId) {
        const state = player.getPlayerState();
        if (state === 1) { // Playing
          const time = player.getCurrentTime();
          // Save every 5s if changed by at least 1s
          if (Math.abs(time - lastSavedPosition.current) > 1) {
            await updateVideoProgressLocally(videoId, playlistId, time, currentVideo.duration_seconds);
            lastSavedPosition.current = time;
            scheduleSync(false); // Debounced
          }
        }
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      // Push immediately on unmount (e.g. leaving page)
      scheduleSync(true);
    };
  }, [player, currentVideo, playlistId, videoId]);

  // Handle visibilitychange to save progress
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && player && typeof player.getCurrentTime === 'function' && currentVideo && playlistId) {
        updateVideoProgressLocally(videoId, playlistId, player.getCurrentTime(), currentVideo.duration_seconds);
        scheduleSync(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [player, currentVideo, playlistId, videoId]);

  const onReady: YouTubeProps['onReady'] = (event) => {
    setPlayer(event.target);
    if (progress && progress.position_seconds > 0 && !hasResumed.current) {
      // Seek to saved position if not completed
      if (!progress.completed) {
        event.target.seekTo(progress.position_seconds);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
      }
      hasResumed.current = true;
    }
  };

  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    if (event.data === 0) { // ENDED
      // Mark complete
      if (currentVideo && playlistId) {
        updateVideoProgressLocally(videoId, playlistId, currentVideo.duration_seconds || 0, currentVideo.duration_seconds);
        scheduleSync(true);
      }
      // Auto-advance
      if (nextVideo && playlistId) {
        router.push(`/watch/${nextVideo.video_id}?list=${playlistId}`);
      }
    } else if (event.data === 2) { // PAUSED
      if (player && typeof player.getCurrentTime === 'function' && currentVideo && playlistId) {
        updateVideoProgressLocally(videoId, playlistId, player.getCurrentTime(), currentVideo.duration_seconds);
        scheduleSync(true);
      }
    }
  };

  const handleRestart = () => {
    if (player) {
      player.seekTo(0);
      player.playVideo();
      setShowToast(false);
    }
  };

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      rel: 0,
      modestbranding: 1,
      iv_load_policy: 3,
      playsinline: 1,
    },
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-[1600px] mx-auto pb-12">
      <div className="flex-1 min-w-0">
        <Link 
          href={playlistId ? `/playlist/${playlistId}` : '/'} 
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-50 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Playlist
        </Link>
        
        <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-xl mb-4 group">
          <YouTube 
            videoId={videoId} 
            opts={opts} 
            onReady={onReady} 
            onStateChange={onStateChange}
            className="w-full h-full absolute inset-0"
            iframeClassName="w-full h-full border-none"
          />
          
          {showToast && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur text-white px-4 py-2 rounded-full text-sm flex items-center gap-4 transition-opacity z-10 shadow-lg">
              <span>Resumed from saved position</span>
              <button 
                onClick={handleRestart}
                className="text-blue-400 hover:text-blue-300 font-medium underline-offset-2 hover:underline"
              >
                Start over
              </button>
            </div>
          )}
        </div>

        {currentVideo && (
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-zinc-50 mb-2">{currentVideo.title}</h1>
            
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-zinc-800">
              <div className="flex gap-2">
                {prevVideo ? (
                  <Link 
                    href={`/watch/${prevVideo.video_id}?list=${playlistId}`}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors text-sm font-medium text-zinc-300"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Link>
                ) : <div className="w-[100px]" />}
                
                {nextVideo ? (
                  <Link 
                    href={`/watch/${nextVideo.video_id}?list=${playlistId}`}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 rounded-lg transition-colors text-sm font-medium"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : <div className="w-[100px]" />}
              </div>
              
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-lg text-sm font-medium text-zinc-300"
              >
                <Menu className="w-4 h-4" />
                Playlist
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Playlist Sidebar */}
      <div className={cn(
        "lg:w-96 shrink-0 flex flex-col max-h-[800px]",
        sidebarOpen ? "block" : "hidden lg:flex"
      )}>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
            <h3 className="font-semibold text-zinc-100">Up Next</h3>
            {videos && (
              <span className="text-xs text-zinc-500">{currentIndex + 1} / {videos.length}</span>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {videos?.map((v, idx) => {
              const isPlaying = v.video_id === videoId;
              return (
                <Link
                  key={v.video_id}
                  href={`/watch/${v.video_id}?list=${playlistId}`}
                  className={cn(
                    "flex gap-3 p-2 rounded-lg transition-colors",
                    isPlaying ? "bg-zinc-800" : "hover:bg-zinc-800/50"
                  )}
                >
                  <div className="relative w-24 aspect-video bg-zinc-800 rounded flex-shrink-0 overflow-hidden">
                    {v.thumbnail_url && (
                      <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={cn(
                      "text-sm font-medium line-clamp-2 leading-snug",
                      isPlaying ? "text-blue-400" : "text-zinc-200"
                    )}>
                      {v.title}
                    </h4>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

