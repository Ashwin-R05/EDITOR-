import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Terminal, LogOut, Code, Award, FileText, Sparkles, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export const ParticipantLayout: React.FC = () => {
  const { user, participant, logout } = useAuth();
  const { isConnected } = useSocket();
  const location = useLocation();

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'CLEAR':
        return <span className="badge badge-active">CLEAR</span>;
      case 'UNDER_REVIEW':
        return <span className="badge badge-pending animate-pulse">UNDER REVIEW</span>;
      case 'DISQUALIFIED':
        return <span className="badge badge-danger">DISQUALIFIED</span>;
      case 'COMPLETED':
        return <span className="badge badge-info">COMPLETED</span>;
      default:
        return <span className="badge badge-muted">CLEAR</span>;
    }
  };

  const navItems = [
    { label: 'Dashboard', path: '/participant/dashboard', icon: Terminal },
    { label: 'Submissions', path: '/participant/submissions', icon: FileText },
    { label: 'Results', path: '/participant/results', icon: Award },
  ];

  return (
    <div className="min-h-screen bg-[#080c16] text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0d1322]/90 backdrop-blur-2xl border-b border-white/10 px-6 sm:px-10 py-3.5 flex items-center justify-between shadow-xl shadow-black/30">
        <div className="flex items-center gap-8">
          <Link to="/participant/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-indigo-600 p-[1.5px] shadow-lg shadow-cyan-500/25 group-hover:shadow-cyan-500/40 transition-shadow">
              <div className="w-full h-full bg-[#0d1322] rounded-[10px] flex items-center justify-center">
                <Code className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-base tracking-wide font-heading bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                TECH AUCTION
              </span>
              <span className="block text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                ARENA PORTAL
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 border-l border-white/10 pl-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 shadow-md shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Info & Actions */}
        <div className="flex items-center gap-4">
          {/* Live telemetry sync indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs shadow-inner">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse' : 'bg-red-400 animate-ping'
              }`}
            />
            <span className="text-slate-300 font-medium text-[11px]">{isConnected ? 'LIVE SYNC' : 'OFFLINE'}</span>
          </div>

          {/* Status badge */}
          {getStatusBadge(participant?.status)}

          {/* User Profile Pill */}
          <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-white/10">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center font-bold text-xs text-cyan-300 font-heading">
              {user?.displayName?.charAt(0) || 'P'}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-white">{user?.displayName}</span>
              <span className="text-[10px] text-cyan-400 font-mono">
                {participant?.participant_id || 'PARTICIPANT'}
              </span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
};
