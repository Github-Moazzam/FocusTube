import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(supabaseUrl, supabaseKey);
};

export async function GET(req: Request) {
  // Check CRON_SECRET to authenticate the request from Vercel
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabase();
    // Perform a trivial write to update the heartbeat timestamp
    // This prevents Supabase from pausing the project due to inactivity
    const { error } = await supabase
      .from('heartbeat')
      .update({ pinged_at: new Date().toISOString() })
      .eq('id', 1);

    if (error) {
      console.error('Keep-alive failed to write:', error);
      return NextResponse.json({ error: 'Failed to update heartbeat' }, { status: 500 });
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Keep-alive error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
