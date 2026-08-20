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
  const [submittedFixtures, setSubmittedFixtures] = useState(new Set());
  const [officialRosters, setOfficialRosters] = useState({});
  const [teamLogos, setTeamLogos] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [savingAll, setSavingAll] = useState(false);
  const [user, setUser] = useState(null);

  // Active MOTM tab (home/away) per fixture
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

  // 2. Load API data (Players + Logos) & Fixtures
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
      const { data } = await supabase.from('fixtures').select('*').order('match_date', { ascending: true }).order('id');
      if (data) setFixtures(data);
      setLoading(false);
    }
    loadFixtures();
  }, []);

  // 3. Load user's saved predictions and submitted state
  useEffect(() => {
    async function loadUserPredictions() {
      if (!user) {
        setPredictions({});
        setSubmittedFixtures(new Set());
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
        const submittedSet = new Set();
        data.forEach((p) => {
          formatted[p.fixture_id] = {
            outcome: p.pred_outcome,
            homeGoals: p.pred_home_goals,
            awayGoals: p.pred_away_goals,
            motm: p.pred_motm,
          };
          // Track fixtures that have submitted predictions
          if (p.is_submitted || p.pred_outcome) {
            submittedSet.add(p.fixture_id);
          }
        });
        setPredictions(formatted);
        setSubmittedFixtures(submittedSet);
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
    setSubmittedFixtures(new Set());
  };

  const handleOutcomeChange = (id, outcome) => {
    if (submittedFixtures.has(id)) return; // Prevent edits if locked
    setPredictions((prev) => ({
      ...prev,
      [id]: { ...prev[id], outcome },
    }));
  };

  const handleInputChange = (id, field, value) => {
    if (submittedFixtures.has(id)) return; // Prevent edits if locked
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

  // Submit Single Prediction
  const handleSaveSingle = async (fixtureId) => {
    if (!user) {
      alert('Please log in or sign up above to submit your prediction!');
      return;
    }

    const pred = predictions[fixtureId];
    if (!pred || !pred.outcome) {
      alert('Please select an outcome before submitting this game!');
      return;
    }

    setSavingId(fixtureId);

    const record = {
      user_id: user.id,
      fixture_id: fixtureId,
      pred_outcome: pred.outcome || 'DRAW',
      pred_home_goals: pred.homeGoals || 0,
      pred_away_goals: pred.awayGoals || 0,
      pred_motm: pred.motm || '',
      is_submitted: true,
    };

    const { error } = await supabase
      .from('predictions')
      .upsert([record], { onConflict: 'user_id,fixture_id' });

    setSavingId(null);
    if (error) {
      alert('Save failed: ' + error.message);
    } else {
      setSubmittedFixtures((prev) => new Set(prev).add(fixtureId));
    }
  };

  // Submit All Predictions
  const handleSaveAll = async () => {
    if (!user) {
      alert('Please log in or sign up above to submit your predictions!');
      return;
    }

    // Filter for unsubmitted fixtures that have selections
    const unsubmittedIds = fixtures
      .map((f) => f.id)
      .filter((id) => !submittedFixtures.has(id) && predictions[id]?.outcome);

    if (unsubmittedIds.length === 0) {
      alert('No new or completed predictions available to submit!');
      return;
    }

    setSavingAll(true);

    const records = unsubmittedIds.map((fixtureId) => ({
      user_id: user.id,
      fixture_id: fixtureId,
      pred_outcome: predictions[fixtureId]?.outcome || 'DRAW',
      pred_home_goals: predictions[fixtureId]?.homeGoals || 0,
      pred_away_goals: predictions[fixtureId]?.awayGoals || 0,
      pred_motm: predictions[fixtureId]?.motm || '',
      is_submitted: true,
    }));

    const { error } = await supabase
      .from('predictions')
      .upsert(records, { onConflict: 'user_id,fixture_id' });

    setSavingAll(false);
    if (error) {
      alert('Save failed: ' + error.message);
    } else {
      setSubmittedFixtures((prev) => {
        const updated = new Set(prev);
        unsubmittedIds.forEach((id) => updated.add(id));
        return updated;
      });
      alert('All predictions submitted successfully!');
    }
  };

  // Group fixtures by formatted match date
  const groupedFixtures = fixtures.reduce((acc, fixture) => {
    const dateStr = fixture.match_date
      ? new Date(fixture.match_date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Upcoming Fixtures';

    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(fixture);
    return acc;
  }, {});

  if (loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-bold">Loading Gameweek 1...</div>;

  return (
    <div className="min-h-screen bg-[#0d1322] text-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
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

        {/* Global Submit All Banner */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-800/90 border border-slate-700 p-4 rounded-xl gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-200">Gameweek 1 Predictions</h2>
            <p className="text-xs text-slate-400">
              Submitted: <strong className="text-emerald-400">{submittedFixtures.size}</strong> / {fixtures.length} matches locked
            </p>
          </div>
          <button
            onClick={handleSaveAll}
            disabled={savingAll || submittedFixtures.size === fixtures.length}
            className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition shadow ${
              submittedFixtures.size === fixtures.length
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
            }`}
          >
            {savingAll ? 'Submitting All...' : submittedFixtures.size === fixtures.length ? 'All Matches Locked' : 'Submit All Predictions'}
          </button>
        </div>

        {/* Matches Grouped by Date */}
        {Object.keys(groupedFixtures).map((dateGroup) => (
          <div key={dateGroup} className="space-y-4">
            
            {/* Date Group Header */}
            <div className="flex items-center space-x-3 border-b border-slate-800 pb-2">
              <span className="text-amber-400 text-sm font-black uppercase tracking-wider">📅 {dateGroup}</span>
              <span className="text-xs text-slate-500 font-semibold">({groupedFixtures[dateGroup].length} matches)</span>
            </div>

            {/* Match Grid for this Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {groupedFixtures[dateGroup].map((m) => {
                const pred = predictions[m.id] || {};
                const outcome = pred.outcome || '';
                const homeGoals = pred.homeGoals ?? '';
                const awayGoals = pred.awayGoals ?? '';
                const motm = pred.motm || '';

                const isLocked = submittedFixtures.has(m.id);
                const activeTab = motmTab[m.id] || 'home';

                const homePlayers = officialRosters[m.home_team] || m.home_players || [];
                const awayPlayers = officialRosters[m.away_team] || m.away_players || [];

                const homeLogo = teamLogos[m.home_team];
                const awayLogo = teamLogos[m.away_team];

                return (
                  <div
                    key={m.id}
                    className={`border p-5 rounded-xl space-y-4 shadow-lg flex flex-col justify-between transition ${
                      isLocked
                        ? 'bg-slate-900/90 border-emerald-500/50 opacity-85'
                        : 'bg-slate-800/60 border-slate-700/80'
                    }`}
                  >
                    {/* Status Badge & Header */}
                    <div className="flex justify-between items-center text-xs border-b border-slate-700/50 pb-2">
                      <span className="text-amber-400/80 font-bold uppercase text-[10px]">Gameweek 1</span>
                      
                      {/* Submission Indicator */}
                      {isLocked ? (
                        <span className="flex items-center space-x-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <span>✓</span>
                          <span>Prediction Locked</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 bg-amber-500/10 text-amber-400/90 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <span>○</span>
                          <span>Unsubmitted</span>
                        </span>
                      )}
                    </div>

                    {/* 1. Outcome Selector */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">1. Select Outcome</label>
                      <div className="grid grid-cols-3 gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-slate-700/60">
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => handleOutcomeChange(m.id, 'HOME_WIN')}
                          className={`py-1.5 rounded text-xs font-bold transition flex items-center justify-center space-x-1 px-1 ${
                            outcome === 'HOME_WIN'
                              ? 'bg-emerald-500 text-slate-950 shadow'
                              : 'text-slate-300 hover:bg-slate-800 disabled:hover:bg-transparent'
                          } ${isLocked ? 'cursor-not-allowed' : ''}`}
                        >
                          {homeLogo && <img src={homeLogo} alt="" className="w-4 h-4 object-contain" />}
                          <span className="truncate">{m.home_team}</span>
                        </button>

                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => handleOutcomeChange(m.id, 'DRAW')}
                          className={`py-1.5 rounded text-xs font-bold transition ${
                            outcome === 'DRAW'
                              ? 'bg-amber-400 text-slate-950 shadow'
                              : 'text-slate-300 hover:bg-slate-800 disabled:hover:bg-transparent'
                          } ${isLocked ? 'cursor-not-allowed' : ''}`}
                        >
                          Draw
                        </button>

                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => handleOutcomeChange(m.id, 'AWAY_WIN')}
                          className={`py-1.5 rounded text-xs font-bold transition flex items-center justify-center space-x-1 px-1 ${
                            outcome === 'AWAY_WIN'
                              ? 'bg-emerald-500 text-slate-950 shadow'
                              : 'text-slate-300 hover:bg-slate-800 disabled:hover:bg-transparent'
                          } ${isLocked ? 'cursor-not-allowed' : ''}`}
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
                        <div className="w-1/3 flex items-center justify-end space-x-1.5">
                          <span className="truncate text-xs text-right">{m.home_team}</span>
                          {homeLogo && <img src={homeLogo} alt={m.home_team} className="w-5 h-5 object-contain flex-shrink-0" />}
                        </div>

                        <div className="flex items-center space-x-1.5 mx-2">
                          <input
                            type="number"
                            min="0"
                            disabled={isLocked}
                            value={homeGoals}
                            placeholder="0"
                            className={`w-10 h-10 bg-slate-900 border border-slate-600 rounded-md text-center text-amber-400 font-bold text-base focus:outline-none focus:border-amber-400 ${
                              isLocked ? 'cursor-not-allowed opacity-75' : ''
                            }`}
                            onChange={(e) => handleInputChange(m.id, 'homeGoals', e.target.value)}
                          />
                          <span className="text-slate-500 font-bold">-</span>
                          <input
                            type="number"
                            min="0"
                            disabled={isLocked}
                            value={awayGoals}
                            placeholder="0"
                            className={`w-10 h-10 bg-slate-900 border border-slate-600 rounded-md text-center text-amber-400 font-bold text-base focus:outline-none focus:border-amber-400 ${
                              isLocked ? 'cursor-not-allowed opacity-75' : ''
                            }`}
                            onChange={(e) => handleInputChange(m.id, 'awayGoals', e.target.value)}
                          />
                        </div>

                        <div className="w-1/3 flex items-center justify-start space-x-1.5">
                          {awayLogo && <img src={awayLogo} alt={m.away_team} className="w-5 h-5 object-contain flex-shrink-0" />}
                          <span className="truncate text-xs text-left">{m.away_team}</span>
                        </div>
                      </div>
                    </div>

                    {/* 3. Team-Tabbed MOTM Dropdown Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">3. Man of the Match</label>

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

                      <select
                        disabled={isLocked}
                        value={motm}
                        onChange={(e) => handleInputChange(m.id, 'motm', e.target.value)}
                        className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400 ${
                          isLocked ? 'cursor-not-allowed opacity-75' : ''
                        }`}
                      >
                        <option value="">-- Select {activeTab === 'home' ? m.home_team : m.away_team} Player --</option>
                        {(activeTab === 'home' ? homePlayers : awayPlayers).map((player) => (
                          <option key={player} value={player}>
                            {player}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Per-Game Single Submit Button */}
                    <div className="pt-2">
                      {isLocked ? (
                        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg py-2 px-3 text-center text-xs font-bold text-emerald-400">
                          🔒 Prediction Submitted
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={savingId === m.id || !outcome}
                          onClick={() => handleSaveSingle(m.id)}
                          className={`w-full py-2.5 rounded-lg text-xs font-bold transition uppercase tracking-wider ${
                            outcome
                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow'
                              : 'bg-slate-700/60 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {savingId === m.id ? 'Submitting...' : 'Submit Pick'}
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        ))}

      </div>
    </div>
  );
}