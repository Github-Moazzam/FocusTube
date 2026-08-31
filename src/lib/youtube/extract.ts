export function parseYouTubeUrl(url: string): { type: 'playlist' | 'video' | 'both', playlistId?: string, videoId?: string } | null {
  try {
    const parsed = new URL(url);
    const searchParams = parsed.searchParams;

    const playlistId = searchParams.get('list');
    let videoId = searchParams.get('v');

    if (parsed.hostname === 'youtu.be') {
      videoId = parsed.pathname.slice(1);
    } else if (parsed.pathname.startsWith('/shorts/')) {
      videoId = parsed.pathname.split('/')[2];
    }

    if (playlistId && videoId) {
      return { type: 'both', playlistId, videoId };
    }
    if (playlistId) {
      return { type: 'playlist', playlistId };
    }
    if (videoId) {
      return { type: 'video', videoId };
    }
    
    // Check if it's just a raw ID
    if (/^PL[\w-]{16,34}$/.test(url)) {
      return { type: 'playlist', playlistId: url };
    }
    if (/^[\w-]{11}$/.test(url)) {
      return { type: 'video', videoId: url };
    }

    return null;
  } catch (e) {
    // Check if it's just a raw ID without full URL
    if (/^PL[\w-]{16,34}$/.test(url)) {
      return { type: 'playlist', playlistId: url };
    }
    if (/^[\w-]{11}$/.test(url)) {
      return { type: 'video', videoId: url };
    }
    return null;
  }
}

