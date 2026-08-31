import { NextResponse } from 'next/server';

const YT_API_KEY = process.env.YOUTUBE_API_KEY;

export async function POST(req: Request) {
  if (!YT_API_KEY) {
    return NextResponse.json({ error: 'YOUTUBE_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { playlistId, videoId } = await req.json();

    if (playlistId) {
      return await fetchPlaylist(playlistId);
    } else if (videoId) {
      return await fetchVideo(videoId);
    }

    return NextResponse.json({ error: 'Missing playlistId or videoId' }, { status: 400 });

  } catch (error: unknown) {
    console.error('YouTube API Error:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to fetch from YouTube' }, { status: 500 });
  }
}

async function fetchPlaylist(playlistId: string) {
  // 1. Fetch Playlist Details
  const playlistUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistId}&key=${YT_API_KEY}`;
  const playlistRes = await fetch(playlistUrl);
  const playlistData = await playlistRes.json();

  if (!playlistData.items || playlistData.items.length === 0) {
    return NextResponse.json({ error: 'Playlist not found or private' }, { status: 404 });
  }

  const p = playlistData.items[0];
  const playlist = {
    id: p.id,
    title: p.snippet.title,
    channel: p.snippet.channelTitle,
    thumbnail_url: p.snippet.thumbnails?.high?.url || p.snippet.thumbnails?.default?.url || null,
    video_count: p.contentDetails.itemCount,
  };

  // 2. Fetch all Playlist Items (pagination)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let allItems: any[] = [];
  let nextPageToken = '';
  
  do {
    const itemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${YT_API_KEY}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
    const itemsRes = await fetch(itemsUrl);
    const itemsData = await itemsRes.json();
    
    if (itemsData.items) {
      allItems = [...allItems, ...itemsData.items];
    }
    nextPageToken = itemsData.nextPageToken;
  } while (nextPageToken);

  // Filter out private/deleted videos (they lack a standard video title)
  const validItems = allItems.filter(item => 
    item.snippet.title !== 'Private video' && 
    item.snippet.title !== 'Deleted video'
  );

  // 3. Fetch Durations for all videos (chunked by 50)
  const videoIds = validItems.map(item => item.contentDetails.videoId);
  const durationsMap: Record<string, number> = {};

  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${chunk.join(',')}&key=${YT_API_KEY}`;
    const videosRes = await fetch(videosUrl);
    const videosData = await videosRes.json();

    if (videosData.items) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      videosData.items.forEach((v: any) => {
        durationsMap[v.id] = parseISO8601Duration(v.contentDetails.duration);
      });
    }
  }

  // 4. Construct response
  const videos = validItems.map((item, index) => {
    const vId = item.contentDetails.videoId;
    return {
      video_id: vId,
      playlist_id: playlistId,
      title: item.snippet.title,
      thumbnail_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || null,
      duration_seconds: durationsMap[vId] || null,
      position: index,
    };
  });

  return NextResponse.json({ playlist, videos });
}

async function fetchVideo(videoId: string) {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${YT_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.items || data.items.length === 0) {
    return NextResponse.json({ error: 'Video not found or private' }, { status: 404 });
  }

  const v = data.items[0];
  const video = {
    video_id: v.id,
    playlist_id: 'saved_videos', // Special default playlist
    title: v.snippet.title,
    thumbnail_url: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.default?.url || null,
    duration_seconds: parseISO8601Duration(v.contentDetails.duration),
    position: 0,
  };

  const playlist = {
    id: 'saved_videos',
    title: 'Saved Videos',
    channel: 'Various',
    thumbnail_url: null,
    video_count: 1, // Handled properly on client
  };

  return NextResponse.json({ playlist, videos: [video] });
}

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  
  return hours * 3600 + minutes * 60 + seconds;
}
