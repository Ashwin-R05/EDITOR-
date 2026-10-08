import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Eye, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import api from '../../services/api';
import { Participant } from '../../types';

export const AdminParticipants: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const res = await api.get('/admin/participants');
        setParticipants(res.data.participants || []);
      } catch (err) {
        console.error('Failed to load participants:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchParticipants();
  }, []);

  const filtered = participants.filter((p) => {
    const query = search.toLowerCase();
    return (
      p.participant_id.toLowerCase().includes(query) ||
      (p.display_name && p.display_name.toLowerCase().includes(query)) ||
      (p.email && p.email.toLowerCase().includes(query))
    );
  });

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" />
            <span>Participant Telemetry & Monitoring</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-time status, code activities, run counts, and anti-cheat tracking.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, name, email..."
            className="input pl-9 text-xs"
          />
        </div>
      </div>

      <div className="glass rounded-xl overflow-hidden border border-slate-800">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Participant</th>
                <th>ID</th>
                <th>Current Round</th>
                <th>Status</th>
                <th>Activity</th>
                <th>Submissions</th>
                <th>Incidents</th>
                <th>Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-cyan-300">
                        {p.display_name?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <span className="block font-semibold text-slate-200 text-xs">{p.display_name}</span>
                        <span className="block text-[10px] text-slate-500 font-mono">{p.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-cyan-400 text-xs font-semibold">{p.participant_id}</td>
                  <td className="font-mono text-xs">
                    {p.current_round ? `Round ${p.current_round}` : 'Standby'}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        p.status === 'CLEAR'
                          ? 'badge-active'
                          : p.status === 'UNDER_REVIEW'
                          ? 'badge-pending animate-pulse'
                          : p.status === 'DISQUALIFIED'
                          ? 'badge-danger'
                          : 'badge-info'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td>
                    <span className="flex items-center gap-1.5 text-xs font-mono">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          p.is_online ? 'bg-emerald-400' : 'bg-slate-600'
                        }`}
                      />
                      <span className={p.is_online ? 'text-emerald-400' : 'text-slate-500'}>
                        {p.is_online ? 'Online' : 'Offline'}
                      </span>
                    </span>
                  </td>
                  <td className="font-mono text-xs">{(p as any).submission_count || 0}</td>
                  <td className="font-mono text-xs">
                    {(p as any).incident_count > 0 ? (
                      <span className="text-red-400 font-bold">{(p as any).incident_count} Incidents</span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>
                  <td className="font-mono text-xs font-bold text-cyan-300">
                    {(p as any).total_score || 0} pts
                  </td>
                  <td>
                    <Link
                      to={`/admin/participants/${p.id}`}
                      className="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-xs font-mono inline-flex items-center gap-1 border border-purple-500/30 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </Link>
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
