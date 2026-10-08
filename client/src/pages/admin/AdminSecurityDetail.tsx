import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const AdminSecurityDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-6">
      <Link
        to="/admin/security"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>BACK TO INCIDENT LOG</span>
      </Link>

      <div className="glass rounded-xl p-6 border border-slate-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          <span>Incident Arbitration: {id}</span>
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Review incident details, code snapshot, and submit Accept or Decline decision.
        </p>
      </div>
    </div>
  );
};
