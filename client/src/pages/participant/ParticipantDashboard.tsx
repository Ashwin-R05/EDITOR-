import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Code,
  Shield,
  Clock,
  Send,
  Trophy,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Terminal,
  Zap,
  Sparkles,
  Flame,
  FileCode2,
  Layers,
  ChevronRight,
  Info,
  Award
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
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    try {
      const [dashRes, subsRes] = await Promise.allSettled([
        api.get('/participant/dashboard'),
        api.get('/participant/submissions', { params: { limit: 4 } })
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value.data) {
        setRounds(dashRes.value.data.rounds || []);
        setSessions(dashRes.value.data.sessions || []);
        setScores(dashRes.value.data.scores || []);
        setSecurityIncidents(dashRes.value.data.securityIncidents || 0);
        setTotalSubmissions(dashRes.value.data.totalSubmissions || 0);
      }

      if (subsRes.status === 'fulfilled' && subsRes.value.data?.submissions) {
        setRecentSubmissions(subsRes.value.data.submissions);
      }
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

  const activeRound = rounds.find((r) => r.status === 'ACTIVE');
  const activeSession = activeRound ? getSessionForRound(activeRound.id) : null;
  const totalScore = scores.reduce((acc, curr) => acc + (curr.round_score || 0), 0);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="spinner mb-4" />
        <p className="text-cyan-400 font-sans text-sm font-medium tracking-wide animate-pulse">
          Synchronizing contest telemetry...
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 sm:px-8 lg:px-12 py-8 max-w-7xl mx-auto w-full space-y-8 select-none">
      {/* 1. Hero Welcome Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden shadow-2xl"
      >
        {/* Ambient atmospheric lighting */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center flex-wrap gap-2.5">
              <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 font-sans text-xs font-semibold tracking-wide flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>COMPETITIVE CODING ARENA</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Arena Connected</span>
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight font-heading">
                Welcome back,{' '}
                <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                  {user?.displayName || 'Participant'}
                </span>
              </h1>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl font-sans leading-relaxed">
                Compete against time in isolated C execution sandboxes. Code drafts autosave automatically, test runs are executed in Docker, and all snapshots are immutable.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
              <span className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-cyan-300 font-mono font-bold shadow-inner">
                CANDIDATE ID: {participant?.participant_id || 'P001'}
              </span>
              <span className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-200 font-medium">
                {participant?.college || 'Engineering Institute'}
              </span>
              <span className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-300 font-medium">
                {participant?.department ? `Dept: ${participant.department}` : 'Computer Science'}
              </span>
            </div>
          </div>

          {/* Quick Active Round Callout if live */}
          {activeRound && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/60 to-blue-950/40 border border-cyan-500/30 shrink-0 max-w-xs shadow-xl">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>CURRENT ACTIVE ROUND</span>
              </div>
              <h3 className="text-lg font-bold text-white font-heading">{activeRound.name}</h3>
              <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                Round {activeRound.round_number} is currently ongoing. Click below to enter the live arena.
              </p>
              <button
                onClick={() => navigate(`/participant/round/${activeRound.id}`)}
                className="mt-3.5 w-full btn btn-primary text-xs font-bold py-2.5"
              >
                <span>ENTER ARENA</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Security Status Alerts (if review or disqualified) */}
      {participant?.status === 'UNDER_REVIEW' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-amber-950/80 border-2 border-amber-500/60 flex items-start gap-4 text-amber-200 backdrop-blur-md shadow-xl"
        >
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
            <AlertCircle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white uppercase tracking-wider font-heading">
              SECURITY REVIEW IN PROGRESS
            </h3>
            <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
              Your session was temporarily locked because a security event (such as a tab switch, copy/paste, or window blur) was detected.
              An administrator will review and resolve your session shortly.
            </p>
          </div>
        </motion.div>
      )}

      {participant?.status === 'DISQUALIFIED' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-red-950/80 border-2 border-red-500/60 flex items-start gap-4 text-red-200 backdrop-blur-md shadow-xl"
        >
          <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400 shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white uppercase tracking-wider font-heading">
              DISQUALIFIED FROM COMPETITION
            </h3>
            <p className="text-xs text-red-200/90 mt-1 leading-relaxed">
              Your participation in TECH AUCTION has been terminated due to confirmed anti-cheat policy violations.
            </p>
          </div>
        </motion.div>
      )}

      {/* 2. Key Performance Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Score */}
        <div className="stat-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="stat-label">Event Score</span>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Trophy className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="stat-value text-white">{totalScore}</span>
            <span className="text-xs text-slate-400 font-sans ml-1.5">points</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
            <span>Cumulative performance</span>
            <span className="text-cyan-400 font-medium">Rank Active</span>
          </div>
        </div>

        {/* Total Submissions Snapshots */}
        <div className="stat-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="stat-label">Submissions</span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Send className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="stat-value text-purple-300">{totalSubmissions}</span>
            <span className="text-xs text-slate-400 font-sans ml-1.5">snapshots</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
            <span>Immutable history</span>
            <Link to="/participant/submissions" className="text-purple-400 hover:text-purple-300 font-medium flex items-center gap-0.5">
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Runs Quota */}
        <div className="stat-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="stat-label">Test Runs Quota</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="stat-value text-amber-300">
              {activeSession ? `${activeSession.run_count} / 5` : '0 / 5'}
            </span>
            <span className="text-xs text-slate-400 font-sans ml-1.5">used</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
            <span>{activeSession ? `${5 - activeSession.run_count} runs left` : '5 runs per round'}</span>
            <span className="text-amber-400 font-medium">Docker Sandbox</span>
          </div>
        </div>

        {/* Anti-Cheat Integrity Status */}
        <div className="stat-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="stat-label">Session Integrity</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span
              className={`stat-value ${
                participant?.status === 'CLEAR'
                  ? 'text-emerald-400'
                  : participant?.status === 'UNDER_REVIEW'
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}
            >
              {participant?.status || 'CLEAR'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
            <span>{securityIncidents} security events</span>
            <span className="text-emerald-400 font-medium">Tele-Monitoring</span>
          </div>
        </div>
      </div>

      {/* 3. Competitive Arenas (The Main Round Cards) */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5 font-heading">
              <Flame className="w-6 h-6 text-amber-400" />
              <span>Competitive Arenas</span>
            </h2>
            <p className="text-sm text-slate-400 font-sans mt-0.5">
              Enter the active arena to write, test, and submit your C solutions.
            </p>
          </div>

          <button
            onClick={() => {
              setRefreshing(true);
              fetchDashboardData();
            }}
            disabled={refreshing}
            className="btn btn-ghost text-xs self-start sm:self-auto"
            title="Refresh Arena Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Sync Arenas</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                whileHover={canEnter ? { y: -3 } : {}}
                transition={{ duration: 0.2 }}
                className={`card-premium p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden ${
                  isActive
                    ? 'border-cyan-500/40 shadow-2xl shadow-cyan-950/30 bg-gradient-to-b from-[#0f172a]/95 to-[#0a0f1d]/95'
                    : 'border-white/5 bg-[#0d1322]/80 opacity-90'
                }`}
              >
                {/* Active ambient glow */}
                {isActive && (
                  <div className="absolute top-0 right-0 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                )}

                <div className="space-y-5">
                  {/* Round Header & Badge */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase tracking-wider bg-slate-900 border border-slate-700 text-cyan-300">
                          ROUND 0{round.round_number}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {round.round_number === 1 ? 'ALGORITHMIC FOUNDATIONS' : 'MATRIX & PATTERN GENERATION'}
                        </span>
                      </div>
                      <h3 className="text-2xl font-extrabold text-white mt-2 font-heading">
                        {round.name}
                      </h3>
                      <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                        {round.round_number === 1
                          ? 'Algorithmic string and number processing in pure C. Write an efficient palindrome validator with memory and time bounds.'
                          : 'Dynamic 2D matrix transformation and nested loop output patterns in C. Implement structured standard output formatting.'}
                      </p>
                    </div>

                    <div>
                      {isActive && (
                        <span className="badge badge-active flex items-center gap-2 shadow-lg shadow-emerald-950/40 py-1.5 px-3">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          <span>LIVE ARENA</span>
                        </span>
                      )}
                      {round.status === 'NOT_STARTED' && (
                        <span className="badge badge-muted py-1.5 px-3">LOCKED</span>
                      )}
                      {isPaused && (
                        <span className="badge badge-pending py-1.5 px-3">PAUSED</span>
                      )}
                      {isEnded && (
                        <span className="badge badge-info py-1.5 px-3">CONCLUDED</span>
                      )}
                    </div>
                  </div>

                  {/* Specifications Card */}
                  <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium mb-0.5">Duration</span>
                      <span className="text-white font-bold text-sm">{round.duration_minutes} Mins</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block font-medium mb-0.5">Test Quota</span>
                      <span className={`font-bold text-sm ${runsRemaining === 0 ? 'text-red-400' : 'text-cyan-300'}`}>
                        {runsRemaining} of {round.run_limit} left
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block font-medium mb-0.5">Execution Engine</span>
                      <span className="text-purple-300 font-bold text-sm">GCC 11 (C11)</span>
                    </div>
                  </div>

                  {/* Session Metrics Bar (if started) */}
                  {session && (
                    <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-2">
                      <div className="flex justify-between items-center text-slate-300">
                        <span>Current Session Status:</span>
                        <span className="font-semibold text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                          {session.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span>Snapshots Recorded:</span>
                        <span className="text-purple-300 font-bold text-sm">{session.submission_count}</span>
                      </div>
                      {score && (
                        <div className="flex justify-between items-center text-slate-200 pt-2 border-t border-slate-800">
                          <span className="font-medium">Evaluated Score:</span>
                          <span className="text-emerald-400 font-bold text-sm">{score.round_score} pts</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Enter Arena CTA Button */}
                <div className="pt-6">
                  {canEnter ? (
                    <button
                      onClick={() => navigate(`/participant/round/${round.id}`)}
                      className="w-full btn btn-primary py-3.5 px-6 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 group cursor-pointer"
                    >
                      <Terminal className="w-4 h-4 text-cyan-200 group-hover:rotate-12 transition-transform" />
                      <span>{session ? 'RESUME CODING WORKSPACE' : 'ENTER CODING ARENA'}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ) : (
                    <div className="w-full py-3.5 px-4 rounded-2xl text-xs font-sans text-slate-400 bg-slate-950/60 border border-slate-800 flex items-center justify-center gap-2">
                      <Info className="w-4 h-4 text-slate-400" />
                      <span>
                        {isEnded
                          ? 'This round has concluded. Results are available in the Results tab.'
                          : isPaused
                          ? 'Round is temporarily paused by contest administrators.'
                          : round.round_number === 2
                          ? 'Round 2 unlocks upon completion of Round 1.'
                          : 'Waiting for administrators to activate Round 1.'}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 4. Contest Schedule & Stage Progression Timeline */}
      <div className="card-premium p-6 sm:p-8 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-heading">Event Roadmap & Progression</h2>
              <p className="text-xs text-slate-400 font-sans">
                Real-time tracking of competition stages and evaluation phases.
              </p>
            </div>
          </div>
          <span className="badge badge-info text-xs">EVENT IN PROGRESS</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          {/* Step 1 */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-emerald-500/30 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-emerald-400">PHASE 01</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <h4 className="text-sm font-bold text-white">Participant Check-in</h4>
            <p className="text-xs text-slate-400 mt-1">Credentials verified & sandbox ready.</p>
          </div>

          {/* Step 2 */}
          <div className={`p-4 rounded-2xl relative ${
            activeRound?.round_number === 1
              ? 'bg-cyan-950/40 border-2 border-cyan-500/50 shadow-lg shadow-cyan-950/20'
              : 'bg-slate-900/70 border border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-cyan-400">PHASE 02</span>
              {activeRound?.round_number === 1 ? (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              ) : (
                <Clock className="w-4 h-4 text-slate-500" />
              )}
            </div>
            <h4 className="text-sm font-bold text-white">Round 1: Palindrome</h4>
            <p className="text-xs text-slate-400 mt-1">Algorithmic string processing in C.</p>
          </div>

          {/* Step 3 */}
          <div className={`p-4 rounded-2xl relative ${
            activeRound?.round_number === 2
              ? 'bg-purple-950/40 border-2 border-purple-500/50 shadow-lg shadow-purple-950/20'
              : 'bg-slate-900/70 border border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-purple-400">PHASE 03</span>
              {activeRound?.round_number === 2 ? (
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              ) : (
                <Clock className="w-4 h-4 text-slate-500" />
              )}
            </div>
            <h4 className="text-sm font-bold text-white">Round 2: Pattern</h4>
            <p className="text-xs text-slate-400 mt-1">Dynamic matrix transformations.</p>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-slate-400">PHASE 04</span>
              <Award className="w-4 h-4 text-slate-500" />
            </div>
            <h4 className="text-sm font-bold text-white">Leaderboard & Results</h4>
            <p className="text-xs text-slate-400 mt-1">Final scores & Tech Auction winners.</p>
          </div>
        </div>
      </div>

      {/* 5. Two-Column Lower Section: Recent Activity + Arena Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: Recent Submissions / Snapshots */}
        <div className="card-premium p-6 sm:p-7 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <FileCode2 className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white font-heading">Your Code Snapshots</h3>
            </div>
            <Link
              to="/participant/submissions"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              <span>View History</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentSubmissions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-sans">
              No code snapshots submitted yet. Enter the active arena to write and submit your code.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentSubmissions.map((sub: any) => (
                <div
                  key={sub.id}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 flex items-center justify-between gap-3 hover:border-slate-700 transition-all text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-500/20 flex items-center justify-center text-cyan-300 font-mono font-bold text-xs">
                      #{sub.submission_number || 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{sub.round_name || 'Round Solution'}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {sub.source_code ? `${sub.source_code.split('\n').length} lines` : 'C11 Code'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {new Date(sub.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="badge badge-active text-[10px]">SAVED SNAPSHOT</span>
                    <Link
                      to={`/participant/submissions/${sub.id}`}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Inspect Snapshot"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Arena Rules & Sandbox Guidelines */}
        <div className="card-premium p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <Shield className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white font-heading">Arena Rules & Compiler Environment</h3>
          </div>

          <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
              <Zap className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-medium">Standard C11 Sandbox</strong>
                <span>All code is compiled with GCC 11 using <code className="text-cyan-300 font-mono text-[11px] bg-black/40 px-1 py-0.5 rounded">-O2 -Wall -std=c11</code>. Use standard C library headers.</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
              <Cpu className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-medium">Test Run Quota Limit</strong>
                <span>You have exactly <strong>5 test runs</strong> per round. Each run executes all sample and hidden test cases in an isolated container.</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-medium">Anti-Cheat Real-Time Telemetry</strong>
                <span>Switching tabs, exiting fullscreen, or copy-pasting triggers an immediate screen lock. Sessions are arbitrated by Administrators.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
