import React, { useState, useEffect } from 'react';
import { History } from 'lucide-react';
import api from '../../services/api';

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/admin/audit-logs');
        setLogs(res.data.logs || []);
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <History className="w-6 h-6 text-purple-400" />
          <span>System Audit Trail & Security Ledger</span>
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Chronological record of administrative operations, round lifecycle state shifts, and arbitrations.
        </p>
      </div>

      <div className="glass rounded-xl overflow-hidden border border-slate-800">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="font-mono text-xs text-slate-400">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="font-semibold text-xs text-white">
                    {log.actor_name || 'System'}
                  </td>
                  <td>
                    <span className="badge badge-info">{log.actor_role || 'SYSTEM'}</span>
                  </td>
                  <td className="font-mono text-xs font-bold text-cyan-300">{log.action}</td>
                  <td className="font-mono text-xs text-slate-400">{log.target_type || '-'}</td>
                  <td className="font-mono text-[11px] text-slate-500 max-w-xs truncate">
                    {JSON.stringify(log.metadata || {})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
