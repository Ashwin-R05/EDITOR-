import React from 'react';
import { Trophy, Award } from 'lucide-react';

export const ParticipantResults: React.FC = () => {
  return (
    <div className="flex-1 p-8 max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-400" />
          <span>Competition Standings & Results</span>
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Final event scores and evaluation breakdown.
        </p>
      </div>

      <div className="glass rounded-xl p-8 border border-slate-800 text-center text-slate-400 text-xs font-mono">
        <Award className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-50" />
        Official results will be published once the event concludes and all rounds are finalized.
      </div>
    </div>
  );
};
