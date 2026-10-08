import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';

export const AdminSecurity: React.FC = () => {
  const { socket } = useSocket();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter && statusFilter !== 'ALL') params.status = statusFilter;
      if (severityFilter && severityFilter !== 'ALL') params.severity = severityFilter;
      if (typeFilter && typeFilter !== 'ALL') params.incidentType = typeFilter;

      const res = await api.get('/admin/security/incidents', { params });
      if (res.data?.incidents) {
        setIncidents(res.data.incidents);
      }
    } catch (err) {
      console.error('Failed to load security incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter, severityFilter, typeFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIncidents();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Real-time socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('incident:created', () => fetchIncidents());
    socket.on('participant:incident', () => fetchIncidents());
    socket.on('security:decision', () => fetchIncidents());

    return () => {
      socket.off('incident:created');
      socket.off('participant:incident');
      socket.off('security:decision');
    };
  }, [socket]);

  const pendingCount = incidents.filter((i) => i.status === 'PENDING').length;

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-red-400" />
              <span>Anti-Cheat & Security Incident Log</span>
            </h1>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-red-600 text-white animate-pulse">
                {pendingCount} PENDING
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Autonomous violation detection • Live code snapshot arbitration • Real-time session lock
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchIncidents}
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
            placeholder="Search by participant ID, name, incident code..."
            className="input pl-9 text-xs w-full"
          />
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-44">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input text-xs w-full cursor-pointer bg-slate-900 border-slate-800"
          >
            <option value="">Status: All</option>
            <option value="PENDING">Pending Review</option>
            <option value="ACCEPTED">Accepted (Cleared)</option>
            <option value="DECLINED">Declined (Disqualified)</option>
          </select>
        </div>

        {/* Severity Filter */}
        <div className="w-full md:w-36">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="input text-xs w-full cursor-pointer bg-slate-900 border-slate-800"
          >
            <option value="">Severity: All</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
          </select>
        </div>

        {/* Violation Type Filter */}
        <div className="w-full md:w-44">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input text-xs w-full cursor-pointer bg-slate-900 border-slate-800"
          >
            <option value="">Violation: All</option>
            <option value="TAB_SWITCH">Tab Switch</option>
            <option value="PASTE_ATTEMPT">Paste Attempt</option>
            <option value="COPY_ATTEMPT">Copy Attempt</option>
            <option value="CUT_ATTEMPT">Cut Attempt</option>
            <option value="RIGHT_CLICK">Right Click</option>
            <option value="WINDOW_BLUR">Window Blur</option>
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="glass rounded-xl overflow-hidden border border-slate-800">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Incident Code</th>
                <th>Participant</th>
                <th>Round</th>
                <th>Violation</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Detected At</th>
                <th>Decision</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && incidents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500 font-mono text-xs">
                    Loading security incidents...
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500 font-mono text-xs">
                    No security incidents found matching your criteria.
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => (
                  <tr key={inc.id} className={inc.status === 'PENDING' ? 'bg-red-950/10' : ''}>
                    <td className="font-mono text-cyan-400 text-xs font-semibold">
                      {inc.incident_code}
                    </td>
                    <td>
                      <div>
                        <span className="block font-semibold text-slate-200 text-xs">
                          {inc.participant_name}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-mono">
                          ID: {inc.participant_code}
                        </span>
                      </div>
                    </td>
                    <td className="font-mono text-xs text-purple-300">
                      {inc.round_name || `Round ${inc.round_number}`}
                    </td>
                    <td>
                      <span className="text-xs font-bold font-mono text-red-300">
                        {inc.incident_type}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                          inc.severity === 'HIGH'
                            ? 'bg-red-500/20 text-red-300 border-red-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {inc.severity}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge text-[10px] ${
                          inc.status === 'PENDING'
                            ? 'badge-pending animate-pulse'
                            : inc.status === 'ACCEPTED'
                            ? 'badge-active'
                            : 'badge-danger'
                        }`}
                      >
                        {inc.status}
                      </span>
                    </td>
                    <td className="font-mono text-[11px] text-slate-400">
                      {new Date(inc.detected_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="font-mono text-[11px] text-slate-400">
                      {inc.admin_decision ? (
                        <span className={inc.admin_decision === 'ACCEPT' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                          {inc.admin_decision} ({inc.admin_name || 'Admin'})
                        </span>
                      ) : (
                        <span className="text-amber-400 italic">Awaiting</span>
                      )}
                    </td>
                    <td>
                      <Link
                        to={`/admin/security/${inc.id}`}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                          inc.status === 'PENDING'
                            ? 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-900/30'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{inc.status === 'PENDING' ? 'ARBITRATE' : 'VIEW'}</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
