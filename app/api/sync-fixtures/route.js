import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic execution to bypass Next.js static caching
export const dynamic = 'force-dynamic';

// Initialize Supabase client using Service Role Key to bypass RLS policies
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'FOOTBALL_DATA_API_KEY environment variable is missing.' },
      { status: 500 }
    );
  }

  try {
    // 1. Fetch Premier League matches (PL) from football-data.org
    const apiRes = await fetch(
      'https://api.football-data.org/v4/competitions/PL/matches',
      {
        headers: {
          'X-Auth-Token': apiKey,
        },
        cache: 'no-store',
      }
    );

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return NextResponse.json(
        { error: `API response error: ${apiRes.status}`, details: errText },
        { status: apiRes.status }
      );
    }

    const data = await apiRes.json();
    const matches = data.matches || [];

    if (matches.length === 0) {
      return NextResponse.json(
        { message: 'No matches returned from Football Data API.' },
        { status: 404 }
      );
    }

    // 2. Map API data to match your Supabase fixtures schema
    const fixtureRecords = matches.map((m) => ({
      id: m.id,
      gameweek: m.matchday,
      home_team: m.homeTeam.name,
      away_team: m.awayTeam.name,
      match_date: m.utcDate,
      status: m.status,
      final_home_goals: m.score?.fullTime?.home ?? null,
      final_away_goals: m.score?.fullTime?.away ?? null,
    }));

    // 3. Upsert records into Supabase in bulk (inserts new, updates existing)
    const { error: dbError } = await supabase
      .from('fixtures')
      .upsert(fixtureRecords, { onConflict: 'id' });

    if (dbError) {
      return NextResponse.json(
        { error: 'Supabase DB Error', details: dbError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: fixtureRecords.length,
      message: `Successfully synced ${fixtureRecords.length} fixtures across all gameweeks!`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}