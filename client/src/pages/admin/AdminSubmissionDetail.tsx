import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  FileCode,
  User,
  ShieldCheck,
  XCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  Zap,
  Code2,
  Copy,
  Check,
  MessageSquare,
  History,
  Lock,
  EyeOff
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import api from '../../services/api';
import { Submission, SubmissionReview } from '../../types';

export const AdminSubmissionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [reviewHistory, setReviewHistory] = useState<SubmissionReview[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Modals for Validation, Rejection, and Remark
  const [showValidateModal, setShowValidateModal] = useState<boolean>(false);
  const [validateRemark, setValidateRemark] = useState<string>('');
  const [validating, setValidating] = useState<boolean>(false);

  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<boolean>(false);

  const [showRemarkModal, setShowRemarkModal] = useState<boolean>(false);
  const [adminRemarkText, setAdminRemarkText] = useState<string>('');
  const [remarking, setRemarking] = useState<boolean>(false);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/submissions/${id}`);
      setSubmission(res.data.submission);
      setTestResults(res.data.testResults || []);
      setReviewHistory(res.data.reviewHistory || []);
    } catch (err: any) {
      console.error('Failed to load admin submission detail:', err);
      setError(err.response?.data?.error || 'Failed to load submission.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDetail();
    }
  }, [id]);

  const handleCopyCode = () => {
    if (submission?.source_code) {
      navigator.clipboard.writeText(submission.source_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      await api.post(`/admin/submissions/${id}/validate`, {
        remark: validateRemark.trim() || undefined,
      });
      setShowValidateModal(false);
      setValidateRemark('');
      await fetchDetail();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to validate submission');
    } finally {
      setValidating(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setRejectError('Rejection reason is required.');
      return;
    }
    setRejectError(null);
    setRejecting(true);
    try {
      await api.post(`/admin/submissions/${id}/reject`, {
        reason: rejectReason.trim(),
      });
      setShowRejectModal(false);
      setRejectReason('');
      await fetchDetail();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reject submission');
    } finally {
      setRejecting(false);
    }
  };

  const handleAddRemark = async () => {
    if (!adminRemarkText.trim()) {
      alert('Remark cannot be empty');
      return;
    }
    setRemarking(true);
    try {
      await api.post(`/admin/submissions/${id}/remarks`, {
        remark: adminRemarkText.trim(),
      });
      setShowRemarkModal(false);
      setAdminRemarkText('');
      await fetchDetail();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record remark');
    } finally {
      setRemarking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="spinner mb-4" />
        <p className="text-purple-400 font-mono text-xs tracking-wider animate-pulse">
          FETCHING IMMUTABLE SNAPSHOT & REVIEW LOGS...
        </p>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="flex-1 px-6 py-12 max-w-4xl mx-auto w-full text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white font-mono">Submission Not Found</h2>
        <p className="text-sm text-slate-400">{error || 'The requested submission snapshot could not be found.'}</p>
        <button
          onClick={() => navigate('/admin/submissions')}
          className="btn btn-secondary text-xs font-mono inline-flex items-center gap-2 mt-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Submissions</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            to="/admin/submissions"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-purple-400 font-mono transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Submissions</span>
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 font-mono">
            <FileCode className="w-6 h-6 text-purple-400" />
            <span>Code {submission.submission_number} Review</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-950/70 border border-purple-500/30 text-purple-300 font-normal">
              {submission.round_name || `Round ${submission.round_number || 1}`}
            </span>
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Snapshot ID: {submission.id} • Submitted at {new Date(submission.submitted_at).toLocaleString()}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowValidateModal(true)}
            className="px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono border border-emerald-500/40 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Validate Solution</span>
          </button>

          <button
            onClick={() => setShowRejectModal(true)}
            className="px-3 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-mono border border-rose-500/40 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <XCircle className="w-4 h-4 text-rose-400" />
            <span>Reject Solution</span>
          </button>

          <button
            onClick={() => setShowRemarkModal(true)}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <span>Add Remark</span>
          </button>
        </div>
      </div>

      {/* Info Row: Participant Card & Submission Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Participant Details */}
        <div className="glass p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
              <User className="w-4 h-4 text-purple-400" />
              PARTICIPANT PROFILE
            </span>
            <span className="badge badge-active text-[10px]">
              {submission.participant_status || 'ACTIVE'}
            </span>
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[10px]">NAME</span>
              <span className="text-white font-bold">{submission.participant_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-500 block text-[10px]">CODE</span>
                <span className="text-purple-300">{submission.participant_code || submission.participant_id}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">YEAR / DEPT</span>
                <span className="text-slate-300">{submission.year ? `Year ${submission.year}` : ''} {submission.department || ''}</span>
              </div>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">INSTITUTION</span>
              <span className="text-slate-300">{submission.college || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">EMAIL</span>
              <span className="text-slate-400">{submission.participant_email}</span>
            </div>
          </div>
        </div>

        {/* Execution & Validation Stats */}
        <div className="glass p-5 rounded-2xl border border-slate-800 space-y-3 md:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              EVALUATION METRICS
            </span>
            <div className="flex items-center gap-2">
              <span className={`badge ${
                submission.validation_status === 'VALIDATED'
                  ? 'badge-active'
                  : submission.validation_status === 'REJECTED'
                  ? 'badge-danger'
                  : 'badge-pending'
              } text-[10px]`}>
                {submission.validation_status}
              </span>
              <span className={`badge ${
                submission.execution_status === 'PASSED'
                  ? 'badge-active'
                  : submission.execution_status === 'FAILED'
                  ? 'badge-danger'
                  : 'badge-warning'
              } text-[10px]`}>
                {submission.execution_status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono block">FINAL SCORE</span>
              <span className="text-xl font-bold text-cyan-300 font-mono">{submission.score} pts</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono block">TEST CASES</span>
              <span className="text-xl font-bold text-emerald-400 font-mono">
                {submission.test_cases_passed} / {submission.total_test_cases}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono block">EXECUTION TIME</span>
              <span className="text-xl font-bold text-purple-300 font-mono">{submission.execution_time_ms || 0} ms</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono block">RUNS CONSUMED</span>
              <span className="text-xl font-bold text-amber-300 font-mono">{submission.run_count_at_submission} runs</span>
            </div>
          </div>

          {submission.rejection_reason && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs font-mono">
              <span className="font-bold text-rose-300 block mb-0.5">REJECTION REASON:</span>
              {submission.rejection_reason}
            </div>
          )}

          {submission.admin_remarks && !submission.rejection_reason && (
            <div className="p-3 rounded-lg bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs font-mono">
              <span className="font-bold text-purple-300 block mb-0.5">ADMIN REMARKS:</span>
              {submission.admin_remarks}
            </div>
          )}
        </div>
      </div>

      {/* EXACT IMMUTABLE SOURCE CODE VIEWER (Requirement 13) */}
      <div className="glass rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-mono font-bold text-white">
              EXACT IMMUTABLE CODE SNAPSHOT — CODE {submission.submission_number}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
              {submission.language || 'c'}
            </span>
          </div>

          <button
            onClick={handleCopyCode}
            className="btn btn-ghost py-1 px-2.5 text-xs font-mono flex items-center gap-1.5 text-slate-300 hover:text-purple-400"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        <div className="h-[440px] w-full bg-[#0d1117]">
          <Editor
            height="100%"
            language="c"
            theme="vs-dark"
            value={submission.source_code}
            options={{
              readOnly: true,
              domReadOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              lineNumbers: 'on',
              contextmenu: false,
            }}
          />
        </div>
      </div>

      {/* TEST CASE RESULTS (Requirement 12: Public vs Hidden test confidentiality) */}
      <div className="glass p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>Test Suite Execution Results ({testResults.length} Test Cases)</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Hidden test cases maintain protected confidentiality
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
          {testResults.map((tr) => {
            const isHidden = tr.case_type === 'HIDDEN';

            return (
              <div
                key={tr.test_number}
                className={`p-4 rounded-xl border ${
                  tr.passed
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-2">
                  <span className="flex items-center gap-1.5">
                    {tr.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>
                      {isHidden ? `Hidden Test Case #${tr.test_number}` : `Public Test Case #${tr.test_number}`}
                    </span>
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-black/40">
                    {tr.status} • {tr.execution_time_ms || 0} ms
                  </span>
                </div>

                {isHidden ? (
                  <div className="p-3 rounded bg-black/40 border border-slate-800/80 text-slate-400 flex items-center gap-2 text-[11px]">
                    <EyeOff className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Inputs and expected outputs are confidential hidden test cases.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tr.input && (
                      <div>
                        <span className="text-[10px] text-slate-400 block">INPUT:</span>
                        <pre className="p-2 rounded bg-black/50 text-[11px] text-slate-200 overflow-x-auto">
                          {tr.input}
                        </pre>
                      </div>
                    )}
                    {tr.expected_output && (
                      <div>
                        <span className="text-[10px] text-slate-400 block">EXPECTED:</span>
                        <pre className="p-2 rounded bg-black/50 text-[11px] text-slate-200 overflow-x-auto">
                          {tr.expected_output}
                        </pre>
                      </div>
                    )}
                    {tr.actual_output !== null && tr.actual_output !== undefined && (
                      <div>
                        <span className="text-[10px] text-slate-400 block">ACTUAL OUTPUT:</span>
                        <pre className="p-2 rounded bg-black/50 text-[11px] text-slate-200 overflow-x-auto">
                          {tr.actual_output}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* REVIEW HISTORY TIMELINE (Requirement 16) */}
      <div className="glass p-5 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2 border-b border-slate-800 pb-2">
          <History className="w-4 h-4 text-purple-400" />
          <span>Audit Review History</span>
        </h3>

        {reviewHistory.length === 0 ? (
          <p className="text-xs text-slate-500 font-mono py-2">
            No administrative reviews or status modifications recorded for this submission snapshot yet.
          </p>
        ) : (
          <div className="space-y-3">
            {reviewHistory.map((rev) => (
              <div
                key={rev.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2 font-bold text-white">
                    <span className="text-purple-300">{rev.admin_name || 'Admin'}</span>
                    <span className="text-slate-500">•</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      rev.action === 'VALIDATE'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : rev.action === 'REJECT'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-purple-500/20 text-purple-300'
                    }`}>
                      {rev.action}
                    </span>
                    {rev.previous_status && rev.new_status && (
                      <span className="text-slate-400 text-[11px]">
                        ({rev.previous_status} → {rev.new_status})
                      </span>
                    )}
                  </div>
                  {rev.remark && (
                    <p className="text-slate-300 text-xs mt-1 pl-1">
                      "{rev.remark}"
                    </p>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 self-end sm:self-auto shrink-0">
                  {new Date(rev.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: VALIDATE SUBMISSION */}
      <AnimatePresence>
        {showValidateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md glass p-6 rounded-2xl border border-emerald-500/40 space-y-4"
            >
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Validate Submission</span>
              </h3>
              <p className="text-xs text-slate-300 font-mono">
                Approve Code #{submission.submission_number} for {submission.participant_name}. You may optionally add review remarks.
              </p>

              <div>
                <label className="text-[11px] text-slate-400 font-mono block mb-1">
                  OPTIONAL REMARKS
                </label>
                <textarea
                  value={validateRemark}
                  onChange={(e) => setValidateRemark(e.target.value)}
                  placeholder="e.g., Verified algorithmic correctness and test accuracy."
                  rows={3}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowValidateModal(false)}
                  disabled={validating}
                  className="btn btn-ghost text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  onClick={handleValidate}
                  disabled={validating}
                  className="btn btn-primary text-xs font-mono bg-emerald-600 hover:bg-emerald-500 border-none text-white"
                >
                  {validating ? 'Validating...' : 'Confirm Validation'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: REJECT SUBMISSION (REASON REQUIRED) */}
      <AnimatePresence>
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md glass p-6 rounded-2xl border border-rose-500/40 space-y-4"
            >
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400" />
                <span>Reject Submission</span>
              </h3>
              <p className="text-xs text-slate-300 font-mono">
                Reject Code #{submission.submission_number}. A specific rejection reason is strictly required.
              </p>

              <div>
                <label className="text-[11px] text-rose-300 font-mono block mb-1 font-bold">
                  REJECTION REASON (REQUIRED) *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    if (rejectError) setRejectError(null);
                  }}
                  placeholder="e.g., Hardcoded output values detected or failed manual inspection."
                  rows={3}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-rose-500/60 text-xs text-white font-mono focus:outline-none focus:border-rose-400"
                />
                {rejectError && (
                  <p className="text-[11px] text-rose-400 font-mono mt-1">{rejectError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowRejectModal(false)}
                  disabled={rejecting}
                  className="btn btn-ghost text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={rejecting}
                  className="btn btn-primary text-xs font-mono bg-rose-600 hover:bg-rose-500 border-none text-white"
                >
                  {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD REMARK */}
      <AnimatePresence>
        {showRemarkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md glass p-6 rounded-2xl border border-purple-500/40 space-y-4"
            >
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-400" />
                <span>Add Administrative Remark</span>
              </h3>
              <p className="text-xs text-slate-300 font-mono">
                Log an internal remark without altering the validation status. This will be preserved in review history.
              </p>

              <div>
                <label className="text-[11px] text-purple-300 font-mono block mb-1">
                  REMARK CONTENT *
                </label>
                <textarea
                  value={adminRemarkText}
                  onChange={(e) => setAdminRemarkText(e.target.value)}
                  placeholder="e.g., Code reviewed for edge case handling on large inputs."
                  rows={3}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowRemarkModal(false)}
                  disabled={remarking}
                  className="btn btn-ghost text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRemark}
                  disabled={remarking}
                  className="btn btn-primary text-xs font-mono bg-purple-600 hover:bg-purple-500 border-none text-white"
                >
                  {remarking ? 'Saving...' : 'Save Remark'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
