import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal,
  Play,
  Send,
  Clock,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCode,
  Shield,
  Save,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  AlertCircle,
  Lock,
  Cpu
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import {
  Round,
  Problem,
  TestCase,
  CodingSession,
  RunExecutionResponse,
  TestCaseResult
} from '../../types';

export const ParticipantRound: React.FC = () => {
  const { id: roundId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, participant, refreshUser } = useAuth();
  const { socket } = useSocket();

  // State
  const [round, setRound] = useState<Round | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [session, setSession] = useState<CodingSession | null>(null);
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  // Timer state
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isTimeExpired, setIsTimeExpired] = useState<boolean>(false);

  // Draft autosave state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const autosaveTimerRef = useRef<any>(null);
  const codeRef = useRef<string>('');
  codeRef.current = code;

  // Run & Execution state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runResult, setRunResult] = useState<RunExecutionResponse | null>(null);
  const [runCount, setRunCount] = useState<number>(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionModal, setSubmissionModal] = useState<any | null>(null);

  // 1. Initial Data Fetch & Verification
  const fetchRoundData = useCallback(async () => {
    if (!roundId) return;

    try {
      setLoading(true);
      setAccessError(null);

      // Call backend round API
      const res = await api.get(`/participant/rounds/${roundId}`);
      const { round: r, problem: p, testCases: tc, session: s, timer: t } = res.data;

      setRound(r);
      setProblem(p);
      setTestCases(tc || []);
      setSession(s);
      setRunCount(s?.run_count || 0);

      // Initialize Timer
      if (t) {
        setRemainingSeconds(t.remainingSeconds);
        setIsTimeExpired(t.isExpired);
      }

      // Fetch Saved Draft or Fallback to Starter Code
      try {
        const draftRes = await api.get(`/participant/code-drafts/${roundId}`);
        if (draftRes.data?.sourceCode) {
          setCode(draftRes.data.sourceCode);
          if (draftRes.data.lastSavedAt) {
            setLastSavedTime(new Date(draftRes.data.lastSavedAt).toLocaleTimeString());
          }
        } else if (p?.starter_code) {
          setCode(p.starter_code);
        }
      } catch (dErr) {
        if (p?.starter_code) setCode(p.starter_code);
      }
    } catch (err: any) {
      console.error('Failed to enter round:', err);
      const errMsg =
        err.response?.data?.error ||
        'Access denied: Round is not active or you do not have permission to enter.';
      setAccessError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [roundId]);

  useEffect(() => {
    fetchRoundData();
  }, [fetchRoundData]);

  // 2. Authoritative Timer Countdown
  useEffect(() => {
    if (isTimeExpired || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsTimeExpired(true);
          // Auto-save final draft when time expires
          saveDraftNow('time_expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimeExpired, remainingSeconds]);

  // 3. Socket.IO Lifecycle Listeners
  useEffect(() => {
    if (!socket || !roundId) return;

    socket.emit('join:round', roundId);

    socket.on('round:paused', () => {
      fetchRoundData();
    });

    socket.on('round:ended', () => {
      setIsTimeExpired(true);
      fetchRoundData();
    });

    socket.on('security:decision', () => {
      refreshUser();
      fetchRoundData();
    });

    return () => {
      socket.emit('leave:round', roundId);
      socket.off('round:paused');
      socket.off('round:ended');
      socket.off('security:decision');
    };
  }, [socket, roundId, fetchRoundData, refreshUser]);

  // 4. Draft Saving Implementation
  const saveDraftNow = async (trigger: string = 'autosave') => {
    if (!roundId || !codeRef.current || isTimeExpired) return;

    setSaveStatus('saving');
    try {
      const res = await api.put(`/participant/code-drafts/${roundId}`, {
        sourceCode: codeRef.current,
        language: 'c',
        saveTrigger: trigger,
      });

      if (res.data?.savedAt) {
        setLastSavedTime(new Date(res.data.savedAt).toLocaleTimeString());
        setSaveStatus('saved');
      }
    } catch (err) {
      console.error('Draft save failed:', err);
      setSaveStatus('unsaved');
    }
  };

  // Debounced Autosave while typing
  const handleCodeChange = (newCode?: string) => {
    const val = newCode || '';
    setCode(val);
    setSaveStatus('unsaved');

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      saveDraftNow('autosave_typing');
    }, 3000);
  };

  // Save on editor blur
  const handleEditorBlur = () => {
    saveDraftNow('editor_blur');
  };

  // Save on page exit / unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (roundId && codeRef.current) {
        // Send beacon or synchronous save
        navigator.sendBeacon?.(
          `/api/participant/code-drafts/${roundId}`,
          JSON.stringify({ sourceCode: codeRef.current, saveTrigger: 'page_unload' })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [roundId]);

  // 5. RUN Code Action
  const handleRun = async () => {
    if (!roundId || isRunning || isTimeExpired) return;

    // Check run limit client-side
    const maxRuns = round?.run_limit || 5;
    if (runCount >= maxRuns) {
      alert(`Maximum run limit of ${maxRuns} reached for this round. Please submit your solution directly.`);
      return;
    }

    setIsRunning(true);
    setIsDrawerOpen(true);
    setRunResult(null);

    try {
      // 1. Immediately save current draft
      await saveDraftNow('run_click');

      // 2. Request backend run execution
      const res = await api.post('/participant/code/run', {
        roundId,
        sourceCode: code,
        language: 'c',
      });

      setRunResult(res.data);
      const updatedCount = res.data.runCount ?? res.data.runNumber ?? runCount + 1;
      setRunCount(updatedCount);
    } catch (err: any) {
      console.error('Run failed:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Execution failed. Please verify your code.';
      const newCount = err.response?.data?.runCount ?? err.response?.data?.runNumber ?? runCount + 1;
      const maxR = round?.run_limit || 5;
      setRunResult({
        status: 'COMPILATION_ERROR',
        compilationError: errMsg,
        totalTests: testCases.length,
        passedTests: 0,
        executionTime: 0,
        executionTimeMs: 0,
        results: [],
        runNumber: newCount,
        runsRemaining: Math.max(0, maxR - newCount),
        totalTestCases: testCases.length,
        passedTestCases: 0,
        runCount: newCount,
        maxRuns: maxR,
        remainingRuns: Math.max(0, maxR - newCount),
        runLimitReached: newCount >= maxR,
      });
      setRunCount(newCount);
    } finally {
      setIsRunning(false);
    }
  };

  // 6. SUBMIT Code Action
  const handleSubmitSolution = async () => {
    if (!roundId || isSubmitting || isTimeExpired) return;

    const confirmSubmit = window.confirm(
      'Are you sure you want to SUBMIT this solution? An immutable snapshot will be created and evaluated against all public and hidden test cases.'
    );
    if (!confirmSubmit) return;

    setIsSubmitting(true);

    try {
      // 1. Save draft
      await saveDraftNow('submit_click');

      // 2. Call submission endpoint
      const res = await api.post('/participant/submissions', {
        roundId,
        sourceCode: code,
        language: 'c',
      });

      // Show submission success modal
      setSubmissionModal(res.data);
      setIsDrawerOpen(false);
    } catch (err: any) {
      console.error('Submission failed:', err);
      alert(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Handle Inactive / Forbidden Access Screen
  if (accessError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4">
          <Lock className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-white font-mono uppercase mb-2">
          ARENA ACCESS RESTRICTED
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed mb-6 font-mono">
          {accessError}
        </p>
        <button
          onClick={() => navigate('/participant/dashboard')}
          className="btn btn-primary text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>RETURN TO DASHBOARD</span>
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="spinner mb-4" />
        <p className="text-cyan-400 font-mono text-xs tracking-wider animate-pulse">
          PREPARING SECURE CODING ENVIRONMENT...
        </p>
      </div>
    );
  }

  const maxRuns = round?.run_limit || 5;
  const runsRemaining = Math.max(0, maxRuns - runCount);
  const isRunDisabled = isRunning || runsRemaining === 0 || isTimeExpired;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-62px)] overflow-hidden bg-[#070b14] relative">
      {/* Time Expired Banner */}
      {isTimeExpired && (
        <div className="bg-red-950/90 border-b border-red-500/50 px-6 py-2 text-center text-xs font-mono text-red-200 flex items-center justify-center gap-2 z-50">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="font-bold">ROUND TIME HAS ENDED.</span>
          <span>Coding interface is locked. All final drafts have been persisted.</span>
        </div>
      )}

      {/* TOP ARENA BAR */}
      <div className="h-14 bg-[#0a0f1d] border-b border-slate-800/90 px-6 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              saveDraftNow('exit_click');
              navigate('/participant/dashboard');
            }}
            className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>DASHBOARD</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-800" />

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold uppercase">
              ROUND {round?.round_number}
            </span>
            <span className="text-sm font-bold text-white tracking-wide">
              {round?.name}
            </span>
          </div>
        </div>

        {/* Center: Server-Authoritative Countdown Timer */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono text-xs transition-all ${
              remainingSeconds < 300
                ? 'bg-red-950/60 border-red-500/60 text-red-300 shadow-md shadow-red-900/30 animate-pulse'
                : 'bg-slate-900/90 border-slate-800 text-cyan-300'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${remainingSeconds < 300 ? 'text-red-400' : 'text-cyan-400'}`} />
            <span className="font-bold tracking-wider text-sm">
              {formatTime(remainingSeconds)}
            </span>
            <span className="text-[9px] text-slate-400 uppercase">SERVER SYNC</span>
          </div>
        </div>

        {/* Right: Autosave Status & Security Badge */}
        <div className="flex items-center gap-4 text-xs font-mono">
          {/* Autosave Pill */}
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            {saveStatus === 'saving' ? (
              <>
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-cyan-300">Saving draft...</span>
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lastSavedTime ? `Draft saved ${lastSavedTime}` : 'Draft saved'}</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-amber-300">Unsaved changes</span>
              </>
            )}
          </div>

          <div className="h-4 w-[1px] bg-slate-800" />

          {/* Security Status */}
          <span className="badge badge-active text-[10px]">
            SECURE ARENA ACTIVE
          </span>
        </div>
      </div>

      {/* MAIN SPLIT VIEW: Problem Spec vs Editor */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 overflow-hidden min-h-0">
        {/* LEFT: Problem Statement Panel */}
        <div className="overflow-y-auto p-6 md:p-8 space-y-6 bg-[#080d19]/90 text-slate-200">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1">
              <span>PROBLEM SET {round?.round_number}</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">
              {problem?.title || 'Coding Problem'}
            </h1>
            <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans">
              {problem?.statement}
            </div>
          </div>

          {/* Input Format */}
          <div>
            <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span>Input Format</span>
            </h3>
            <div className="text-xs text-slate-300 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/80 leading-relaxed font-mono">
              {problem?.input_format}
            </div>
          </div>

          {/* Output Format */}
          <div>
            <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span>Output Format</span>
            </h3>
            <div className="text-xs text-slate-300 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/80 leading-relaxed font-mono">
              {problem?.output_format}
            </div>
          </div>

          {/* Constraints */}
          {problem?.constraints && (
            <div>
              <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
                Constraints
              </h3>
              <div className="text-xs text-slate-300 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/80 font-mono whitespace-pre-line">
                {problem.constraints}
              </div>
            </div>
          )}

          {/* Examples */}
          {problem?.examples && problem.examples.length > 0 && (
            <div>
              <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-2.5">
                Example Test Cases
              </h3>
              <div className="space-y-3">
                {problem.examples.map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/60 pb-1.5">
                      <span className="font-bold text-slate-300">Example {idx + 1}</span>
                      {ex.explanation && (
                        <span className="text-[10px] text-slate-400 italic font-sans">{ex.explanation}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block mb-0.5">Sample Input:</span>
                      <pre className="p-2 rounded bg-black/40 text-cyan-300 overflow-x-auto whitespace-pre-wrap">{ex.input}</pre>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block mb-0.5">Expected Output:</span>
                      <pre className="p-2 rounded bg-black/40 text-emerald-300 overflow-x-auto whitespace-pre-wrap">{ex.output}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Monaco Editor & Console Container */}
        <div className="flex flex-col bg-[#0b1020] min-h-0 overflow-hidden relative">
          {/* Editor Header Bar */}
          <div className="h-10 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
            <div className="flex items-center gap-2">
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-200 font-semibold">solution.c</span>
              <span className="text-[10px] text-slate-500 font-mono">(C11 / GCC Sandbox)</span>
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              <span>Runs Remaining: <strong className={runsRemaining === 0 ? 'text-red-400' : 'text-cyan-300'}>{runsRemaining} of {maxRuns}</strong></span>
            </div>
          </div>

          {/* Monaco Editor Mount Point */}
          <div className="flex-1 min-h-0 relative">
            <Editor
              height="100%"
              defaultLanguage="c"
              language="c"
              theme="vs-dark"
              value={code}
              onChange={handleCodeChange}
              onMount={(editor) => {
                editor.onDidBlurEditorText(handleEditorBlur);
              }}
              options={{
                readOnly: isTimeExpired || participant?.status === 'UNDER_REVIEW' || participant?.status === 'DISQUALIFIED',
                minimap: { enabled: true, scale: 0.75 },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                wordWrap: 'on',
                bracketPairColorization: { enabled: true },
                formatOnPaste: true,
                formatOnType: true,
              }}
            />
          </div>

          {/* BOTTOM DRAWER: Execution Output Console */}
          <AnimatePresence>
            {isDrawerOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 260, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-[#090d1a] border-t-2 border-cyan-500/40 flex flex-col shrink-0 overflow-hidden z-20 shadow-2xl shadow-cyan-950/60"
              >
                {/* Console Drawer Header */}
                <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-bold text-white">Execution Console</span>
                    {runResult && (
                      <span
                        className={`badge ${
                          runResult.status === 'PASSED'
                            ? 'badge-active'
                            : runResult.status === 'FAILED'
                            ? 'badge-danger'
                            : 'badge-pending'
                        } text-[10px] ml-2`}
                      >
                        {runResult.status}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1 text-slate-400 hover:text-white rounded"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Console Body */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono text-xs">
                  {isRunning ? (
                    <div className="flex items-center gap-3 text-cyan-300 py-6 justify-center">
                      <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      <span>Compiling and executing code in sandbox container...</span>
                    </div>
                  ) : runResult ? (
                    <div className="space-y-3">
                      {/* Summary Banner */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                        <div className="flex items-center gap-2">
                          {runResult.status === 'PASSED' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                          <span className="font-bold text-slate-200">
                            Passed {runResult.passedTestCases ?? runResult.passedTests ?? 0} / {runResult.totalTestCases ?? runResult.totalTests ?? 0} Public Test Cases
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Execution Time: {runResult.executionTimeMs ?? Math.round((runResult.executionTime || 0) * 1000)} ms • Runs Left: {runResult.remainingRuns ?? runResult.runsRemaining ?? 0}
                        </div>
                      </div>

                      {/* Compilation Error if any */}
                      {runResult.compilationError && (
                        <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 font-mono text-xs whitespace-pre-wrap">
                          <span className="font-bold block mb-1">COMPILATION ERROR:</span>
                          {runResult.compilationError}
                        </div>
                      )}

                      {/* Individual Test Cases */}
                      {runResult.results && runResult.results.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {runResult.results.map((tr) => (
                            <div
                              key={tr.testCaseId}
                              className={`p-3 rounded-lg border text-xs ${
                                tr.passed
                                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                                  : 'bg-red-950/20 border-red-500/30 text-red-200'
                              }`}
                            >
                              <div className="flex items-center justify-between font-bold mb-1">
                                <span>Test Case #{tr.testNumber}</span>
                                <span>{tr.status}</span>
                              </div>
                              {tr.input && (
                                <div className="text-[10px] text-slate-400 truncate">
                                  Input: <span className="text-slate-200">{tr.input}</span>
                                </div>
                              )}
                              {tr.expectedOutput && (
                                <div className="text-[10px] text-slate-400 truncate">
                                  Expected: <span className="text-slate-200">{tr.expectedOutput}</span>
                                </div>
                              )}
                              {tr.actualOutput !== undefined && (
                                <div className="text-[10px] text-slate-400 truncate">
                                  Output: <span className="text-slate-200">{tr.actualOutput}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-500 text-center py-6">
                      Click RUN to compile and evaluate code against sample public test cases.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* BOTTOM ACTION BAR */}
          <div className="h-16 bg-[#080d19] border-t border-slate-800 px-6 flex items-center justify-between shrink-0 z-30 select-none">
            {/* Console toggle button */}
            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-mono transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Console</span>
              {isDrawerOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>

            {/* Run & Submit Action Buttons */}
            <div className="flex items-center gap-3">
              {/* RUN BUTTON */}
              <button
                disabled={isRunDisabled}
                onClick={handleRun}
                className={`btn text-xs font-mono px-4 py-2.5 transition-all ${
                  isRunDisabled
                    ? 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60'
                    : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 shadow-md shadow-cyan-950/40'
                }`}
                title={runsRemaining === 0 ? 'Run limit of 5 exceeded' : 'Execute public tests'}
              >
                {isRunning ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <span>EXECUTING...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-cyan-400" />
                    <span>
                      RUN ({runsRemaining} / {maxRuns} LEFT)
                    </span>
                  </>
                )}
              </button>

              {/* SUBMIT BUTTON */}
              <button
                disabled={isSubmitting || isTimeExpired}
                onClick={handleSubmitSolution}
                className="btn btn-primary text-xs font-mono px-5 py-2.5"
                title="Create immutable submission snapshot"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>EVALUATING SUBMISSION...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>SUBMIT SOLUTION</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SUBMISSION CONFIRMATION MODAL */}
      <AnimatePresence>
        {submissionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-md w-full glass rounded-2xl p-6 border-2 border-cyan-500/50 shadow-2xl shadow-cyan-950/60 font-mono space-y-4"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white uppercase">
                    Submission Recorded
                  </h3>
                  <span className="text-xs text-cyan-300">
                    Code #{submissionModal.submissionNumber} • Snapshot Saved
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>Test Cases Passed:</span>
                  <span className="font-bold text-emerald-400">
                    {submissionModal.testCasesPassed} / {submissionModal.totalTestCases}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Score Awarded:</span>
                  <span className="font-bold text-cyan-300">{submissionModal.score} pts</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Execution Status:</span>
                  <span className="font-bold text-white">{submissionModal.executionStatus}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                An immutable snapshot of your source code has been permanently archived.
                You can review this exact code anytime under{' '}
                <strong className="text-slate-200">Submissions History</strong>.
              </p>

              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => setSubmissionModal(null)}
                  className="btn btn-ghost text-xs flex-1"
                >
                  Continue Coding
                </button>
                <button
                  onClick={() => {
                    setSubmissionModal(null);
                    navigate('/participant/submissions');
                  }}
                  className="btn btn-primary text-xs flex-1"
                >
                  View Submissions
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
