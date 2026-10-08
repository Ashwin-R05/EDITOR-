import React from 'react';
import { Send, Clock } from 'lucide-react';

export const ParticipantSubmissions: React.FC = () => {
  return (
    <div className="flex-1 p-8 max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Send className="w-6 h-6 text-cyan-400" />
          <span>My Submission History</span>
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Immutable source code snapshots and automated evaluation logs.
        </p>
      </div>

      <div className="glass rounded-xl p-8 border border-slate-800 text-center text-slate-400 text-xs font-mono">
        <Clock className="w-8 h-8 text-cyan-400 mx-auto mb-2 opacity-50" />
        No active submissions yet for this competition session. Submissions made during active rounds will appear here with exact immutable snapshots.
      </div>
    </div>
  );
};
