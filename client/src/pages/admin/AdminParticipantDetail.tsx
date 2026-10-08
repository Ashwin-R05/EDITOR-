import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Code,
  ShieldAlert,
  Trophy,
  Clock,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Radio,
  FileCode2,
  Calendar,
  GraduationCap
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';

export const AdminParticipantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { socket } = useSocket();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = async () => {
    try {
      const res = await api.get(`/admin/participants/live/${id}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load participant detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  // Real-time updates for participant
  useEffect(() => {
    if (!socket) return;

    socket.on('participant:connected', () => fetchDetail());
    socket.on('participant:disconnected', () => fetchDetail());
    socket.on('participant:statusChanged', () => fetchDetail());
    socket.on('submission:created', () => fetchDetail());
    socket.on('incident:created', () => fetchDetail());

    return () => {
      socket.off('participant:connected');
      socket.off('participant:disconnected');
      socket.off('participant:statusChanged');
      socket.off('submission:created');
      socket.off('incident:created');
    };
  }, [socket, id]);

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="spinner" />
      </div>
    );
  }

  const { participant, sessions, submissions, incidents, scores, securitySummary, latestDraft } = data;

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Back Button */}
      <Link
        to="/admin/participants"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>BACK TO PARTICIPANT ROSTER</span>
      </Link>

      {/* Main Profile Header Card */}
      <div className="glass rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-600 p-[1px] shadow-lg shadow-purple-900/40">
            <div className="w-full h-full bg-slate-900 rounded-[15px] flex items-center justify-center font-bold text-2xl text-purple-300">
              {participant.display_name?.charAt(0) || 'P'}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-extrabold text-white">{participant.display_name}</h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                {participant.participant_id}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
              <span>{participant.email}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
                {participant.college || 'N/A'} {participant.department ? `(${participant.department})` : ''}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Reg: {new Date(participant.registered_at || participant.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Live Telemetry Status Badges */}
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs font-mono">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                participant.connectionStatus === 'CONNECTED'
                  ? 'bg-emerald-400 animate-pulse'
                  : participant.connectionStatus === 'STALE'
                  ? 'bg-amber-400'
                  : 'bg-slate-600'
              }`}
            />
            <span
              className={
                participant.connectionStatus === 'CONNECTED'
                  ? 'text-emerald-400 font-bold'
                  : participant.connectionStatus === 'STALE'
                  ? 'text-amber-400 font-bold'
                  : 'text-slate-500 font-bold'
              }
            >
              {participant.connectionStatus}
            </span>
            {participant.heartbeatAge !== null && (
              <span className="text-[10px] text-slate-500">
                ({participant.heartbeatAge}s ago)
              </span>
            )}
          </div>

          {/* Security Status */}
          <span
            className={`badge text-xs px-3 py-1.5 ${
              participant.status === 'CLEAR'
                ? 'badge-active'
                : participant.status === 'UNDER_REVIEW'
                ? 'badge-pending animate-pulse'
                : participant.status === 'DISQUALIFIED'
                ? 'badge-danger'
                : 'badge-info'
            }`}
          >
            {participant.status}
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Total Submissions</span>
          <span className="text-xl font-bold font-mono text-cyan-400">{submissions.length}</span>
          <span className="text-[10px] text-slate-500 font-mono block mt-1">Immutable snapshots</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Total Incidents</span>
          <span className="text-xl font-bold font-mono text-red-400">
            {securitySummary?.total || incidents.length}
          </span>
          <span className="text-[10px] text-slate-500 font-mono block mt-1">
            {securitySummary?.pending || 0} pending review
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Total Best Score</span>
          <span className="text-xl font-bold font-mono text-emerald-400">
            {scores.reduce((acc: number, s: any) => acc + (s.round_score || 0), 0)} pts
          </span>
          <span className="text-[10px] text-slate-500 font-mono block mt-1">Combined leaderboard</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Draft Autosave</span>
          <span className="text-sm font-bold font-mono text-purple-300">
            {latestDraft ? new Date(latestDraft.draft_time).toLocaleTimeString() : 'None recorded'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono block mt-1">
            {latestDraft ? latestDraft.round_name : 'No drafts'}
          </span>
        </div>
      </div>

      {/* Coding Sessions Grid */}
      <div className="glass rounded-xl p-5 border border-slate-800">
        <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span>Competitive Coding Sessions</span>
        </h2>
        {sessions.length === 0 ? (
          <p className="text-xs text-slate-500 font-mono py-4 text-center">
            No active or past sessions found for this participant.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((s: any) => (
              <div key={s.id} className="p-4 bg-slate-900/80 rounded-xl border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">
                    Round {s.round_number}: {s.round_name}
                  </span>
                  <span
                    className={`badge text-[10px] ${
                      s.status === 'ACTIVE'
                        ? 'badge-active animate-pulse'
                        : s.status === 'UNDER_REVIEW'
                        ? 'badge-pending'
                        : s.status === 'COMPLETED'
                        ? 'badge-info'
                        : 'badge-muted'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono text-slate-400">
                  <div className="flex justify-between">
                    <span>Runs Consumed:</span>
                    <span className="text-cyan-300 font-bold">
                      {s.run_count} / {s.run_limit} runs
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (s.run_count / (s.run_limit || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between pt-1">
                    <span>Submissions:</span>
                    <span className="text-purple-300 font-bold">{s.submission_count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submissions & Incidents 2-Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submissions Table */}
        <div className="glass rounded-xl p-5 border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Code className="w-4 h-4 text-purple-400" />
              <span>Submissions Log ({submissions.length})</span>
            </h2>
          </div>

          {submissions.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono py-8 text-center">
              No code submissions recorded yet.
            </p>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-[360px] scrollbar-thin scrollbar-thumb-slate-800">
              {submissions.map((sub: any) => (
                <div
                  key={sub.id}
                  className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs font-mono hover:border-slate-700/80 transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white">#{sub.submission_number}</span>
                      <span className="text-purple-300 font-semibold">{sub.round_name}</span>
                      <span className="text-emerald-400 font-bold">{sub.score} pts</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Passed {sub.test_cases_passed} / {sub.total_test_cases} tests • {sub.execution_status}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`badge text-[9px] ${
                        sub.validation_status === 'VALIDATED'
                          ? 'badge-active'
                          : sub.validation_status === 'REJECTED'
                          ? 'badge-danger'
                          : 'badge-pending'
                      }`}
                    >
                      {sub.validation_status}
                    </span>
                    <Link
                      to={`/admin/submissions/${sub.id}`}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Inspect Snapshot"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Incidents Table */}
        <div className="glass rounded-xl p-5 border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>Security Incidents ({incidents.length})</span>
            </h2>
            <Link
              to="/admin/security"
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>MANAGE INCIDENTS</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {incidents.length === 0 ? (
            <div className="py-8 text-center text-xs text-emerald-400 font-mono">
              Clean Record — No anti-cheat incidents flagged.
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-[360px] scrollbar-thin scrollbar-thumb-slate-800">
              {incidents.map((inc: any) => (
                <div
                  key={inc.id}
                  className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs font-mono hover:border-slate-700/80 transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-red-400">{inc.incident_type}</span>
                      <span className="text-[10px] text-slate-500">{inc.incident_code}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {inc.round_name} • {new Date(inc.detected_at).toLocaleTimeString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`badge text-[9px] ${
                        inc.status === 'ACCEPTED'
                          ? 'badge-active'
                          : inc.status === 'DECLINED'
                          ? 'badge-danger'
                          : 'badge-pending animate-pulse'
                      }`}
                    >
                      {inc.status}
                    </span>
                    <Link
                      to={`/admin/security/${inc.id}`}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Review Incident"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
