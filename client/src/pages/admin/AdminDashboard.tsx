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
  Zap,
  Activity,
  Cpu,
  Trophy,
  Lock,
  ChevronRight,
  ShieldCheck
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
        api.get('/admin/participants/live', { params: { limit: 8 } }),
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
      <div className="flex-1 flex flex-col items-center justify-center p-16">
        <div className="spinner mb-4" />
        <p className="text-purple-400 font-sans text-sm animate-pulse">Loading Mission Control Telemetry...</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 space-y-8 max-w-7xl mx-auto w-full select-none">
      {/* 1. Top Mission Control Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2.5 text-xs text-purple-400 mb-1.5 font-medium">
            <span className="p-1 rounded-md bg-purple-500/10 border border-purple-500/20">
              <Radio className="w-3.5 h-3.5 animate-pulse text-purple-400" />
            </span>
            <span className="font-semibold uppercase tracking-wider">COMMAND CENTER OPERATIONS</span>
            <span className="text-slate-500">•</span>
            <span className={isConnected ? 'text-emerald-400 flex items-center gap-1.5' : 'text-red-400'}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              {isConnected ? 'LIVE TELEMETRY STREAMING' : 'OFFLINE'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading">
            Live Event Operations Center
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl font-sans">
            Real-time participant tracking, round broadcasting, sandbox monitoring, and instant anti-cheat arbitration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="btn btn-ghost text-xs p-3"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link
            to="/admin/security"
            className={`btn py-2.5 px-4 text-xs font-bold transition-all ${
              stats.pendingIncidents > 0
                ? 'btn-danger animate-pulse shadow-lg shadow-red-900/40'
                : 'btn-ghost'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{stats.pendingIncidents} PENDING REVIEWS</span>
          </Link>
        </div>
      </div>

      {/* 2. Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Registered */}
        <div className="stat-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="stat-label">Total Registered</span>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="stat-value text-white">{stats.totalParticipants}</span>
            <span className="text-xs text-slate-400 ml-1.5 font-sans">candidates</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-400 pt-2 border-t border-white/5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{stats.activeParticipants} Currently Connected</span>
          </div>
        </div>

        {/* Round 1 Active Coders */}
        <div className="stat-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="stat-label">Round 1 (Palindrome)</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="stat-value text-cyan-300">{stats.round1Participants}</span>
            <span className="text-xs text-slate-400 ml-1.5 font-sans">active coders</span>
          </div>
          <div className="text-xs text-slate-400 pt-2 border-t border-white/5 font-sans">
            Core algorithmic evaluation
          </div>
        </div>

        {/* Round 2 Active Coders */}
        <div className="stat-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="stat-label">Round 2 (Pattern)</span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="stat-value text-purple-300">{stats.round2Participants}</span>
            <span className="text-xs text-slate-400 ml-1.5 font-sans">active coders</span>
          </div>
          <div className="text-xs text-slate-400 pt-2 border-t border-white/5 font-sans">
            Matrix transformation round
          </div>
        </div>

        {/* Total Snapshots Submissions */}
        <div className="stat-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="stat-label">Total Submissions</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Send className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="stat-value text-emerald-300">{stats.totalSubmissions}</span>
            <span className="text-xs text-slate-400 ml-1.5 font-sans">snapshots</span>
          </div>
          <div className="text-xs text-slate-400 pt-2 border-t border-white/5 font-sans">
            Immutable database records
          </div>
        </div>
      </div>

      {/* 3. Secondary System Status Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold block">Under Review</span>
            <span className="text-2xl font-bold font-heading text-amber-400 mt-0.5 block">{stats.underReview}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold block">Disqualified</span>
            <span className="text-2xl font-bold font-heading text-red-400 mt-0.5 block">{stats.disqualified}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold block">Completed</span>
            <span className="text-2xl font-bold font-heading text-emerald-400 mt-0.5 block">{stats.completed}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold block">Total Incidents</span>
            <span className="text-2xl font-bold font-heading text-red-300 mt-0.5 block">{stats.securityIncidents}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Live Event Round Broadcast Controls */}
      <div className="card-premium p-7 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5 font-heading">
              <Layers className="w-5 h-5 text-purple-400" />
              <span>Event Round Broadcast Controls</span>
            </h2>
            <p className="text-sm text-slate-400 font-sans mt-0.5">
              Live round orchestration with synchronized countdown timers across all participant screens.
            </p>
          </div>
          <Link
            to="/admin/rounds"
            className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 self-start sm:self-auto"
          >
            <span>CONFIGURE PROBLEM SETS</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rounds.map((round) => (
            <div
              key={round.id}
              className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold text-purple-300 bg-purple-950/60 border border-purple-800/60">
                    ROUND 0{round.round_number}
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
                <h3 className="text-xl font-bold text-white font-heading">{round.name}</h3>
                <p className="text-sm text-slate-300 mt-1 leading-relaxed">{round.description}</p>

                <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    {round.duration_minutes} Mins Duration
                  </span>
                  <span>•</span>
                  <span>{round.run_limit} Max Runs</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-3">
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
                    className="flex-1 btn btn-success py-2.5 text-xs font-bold"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>START & BROADCAST ROUND</span>
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
                      className="flex-1 btn py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
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
                      className="btn btn-danger py-2.5 px-4 text-xs font-bold"
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
                      className="flex-1 btn btn-primary py-2.5 text-xs font-bold"
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
                      className="btn btn-danger py-2.5 px-4 text-xs font-bold"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                      <span>END ROUND</span>
                    </button>
                  </>
                )}

                {round.status === 'ENDED' && (
                  <div className="w-full text-center py-2.5 text-xs font-medium text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800">
                    ROUND CONCLUDED • FINALIZED
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Two-Column Live Surveillance & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: Real-Time Activity Feed */}
        <ActivityFeed maxItems={30} showFilters={true} />

        {/* Right: Live Participant Telemetry Snapshot */}
        <div className="card-premium p-6 sm:p-7 flex flex-col h-full space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <Zap className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold text-white font-heading">
                Live Participant Roster
              </h2>
            </div>
            <Link
              to="/admin/participants"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
            >
              <span>VIEW ALL</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
            {recentParticipants.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-sans">
                No participant telemetry available.
              </div>
            ) : (
              recentParticipants.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 text-xs hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-cyan-300">
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
                        <span className="font-semibold text-white truncate text-sm">
                          {p.display_name}
                        </span>
                        <span className="font-mono text-xs text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                          {p.participant_id}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 block mt-0.5">
                        {p.round_name || (p.active_round_number ? `Round ${p.active_round_number}` : 'Standby')}
                        {' • '}
                        <strong className="text-emerald-400">{p.total_score || 0} pts</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
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
                    <Link
                      to={`/admin/participants/${p.id}`}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="card-premium p-7 max-w-md w-full shadow-2xl border-white/20">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2 font-heading">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>Confirm Round Action</span>
            </h3>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed font-sans">
              Are you sure you want to{' '}
              <strong className="text-white uppercase font-bold">{confirmModal.action}</strong>{' '}
              <strong className="text-purple-400 font-bold">{confirmModal.roundName}</strong>?
              {confirmModal.action === 'start' &&
                ' This will broadcast immediately to all participant consoles and trigger countdown timers.'}
              {confirmModal.action === 'pause' &&
                ' This will temporarily pause participant editors and freeze active timers.'}
              {confirmModal.action === 'end' &&
                ' This will conclude the round and lock further code submissions.'}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="btn btn-ghost text-xs"
              >
                CANCEL
              </button>
              <button
                onClick={handleRoundActionConfirm}
                className={`btn text-xs font-bold ${
                  confirmModal.action === 'end'
                    ? 'btn-danger'
                    : confirmModal.action === 'pause'
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'btn-success'
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
