'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function DashboardPage() {
  const [currentGameweek, setCurrentGameweek] = useState(1);
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch fixtures specifically for the selected Gameweek
  useEffect(() => {
    async function fetchGameweekFixtures() {
      setLoading(true);
      const { data, error } = await supabase
        .from('fixtures')
        .select('*')
        .eq('gameweek', currentGameweek)
        .order('match_date', { ascending: true });

      if (!error && data) {
        setFixtures(data);
      }
      setLoading(false);
    }

    fetchGameweekFixtures();
  }, [currentGameweek]);

  // Carousel navigation handlers
  const handlePrev = () => {
    if (currentGameweek > 1) setCurrentGameweek((prev) => prev - 1);
  };

  const handleNext = () => {
    if (currentGameweek < 38) setCurrentGameweek((prev) => prev + 1);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* GAMEWEEK CAROUSEL CONTROLLER */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md text-white">
        <button
          onClick={handlePrev}
          disabled={currentGameweek === 1}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg font-bold text-sm transition"
        >
          ← Prev
        </button>

        <div className="flex items-center space-x-3">
          <span className="text-lg font-bold text-amber-400">
            Gameweek {currentGameweek}
          </span>
          <select
            value={currentGameweek}
            onChange={(e) => setCurrentGameweek(Number(e.target.value))}
            className="bg-slate-800 text-white font-semibold text-sm rounded-md px-3 py-1.5 border border-slate-700 focus:outline-none"
          >
            {Array.from({ length: 38 }, (_, i) => i + 1).map((gw) => (
              <option key={gw} value={gw}>
                GW {gw}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleNext}
          disabled={currentGameweek === 38}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg font-bold text-sm transition"
        >
          Next →
        </button>
      </div>

      {/* FIXTURES LIST FOR ACTIVE GAMEWEEK */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 font-medium">
          Loading Gameweek {currentGameweek} fixtures...
        </div>
      ) : fixtures.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          No matches scheduled for Gameweek {currentGameweek}.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {fixtures.map((fixture) => (
            <div
              key={fixture.id}
              className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex items-center justify-between text-white shadow"
            >
              <div className="flex-1 font-semibold text-right">{fixture.home_team}</div>
              <div className="px-4 py-1 text-xs font-bold text-amber-400 bg-slate-800 rounded mx-2">
                {fixture.status === 'FINISHED'
                  ? `${fixture.final_home_goals ?? 0} - ${fixture.final_away_goals ?? 0}`
                  : 'VS'}
              </div>
              <div className="flex-1 font-semibold text-left">{fixture.away_team}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}