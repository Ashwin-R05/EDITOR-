import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  FileCode,
  ArrowLeft,
  X,
  Code2,
  RefreshCw
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import api from '../../services/api';
import { Submission } from '../../types';

export const ParticipantSubmissions: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Selected Submission Detail Modal
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  const fetchSubmissions = async () => {
    try {
      const res = await api.get('/participant/submissions');
      setSubmissions(res.data.submissions || []);
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const openSubmissionDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/participant/submissions/${id}`);
      setSelectedSubmission(res.data);
    } catch (err) {
      console.error('Failed to load submission detail:', err);
      alert('Failed to load submission snapshot');
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="spinner mb-4" />
        <p className="text-cyan-400 font-mono text-xs tracking-wider animate-pulse">
          LOADING SUBMISSION ARCHIVE...
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 px-6 md:px-10 py-8 max-w-7xl mx-auto w-full space-y-6 select-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Send className="w-6 h-6 text-cyan-400" />
            <span>Immutable Submission History</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Every submission creates a permanent, tamper-proof snapshot with automated test evaluations.
          </p>
        </div>

        <button
          onClick={() => {
            setRefreshing(true);
            fetchSubmissions();
          }}
          disabled={refreshing}
          className="btn btn-ghost text-xs font-mono self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh History</span>
        </button>
      </div>

      {submissions.length === 0 ? (
        <div className="glass rounded-2xl p-12 border border-slate-800 text-center space-y-3">
          <Clock className="w-10 h-10 text-cyan-400/40 mx-auto" />
          <h3 className="text-base font-bold text-slate-300 font-mono">
            NO SUBMISSIONS RECORDED YET
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto font-mono">
            When you enter an active competition round and click SUBMIT SOLUTION, your permanent code snapshot will appear here.
          </p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden border border-slate-800">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Snapshot</th>
                  <th>Round</th>
                  <th>Submitted At</th>
                  <th>Runs at Submit</th>
                  <th>Test Results</th>
                  <th>Execution</th>
                  <th>Score</th>
                  <th>Admin Validation</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-900/40 transition-colors">
                    <td>
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-cyan-400" />
                        <span className="font-mono font-bold text-white text-xs">
                          Code {s.submission_number}
                        </span>
                      </div>
                    </td>
                    <td className="font-mono text-xs text-slate-300">
                      Round {s.round_number || 1}: {s.round_name || 'Coding Round'}
                    </td>
                    <td className="font-mono text-xs text-slate-400">
                      {new Date(s.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="font-mono text-xs text-slate-300">
                      {s.run_count_at_submission} runs
                    </td>
                    <td>
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        {s.test_cases_passed} / {s.total_test_cases} Passed
                      </span>
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
                        onClick={() => openSubmissionDetail(s.id)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono inline-flex items-center gap-1.5 border border-cyan-500/30 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Snapshot</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBMISSION SNAPSHOT DETAIL MODAL */}
      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-5xl h-[85vh] glass rounded-2xl border-2 border-cyan-500/50 shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Modal Top Bar */}
              <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                    <Code2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                      <span>Code {selectedSubmission.submission.submission_number} Snapshot</span>
                      <span className="text-xs text-slate-400 font-normal">
                        ({selectedSubmission.submission.round_name})
                      </span>
                    </h2>
                    <span className="text-[11px] font-mono text-slate-400">
                      Submitted on {new Date(selectedSubmission.submission.submitted_at).toLocaleString()} • Runs used: {selectedSubmission.submission.run_count_at_submission}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right font-mono">
                    <span className="text-xs text-slate-400 block">Score</span>
                    <span className="text-base font-bold text-cyan-300">
                      {selectedSubmission.submission.score} pts
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedSubmission(null)}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body: Split view of Code vs Test Results */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 min-h-0 overflow-hidden">
                {/* Code Snapshot Editor (ReadOnly) */}
                <div className="lg:col-span-2 flex flex-col min-h-0 bg-[#0b1020]">
                  <div className="px-4 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Archived Source Code (Read-Only)</span>
                    <span className="text-cyan-400 font-semibold uppercase">{selectedSubmission.submission.language}</span>
                  </div>
                  <div className="flex-1 min-h-0">
                    <Editor
                      height="100%"
                      defaultLanguage="c"
                      language="c"
                      theme="vs-dark"
                      value={selectedSubmission.submission.source_code}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 4,
                      }}
                    />
                  </div>
                </div>

                {/* Test Results Breakdown */}
                <div className="p-4 overflow-y-auto space-y-3 bg-[#080d19] font-mono text-xs">
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-2">
                    Test Case Evaluation
                  </h3>

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 mb-3 space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span>Cases Passed:</span>
                      <span className="font-bold text-emerald-400">
                        {selectedSubmission.submission.test_cases_passed} / {selectedSubmission.submission.total_test_cases}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Status:</span>
                      <span className="font-bold text-white">{selectedSubmission.submission.execution_status}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {selectedSubmission.testResults?.map((tr: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border text-xs ${
                          tr.passed
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                            : 'bg-red-950/20 border-red-500/30 text-red-200'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold mb-1">
                          <span>
                            Test #{tr.test_number} ({tr.case_type})
                          </span>
                          <span>{tr.status}</span>
                        </div>
                        {tr.input && (
                          <div className="text-[10px] text-slate-400 truncate">
                            Input: <span className="text-slate-200">{tr.input}</span>
                          </div>
                        )}
                        {tr.expected_output && (
                          <div className="text-[10px] text-slate-400 truncate">
                            Expected: <span className="text-slate-200">{tr.expected_output}</span>
                          </div>
                        )}
                        {tr.actual_output && (
                          <div className="text-[10px] text-slate-400 truncate">
                            Actual: <span className="text-slate-200">{tr.actual_output}</span>
                          </div>
                        )}
                        <div className="text-[9px] text-slate-500 mt-1">
                          Exec time: {tr.execution_time_ms} ms
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
