import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Zap,
  ShieldCheck,
  FileCode,
  Copy,
  Check,
  Code2
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import api from '../../services/api';
import { Submission } from '../../types';

export const ParticipantSubmissionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/participant/submissions/${id}`);
        setSubmission(res.data.submission);
        setTestResults(res.data.testResults || []);
      } catch (err: any) {
        console.error('Failed to load submission:', err);
        setError(err.response?.data?.error || 'Failed to load submission record.');
      } finally {
        setLoading(false);
      }
    };

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

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="spinner mb-4" />
        <p className="text-cyan-400 font-mono text-xs tracking-wider animate-pulse">
          FETCHING IMMUTABLE SNAPSHOT...
        </p>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="flex-1 px-6 py-12 max-w-4xl mx-auto w-full text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white font-mono">Snapshot Access Denied</h2>
        <p className="text-sm text-slate-400">{error || 'Submission could not be located or belongs to another participant.'}</p>
        <button
          onClick={() => navigate('/participant/submissions')}
          className="btn btn-secondary text-xs font-mono inline-flex items-center gap-2 mt-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Submissions</span>
        </button>
      </div>
    );
  }

  const getValidationBadge = (status?: string) => {
    switch (status) {
      case 'VALIDATED':
        return <span className="badge badge-active flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-400" /> VALIDATED</span>;
      case 'REJECTED':
        return <span className="badge badge-danger flex items-center gap-1"><XCircle className="w-3 h-3 text-rose-400" /> REJECTED</span>;
      default:
        return <span className="badge badge-pending flex items-center gap-1"><Clock className="w-3 h-3 text-amber-400" /> PENDING REVIEW</span>;
    }
  };

  const getExecutionBadge = (status: string) => {
    switch (status) {
      case 'PASSED':
        return <span className="badge badge-active">PASSED</span>;
      case 'PARTIALLY_PASSED':
        return <span className="badge badge-warning">PARTIALLY PASSED</span>;
      case 'COMPILATION_ERROR':
        return <span className="badge badge-danger">COMPILATION ERROR</span>;
      case 'TIME_LIMIT_EXCEEDED':
        return <span className="badge badge-danger">TIME LIMIT EXCEEDED</span>;
      default:
        return <span className="badge badge-danger">{status}</span>;
    }
  };

  return (
    <div className="flex-1 px-6 md:px-10 py-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/participant/submissions"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 font-mono transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Submissions</span>
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 font-mono">
            <FileCode className="w-6 h-6 text-cyan-400" />
            <span>Submission Code #{submission.submission_number}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 font-normal">
              {submission.round_name || `Round ${submission.round_number || 1}`}
            </span>
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Immutable snapshot captured at {new Date(submission.submitted_at).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {getValidationBadge(submission.validation_status)}
          {getExecutionBadge(submission.execution_status)}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass p-4 rounded-xl border border-slate-800">
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>SCORE</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono mt-1">
            {submission.score} <span className="text-xs text-slate-500 font-normal">pts</span>
          </div>
        </div>

        <div className="glass p-4 rounded-xl border border-slate-800">
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>TESTS PASSED</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
            {submission.test_cases_passed} <span className="text-slate-400 text-sm">/ {submission.total_test_cases}</span>
          </div>
        </div>

        <div className="glass p-4 rounded-xl border border-slate-800">
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>EXECUTION TIME</span>
          </div>
          <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">
            {submission.execution_time_ms || 0} <span className="text-xs text-slate-500 font-normal">ms</span>
          </div>
        </div>

        <div className="glass p-4 rounded-xl border border-slate-800">
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span>RUNS USED</span>
          </div>
          <div className="text-2xl font-bold text-purple-400 font-mono mt-1">
            {submission.run_count_at_submission} <span className="text-xs text-slate-500 font-normal">runs</span>
          </div>
        </div>
      </div>

      {/* Admin Notes / Rejection banner if present */}
      {submission.rejection_reason && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs font-mono space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-rose-300">
            <XCircle className="w-4 h-4 text-rose-400" />
            <span>ADMIN REJECTION REASON:</span>
          </div>
          <p className="text-rose-200/90 pl-5">{submission.rejection_reason}</p>
        </div>
      )}

      {submission.admin_remarks && !submission.rejection_reason && (
        <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-xs font-mono space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-cyan-300">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>ADMINISTRATIVE REMARK:</span>
          </div>
          <p className="text-cyan-200/90 pl-5">{submission.admin_remarks}</p>
        </div>
      )}

      {/* Main Code Viewer (Read-only Monaco Editor) */}
      <div className="glass rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-slate-200">
              IMMUTABLE SNAPSHOT (READ ONLY)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
              {submission.language || 'c'}
            </span>
          </div>

          <button
            onClick={handleCopyCode}
            className="btn btn-ghost py-1 px-2.5 text-xs font-mono flex items-center gap-1.5 text-slate-300 hover:text-cyan-400"
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

        <div className="h-[420px] w-full bg-[#0d1117]">
          <Editor
            height="100%"
            language={submission.language === 'c' ? 'c' : 'c'}
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

      {/* Public Test Case Evaluations */}
      {testResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
            <span>Evaluation Breakdown</span>
            <span className="text-xs text-slate-400 font-normal">
              ({testResults.filter(t => t.case_type === 'PUBLIC').length} Public Test Cases)
            </span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
            {testResults
              .filter((tr) => tr.case_type === 'PUBLIC')
              .map((tr) => (
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
                      <span>Test Case #{tr.test_number}</span>
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-black/40">
                      {tr.status} • {tr.execution_time_ms || 0} ms
                    </span>
                  </div>

                  {tr.input && (
                    <div className="space-y-1 mb-2">
                      <span className="text-[10px] text-slate-400">INPUT:</span>
                      <pre className="p-2 rounded bg-black/50 text-[11px] text-slate-200 overflow-x-auto">
                        {tr.input}
                      </pre>
                    </div>
                  )}

                  {tr.expected_output && (
                    <div className="space-y-1 mb-2">
                      <span className="text-[10px] text-slate-400">EXPECTED:</span>
                      <pre className="p-2 rounded bg-black/50 text-[11px] text-slate-200 overflow-x-auto">
                        {tr.expected_output}
                      </pre>
                    </div>
                  )}

                  {tr.actual_output !== null && tr.actual_output !== undefined && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400">ACTUAL OUTPUT:</span>
                      <pre className="p-2 rounded bg-black/50 text-[11px] text-slate-200 overflow-x-auto">
                        {tr.actual_output}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
