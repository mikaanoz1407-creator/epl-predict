'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  // --- STATE MANAGEMENT ---
  const [user, setUser] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [news, setNews] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedGameweek, setSelectedGameweek] = useState(1);
  const [loading, setLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);

  // Fallback news items if external API key is not configured
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

  // --- INITIAL DATA FETCHING ---
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch News
        const newsRes = await fetch('/api/news');
        if (newsRes.ok) {
          const newsData = await newsRes.json();
          setNews(newsData.length > 0 ? newsData : fallbackNews);
        } else {
          setNews(fallbackNews);
        }

        // Fetch Leaderboard
        const lbRes = await fetch('/api/leaderboard');
        if (lbRes.ok) {
          const lbData = await lbRes.json();
          if (Array.isArray(lbData)) setLeaderboard(lbData);
        }

        // Dummy Initial Fixtures (Replace or link with Supabase fetch)
        setFixtures([
          {
            id: 101,
            gameweek: 1,
            home_team: 'Arsenal',
            away_team: 'Chelsea',
            match_date: '2026-08-15 12:30 UTC',
            final_home_goals: 2,
            final_away_goals: 1,
            final_outcome: 'HOME_WIN',
            final_motm: 'Bukayo Saka'
          },
          {
            id: 102,
            gameweek: 1,
            home_team: 'Liverpool',
            away_team: 'Manchester City',
            match_date: '2026-08-15 15:00 UTC',
            final_home_goals: 1,
            final_away_goals: 1,
            final_outcome: 'DRAW',
            final_motm: 'Erling Haaland'
          }
        ]);

        // Default Predictions state for testing
        setPredictions({
          101: {
            pred_outcome: 'HOME_WIN',
            pred_home_goals: 2,
            pred_away_goals: 1,
            pred_motm: 'Bukayo Saka',
            is_submitted: true,
            points_outcome: 3,
            points_score: 5,
            points_motm: 2,
            total_pts: 10
          },
          102: {
            pred_outcome: 'DRAW',
            pred_home_goals: 1,
            pred_away_goals: 1,
            pred_motm: 'Mohamed Salah',
            is_submitted: true,
            points_outcome: 3,
            points_score: 5,
            points_motm: 0,
            total_pts: 8
          }
        });

      } catch (err) {
        console.error("Error initializing homepage data:", err);
        setNews(fallbackNews);
      } finally {
        setLoading(false);
        setNewsLoading(false);
      }
    }

    loadData();
  }, []);

  // --- HANDLERS ---
  const handleInputChange = (fixtureId, field, value) => {
    setPredictions((prev) => ({
      ...prev,
      [fixtureId]: {
        ...prev[fixtureId],
        [field]: value
      }
    }));
  };

  const handleSavePrediction = (fixtureId) => {
    setPredictions((prev) => ({
      ...prev,
      [fixtureId]: {
        ...prev[fixtureId],
        is_submitted: true
      }
    }));
    alert('Prediction locked and submitted!');
  };

  // Calculate overall GW points for active user
  const totalGameweekPoints = Object.values(predictions).reduce(
    (sum, p) => sum + (p.total_pts || 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#0d1322] text-slate-100 p-4 md:p-8 space-y-10">
      
      {/* 1. TOP HERO BANNER & AUTH HEADER */}
      <div className="max-w-6xl mx-auto bg-gradient-to-r from-purple-900 via-slate-900 to-indigo-950 p-6 md:p-8 rounded-2xl border border-purple-800/40 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-2 max-w-xl">
          <span className="bg-amber-400/10 text-amber-400 text-[10px] font-bold px-3 py-1 rounded-full border border-amber-400/20 uppercase tracking-widest">
            2026/27 Season Active
          </span>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
            PREMIER LEAGUE <span className="text-amber-400">PREDICTOR</span>
          </h1>
          <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
            Predict scores, guess Man of the Match, collect points, and compete on the global leaderboard.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
          <div className="text-center sm:text-right">
            <span className="text-[10px] uppercase text-slate-400 block font-bold">Your GW{selectedGameweek} Total</span>
            <span className="text-2xl font-black text-emerald-400">{totalGameweekPoints} PTS</span>
          </div>
          <Link 
            href="/leaderboard" 
            className="text-center bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-5 py-2.5 rounded-xl shadow-lg transition text-xs"
          >
            🏆 Leaderboard
          </Link>
        </div>
      </div>

      {/* 2. HOW TO PLAY & COMPETE INSTRUCTIONS */}
      <section className="max-w-6xl mx-auto space-y-3">
        <h2 className="text-lg font-bold text-slate-200 tracking-wide flex items-center gap-2">
          <span>📖</span> How to Play & Compete
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 font-black flex items-center justify-center text-xs">
              1
            </div>
            <h3 className="font-bold text-slate-100 text-sm">Submit Predictions</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Choose the match outcome (Home/Draw/Away), exact goals, and predicted Man of the Match before kickoff.
            </p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center text-xs">
              2
            </div>
            <h3 className="font-bold text-slate-100 text-sm">Earn Points</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Earn <span className="text-emerald-400 font-bold">+3 pts</span> for correct outcome, <span className="text-emerald-400 font-bold">+5 pts</span> for exact scoreline, and <span className="text-emerald-400 font-bold">+2 pts</span> for correct MOTM.
            </p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-xs">
              3
            </div>
            <h3 className="font-bold text-slate-100 text-sm">Climb the Leaderboard</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Points update live post-match. Compare your gameweek breakdown and track your rank against all users.
            </p>
          </div>

        </div>
      </section>

      {/* 3. LATEST PREMIER LEAGUE NEWS */}
      <section className="max-w-6xl mx-auto space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-200 tracking-wide flex items-center gap-2">
            <span>📰</span> Premier League News
          </h2>
          <span className="text-xs text-slate-400">Live Updates</span>
        </div>

        {newsLoading ? (
          <div className="p-6 text-center text-xs text-slate-500">Loading news feed...</div>
        ) : (
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
                  <div className="h-36 overflow-hidden relative">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>
                  <div className="p-4 space-y-1.5">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      {item.source}
                    </span>
                    <h3 className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition line-clamp-2">
                      {item.title}
                    </h3>
                  </div>
                </div>
                <div className="p-4 pt-0 text-[10px] text-slate-500">
                  {item.time}
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* 4. GAMEWEEK PREDICTIONS & DRILLDOWN BREAKDOWN */}
      <section className="max-w-6xl mx-auto space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h2 className="text-lg font-bold text-slate-200 tracking-wide flex items-center gap-2">
            <span>⚽</span> Gameweek {selectedGameweek} Fixtures & Predictions
          </h2>
          <div className="flex gap-2">
            {[1, 2, 3].map((gw) => (
              <button
                key={gw}
                onClick={() => setSelectedGameweek(gw)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                  selectedGameweek === gw
                    ? 'bg-amber-400 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                GW{gw}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fixtures
            .filter((f) => f.gameweek === selectedGameweek)
            .map((fixture) => {
              const pred = predictions[fixture.id] || {};
              const isLocked = pred.is_submitted;

              return (
                <div
                  key={fixture.id}
                  className="bg-slate-800/80 rounded-2xl border border-slate-700 p-5 space-y-4 shadow-lg"
                >
                  {/* Fixture Header */}
                  <div className="flex justify-between items-center text-xs text-slate-400 border-b border-slate-700/60 pb-2">
                    <span>{fixture.match_date}</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${isLocked ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400'}`}>
                      {isLocked ? '✓ Prediction Submitted' : 'Open for Predictions'}
                    </span>
                  </div>

                  {/* Teams & Score Input */}
                  <div className="flex items-center justify-between gap-4 py-2">
                    <div className="text-center font-bold text-sm text-slate-100 flex-1">
                      {fixture.home_team}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        disabled={isLocked}
                        value={pred.pred_home_goals ?? ''}
                        onChange={(e) => handleInputChange(fixture.id, 'pred_home_goals', parseInt(e.target.value) || 0)}
                        className="w-12 h-10 text-center font-black bg-slate-900 border border-slate-700 rounded-lg text-amber-400 text-base focus:outline-none focus:border-amber-400 disabled:opacity-70"
                      />
                      <span className="font-bold text-slate-500">:</span>
                      <input
                        type="number"
                        min="0"
                        disabled={isLocked}
                        value={pred.pred_away_goals ?? ''}
                        onChange={(e) => handleInputChange(fixture.id, 'pred_away_goals', parseInt(e.target.value) || 0)}
                        className="w-12 h-10 text-center font-black bg-slate-900 border border-slate-700 rounded-lg text-amber-400 text-base focus:outline-none focus:border-amber-400 disabled:opacity-70"
                      />
                    </div>

                    <div className="text-center font-bold text-sm text-slate-100 flex-1">
                      {fixture.away_team}
                    </div>
                  </div>

                  {/* Outcome Selector */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Home Win', val: 'HOME_WIN' },
                      { label: 'Draw', val: 'DRAW' },
                      { label: 'Away Win', val: 'AWAY_WIN' }
                    ].map((btn) => (
                      <button
                        key={btn.val}
                        disabled={isLocked}
                        onClick={() => handleInputChange(fixture.id, 'pred_outcome', btn.val)}
                        className={`py-2 text-xs font-bold rounded-lg border transition ${
                          pred.pred_outcome === btn.val
                            ? 'bg-purple-600 text-white border-purple-500'
                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  {/* MOTM Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-slate-400 font-bold">Predicted Man of the Match</label>
                    <input
                      type="text"
                      disabled={isLocked}
                      placeholder="e.g. Bukayo Saka"
                      value={pred.pred_motm ?? ''}
                      onChange={(e) => handleInputChange(fixture.id, 'pred_motm', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-xs px-3 py-2 rounded-lg text-slate-200 focus:outline-none focus:border-amber-400 disabled:opacity-70"
                    />
                  </div>

                  {/* Action Button */}
                  {!isLocked && (
                    <button
                      onClick={() => handleSavePrediction(fixture.id)}
                      className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs transition"
                    >
                      Lock & Submit Prediction
                    </button>
                  )}

                  {/* DRILLDOWN POINT BREAKDOWN (Visible when match has actual result) */}
                  {fixture.final_outcome && (
                    <div className="mt-4 pt-3 border-t border-slate-700/60 bg-slate-900/60 p-3 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-amber-400">
                        <span>Actual Result: {fixture.final_home_goals} - {fixture.final_away_goals} ({fixture.final_motm})</span>
                        <span className="text-emerald-400 font-black">+{pred.total_pts || 0} PTS</span>
                      </div>
                      <div className="flex gap-2 text-[10px]">
                        <span className={`px-2 py-0.5 rounded ${pred.points_outcome > 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
                          Outcome: +{pred.points_outcome || 0}
                        </span>
                        <span className={`px-2 py-0.5 rounded ${pred.points_score > 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
                          Exact Score: +{pred.points_score || 0}
                        </span>
                        <span className={`px-2 py-0.5 rounded ${pred.points_motm > 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
                          MOTM: +{pred.points_motm || 0}
                        </span>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
        </div>
      </section>

      {/* 5. TOP LEADERBOARD SUMMARY TABLE */}
      <section className="max-w-6xl mx-auto space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-200 tracking-wide flex items-center gap-2">
            <span>📊</span> Top Leaderboard Standings
          </h2>
          <Link href="/leaderboard" className="text-xs text-amber-400 hover:underline font-bold">
            Full Table →
          </Link>
        </div>

        <div className="bg-slate-800/80 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
          {leaderboard.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">No predictions recorded yet.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase font-bold border-b border-slate-700">
                <tr>
                  <th className="p-3">Rank</th>
                  <th className="p-3">User ID</th>
                  <th className="p-3 text-right">Total Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {leaderboard.slice(0, 3).map((row, index) => (
                  <tr key={row.user_id} className="hover:bg-slate-700/40 transition">
                    <td className="p-3 font-bold text-amber-400">
                      {index === 0 ? '🥇 #1' : index === 1 ? '🥈 #2' : '🥉 #3'}
                    </td>
                    <td className="p-3 font-mono text-slate-300">{row.user_id}</td>
                    <td className="p-3 text-right font-black text-sm text-emerald-400">{row.total_pts} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

    </div>
  );
}