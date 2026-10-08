import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Terminal, LogOut, Code, Award, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export const ParticipantLayout: React.FC = () => {
  const { user, participant, logout } = useAuth();
  const { isConnected } = useSocket();
  const location = useLocation();

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'CLEAR':
        return <span className="badge badge-active">STATUS: CLEAR</span>;
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
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#0c1222]/90 backdrop-blur-md border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/participant/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-[1px] shadow-md shadow-cyan-500/20">
              <div className="w-full h-full bg-[#0a0e1a] rounded-[11px] flex items-center justify-center">
                <Code className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-wider bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                TECH AUCTION
              </span>
              <span className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                Arena Portal
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 border-l border-slate-800 pl-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Info & Actions */}
        <div className="flex items-center gap-4">
          {/* Socket connectivity */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-red-400 animate-ping'
              }`}
            />
            <span className="text-slate-400">{isConnected ? 'LIVE SYNC' : 'OFFLINE'}</span>
          </div>

          {/* Status badge */}
          {getStatusBadge(participant?.status)}

          {/* User info */}
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-200">{user?.displayName}</span>
            <span className="text-[10px] font-mono text-cyan-400">
              ID: {participant?.participant_id || 'PARTICIPANT'}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 rounded-lg bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition-colors"
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
