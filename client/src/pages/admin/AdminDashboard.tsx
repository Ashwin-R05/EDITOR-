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
  ArrowRight
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { AdminDashboardStats, Round } from '../../types';

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
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      if (res.data?.stats) setStats(res.data.stats);
      if (res.data?.rounds) setRounds(res.data.rounds);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Socket real-time listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('participant:connected', () => fetchDashboard());
    socket.on('participant:disconnected', () => fetchDashboard());
    socket.on('submission:created', () => fetchDashboard());
    socket.on('incident:created', () => fetchDashboard());
    socket.on('security:decision', () => fetchDashboard());
    socket.on('round:started', () => fetchDashboard());
    socket.on('round:paused', () => fetchDashboard());
    socket.on('round:ended', () => fetchDashboard());

    return () => {
      socket.off('participant:connected');
      socket.off('participant:disconnected');
      socket.off('submission:created');
      socket.off('incident:created');
      socket.off('security:decision');
      socket.off('round:started');
      socket.off('round:paused');
      socket.off('round:ended');
    };
  }, [socket]);

  const handleRoundAction = async (roundId: string, action: 'start' | 'pause' | 'end') => {
    setActionLoading(roundId);
    try {
      await api.post(`/admin/rounds/${roundId}/${action}`);
      await fetchDashboard();
    } catch (err: any) {
      alert(err.response?.data?.error || `Failed to ${action} round`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
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
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            Live Event Operations Center
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Autonomous state tracking • Real-time telemetry • Instant anti-cheat arbitration
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/security"
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-2 transition-all ${
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
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {stats.activeParticipants} Currently Connected
          </span>
        </div>

        {/* Round 1 Active */}
        <div className="stat-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="stat-label">In Round 1 (Palindrome)</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <span className="stat-value text-cyan-300">{stats.round1Participants}</span>
          <span className="text-[10px] font-mono text-slate-500">Active coding sessions</span>
        </div>

        {/* Round 2 Active */}
        <div className="stat-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="stat-label">In Round 2 (Pattern)</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <span className="stat-value text-purple-300">{stats.round2Participants}</span>
          <span className="text-[10px] font-mono text-slate-500">Configurable round</span>
        </div>

        {/* Total Submissions */}
        <div className="stat-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="stat-label">Total Submissions</span>
            <Send className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="stat-value text-emerald-300">{stats.totalSubmissions}</span>
          <span className="text-[10px] font-mono text-slate-500">Immutable snapshots</span>
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

      {/* Live Event Control Section */}
      <div className="glass rounded-2xl p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              <span>Event Round Control Panel</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Activate, pause, resume, or terminate competitive rounds for all participants.
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
                        ? 'badge-active'
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
                    onClick={() => handleRoundAction(round.id, 'start')}
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
                      onClick={() => handleRoundAction(round.id, 'pause')}
                      className="flex-1 py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>PAUSE ROUND</span>
                    </button>
                    <button
                      disabled={actionLoading === round.id}
                      onClick={() => handleRoundAction(round.id, 'end')}
                      className="py-2 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                      <span>END</span>
                    </button>
                  </>
                )}

                {round.status === 'PAUSED' && (
                  <>
                    <button
                      disabled={actionLoading === round.id}
                      onClick={() => handleRoundAction(round.id, 'start')}
                      className="flex-1 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>RESUME ROUND</span>
                    </button>
                    <button
                      disabled={actionLoading === round.id}
                      onClick={() => handleRoundAction(round.id, 'end')}
                      className="py-2 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                      <span>END</span>
                    </button>
                  </>
                )}

                {round.status === 'ENDED' && (
                  <div className="w-full text-center py-2 text-xs font-mono text-slate-500">
                    ROUND CONCLUDED • VIEW SUBMISSIONS & SCORES
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
