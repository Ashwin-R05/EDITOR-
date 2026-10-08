import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  ShieldAlert,
  Users,
  Layers,
  FileCode2,
  Send,
  Trophy,
  History,
  Activity,
  LogOut,
  Radio,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import { NotificationCenter } from '../components/admin/NotificationCenter';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { socket, isConnected } = useSocket();
  const location = useLocation();
  const [pendingIncidents, setPendingIncidents] = useState<number>(0);
  const [activeAlert, setActiveAlert] = useState<any | null>(null);

  // Fetch pending incidents count periodically or on socket event
  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      if (res.data?.stats) {
        setPendingIncidents(res.data.stats.pendingIncidents || 0);
      }
    } catch (e) {
      // quiet fail on initial load
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleIncident = (incident: any) => {
      setPendingIncidents((prev) => prev + 1);
      setActiveAlert(incident);
      setTimeout(() => {
        setActiveAlert(null);
      }, 10000);
    };

    socket.on('incident:created', handleIncident);
    socket.on('participant:incident', handleIncident);

    return () => {
      socket.off('incident:created', handleIncident);
      socket.off('participant:incident', handleIncident);
    };
  }, [socket]);

  const navItems = [
    { label: 'Event Overview', path: '/admin/dashboard', icon: Activity },
    { label: 'Live Monitoring', path: '/admin/participants', icon: Users },
    { label: 'Round Controls', path: '/admin/rounds', icon: Layers },
    { label: 'Problem Sets', path: '/admin/problems', icon: FileCode2 },
    { label: 'Submissions', path: '/admin/submissions', icon: Send },
    {
      label: 'Security & Anti-Cheat',
      path: '/admin/security',
      icon: ShieldAlert,
      badge: pendingIncidents > 0 ? pendingIncidents : undefined,
    },
    { label: 'Leaderboard', path: '/admin/leaderboard', icon: Trophy },
    { label: 'Audit Trail', path: '/admin/audit-logs', icon: History },
  ];

  return (
    <div className="min-h-screen bg-[#080c16] text-slate-100 flex font-sans">
      {/* Floating High-Priority Security Alert Notification Banner */}
      {activeAlert && (
        <div className="fixed top-5 right-5 z-50 max-w-md w-full bg-rose-950/95 border-2 border-rose-500 rounded-2xl p-4 shadow-2xl shadow-rose-950/60 backdrop-blur-2xl">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                  SECURITY ALERT DETECTED
                </span>
                <span className="text-[10px] text-slate-400 font-medium">JUST NOW</span>
              </div>
              <p className="text-sm font-semibold text-white mt-1">
                {activeAlert.participantName || 'Participant'} — {activeAlert.incidentType}
              </p>
              <p className="text-xs text-slate-300 mt-0.5">
                Participant screen locked. Action required.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Link
                  to={`/admin/security/${activeAlert.incidentId || ''}`}
                  onClick={() => setActiveAlert(null)}
                  className="btn btn-danger py-1.5 px-3.5 text-xs font-bold"
                >
                  REVIEW NOW
                </Link>
                <button
                  onClick={() => setActiveAlert(null)}
                  className="btn btn-ghost py-1.5 px-3 text-xs"
                >
                  DISMISS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Left Control Center Sidebar */}
      <aside className="w-68 bg-[#0d1322] border-r border-white/10 flex flex-col shrink-0 select-none shadow-xl">
        {/* Brand Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 p-[1.5px] shadow-lg shadow-purple-600/30">
              <div className="w-full h-full bg-[#0d1322] rounded-[10px] flex items-center justify-center">
                <Radio className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <div>
              <h2 className="font-extrabold text-sm tracking-wide bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent font-heading">
                CONTROL CENTER
              </h2>
              <p className="text-[10px] tracking-wider text-slate-400 uppercase font-medium">
                ADMIN COMMAND
              </p>
            </div>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="mx-5 my-4 px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs shadow-inner">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className="text-slate-200 text-xs font-semibold">
              {isConnected ? 'NODE ONLINE' : 'DISCONNECTED'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">PORT 3001</span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3.5 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-purple-600/20 text-purple-200 border border-purple-500/40 shadow-sm shadow-purple-900/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-purple-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-2">
                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-bold animate-pulse">
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-purple-400" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Admin User Footer Profile */}
        <div className="p-4 border-t border-white/10 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-purple-900/50 border border-purple-700/50 flex items-center justify-center font-bold text-xs text-purple-300 font-heading">
              {user?.displayName?.charAt(0) || 'A'}
            </div>
            <div className="truncate">
              <span className="block text-xs font-bold text-white truncate">
                {user?.displayName}
              </span>
              <span className="block text-[10px] text-purple-400 font-medium">ADMINISTRATOR</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Administrative Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 px-8 border-b border-white/10 bg-[#0d1322]/80 backdrop-blur-xl flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5 text-xs text-slate-400 font-medium">
            <span className="text-purple-400 font-bold">TECH AUCTION</span>
            <span>•</span>
            <span className="text-slate-200">ADMIN CONTROL CENTER</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
          </div>
          <div className="flex items-center gap-4">
            <NotificationCenter />
          </div>
        </header>
        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
