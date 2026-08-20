'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function LeaderboardPage() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const res = await fetch('/api/leaderboard');
        const data = await res.json();
        if (Array.isArray(data)) setRankings(data);
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-[#0d1322] text-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-black text-amber-400">GLOBAL LEADERBOARD</h1>
            <p className="text-xs text-slate-400">Rankings updated automatically after match results</p>
          </div>
          <Link
            href="/"
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2 rounded-lg border border-slate-700 transition"
          >
            ← Back to Predictor
          </Link>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-slate-800/80 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
          {loading ? (
            <div className="p-8 text-center text-xs font-bold text-slate-400">Loading Leaderboard...</div>
          ) : rankings.length === 0 ? (
            <div className="p-8 text-center text-xs font-semibold text-slate-500">No predictions submitted yet.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase font-bold border-b border-slate-700">
                <tr>
                  <th className="p-4">Rank</th>
                  <th className="p-4">User ID</th>
                  <th className="p-4 text-right">Total Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {rankings.map((row, index) => (
                  <tr key={row.user_id} className="hover:bg-slate-700/40 transition">
                    <td className="p-4 font-bold text-amber-400">
                      {index === 0 ? '🥇 #1' : index === 1 ? '🥈 #2' : index === 2 ? '🥉 #3' : `#${index + 1}`}
                    </td>
                    <td className="p-4 font-mono text-slate-300">{row.user_id}</td>
                    <td className="p-4 text-right font-black text-base text-emerald-400">{row.total_pts} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}