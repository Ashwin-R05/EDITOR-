import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Send,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  FileCode,
  Eye,
  RefreshCw,
  ExternalLink,
  Layers,
  Award,
  UserCheck
} from 'lucide-react';
import api from '../../services/api';
import { Submission, Round } from '../../types';

export const AdminSubmissions: React.FC = () => {
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRound, setSelectedRound] = useState<string>('ALL');
  const [selectedExecutionStatus, setSelectedExecutionStatus] = useState<string>('ALL');
  const [selectedValidationStatus, setSelectedValidationStatus] = useState<string>('ALL');
  const [minScoreFilter, setMinScoreFilter] = useState<string>('');

  const fetchSubmissions = async () => {
    try {
      const [subRes, roundsRes] = await Promise.all([
        api.get('/admin/submissions'),
        api.get('/admin/rounds'),
      ]);
      setSubmissions(subRes.data.submissions || []);
      setRounds(roundsRes.data.rounds || []);
    } catch (err) {
      console.error('Failed to load admin submissions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  // Filtered submissions
  const filteredSubmissions = submissions.filter((s) => {
    // Search filter (participant name, code, email)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = (s.participant_name || '').toLowerCase().includes(term);
      const matchCode = (s.participant_code || s.participant_id || '').toLowerCase().includes(term);
      const matchEmail = (s.participant_email || '').toLowerCase().includes(term);
      if (!matchName && !matchCode && !matchEmail) return false;
    }

    // Round filter
    if (selectedRound !== 'ALL' && s.round_id !== selectedRound) {
      return false;
    }

    // Execution status filter
    if (selectedExecutionStatus !== 'ALL' && s.execution_status !== selectedExecutionStatus) {
      return false;
    }

    // Validation status filter
    if (selectedValidationStatus !== 'ALL') {
      if (selectedValidationStatus === 'PENDING_REVIEW') {
        if (s.validation_status !== 'PENDING_REVIEW' && s.validation_status !== 'PENDING') return false;
      } else if (s.validation_status !== selectedValidationStatus) {
        return false;
      }
    }

    // Score filter
    if (minScoreFilter !== '') {
      const minScore = Number(minScoreFilter);
      if (!isNaN(minScore) && s.score < minScore) return false;
    }

    return true;
  });

  // Summary counts
  const totalSubmissions = submissions.length;
  const pendingReviewCount = submissions.filter(
    (s) => s.validation_status === 'PENDING_REVIEW' || s.validation_status === 'PENDING'
  ).length;
  const validatedCount = submissions.filter((s) => s.validation_status === 'VALIDATED').length;
  const rejectedCount = submissions.filter((s) => s.validation_status === 'REJECTED').length;

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="spinner mb-4" />
        <p className="text-purple-400 font-mono text-xs tracking-wider animate-pulse">
          LOADING SUBMISSION AUDIT LOGS...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Send className="w-6 h-6 text-purple-400" />
            <span>Participant Submissions Control</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Central review interface for inspecting immutable snapshots, automated grading, and manual validation.
          </p>
        </div>

        <button
          onClick={() => {
            setRefreshing(true);
            fetchSubmissions();
          }}
          disabled={refreshing}
          className="btn btn-ghost text-xs font-mono self-start md:self-auto flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass p-4 rounded-xl border border-slate-800">
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-slate-300" />
            <span>TOTAL SUBMISSIONS</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono mt-1">{totalSubmissions}</div>
        </div>

        <div className="glass p-4 rounded-xl border border-amber-500/20 bg-amber-950/10">
          <div className="text-[11px] text-amber-400 font-mono flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>PENDING REVIEW</span>
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono mt-1">{pendingReviewCount}</div>
        </div>

        <div className="glass p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10">
          <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>VALIDATED</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">{validatedCount}</div>
        </div>

        <div className="glass p-4 rounded-xl border border-rose-500/20 bg-rose-950/10">
          <div className="text-[11px] text-rose-400 font-mono flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            <span>REJECTED</span>
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono mt-1">{rejectedCount}</div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="glass p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, code, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Round Filter */}
          <div>
            <select
              value={selectedRound}
              onChange={(e) => setSelectedRound(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">All Rounds</option>
              {rounds.map((r) => (
                <option key={r.id} value={r.id}>
                  Round {r.round_number}: {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Execution Status Filter */}
          <div>
            <select
              value={selectedExecutionStatus}
              onChange={(e) => setSelectedExecutionStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">All Execution Statuses</option>
              <option value="PASSED">PASSED</option>
              <option value="PARTIALLY_PASSED">PARTIALLY PASSED</option>
              <option value="FAILED">FAILED</option>
              <option value="COMPILATION_ERROR">COMPILATION ERROR</option>
              <option value="TIME_LIMIT_EXCEEDED">TIME LIMIT EXCEEDED</option>
            </select>
          </div>

          {/* Validation Status Filter */}
          <div>
            <select
              value={selectedValidationStatus}
              onChange={(e) => setSelectedValidationStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">All Validation Statuses</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="VALIDATED">Validated</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      {filteredSubmissions.length === 0 ? (
        <div className="glass rounded-xl p-12 border border-slate-800 text-center space-y-2">
          <Clock className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300 font-mono">NO MATCHING SUBMISSIONS</h3>
          <p className="text-xs text-slate-500 font-mono">
            Try adjusting your search query or filter options.
          </p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden border border-slate-800">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Submission</th>
                  <th>Participant</th>
                  <th>Round</th>
                  <th>Submitted At</th>
                  <th>Execution</th>
                  <th>Tests Passed</th>
                  <th>Score</th>
                  <th>Validation</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-900/50 transition-colors">
                    <td>
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-purple-400" />
                        <span className="font-mono font-bold text-white text-xs">
                          Code {s.submission_number}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <span className="font-bold text-xs text-white block">
                          {s.participant_name || 'Participant'}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                          <span className="text-purple-300">{s.participant_code || s.participant_id}</span>
                          <span>•</span>
                          <span>{s.college || 'College'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-xs text-slate-300">
                      R{s.round_number || 1}: {s.round_name || 'Round'}
                    </td>
                    <td className="font-mono text-xs text-slate-400">
                      {new Date(s.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          s.execution_status === 'PASSED'
                            ? 'badge-active'
                            : s.execution_status === 'FAILED'
                            ? 'badge-danger'
                            : s.execution_status === 'PARTIALLY_PASSED'
                            ? 'badge-warning'
                            : 'badge-pending'
                        } text-[10px]`}
                      >
                        {s.execution_status}
                      </span>
                    </td>
                    <td className="font-mono text-xs font-bold text-emerald-400">
                      {s.test_cases_passed} / {s.total_test_cases}
                    </td>
                    <td className="font-mono font-bold text-cyan-300 text-xs">
                      {s.score} pts
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          s.validation_status === 'VALIDATED'
                            ? 'badge-active'
                            : s.validation_status === 'REJECTED'
                            ? 'badge-danger'
                            : 'badge-pending'
                        } text-[10px]`}
                      >
                        {s.validation_status === 'VALIDATED'
                          ? 'VALIDATED'
                          : s.validation_status === 'REJECTED'
                          ? 'REJECTED'
                          : 'PENDING REVIEW'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => navigate(`/admin/submissions/${s.id}`)}
                        className="px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 text-xs font-mono inline-flex items-center gap-1.5 border border-purple-500/30 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Review</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
