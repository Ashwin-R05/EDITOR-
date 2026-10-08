import React from 'react';
import { Send } from 'lucide-react';

export const AdminSubmissions: React.FC = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Send className="w-6 h-6 text-purple-400" />
          <span>Participant Submissions Review</span>
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Inspect immutable code snapshots, compilation outputs, and test suite execution logs.
        </p>
      </div>

      <div className="glass rounded-xl p-8 border border-slate-800 text-center text-slate-400 text-xs font-mono">
        Submissions made by participants during active rounds will appear here for validation and remarks.
      </div>
    </div>
  );
};
