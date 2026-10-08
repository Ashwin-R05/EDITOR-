import React, { useState, useEffect } from 'react';
import { Trophy, RefreshCw } from 'lucide-react';
import api from '../../services/api';

export const AdminLeaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get('/admin/leaderboard');
      setLeaderboard(res.data.leaderboard || []);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <span>Event Leaderboard & Standings</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-time score tally across Round 1, Round 2, and composite rankings.
          </p>
        </div>

        <button
          onClick={fetchLeaderboard}
          className="btn btn-ghost text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Standings</span>
        </button>
      </div>

      <div className="glass rounded-xl overflow-hidden border border-slate-800">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Participant</th>
                <th>Participant ID</th>
                <th>Round 1</th>
                <th>Round 2</th>
                <th>Total Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((item, idx) => (
                <tr key={item.id}>
                  <td className="font-mono font-bold text-amber-400 text-sm">
                    #{idx + 1}
                  </td>
                  <td className="font-semibold text-white text-xs">{item.display_name}</td>
                  <td className="font-mono text-cyan-400 text-xs">{item.participant_id}</td>
                  <td className="font-mono text-xs">{item.round1_score} pts</td>
                  <td className="font-mono text-xs">{item.round2_score} pts</td>
                  <td className="font-mono font-bold text-cyan-300 text-sm">{item.total_score} pts</td>
                  <td>
                    <span className="badge badge-active">{item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
