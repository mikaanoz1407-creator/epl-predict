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
  const [user, setUser] = useState(null);

  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // 3. Load fixtures
    async function loadData() {
      const { data } = await supabase.from('fixtures').select('*').order('id');
      if (data) setFixtures(data);
      setLoading(false);
    }
    loadData();

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setAuthError(error.message);
      else alert('Check your email for the confirmation link!');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
    }
  };

  const handleSignOut = () => supabase.auth.signOut();

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
    if (!user) {
      alert('Please log in or sign up above to submit your predictions!');
      return;
    }

    setSaving(true);
    const records = Object.keys(predictions).map((fixtureId) => ({
      user_id: user.id,
      fixture_id: parseInt(fixtureId, 10),
      pred_home_goals: predictions[fixtureId]?.homeGoals || 0,
      pred_away_goals: predictions[fixtureId]?.awayGoals || 0,
      pred_motm: predictions[fixtureId]?.motm || '',
    }));

    const { error } = await supabase.from('predictions').upsert(records, { onConflict: 'user_id,fixture_id' });

    setSaving(false);
    if (error) alert('Save failed: ' + error.message);
    else alert('Predictions submitted successfully for Gameweek 1!');
  };

  if (loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-bold">Loading Gameweek 1...</div>;

  return (
    <div className="min-h-screen bg-[#0d1322] text-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Bar */}
        <header className="flex flex-col md:flex-row justify-between items-center border-b border-slate-800 pb-4 gap-4">
          <div>
            <h1 className="text-2xl font-black text-amber-400">EPL PREDICTOR</h1>
            <div className="text-xs text-slate-400">Exact Score: 5pts | Result: 3pts | MOTM: 2pts</div>
          </div>

          {/* Authentication Box */}
          {user ? (
            <div className="flex items-center space-x-3 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
              <span className="text-xs text-slate-300 font-medium">Logged in as: <strong className="text-amber-400">{user.email}</strong></span>
              <button
                onClick={handleSignOut}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1 rounded transition"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="flex flex-wrap items-center gap-2 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <input
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs text-white rounded px-3 py-1.5 focus:outline-none focus:border-amber-400"
              />
              <input
                type="password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs text-white rounded px-3 py-1.5 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold px-3 py-1.5 rounded transition"
              >
                {isSignUp ? 'Sign Up' : 'Log In'}
              </button>
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-slate-400 hover:text-amber-400 underline ml-1"
              >
                {isSignUp ? 'Need to Log In?' : 'Need an Account?'}
              </button>
              {authError && <div className="w-full text-red-400 text-xs mt-1">{authError}</div>}
            </form>
          )}
        </header>

        {/* Matches Grid */}
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

        {/* Submit Predictions */}
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