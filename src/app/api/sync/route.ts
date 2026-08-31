import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(supabaseUrl, supabaseKey);
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('health') === '1') {
    const supabase = getSupabase();
    const { data } = await supabase.from('heartbeat').select('pinged_at').eq('id', 1).single();
    return NextResponse.json({ ok: true, last_ping: data?.pinged_at || null });
  }

  try {
    const supabase = getSupabase();
    const { data: playlists } = await supabase.from('playlists').select('*');
    const { data: videos } = await supabase.from('videos').select('*');
    const { data: progress } = await supabase.from('progress').select('*');

    return NextResponse.json({
      playlists: playlists || [],
      videos: videos || [],
      progress: progress || [],
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sync data' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    const payload = await req.json();
    const { playlists, videos, progress } = payload;

    // Merge Playlists (last-write-wins based on updated_at)
    if (playlists && playlists.length > 0) {
      for (const p of playlists) {
        const { data: existing } = await supabase
          .from('playlists')
          .select('updated_at')
          .eq('id', p.id)
          .single();

        if (!existing || new Date(p.updated_at) > new Date(existing.updated_at)) {
          await supabase.from('playlists').upsert(p, { onConflict: 'id' });
        }
      }
    }

    // Videos are static per playlist, so we can just upsert.
    // They are updated when a playlist is refreshed.
    if (videos && videos.length > 0) {
      // Chunking videos to prevent payload too large on Supabase
      const chunkSize = 100;
      for (let i = 0; i < videos.length; i += chunkSize) {
        await supabase.from('videos').upsert(videos.slice(i, i + chunkSize), { onConflict: 'playlist_id,video_id' });
      }
    }

    // Merge Progress (greatest position, OR completed)
    if (progress && progress.length > 0) {
      for (const p of progress) {
        const { data: existing } = await supabase
          .from('progress')
          .select('position_seconds, completed, updated_at')
          .eq('video_id', p.video_id)
          .single();

        if (!existing) {
          await supabase.from('progress').insert(p);
        } else {
          const mergedPosition = Math.max(existing.position_seconds || 0, p.position_seconds || 0);
          const mergedCompleted = existing.completed || p.completed;
          // We update if the client has genuinely new data
          if (mergedPosition > existing.position_seconds || p.completed && !existing.completed) {
            await supabase.from('progress').update({
              position_seconds: mergedPosition,
              completed: mergedCompleted,
              updated_at: new Date().toISOString()
            }).eq('video_id', p.video_id);
          }
        }
      }
    }

    // After all writes, fetch the latest state to return
    const { data: finalPlaylists } = await supabase.from('playlists').select('*');
    const { data: finalVideos } = await supabase.from('videos').select('*');
    const { data: finalProgress } = await supabase.from('progress').select('*');

    return NextResponse.json({
      playlists: finalPlaylists || [],
      videos: finalVideos || [],
      progress: finalProgress || [],
    });

  } catch (error) {
    console.error('Sync Error:', error);
    return NextResponse.json({ error: 'Failed to process sync' }, { status: 500 });
  }
}
