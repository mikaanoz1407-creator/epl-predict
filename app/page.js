'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function App() {
  const [fixtures, setFixtures] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [officialRosters, setOfficialRosters] = useState({});
  const [teamLogos, setTeamLogos] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);

  // Tracks active MOTM tab (home/away) per fixture
  const [motmTab, setMotmTab] = useState({});

  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');

  // 1. Auth Listener
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Load API data (Players + Logos) & Supabase Fixtures
  useEffect(() => {
    async function fetchPlayersAndLogos() {
      try {
        const res = await fetch('/api/players');
        const data = await res.json();
        if (data && !data.error) {
          setOfficialRosters(data.players || data);
          if (data.logos) setTeamLogos(data.logos);
        }
      } catch (err) {
        console.error('Failed to load rosters and logos:', err);
      }
    }
    fetchPlayersAndLogos();

    async function loadFixtures() {
      const { data } = await supabase.from('fixtures').select('*').order('id');
      if (data) setFixtures(data);
      setLoading(false);
    }
    loadFixtures();
  }, []);

  // 3. Load saved predictions whenever user logs in
  useEffect(() => {
    async function loadUserPredictions() {
      if (!user) {
        setPredictions({});
        return;
      }

      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching saved predictions:', error.message);
        return;
      }

      if (data) {
        const formatted = {};
        data.forEach((p) => {
          formatted[p.fixture_id] = {
            outcome: p.pred_outcome,
            homeGoals: p.pred_home_goals,
            awayGoals: p.pred_away_goals,
            motm: p.pred_motm,
          };
        });
        setPredictions(formatted);
      }
    }

    loadUserPredictions();
  }, [user]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : '',
        },
      });
      if (error) setAuthError(error.message);
      else alert('Account created! You can now log in.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
    }
  };

  const handleSignOut = () => {
    supabase.auth.signOut();
    setPredictions({});
  };

  const handleOutcomeChange = (id, outcome) => {
    setPredictions((prev) => ({
      ...prev,
      [id]: { ...prev[id], outcome },
    }));
  };

  const handleInputChange = (id, field, value) => {
    setPredictions((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: field === 'motm' ? value : Math.max(0, parseInt(value, 10) || 0),
      },
    }));
  };

  const setFixtureMotmTab = (id, teamSide) => {
    setMotmTab((prev) => ({ ...prev, [id]: teamSide }));
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
      pred_outcome: predictions[fixtureId]?.outcome || 'DRAW',
      pred_home_goals: predictions[fixtureId]?.homeGoals || 0,
      pred_away_goals: predictions[fixtureId]?.awayGoals || 0,
      pred_motm: predictions[fixtureId]?.motm || '',
    }));

    const { error } = await supabase
      .from('predictions')
      .upsert(records, { onConflict: 'user_id,fixture_id' });

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
              <span className="text-xs text-slate-300 font-medium">
                Logged in as: <strong className="text-amber-400">{user.email}</strong>
              </span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {fixtures.map((m) => {
            const pred = predictions[m.id] || {};
            const outcome = pred.outcome || '';
            const homeGoals = pred.homeGoals ?? '';
            const awayGoals = pred.awayGoals ?? '';
            const motm = pred.motm || '';

            const activeTab = motmTab[m.id] || 'home';

            const homePlayers = officialRosters[m.home_team] || m.home_players || [];
            const awayPlayers = officialRosters[m.away_team] || m.away_players || [];

            const homeLogo = teamLogos[m.home_team];
            const awayLogo = teamLogos[m.away_team];

            return (
              <div key={m.id} className="bg-slate-800/60 border border-slate-700/80 p-5 rounded-xl space-y-4 shadow-lg flex flex-col justify-between">
                
                {/* Match Date Header */}
                <div className="flex justify-between items-center text-xs text-slate-400 font-semibold border-b border-slate-700/50 pb-2">
                  <span>
                    {new Date(m.match_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-amber-400/80 font-bold uppercase text-[10px]">Gameweek 1</span>
                </div>

                {/* 1. Outcome Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">1. Select Outcome</label>
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => handleOutcomeChange(m.id, 'HOME_WIN')}
                      className={`py-1.5 rounded text-xs font-bold transition flex items-center justify-center space-x-1 px-1 ${
                        outcome === 'HOME_WIN' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {homeLogo && <img src={homeLogo} alt="" className="w-4 h-4 object-contain" />}
                      <span className="truncate">{m.home_team}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOutcomeChange(m.id, 'DRAW')}
                      className={`py-1.5 rounded text-xs font-bold transition ${
                        outcome === 'DRAW' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      Draw
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOutcomeChange(m.id, 'AWAY_WIN')}
                      className={`py-1.5 rounded text-xs font-bold transition flex items-center justify-center space-x-1 px-1 ${
                        outcome === 'AWAY_WIN' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {awayLogo && <img src={awayLogo} alt="" className="w-4 h-4 object-contain" />}
                      <span className="truncate">{m.away_team}</span>
                    </button>
                  </div>
                </div>

                {/* 2. Score Inputs */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">2. Exact Score</label>
                  <div className="flex justify-between items-center font-bold text-sm bg-slate-900/50 p-2 rounded-lg border border-slate-700/40">
                    
                    {/* Home Team Label + Badge */}
                    <div className="w-1/3 flex items-center justify-end space-x-1.5">
                      <span className="truncate text-xs text-right">{m.home_team}</span>
                      {homeLogo && <img src={homeLogo} alt={m.home_team} className="w-5 h-5 object-contain flex-shrink-0" />}
                    </div>

                    {/* Inputs */}
                    <div className="flex items-center space-x-1.5 mx-2">
                      <input
                        type="number"
                        min="0"
                        value={homeGoals}
                        placeholder="0"
                        className="w-10 h-10 bg-slate-900 border border-slate-600 rounded-md text-center text-amber-400 font-bold text-base focus:outline-none focus:border-amber-400"
                        onChange={(e) => handleInputChange(m.id, 'homeGoals', e.target.value)}
                      />
                      <span className="text-slate-500 font-bold">-</span>
                      <input
                        type="number"
                        min="0"
                        value={awayGoals}
                        placeholder="0"
                        className="w-10 h-10 bg-slate-900 border border-slate-600 rounded-md text-center text-amber-400 font-bold text-base focus:outline-none focus:border-amber-400"
                        onChange={(e) => handleInputChange(m.id, 'awayGoals', e.target.value)}
                      />
                    </div>

                    {/* Away Team Label + Badge */}
                    <div className="w-1/3 flex items-center justify-start space-x-1.5">
                      {awayLogo && <img src={awayLogo} alt={m.away_team} className="w-5 h-5 object-contain flex-shrink-0" />}
                      <span className="truncate text-xs text-left">{m.away_team}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Team-Tabbed MOTM Dropdown Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">3. Man of the Match</label>
                  
                  {/* Two Tabs with Badges */}
                  <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-700/60 text-xs">
                    <button
                      type="button"
                      onClick={() => setFixtureMotmTab(m.id, 'home')}
                      className={`flex-1 py-1 rounded font-bold transition flex items-center justify-center space-x-1 px-1 ${
                        activeTab === 'home' ? 'bg-slate-700 text-amber-400' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {homeLogo && <img src={homeLogo} alt="" className="w-3.5 h-3.5 object-contain" />}
                      <span className="truncate">{m.home_team}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFixtureMotmTab(m.id, 'away')}
                      className={`flex-1 py-1 rounded font-bold transition flex items-center justify-center space-x-1 px-1 ${
                        activeTab === 'away' ? 'bg-slate-700 text-amber-400' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {awayLogo && <img src={awayLogo} alt="" className="w-3.5 h-3.5 object-contain" />}
                      <span className="truncate">{m.away_team}</span>
                    </button>
                  </div>

                  {/* Player Dropdown */}
                  <select
                    value={motm}
                    onChange={(e) => handleInputChange(m.id, 'motm', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  >
                    <option value="">-- Select {activeTab === 'home' ? m.home_team : m.away_team} Player --</option>
                    {(activeTab === 'home' ? homePlayers : awayPlayers).map((player) => (
                      <option key={player} value={player}>
                        {player}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Live Selection Summary */}
                <div className="bg-slate-900/90 border border-amber-400/20 rounded-lg p-2.5 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Your Pick</span>
                  {outcome || homeGoals !== '' || awayGoals !== '' || motm ? (
                    <div className="text-xs font-semibold text-amber-400 flex items-center justify-center space-x-2">
                      <span>{outcome ? (outcome === 'HOME_WIN' ? `${m.home_team} Win` : outcome === 'AWAY_WIN' ? `${m.away_team} Win` : 'Draw') : 'No Result'}</span>
                      <span>•</span>
                      <span>{homeGoals !== '' && awayGoals !== '' ? `${homeGoals} - ${awayGoals}` : 'No Score'}</span>
                      {motm && (
                        <>
                          <span>•</span>
                          <span className="text-slate-200 italic">⭐ {motm}</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic">No selection made yet</div>
                  )}
                </div>

              </div>
            );
          })}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-base rounded-xl uppercase tracking-wider transition shadow-lg"
        >
          {saving ? 'Submitting Predictions...' : 'Submit Gameweek 1 Predictions'}
        </button>
      </div>
    </div>
  );
}