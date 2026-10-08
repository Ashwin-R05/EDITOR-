import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Layers,
  Code,
  FileCode2
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import api from '../../services/api';

export const AdminSecurityDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Decision inputs
  const [acceptRemark, setAcceptRemark] = useState<string>('Reviewed and cleared by administrator');
  const [declineReason, setDeclineReason] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'decision' | 'code'>('decision');

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/security/incidents/${id}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load incident detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await api.post(`/admin/security/incidents/${id}/accept`, {
        remark: acceptRemark.trim(),
      });
      alert('Security incident accepted. Participant session has been resumed.');
      await fetchDetail();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to accept incident');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      alert('A reason is required to decline and disqualify a participant.');
      return;
    }

    const confirmDecline = window.confirm(
      'Are you sure you want to DECLINE this incident? The participant will be PERMANENTLY DISQUALIFIED.'
    );
    if (!confirmDecline) return;

    setActionLoading(true);
    try {
      await api.post(`/admin/security/incidents/${id}/decline`, {
        reason: declineReason.trim(),
      });
      alert('Participant has been disqualified.');
      await fetchDetail();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to decline incident');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="spinner" />
      </div>
    );
  }

  const { incident, sessionMetrics } = data;

  return (
    <div className="p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* Back Link */}
      <Link
        to="/admin/security"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>BACK TO INCIDENT LOG</span>
      </Link>

      {/* Header Banner */}
      <div className="glass rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-cyan-400">
              {incident.incident_code}
            </span>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                incident.severity === 'HIGH'
                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              {incident.severity} SEVERITY
            </span>
            <span
              className={`badge text-[10px] ${
                incident.status === 'PENDING'
                  ? 'badge-pending animate-pulse'
                  : incident.status === 'ACCEPTED'
                  ? 'badge-active'
                  : 'badge-danger'
              }`}
            >
              {incident.status}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-400" />
            <span>Violation: {incident.incident_type}</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Detected: {new Date(incident.detected_at).toLocaleString()}
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Round</span>
          <span className="text-base font-bold text-purple-300 font-mono">
            {incident.round_name} (Round {incident.round_number})
          </span>
        </div>
      </div>

      {/* Participant & Context Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Participant Info */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-xs font-mono">
          <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1">
            <User className="w-4 h-4" />
            <span>Participant</span>
          </div>
          <div className="text-white font-semibold text-sm">{incident.participant_name}</div>
          <div className="text-slate-400">ID: {incident.participant_code}</div>
          <div className="text-slate-500 text-[11px]">{incident.participant_email}</div>
        </div>

        {/* Violation Description */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-xs font-mono md:col-span-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span>Infraction Telemetry Description</span>
          </div>
          <p className="text-slate-300 text-xs leading-relaxed font-sans">
            {incident.description}
          </p>
          <div className="text-[10px] text-slate-500 pt-1">
            Session Runs: {sessionMetrics?.runCount || 0} • Submissions: {sessionMetrics?.submissionCount || 0}
          </div>
        </div>
      </div>

      {/* Code Snapshot Section */}
      <div className="glass rounded-2xl p-5 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Preserved Code Snapshot At Moment Of Violation
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Immutable snapshot captured at infraction
          </span>
        </div>

        <div className="h-64 rounded-xl overflow-hidden border border-slate-800 bg-[#0b1020]">
          <Editor
            height="100%"
            defaultLanguage="c"
            language="c"
            theme="vs-dark"
            value={incident.code_snapshot || '// No source code snapshot was captured.'}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>
      </div>

      {/* Decision / Arbitration Panel */}
      {incident.status === 'PENDING' ? (
        <div className="glass rounded-2xl p-6 border-2 border-amber-500/50 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
            <h2 className="text-base font-bold text-white font-mono tracking-wide uppercase">
              Administrative Arbitration Panel
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Accept / Resume Option */}
            <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">ACCEPT (CLEAR & RESUME)</h3>
              </div>
              <p className="text-xs text-slate-300 font-mono leading-relaxed">
                Approve the participant's explanation. Their coding console will immediately unlock and their session will resume.
              </p>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">
                  Admin Remark:
                </label>
                <input
                  type="text"
                  value={acceptRemark}
                  onChange={(e) => setAcceptRemark(e.target.value)}
                  placeholder="Optional justification or remark..."
                  className="input text-xs w-full bg-slate-900 border-slate-800"
                />
              </div>
              <button
                disabled={actionLoading}
                onClick={handleAccept}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-900/30"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>ACCEPT & UNLOCK PARTICIPANT</span>
              </button>
            </div>

            {/* Decline / Disqualify Option */}
            <div className="p-5 rounded-2xl bg-red-950/20 border border-red-500/40 space-y-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                <h3 className="font-bold text-white text-sm">DECLINE & DISQUALIFY</h3>
              </div>
              <p className="text-xs text-slate-300 font-mono leading-relaxed">
                Reject the incident. The participant will be permanently disqualified and their session terminated.
              </p>
              <div>
                <label className="text-[10px] font-mono text-red-300 block mb-1">
                  Disqualification Reason (Required):
                </label>
                <input
                  type="text"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="State violation reason (e.g. Pasted external solution)..."
                  className="input text-xs w-full bg-slate-900 border-red-500/40 text-red-200"
                />
              </div>
              <button
                disabled={actionLoading || !declineReason.trim()}
                onClick={handleDecline}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-900/30"
              >
                <XCircle className="w-4 h-4" />
                <span>DECLINE & DISQUALIFY</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-6 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            {incident.admin_decision === 'ACCEPT' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
              Arbitration Decision: {incident.admin_decision}
            </h2>
          </div>

          <div className="text-xs font-mono text-slate-300 space-y-1">
            <div>
              Decided By: <strong className="text-white">{incident.admin_name || 'Admin'}</strong>
            </div>
            <div>
              Decided At: <strong className="text-white">{new Date(incident.decision_at).toLocaleString()}</strong>
            </div>
            {incident.admin_reason && (
              <div className="pt-2 text-slate-400">
                Remark / Reason: <span className="text-slate-200">{incident.admin_reason}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
