import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Code, ShieldAlert, Trophy, Clock } from 'lucide-react';
import api from '../../services/api';

export const AdminParticipantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await api.get(`/admin/participants/${id}`);
        setData(res.data);
      } catch (err) {
        console.error('Failed to load participant detail:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const { participant, sessions, submissions, incidents, scores } = data;

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      <Link
        to="/admin/participants"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>BACK TO PARTICIPANT ROSTER</span>
      </Link>

      <div className="glass rounded-xl p-6 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-900/60 border border-purple-500/40 flex items-center justify-center font-bold text-lg text-purple-300">
            {participant.display_name?.charAt(0) || 'P'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{participant.display_name}</h1>
            <p className="text-xs text-slate-400 font-mono">
              ID: {participant.participant_id} • Email: {participant.email} • College: {participant.college || 'N/A'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="badge badge-active">{participant.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sessions */}
        <div className="glass rounded-xl p-5 border border-slate-800">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Coding Sessions</span>
          </h2>
          {sessions.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono">No active sessions.</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s: any) => (
                <div key={s.id} className="p-3 bg-slate-900/80 rounded-lg text-xs font-mono">
                  <div className="flex justify-between font-bold text-white mb-1">
                    <span>{s.round_name}</span>
                    <span className="text-cyan-400">{s.status}</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Runs used: {s.run_count} • Submissions: {s.submission_count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incidents */}
        <div className="glass rounded-xl p-5 border border-slate-800">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>Security Incidents ({incidents.length})</span>
          </h2>
          {incidents.length === 0 ? (
            <p className="text-xs text-emerald-400 font-mono">Clean record — No incidents recorded.</p>
          ) : (
            <div className="space-y-2">
              {incidents.map((inc: any) => (
                <div key={inc.id} className="p-3 bg-slate-900/80 rounded-lg text-xs font-mono border border-red-500/20">
                  <div className="flex justify-between font-bold text-red-400 mb-1">
                    <span>{inc.incident_type}</span>
                    <span className="text-slate-400">{inc.status}</span>
                  </div>
                  <div className="text-slate-500 text-[10px]">
                    {new Date(inc.detected_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submissions */}
        <div className="glass rounded-xl p-5 border border-slate-800">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Code className="w-4 h-4 text-purple-400" />
            <span>Submissions ({submissions.length})</span>
          </h2>
          {submissions.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono">No submissions recorded.</p>
          ) : (
            <div className="space-y-2">
              {submissions.map((sub: any) => (
                <div key={sub.id} className="p-3 bg-slate-900/80 rounded-lg text-xs font-mono">
                  <div className="flex justify-between font-bold text-white mb-1">
                    <span>Code #{sub.submission_number} ({sub.round_name})</span>
                    <span className="text-emerald-400">{sub.score} pts</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Passed {sub.test_cases_passed} / {sub.total_test_cases} test cases
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
