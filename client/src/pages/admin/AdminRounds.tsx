import React, { useState, useEffect } from 'react';
import { Layers, Play, Pause, StopCircle, Clock, Settings } from 'lucide-react';
import api from '../../services/api';
import { Round } from '../../types';

export const AdminRounds: React.FC = () => {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRounds = async () => {
    try {
      const res = await api.get('/admin/rounds');
      setRounds(res.data.rounds || []);
    } catch (err) {
      console.error('Failed to load rounds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRounds();
  }, []);

  const handleAction = async (roundId: string, action: 'start' | 'pause' | 'end') => {
    try {
      await api.post(`/admin/rounds/${roundId}/${action}`);
      fetchRounds();
    } catch (err: any) {
      alert(err.response?.data?.error || `Failed to ${action} round`);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-purple-400" />
            <span>Round System Configuration & Lifecycle</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Configure round parameters, durations, run limits, and execute lifecycle state transitions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rounds.map((r) => (
          <div key={r.id} className="glass rounded-xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-purple-400 uppercase">
                ROUND {r.round_number}
              </span>
              <span className={`badge ${r.status === 'ACTIVE' ? 'badge-active' : r.status === 'PAUSED' ? 'badge-pending' : r.status === 'ENDED' ? 'badge-info' : 'badge-muted'}`}>
                {r.status}
              </span>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">{r.name}</h2>
              <p className="text-xs text-slate-400 mt-1">{r.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900/80 rounded-lg text-xs font-mono border border-slate-800">
              <div>
                <span className="text-slate-500 text-[10px] block">DURATION</span>
                <span className="text-slate-200">{r.duration_minutes} Minutes</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">RUN LIMIT</span>
                <span className="text-slate-200">{r.run_limit} Runs per participant</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              {r.status === 'NOT_STARTED' && (
                <button
                  onClick={() => handleAction(r.id, 'start')}
                  className="btn btn-success text-xs flex-1"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>START ROUND</span>
                </button>
              )}
              {r.status === 'ACTIVE' && (
                <>
                  <button
                    onClick={() => handleAction(r.id, 'pause')}
                    className="btn btn-ghost text-xs flex-1 text-amber-400 border-amber-500/30"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>PAUSE</span>
                  </button>
                  <button
                    onClick={() => handleAction(r.id, 'end')}
                    className="btn btn-danger text-xs flex-1"
                  >
                    <StopCircle className="w-3.5 h-3.5" />
                    <span>END</span>
                  </button>
                </>
              )}
              {r.status === 'PAUSED' && (
                <>
                  <button
                    onClick={() => handleAction(r.id, 'start')}
                    className="btn btn-primary text-xs flex-1"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>RESUME</span>
                  </button>
                  <button
                    onClick={() => handleAction(r.id, 'end')}
                    className="btn btn-danger text-xs flex-1"
                  >
                    <StopCircle className="w-3.5 h-3.5" />
                    <span>END</span>
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
