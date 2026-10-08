import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Code,
  Shield,
  Clock,
  Send,
  Trophy,
  ArrowRight,
  AlertCircle,
  PlayCircle,
  Lock,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Terminal
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { Round, CodingSession, Score } from '../../types';

export const ParticipantDashboard: React.FC = () => {
  const { user, participant, refreshUser } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [rounds, setRounds] = useState<Round[]>([]);
  const [sessions, setSessions] = useState<CodingSession[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [securityIncidents, setSecurityIncidents] = useState<number>(0);
  const [totalSubmissions, setTotalSubmissions] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/participant/dashboard');
      setRounds(res.data.rounds || []);
      setSessions(res.data.sessions || []);
      setScores(res.data.scores || []);
      setSecurityIncidents(res.data.securityIncidents || 0);
      setTotalSubmissions(res.data.totalSubmissions || 0);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Real-time Socket.IO synchronization
  useEffect(() => {
    if (!socket) return;

    socket.on('round:started', () => {
      fetchDashboardData();
      refreshUser();
    });

    socket.on('round:paused', () => {
      fetchDashboardData();
    });

    socket.on('round:ended', () => {
      fetchDashboardData();
    });

    socket.on('security:decision', () => {
      fetchDashboardData();
      refreshUser();
    });

    socket.on('submission:created', () => {
      fetchDashboardData();
    });

    return () => {
      socket.off('round:started');
      socket.off('round:paused');
      socket.off('round:ended');
      socket.off('security:decision');
      socket.off('submission:created');
    };
  }, [socket]);

  const getSessionForRound = (roundId: string) => {
    return sessions.find((s) => s.round_id === roundId);
  };

  const getScoreForRound = (roundId: string) => {
    return scores.find((s) => s.round_id === roundId);
  };

  // Find active round if any
  const activeRound = rounds.find((r) => r.status === 'ACTIVE');
  const activeSession = activeRound ? getSessionForRound(activeRound.id) : null;
  const totalScore = scores.reduce((acc, curr) => acc + (curr.round_score || 0), 0);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="spinner mb-4" />
        <p className="text-cyan-400 font-mono text-xs tracking-wider animate-pulse">
          INITIALIZING ARENA TELEMETRY...
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 px-6 md:px-10 py-8 max-w-7xl mx-auto w-full space-y-8 select-none">
      {/* Top Header Card */}
      <div className="glass rounded-2xl p-6 md:p-8 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-600/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1.5">
              <Cpu className="w-4 h-4" />
              <span>TECH AUCTION • COMPETITIVE CODING PLATFORM</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              Candidate: <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">{user?.displayName}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-2 font-mono">
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-cyan-300 font-semibold">
                ID: {participant?.participant_id || 'P001'}
              </span>
              <span>•</span>
              <span>College: <strong className="text-slate-200">{participant?.college || 'Engineering'}</strong></span>
              <span>•</span>
              <span>Dept: <strong className="text-slate-200">{participant?.department || 'CSE'}</strong></span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Score */}
            <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 text-center min-w-[105px]">
              <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Event Score</span>
              <span className="text-2xl font-bold font-mono text-cyan-300">{totalScore}</span>
              <span className="block text-[9px] text-slate-500 font-mono">points</span>
            </div>

            {/* Submissions */}
            <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 text-center min-w-[105px]">
              <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Submissions</span>
              <span className="text-2xl font-bold font-mono text-purple-300">{totalSubmissions}</span>
              <span className="block text-[9px] text-slate-500 font-mono">snapshots</span>
            </div>

            {/* Active Round Runs Used */}
            <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 text-center min-w-[105px]">
              <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Runs Used</span>
              <span className="text-2xl font-bold font-mono text-amber-300">
                {activeSession ? `${activeSession.run_count}/5` : '0/5'}
              </span>
              <span className="block text-[9px] text-slate-500 font-mono">in active round</span>
            </div>

            {/* Security Status */}
            <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 text-center min-w-[105px]">
              <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Anti-Cheat</span>
              <span
                className={`text-lg font-bold font-mono block mt-0.5 ${
                  participant?.status === 'CLEAR'
                    ? 'text-emerald-400'
                    : participant?.status === 'UNDER_REVIEW'
                    ? 'text-amber-400 animate-pulse'
                    : 'text-red-400'
                }`}
              >
                {participant?.status || 'CLEAR'}
              </span>
              <span className="block text-[9px] text-slate-500 font-mono">
                {securityIncidents} incidents
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Status Alerts */}
      {participant?.status === 'UNDER_REVIEW' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-amber-950/60 border-2 border-amber-500/50 flex items-start gap-4 text-amber-200 backdrop-blur-md shadow-xl shadow-amber-950/40"
        >
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
            <AlertCircle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white font-mono uppercase tracking-wider">
              SECURITY REVIEW IN PROGRESS
            </h3>
            <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
              Your session has been temporarily locked because suspicious activity was detected during coding.
              Please remain on this screen and wait for the administrator to review and accept your session.
            </p>
          </div>
        </motion.div>
      )}

      {participant?.status === 'DISQUALIFIED' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-red-950/60 border-2 border-red-500/50 flex items-start gap-4 text-red-200 backdrop-blur-md shadow-xl shadow-red-950/40"
        >
          <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400 shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white font-mono uppercase tracking-wider">
              DISQUALIFIED FROM COMPETITION
            </h3>
            <p className="text-xs text-red-200/90 mt-1 leading-relaxed">
              Your participation in TECH AUCTION has been terminated by the administrator due to confirmed security violations.
              All active coding sessions have been closed.
            </p>
          </div>
        </motion.div>
      )}

      {/* Round System Cards (Round 1 & Round 2) */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Code className="w-5 h-5 text-cyan-400" />
              <span>Competition Arena Rounds</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Rounds are unlocked sequentially by the administrator. Direct URL access to inactive rounds is strictly prohibited.
            </p>
          </div>

          <button
            onClick={() => {
              setRefreshing(true);
              fetchDashboardData();
            }}
            disabled={refreshing}
            className="btn btn-ghost text-xs font-mono"
            title="Refresh Round Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Sync Arena</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rounds.map((round) => {
            const session = getSessionForRound(round.id);
            const score = getScoreForRound(round.id);
            const isActive = round.status === 'ACTIVE';
            const isEnded = round.status === 'ENDED';
            const isPaused = round.status === 'PAUSED';
            const canEnter = isActive && participant?.status === 'CLEAR';

            const runsUsed = session?.run_count || 0;
            const runsRemaining = Math.max(0, round.run_limit - runsUsed);

            return (
              <motion.div
                key={round.id}
                whileHover={canEnter ? { y: -4 } : {}}
                transition={{ duration: 0.2 }}
                className={`glass rounded-2xl p-6 border flex flex-col justify-between transition-all ${
                  isActive
                    ? 'border-cyan-500/50 shadow-2xl shadow-cyan-950/40 relative'
                    : 'border-slate-800/80 opacity-90'
                }`}
              >
                {/* Active Pulse Glow */}
                {isActive && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />
                )}

                <div>
                  {/* Round Header & Badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-900 border border-slate-700 text-cyan-300">
                        ROUND {round.round_number}
                      </span>
                      <h3 className="text-2xl font-bold text-white mt-1.5 flex items-center gap-2">
                        <span>{round.name.toUpperCase()}</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {round.round_number === 1
                          ? 'Palindrome C Programming — Determine if input is a palindrome.'
                          : 'Pattern C Programming — Admin configurable pattern printing.'}
                      </p>
                    </div>

                    <div>
                      {isActive && (
                        <span className="badge badge-active flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          <span>ACTIVE</span>
                        </span>
                      )}
                      {round.status === 'NOT_STARTED' && (
                        <span className="badge badge-muted">LOCKED</span>
                      )}
                      {isPaused && (
                        <span className="badge badge-pending">PAUSED</span>
                      )}
                      {isEnded && (
                        <span className="badge badge-info">ENDED</span>
                      )}
                    </div>
                  </div>

                  {/* Problem Availability */}
                  <div className="mb-4">
                    <span className="text-[11px] font-mono text-slate-400">
                      Problem Set:{' '}
                      <strong className={isActive ? 'text-emerald-400' : 'text-slate-500'}>
                        {isActive ? 'Available in Arena' : 'Locked until round start'}
                      </strong>
                    </span>
                  </div>

                  {/* Specifications Grid */}
                  <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono mb-4">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Duration</span>
                      <span className="text-slate-200 font-bold">{round.duration_minutes} Mins</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Runs Left</span>
                      <span className={`font-bold ${runsRemaining === 0 ? 'text-red-400' : 'text-cyan-300'}`}>
                        {runsRemaining} / {round.run_limit}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Language</span>
                      <span className="text-cyan-400 font-bold uppercase">C (GCC)</span>
                    </div>
                  </div>

                  {/* Session Telemetry if available */}
                  {session && (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs font-mono space-y-1 mb-4">
                      <div className="flex justify-between text-slate-400">
                        <span>Session Status:</span>
                        <span className="text-slate-200 font-bold">{session.status}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Runs Recorded:</span>
                        <span className="text-cyan-300">{session.run_count} of {round.run_limit}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Submissions Made:</span>
                        <span className="text-purple-300">{session.submission_count}</span>
                      </div>
                      {score && (
                        <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                          <span>Round Score:</span>
                          <span className="text-emerald-400 font-bold">{score.round_score} pts</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Enter Arena Action Button */}
                <div className="pt-2">
                  {canEnter ? (
                    <button
                      onClick={() => navigate(`/participant/round/${round.id}`)}
                      className="w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
                    >
                      <Terminal className="w-4 h-4" />
                      <span>{session ? 'CONTINUE CODING SESSION' : 'ENTER CODING ARENA'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="w-full py-3 px-4 rounded-xl text-xs font-mono text-slate-400 bg-slate-900/60 border border-slate-800/80 flex items-center justify-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {isEnded
                          ? 'ROUND HAS CONCLUDED'
                          : isPaused
                          ? 'ROUND TEMPORARILY PAUSED'
                          : round.round_number === 2
                          ? 'Waiting for Round 2 to begin'
                          : 'Waiting for Round 1 to begin'}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
