import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const AdminSecurity: React.FC = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-red-400" />
          <span>Security & Anti-Cheat Incident Log</span>
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Review copy/paste events, tab switches, visibility changes, and arbitrate Accept/Decline actions.
        </p>
      </div>

      <div className="glass rounded-xl p-8 border border-slate-800 text-center text-slate-400 text-xs font-mono">
        No active pending security incidents. Live incidents will trigger real-time alerts.
      </div>
    </div>
  );
};
