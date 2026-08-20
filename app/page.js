'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function HomePage() {
  // --- STATE MANAGEMENT ---
  const [user, setUser] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [officialRosters, setOfficialRosters] = useState({});
  const [teamLogos, setTeamLogos] = useState({});
  const [news, setNews] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [savingAll, setSavingAll] = useState(false);
  const [motmTab, setMotmTab] = useState({});

  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');

  // Fallback news items
  const fallbackNews = [
    {
      id: 1,
      title: "Gameweek Preview: Crucial Fixtures Ahead for Title Contenders",
      source: "Premier League News",
      url: "https://fantasy.premierleague.com",
      image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80",
      time: "2 hours ago"
    },
    {
      id: 2,
      title: "Key Player Injury Updates: Who's Fit for the Weekend?",
      source: "FPL Scout",
      url: "https://fantasy.premierleague.com",
      image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=800&q=80",
      time: "5 hours ago"
    },
    {
      id: 3,
      title: "Tactical Analysis: How Set Pieces Are Deciding Big Matches",
      source: "Match Analysis",
      url: "https://fantasy.premierleague.com",
      image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80",
      time: "1 day ago"
    }
  ];

  // 1. Auth Listener
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Load API Data (Players/Logos/News/Leaderboard) & Supabase Fixtures
  useEffect(() => {
    async function loadData() {
      try {
        // Load Players & Logos
        const playersRes = await fetch('/api/players');
        const playersData = await playersRes.json();
        if (playersData && !playersData.error) {
          setOfficialRosters(playersData.players || playersData);
          if (playersData.logos) setTeamLogos(playersData.logos);
        }

        // Load News
        const newsRes = await fetch('/api/news');
        if (newsRes.ok) {
          const newsData = await newsRes.json();
          setNews(newsData.length > 0 ? newsData : fallbackNews);
        } else {
          setNews(fallbackNews);
        }

        // Load Leaderboard
        const lbRes = await fetch('/api/leaderboard');
        if (lbRes.ok) {
          const lbData = await lbRes.json();
          if (Array.isArray(lbData)) setLeaderboard(lbData);
        }

        // Load Fixtures from Supabase
        const { data: dbFixtures } = await supabase
          .from('fixtures')
          .select('*')
          .order('match_date', { ascending: true })
          .order('id');

        if (dbFixtures && dbFixtures.length > 0) {
          setFixtures(dbFixtures);
        }
      } catch (err) {
        console.error("Error loading homepage data:", err);
        setNews(fallbackNews);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // 3. Load Saved Predictions from Supabase on Login
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
        console.error('Error fetching predictions:', error.message);
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
            is_submitted: p.is_submitted,
            points_outcome: p.points_outcome || 0,
            points_score: p.points_score || 0,
            points_motm: p.points_motm || 0,
            total_pts: p.total_pts || 0,
          };
        });
        setPredictions(formatted);
      }
    }

    loadUserPredictions();
  }, [user]);

  // Auth Handlers
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

  // Prediction Form Handlers
  const handleOutcomeChange = (id, outcome) => {
    if (predictions[id]?.is_submitted) return;
    setPredictions((prev) => ({
      ...prev,
      [id]: { ...prev[id], outcome },
    }));
  };

  const handleInputChange = (id, field, value) => {
    if (predictions[id]?.is_submitted) return;
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

  // Submit Single Prediction to Supabase
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
      setPredictions((prev) => ({
        ...prev,
        [fixtureId]: { ...prev[fixtureId], is_submitted: true },
      }));
    }
  };

  // Submit All Predictions
  const handleSaveAll = async () => {
    if (!user) {
      alert('Please log in or sign up above to submit your predictions!');
      return;
    }

    const unsubmittedIds = fixtures
      .map((f) => f.id)
      .filter((id) => !predictions[id]?.is_submitted && predictions[id]?.outcome);

    if (unsubmittedIds.length === 0) {
      alert('No new predictions available to submit!');
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
      setPredictions((prev) => {
        const updated = { ...prev };
        unsubmittedIds.forEach((id) => {
          if (updated[id]) updated[id].is_submitted = true;
        });
        return updated;
      });
      alert('All predictions submitted successfully!');
    }
  };

  // Calculate Overall GW Points
  const totalGameweekPoints = Object.values(predictions).reduce(
    (sum, p) => sum + (p.total_pts || 0),
    0
  );

  const submittedCount = Object.values(predictions).filter((p) => p.is_submitted).length;

  if (loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-bold">Loading Premier League Predictor...</div>;

  return (
    <div className="min-h-screen bg-[#0d1322] text-slate-100 p-4 md:p-8 space-y-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* 1. HEADER BAR & AUTHENTICATION */}
        <header className="flex flex-col md:flex-row justify-between items-center border-b border-slate-800 pb-4 gap-4">
          <div>
            <h1 className="text-2xl font-black text-amber-400">EPL PREDICTOR</h1>
            <div className="text-xs text-slate-400">Exact Score: 5pts | Result: 3pts | MOTM: 2pts</div>
          </div>

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

        {/* 2. TOP HERO BANNER & POINTS SCOREBOARD */}
        <div className="bg-gradient-to-r from-purple-900 via-slate-900 to-indigo-950 p-6 md:p-8 rounded-2xl border border-purple-800/40 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="bg-amber-400/10 text-amber-400 text-[10px] font-bold px-3 py-1 rounded-full border border-amber-400/20 uppercase tracking-widest">
              2026/27 Season Active
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white">
              GAMWEEK 1 <span className="text-amber-400">PREDICTIONS</span>
            </h2>
            <p className="text-slate-300 text-xs leading-relaxed">
              Predict match results, exact goals, and MOTM to compete on the global leaderboard.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="text-center sm:text-right">
              <span className="text-[10px] uppercase text-slate-400 block font-bold">Your Total Score</span>
              <span className="text-2xl font-black text-emerald-400">{totalGameweekPoints} PTS</span>
            </div>
            <Link 
              href="/leaderboard" 
              className="text-center bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-5 py-2.5 rounded-xl shadow-lg transition text-xs"
            >
              🏆 Global Leaderboard
            </Link>
          </div>
        </div>

        {/* 3. HOW TO PLAY INSTRUCTIONS */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-200 tracking-wide flex items-center gap-2">
            <span>📖</span> How the Game Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-1.5">
              <span className="text-purple-400 font-black text-xs">1. Submit Predictions</span>
              <p className="text-xs text-slate-400">Pick match outcomes, exact scores, and Man of the Match before kickoff.</p>
            </div>
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-1.5">
              <span className="text-emerald-400 font-black text-xs">2. Earn Points</span>
              <p className="text-xs text-slate-400">Earn +3 pts for correct result, +5 pts for exact scoreline, and +2 pts for MOTM.</p>
            </div>
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-1.5">
              <span className="text-amber-400 font-black text-xs">3. Climb Standings</span>
              <p className="text-xs text-slate-400">Points calculate post-match to determine global user rankings.</p>
            </div>
          </div>
        </section>

        {/* 4. PREMIER LEAGUE NEWS */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-200 tracking-wide flex items-center gap-2">
            <span>📰</span> Premier League News
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {news.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-800/40 hover:bg-slate-800 rounded-xl border border-slate-700/60 overflow-hidden group transition flex flex-col justify-between"
              >
                <div>
                  <div className="h-32 overflow-hidden relative">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  </div>
                  <div className="p-3 space-y-1">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">{item.source}</span>
                    <h3 className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition line-clamp-2">{item.title}</h3>
                  </div>
                </div>
                <div className="p-3 pt-0 text-[10px] text-slate-500">{item.time}</div>
              </a>
            ))}
          </div>
        </section>

        {/* 5. GLOBAL SUBMIT BANNER */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-800/90 border border-slate-700 p-4 rounded-xl gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-200">Gameweek 1 Matches</h2>
            <p className="text-xs text-slate-400">
              Submitted: <strong className="text-emerald-400">{submittedCount}</strong> / {fixtures.length} matches locked
            </p>
          </div>
          <button
            onClick={handleSaveAll}
            disabled={savingAll || submittedCount === fixtures.length}
            className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition shadow ${
              submittedCount === fixtures.length
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
            }`}
          >
            {savingAll ? 'Submitting All...' : submittedCount === fixtures.length ? 'All Matches Locked' : 'Submit All Predictions'}
          </button>
        </div>

        {/* 6. GAMEWEEK FIXTURES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {fixtures.map((m) => {
            const pred = predictions[m.id] || {};
            const outcome = pred.outcome || '';
            const homeGoals = pred.homeGoals ?? '';
            const awayGoals = pred.awayGoals ?? '';
            const motm = pred.motm || '';

            const isLocked = pred.is_submitted;
            const activeTab = motmTab[m.id] || 'home';

            const homePlayers = officialRosters[m.home_team] || [];
            const awayPlayers = officialRosters[m.away_team] || [];

            const homeLogo = teamLogos[m.home_team];
            const awayLogo = teamLogos[m.away_team];

            return (
              <div
                key={m.id}
                className={`border p-5 rounded-xl space-y-4 shadow-lg flex flex-col justify-between transition ${
                  isLocked ? 'bg-slate-900/90 border-emerald-500/50' : 'bg-slate-800/60 border-slate-700/80'
                }`}
              >
                {/* Header */}
                <div className="flex justify-between items-center text-xs border-b border-slate-700/50 pb-2">
                  <span className="text-slate-400">
                    {new Date(m.match_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  {isLocked ? (
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ✓ Locked
                    </span>
                  ) : (
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ○ Unsubmitted
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
                        outcome === 'HOME_WIN' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-300 hover:bg-slate-800'
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
                        outcome === 'DRAW' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-300 hover:bg-slate-800'
                      } ${isLocked ? 'cursor-not-allowed' : ''}`}
                    >
                      Draw
                    </button>
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => handleOutcomeChange(m.id, 'AWAY_WIN')}
                      className={`py-1.5 rounded text-xs font-bold transition flex items-center justify-center space-x-1 px-1 ${
                        outcome === 'AWAY_WIN' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-300 hover:bg-slate-800'
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
                        className="w-10 h-10 bg-slate-900 border border-slate-600 rounded-md text-center text-amber-400 font-bold text-base focus:outline-none focus:border-amber-400 disabled:opacity-75"
                        onChange={(e) => handleInputChange(m.id, 'homeGoals', e.target.value)}
                      />
                      <span className="text-slate-500 font-bold">-</span>
                      <input
                        type="number"
                        min="0"
                        disabled={isLocked}
                        value={awayGoals}
                        placeholder="0"
                        className="w-10 h-10 bg-slate-900 border border-slate-600 rounded-md text-center text-amber-400 font-bold text-base focus:outline-none focus:border-amber-400 disabled:opacity-75"
                        onChange={(e) => handleInputChange(m.id, 'awayGoals', e.target.value)}
                      />
                    </div>

                    <div className="w-1/3 flex items-center justify-start space-x-1.5">
                      {awayLogo && <img src={awayLogo} alt={m.away_team} className="w-5 h-5 object-contain flex-shrink-0" />}
                      <span className="truncate text-xs text-left">{m.away_team}</span>
                    </div>
                  </div>
                </div>

                {/* 3. MOTM Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">3. Man of the Match</label>
                  <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-700/60 text-xs">
                    <button
                      type="button"
                      onClick={() => setFixtureMotmTab(m.id, 'home')}
                      className={`flex-1 py-1 rounded font-bold transition flex items-center justify-center space-x-1 px-1 ${
                        activeTab === 'home' ? 'bg-slate-700 text-amber-400' : 'text-slate-400'
                      }`}
                    >
                      {homeLogo && <img src={homeLogo} alt="" className="w-3.5 h-3.5 object-contain" />}
                      <span className="truncate">{m.home_team}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFixtureMotmTab(m.id, 'away')}
                      className={`flex-1 py-1 rounded font-bold transition flex items-center justify-center space-x-1 px-1 ${
                        activeTab === 'away' ? 'bg-slate-700 text-amber-400' : 'text-slate-400'
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400 disabled:opacity-75"
                  >
                    <option value="">-- Select {activeTab === 'home' ? m.home_team : m.away_team} Player --</option>
                    {(activeTab === 'home' ? homePlayers : awayPlayers).map((player) => (
                      <option key={player} value={player}>
                        {player}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Single Submit Button */}
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
                      className={`w-full py-2 rounded-lg text-xs font-bold transition uppercase ${
                        outcome ? 'bg-amber-400 hover:bg-amber-300 text-slate-950' : 'bg-slate-700/60 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {savingId === m.id ? 'Submitting...' : 'Submit Pick'}
                    </button>
                  )}
                </div>

                {/* Drilldown Point Breakdown (if match completed) */}
                {m.final_outcome && (
                  <div className="mt-2 pt-2 border-t border-slate-700/60 bg-slate-900/60 p-2.5 rounded-xl space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-amber-400">
                      <span>Result: {m.final_home_goals} - {m.final_away_goals} ({m.final_motm})</span>
                      <span className="text-emerald-400">+{pred.total_pts || 0} PTS</span>
                    </div>
                    <div className="flex gap-1.5 text-[10px]">
                      <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">Result: +{pred.points_outcome || 0}</span>
                      <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">Score: +{pred.points_score || 0}</span>
                      <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">MOTM: +{pred.points_motm || 0}</span>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>

        {/* 7. LEADERBOARD STANDINGS PREVIEW */}
        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-200 tracking-wide flex items-center gap-2">
              <span>📊</span> Global Standings
            </h2>
            <Link href="/leaderboard" className="text-xs text-amber-400 hover:underline font-bold">
              Full Standings →
            </Link>
          </div>

          <div className="bg-slate-800/80 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
            {leaderboard.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">No predictions submitted yet.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <tbody className="divide-y divide-slate-700/60">
                  {leaderboard.slice(0, 3).map((row, index) => (
                    <tr key={row.user_id} className="hover:bg-slate-700/40 transition">
                      <td className="p-3 font-bold text-amber-400">#{index + 1}</td>
                      <td className="p-3 font-mono text-slate-300">{row.user_id}</td>
                      <td className="p-3 text-right font-black text-emerald-400">{row.total_pts} pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}