import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET() {
  // Fetch submitted predictions and points
  const { data, error } = await supabase
    .from('predictions')
    .select('user_id, total_pts')
    .eq('is_submitted', true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group total points by user
  const leaderboardMap = {};
  data.forEach((row) => {
    leaderboardMap[row.user_id] = (leaderboardMap[row.user_id] || 0) + (row.total_pts || 0);
  });

  // Convert to array and sort high to low
  const sortedLeaderboard = Object.entries(leaderboardMap)
    .map(([user_id, total_pts]) => ({ user_id, total_pts }))
    .sort((a, b) => b.total_pts - a.total_pts);

  return NextResponse.json(sortedLeaderboard);
}