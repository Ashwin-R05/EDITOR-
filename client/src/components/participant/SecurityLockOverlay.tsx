import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, AlertTriangle, Clock, XCircle, Lock, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SecurityLockOverlayProps {
  status: 'UNDER_REVIEW' | 'DISQUALIFIED';
  incident?: any;
  reason?: string;
  onRefreshStatus?: () => void;
}

export const SecurityLockOverlay: React.FC<SecurityLockOverlayProps> = ({
  status,
  incident,
  reason,
  onRefreshStatus,
}) => {
  const navigate = useNavigate();

  if (status === 'DISQUALIFIED') {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full bg-red-950/80 border-2 border-red-500 rounded-3xl p-8 text-center shadow-2xl shadow-red-950/80 space-y-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto text-red-400">
            <XCircle className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-white font-mono uppercase tracking-wide">
              PARTICIPATION TERMINATED
            </h1>
            <p className="text-xs font-mono text-red-300 mt-1">
              DISQUALIFIED BY TOURNAMENT ADMINISTRATOR
            </p>
          </div>

          <div className="p-4 rounded-xl bg-black/50 border border-red-500/30 text-left text-xs font-mono space-y-2">
            <div className="text-slate-400">
              Disqualification Reason:
            </div>
            <div className="text-red-200 font-semibold leading-relaxed">
              {reason || incident?.admin_reason || 'Severe anti-cheat violation during active session.'}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
            Your access to competitive coding rounds has been revoked. If you believe this is in error, contact event staff in person.
          </p>

          <button
            onClick={() => navigate('/participant/dashboard')}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-mono text-xs font-bold transition-all cursor-pointer"
          >
            RETURN TO DASHBOARD
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 select-none">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full bg-slate-900/95 border-2 border-amber-500/80 rounded-3xl p-8 text-center shadow-2xl shadow-amber-950/60 space-y-6"
      >
        <div className="relative w-16 h-16 mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 animate-pulse">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[10px] text-white font-bold">
            !
          </span>
        </div>

        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold uppercase tracking-wider mb-2">
            SECURITY LOCK ACTIVATED
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-wide">
            Session Locked Under Review
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Suspicious activity detected • Awaiting administrative arbitration
          </p>
        </div>

        {/* Incident Details Card */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left text-xs font-mono space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-slate-400">Violation Detected:</span>
            <span className="text-red-400 font-bold uppercase">
              {incident?.incident_type || incident?.incidentType || 'ANTI_CHEAT_FLAG'}
            </span>
          </div>

          {(incident?.incident_code || incident?.incidentCode) && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Incident Code:</span>
              <span className="text-cyan-400 font-semibold">
                {incident.incident_code || incident.incidentCode}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Captured Snapshot:</span>
            <span className="text-emerald-400">Saved to Audit Trail</span>
          </div>

          <div className="pt-1 text-[11px] text-slate-400 leading-relaxed border-t border-slate-800/80">
            <strong className="text-slate-300 block mb-0.5">Details:</strong>
            {incident?.description || 'Anti-cheat trigger occurred during code editing.'}
          </div>
        </div>

        {/* Real-time Status Card */}
        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <div>
              <span className="block text-amber-300 font-bold">Awaiting Admin Decision</span>
              <span className="block text-[10px] text-slate-400">
                Screen will unlock automatically upon admin approval.
              </span>
            </div>
          </div>
          {onRefreshStatus && (
            <button
              onClick={onRefreshStatus}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Check Status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-[11px] text-slate-500 font-mono">
          Please remain on this screen. Do not close or refresh this tab.
        </p>
      </motion.div>
    </div>
  );
};
