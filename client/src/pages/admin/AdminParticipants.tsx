import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Eye,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Radio
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { ParticipantListItem } from '../../types';

export const AdminParticipants: React.FC = () => {
  const { socket } = useSocket();
  const [participants, setParticipants] = useState<ParticipantListItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roundFilter, setRoundFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit };
      if (search.trim()) params.search = search.trim();
      if (statusFilter && statusFilter !== 'ALL') params.status = statusFilter;
      if (roundFilter && roundFilter !== 'ALL') params.round = roundFilter;

      const res = await api.get('/admin/participants/live', { params });
      if (res.data?.participants) {
        setParticipants(res.data.participants);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalCount(res.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to load participants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, [page, statusFilter, roundFilter]);

  // Handle search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchParticipants();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Real-time socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('participant:connected', () => fetchParticipants());
    socket.on('participant:disconnected', () => fetchParticipants());
    socket.on('participant:statusChanged', () => fetchParticipants());
    socket.on('submission:created', () => fetchParticipants());

    return () => {
      socket.off('participant:connected');
      socket.off('participant:disconnected');
      socket.off('participant:statusChanged');
      socket.off('submission:created');
    };
  }, [socket]);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" />
            <span>Participant Telemetry & Monitoring</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-time status, code activities, run counts, connection states, and anti-cheat tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchParticipants}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass rounded-xl p-4 border border-slate-800 flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, name, email..."
            className="input pl-9 text-xs w-full"
          />
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-48">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="input text-xs w-full cursor-pointer bg-slate-900 border-slate-800"
          >
            <option value="">Status: All</option>
            <option value="CLEAR">CLEAR (Active)</option>
            <option value="UNDER_REVIEW">UNDER REVIEW</option>
            <option value="DISQUALIFIED">DISQUALIFIED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="DISCONNECTED">Offline Only</option>
          </select>
        </div>

        {/* Round Filter */}
        <div className="w-full md:w-40">
          <select
            value={roundFilter}
            onChange={(e) => {
              setRoundFilter(e.target.value);
              setPage(1);
            }}
            className="input text-xs w-full cursor-pointer bg-slate-900 border-slate-800"
          >
            <option value="">Round: All</option>
            <option value="1">Round 1</option>
            <option value="2">Round 2</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="glass rounded-xl overflow-hidden border border-slate-800">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Participant</th>
                <th>Participant ID</th>
                <th>Connection</th>
                <th>Current Round</th>
                <th>Security Status</th>
                <th>Runs Used</th>
                <th>Submissions</th>
                <th>Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && participants.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500 font-mono text-xs">
                    Loading participants telemetry...
                  </td>
                </tr>
              ) : participants.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500 font-mono text-xs">
                    No participants matched your search and filter criteria.
                  </td>
                </tr>
              ) : (
                participants.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-cyan-300">
                          {p.display_name?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <span className="block font-semibold text-slate-200 text-xs">{p.display_name}</span>
                          <span className="block text-[10px] text-slate-500 font-mono">{p.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-cyan-400 text-xs font-semibold">{p.participant_id}</td>
                    <td>
                      <div className="flex items-center gap-1.5 text-xs font-mono">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            p.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                          }`}
                        />
                        <span className={p.is_online ? 'text-emerald-400' : 'text-slate-500'}>
                          {p.is_online ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </td>
                    <td className="font-mono text-xs">
                      {p.round_name || (p.active_round_number ? `Round ${p.active_round_number}` : 'Standby')}
                    </td>
                    <td>
                      <span
                        className={`badge text-[11px] ${
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
                    <td className="font-mono text-xs text-slate-300">
                      {p.active_run_count !== undefined ? `${p.active_run_count} runs` : '—'}
                    </td>
                    <td className="font-mono text-xs text-slate-300">{p.total_submissions || 0}</td>
                    <td className="font-mono font-bold text-xs text-emerald-400">{p.total_score || 0} pts</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/admin/participants/${p.id}`}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-mono flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Telemetry</span>
                        </Link>
                        {p.status === 'UNDER_REVIEW' && (
                          <Link
                            to="/admin/security"
                            className="px-2 py-1.5 rounded-lg bg-red-600/30 border border-red-500/40 text-red-300 hover:bg-red-600/50 text-xs font-mono transition-colors"
                            title="Review Incident"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>
            Showing {participants.length} of {totalCount} participants
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
