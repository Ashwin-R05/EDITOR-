import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Terminal, Shield, Play, Send, RefreshCw, AlertTriangle, ArrowLeft } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';

export const ParticipantRound: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, participant } = useAuth();
  const { socket } = useSocket();

  const [round, setRound] = useState<any>(null);
  const [problem, setProblem] = useState<any>(null);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [code, setCode] = useState<string>('#include <stdio.h>\n\nint main() {\n    // Write your C solution here\n    return 0;\n}\n');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchRound = async () => {
      try {
        const res = await api.get(`/participant/rounds/${id}`);
        setRound(res.data.round);
        setProblem(res.data.problem);
        setTestCases(res.data.testCases || []);
        setSession(res.data.session);
      } catch (err) {
        console.error('Failed to load round:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRound();
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-65px)]">
      {/* Top Arena Bar */}
      <div className="px-6 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/participant/dashboard')}
            className="flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>EXIT ARENA</span>
          </button>
          <div className="h-4 w-[1px] bg-slate-800" />
          <span className="text-xs font-bold font-mono text-cyan-400">
            {round?.name} • ROUND {round?.round_number}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-slate-400">
            RUNS REMAINING: <strong className="text-cyan-300">{round?.run_limit - (session?.run_count || 0)} / {round?.run_limit}</strong>
          </span>
          <div className="h-4 w-[1px] bg-slate-800" />
          <span className="text-emerald-400 font-bold">TIMER SYNCED</span>
        </div>
      </div>

      {/* Main Split View: Problem vs Editor */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-x divide-slate-800 overflow-hidden">
        {/* Left: Problem statement */}
        <div className="p-6 overflow-y-auto space-y-6 bg-[#0a0e1a]/80">
          <div>
            <h1 className="text-xl font-bold text-white mb-2">{problem?.title || 'Problem Statement'}</h1>
            <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
              {problem?.statement}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase mb-1">Input Format</h3>
            <div className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              {problem?.input_format}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase mb-1">Output Format</h3>
            <div className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              {problem?.output_format}
            </div>
          </div>

          {problem?.constraints && (
            <div>
              <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase mb-1">Constraints</h3>
              <div className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800 whitespace-pre-line">
                {problem?.constraints}
              </div>
            </div>
          )}

          {/* Examples */}
          {problem?.examples && (
            <div>
              <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase mb-2">Example Cases</h3>
              <div className="space-y-3">
                {problem.examples.map((ex: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono">
                    <div className="mb-2">
                      <span className="text-slate-500 block text-[10px]">INPUT:</span>
                      <pre className="text-cyan-300">{ex.input}</pre>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">EXPECTED OUTPUT:</span>
                      <pre className="text-emerald-300">{ex.output}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Monaco C Editor */}
        <div className="flex flex-col bg-[#0d1322]">
          <div className="flex-1">
            <Editor
              height="100%"
              defaultLanguage="c"
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
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

          {/* Action Bar */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Autosave Enabled</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="btn btn-ghost text-xs"
                onClick={() => alert('Code Execution Service configured for Phase 3')}
              >
                <Play className="w-3.5 h-3.5 text-cyan-400" />
                <span>RUN CODE ({round?.run_limit - (session?.run_count || 0)} LEFT)</span>
              </button>

              <button
                className="btn btn-primary text-xs"
                onClick={() => alert('Submission Pipeline configured for Phase 3')}
              >
                <Send className="w-3.5 h-3.5" />
                <span>SUBMIT SOLUTION</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
