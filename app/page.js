'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function App() {
  const [fixtures, setFixtures] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase.from('fixtures').select('*').order('id');
      if (data) setFixtures(data);
      setLoading(false);
    }
    loadData();
  }, []);

  const handleInputChange = (id, field, value) => {
    setPredictions((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: field === 'motm' ? value : parseInt(value, 10) || 0,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert('Sign-in required to submit predictions.');
      setSaving(false);
      return;
    }

    const records = Object.keys(predictions).map((fixtureId) => ({
      user_id: user.id,
      fixture_id: parseInt(fixtureId, 10),
      pred_home_goals: predictions[fixtureId].homeGoals || 0,
      pred_away_goals: predictions[fixtureId].awayGoals || 0,
      pred_motm: predictions[fixtureId].motm || '',
    }));

    const { error } = await supabase.from('predictions').upsert(records, { onConflict: 'user_id,fixture_id' });

    setSaving(false);
    if (error) alert('Save failed: ' + error.message);
    else alert('Predictions submitted for Gameweek 1!');
  };

  if (loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-bold">Loading Gameweek 1...</div>;

  return (
    <div className="min-h-screen bg-[#0d1322] text-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-black text-amber-400">EPL PREDICTOR</h1>
          <div className="text-xs text-slate-400">Exact Score: 5pts | Result: 3pts | MOTM: 2pts</div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fixtures.map((m) => (
            <div key={m.id} className="bg-slate-800/50 border border-slate-700/60 p-4 rounded-xl space-y-3">
              <div className="text-xs text-slate-400 font-semibold">
                {new Date(m.match_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              <div className="flex justify-between items-center font-bold text-sm">
                <span className="w-1/3 text-right">{m.home_team}</span>
                <div className="flex items-center space-x-1 mx-2">
                  <input
                    type="number"
                    min="0"
                    className="w-9 h-9 bg-slate-900 border border-slate-600 rounded text-center text-amber-400"
                    onChange={(e) => handleInputChange(m.id, 'homeGoals', e.target.value)}
                  />
                  <span>-</span>
                  <input
                    type="number"
                    min="0"
                    className="w-9 h-9 bg-slate-900 border border-slate-600 rounded text-center text-amber-400"
                    onChange={(e) => handleInputChange(m.id, 'awayGoals', e.target.value)}
                  />
                </div>
                <span className="w-1/3 text-left">{m.away_team}</span>
              </div>
              <input
                type="text"
                placeholder="Man of the Match"
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200"
                onChange={(e) => handleInputChange(m.id, 'motm', e.target.value)}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl uppercase tracking-wider"
        >
          {saving ? 'Submitting...' : 'Submit Gameweek 1 Predictions'}
        </button>
      </div>
    </div>
  );
}