import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Radio,
  Layers,
  Send,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  StopCircle,
  Clock,
  ArrowRight,
  Eye,
  RefreshCw,
  Zap
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { AdminDashboardStats, Round, ParticipantListItem } from '../../types';
import { ActivityFeed } from '../../components/admin/ActivityFeed';

export const AdminDashboard: React.FC = () => {
  const { socket, isConnected } = useSocket();
  const [stats, setStats] = useState<AdminDashboardStats>({
    totalParticipants: 0,
    activeParticipants: 0,
    round1Participants: 0,
    round2Participants: 0,
    underReview: 0,
    disqualified: 0,
    completed: 0,
    totalSubmissions: 0,
    securityIncidents: 0,
    pendingIncidents: 0,
  });

  const [rounds, setRounds] = useState<Round[]>([]);
  const [recentParticipants, setRecentParticipants] = useState<ParticipantListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    roundId: string;
    roundName: string;
    action: 'start' | 'pause' | 'resume' | 'end';
  } | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, roundsRes, partRes] = await Promise.allSettled([
        api.get('/admin/dashboard/stats'),
        api.get('/admin/rounds'),
        api.get('/admin/participants/live', { params: { limit: 6 } }),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.data?.stats) {
        setStats(statsRes.value.data.stats);
      }
      if (roundsRes.status === 'fulfilled' && roundsRes.value.data?.rounds) {
        setRounds(roundsRes.value.data.rounds);
      }
      if (partRes.status === 'fulfilled' && partRes.value.data?.participants) {
        setRecentParticipants(partRes.value.data.participants);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Real-time socket events
  useEffect(() => {
    if (!socket) return;

    const handleStatsUpdate = (newStats: any) => {
      if (newStats) setStats((prev) => ({ ...prev, ...newStats }));
    };

    socket.on('dashboard:stats', handleStatsUpdate);
    socket.on('participant:connected', () => fetchDashboardData());
    socket.on('participant:disconnected', () => fetchDashboardData());
    socket.on('submission:created', () => fetchDashboardData());
    socket.on('incident:created', () => fetchDashboardData());
    socket.on('participant:statusChanged', () => fetchDashboardData());
    socket.on('round:started', () => fetchDashboardData());
    socket.on('round:paused', () => fetchDashboardData());
    socket.on('round:resumed', () => fetchDashboardData());
    socket.on('round:ended', () => fetchDashboardData());

    return () => {
      socket.off('dashboard:stats', handleStatsUpdate);
      socket.off('participant:connected');
      socket.off('participant:disconnected');
      socket.off('submission:created');
      socket.off('incident:created');
      socket.off('participant:statusChanged');
      socket.off('round:started');
      socket.off('round:paused');
      socket.off('round:resumed');
      socket.off('round:ended');
    };
  }, [socket]);

  const handleRoundActionConfirm = async () => {
    if (!confirmModal) return;
    const { roundId, action } = confirmModal;
    setActionLoading(roundId);
    setConfirmModal(null);

    try {
      await api.post(`/admin/rounds/${roundId}/${action}-live`);
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.response?.data?.error || `Failed to ${action} round`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-purple-400 mb-1">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>CENTRAL EVENT CONTROL COMMAND</span>
            <span className="text-slate-500">•</span>
            <span className={isConnected ? 'text-emerald-400' : 'text-red-400'}>
              {isConnected ? 'LIVE TELEMETRY STREAMING' : 'OFFLINE'}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            Live Event Operations Center
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Autonomous state tracking • Real-time telemetry • Instant anti-cheat arbitration
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link
            to="/admin/security"
            className={`px-4 py-2.5 rounded-xl text-xs font-bold font-mono flex items-center gap-2 transition-all ${
              stats.pendingIncidents > 0
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 animate-pulse'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{stats.pendingIncidents} PENDING REVIEWS</span>
          </Link>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Participants */}
        <div className="stat-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="stat-label">Total Registered</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="stat-value text-white">{stats.totalParticipants}</span>
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {stats.activeParticipants} Currently Connected
          </span>
        </div>

        {/* Round 1 Active */}
        <div className="stat-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="stat-label">Round 1 (Palindrome)</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <span className="stat-value text-cyan-300">{stats.round1Participants}</span>
          <span className="text-[10px] font-mono text-slate-400">Active coding participants</span>
        </div>

        {/* Round 2 Active */}
        <div className="stat-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="stat-label">Round 2 (Pattern)</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <span className="stat-value text-purple-300">{stats.round2Participants}</span>
          <span className="text-[10px] font-mono text-slate-400">Advanced round sessions</span>
        </div>

        {/* Total Submissions */}
        <div className="stat-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="stat-label">Total Submissions</span>
            <Send className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="stat-value text-emerald-300">{stats.totalSubmissions}</span>
          <span className="text-[10px] font-mono text-slate-400">Immutable code snapshots</span>
        </div>
      </div>

      {/* Secondary Status Counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase block">Under Review</span>
            <span className="text-xl font-bold font-mono text-amber-400">{stats.underReview}</span>
          </div>
          <AlertTriangle className="w-6 h-6 text-amber-400/50" />
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase block">Disqualified</span>
            <span className="text-xl font-bold font-mono text-red-400">{stats.disqualified}</span>
          </div>
          <XCircle className="w-6 h-6 text-red-400/50" />
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase block">Completed</span>
            <span className="text-xl font-bold font-mono text-emerald-400">{stats.completed}</span>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-400/50" />
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase block">Total Incidents</span>
            <span className="text-xl font-bold font-mono text-red-300">{stats.securityIncidents}</span>
          </div>
          <ShieldAlert className="w-6 h-6 text-red-400/50" />
        </div>
      </div>

      {/* Live Event Round Controls */}
      <div className="glass rounded-2xl p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              <span>Event Round Control Panel</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Live broadcast controls with synchronized countdown timers across all participant screens.
            </p>
          </div>
          <Link
            to="/admin/rounds"
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <span>CONFIGURE PROBLEM SETS</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rounds.map((round) => (
            <div
              key={round.id}
              className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-purple-400">
                    ROUND {round.round_number}
                  </span>
                  <span
                    className={`badge ${
                      round.status === 'ACTIVE'
                        ? 'badge-active animate-pulse'
                        : round.status === 'PAUSED'
                        ? 'badge-pending'
                        : round.status === 'ENDED'
                        ? 'badge-info'
                        : 'badge-muted'
                    }`}
                  >
                    {round.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">{round.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{round.description}</p>

                <div className="mt-4 flex items-center gap-4 text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    {round.duration_minutes} Mins Duration
                  </span>
                  <span>•</span>
                  <span>{round.run_limit} Max Runs</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2">
                {round.status === 'NOT_STARTED' && (
                  <button
                    disabled={actionLoading === round.id}
                    onClick={() =>
                      setConfirmModal({
                        roundId: round.id,
                        roundName: round.name,
                        action: 'start',
                      })
                    }
                    className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-900/20"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>ACTIVATE ROUND</span>
                  </button>
                )}

                {round.status === 'ACTIVE' && (
                  <>
                    <button
                      disabled={actionLoading === round.id}
                      onClick={() =>
                        setConfirmModal({
                          roundId: round.id,
                          roundName: round.name,
                          action: 'pause',
                        })
                      }
                      className="flex-1 py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>PAUSE ROUND</span>
                    </button>
                    <button
                      disabled={actionLoading === round.id}
                      onClick={() =>
                        setConfirmModal({
                          roundId: round.id,
                          roundName: round.name,
                          action: 'end',
                        })
                      }
                      className="py-2 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                      <span>END ROUND</span>
                    </button>
                  </>
                )}

                {round.status === 'PAUSED' && (
                  <>
                    <button
                      disabled={actionLoading === round.id}
                      onClick={() =>
                        setConfirmModal({
                          roundId: round.id,
                          roundName: round.name,
                          action: 'resume',
                        })
                      }
                      className="flex-1 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>RESUME ROUND</span>
                    </button>
                    <button
                      disabled={actionLoading === round.id}
                      onClick={() =>
                        setConfirmModal({
                          roundId: round.id,
                          roundName: round.name,
                          action: 'end',
                        })
                      }
                      className="py-2 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                      <span>END ROUND</span>
                    </button>
                  </>
                )}

                {round.status === 'ENDED' && (
                  <div className="w-full text-center py-2 text-xs font-mono text-slate-500">
                    ROUND CONCLUDED • COMPLETED
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Grid: Activity Feed + Live Participant Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: Real-Time Activity Feed */}
        <ActivityFeed maxItems={30} showFilters={true} />

        {/* Right: Live Participant Telemetry Snapshot */}
        <div className="glass rounded-2xl p-5 border border-slate-800 flex flex-col h-full">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                Live Participant Roster
              </h2>
            </div>
            <Link
              to="/admin/participants"
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>VIEW ALL</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[380px] scrollbar-thin scrollbar-thumb-slate-800">
            {recentParticipants.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-mono">
                No participant data available.
              </div>
            ) : (
              recentParticipants.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between gap-3 text-xs hover:border-slate-700/80 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-cyan-300">
                        {p.display_name?.charAt(0) || 'P'}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                          p.is_online ? 'bg-emerald-400' : 'bg-slate-600'
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 truncate">
                          {p.display_name}
                        </span>
                        <span className="font-mono text-[10px] text-cyan-400">
                          {p.participant_id}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {p.round_name || (p.active_round_number ? `Round ${p.active_round_number}` : 'Standby')}
                        {' • '}
                        {p.total_score || 0} pts
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`badge text-[10px] ${
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
                    <Link
                      to={`/admin/participants/${p.id}`}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Round Action Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>Confirm Round Action</span>
            </h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed font-mono">
              Are you sure you want to{' '}
              <strong className="text-white uppercase">{confirmModal.action}</strong>{' '}
              <strong className="text-purple-400">{confirmModal.roundName}</strong>?
              {confirmModal.action === 'start' &&
                ' This will immediately broadcast to all participant consoles and start their timers.'}
              {confirmModal.action === 'pause' &&
                ' This will pause participant editors and freeze active timers.'}
              {confirmModal.action === 'end' &&
                ' This will conclude the round and lock further submissions.'}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={handleRoundActionConfirm}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold text-white transition-all cursor-pointer shadow-lg ${
                  confirmModal.action === 'end'
                    ? 'bg-red-600 hover:bg-red-500 shadow-red-900/30'
                    : confirmModal.action === 'pause'
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
                }`}
              >
                CONFIRM {confirmModal.action.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
