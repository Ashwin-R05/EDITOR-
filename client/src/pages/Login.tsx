import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Terminal, Shield, Lock, Mail, AlertCircle, ArrowRight, Code2, Cpu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'PARTICIPANT' | 'ADMIN'>('PARTICIPANT');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const data = await login(email, password);

      // Verify that user logged in under the right role if requested
      if (data.user.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        const from = (location.state as any)?.from?.pathname || '/participant/dashboard';
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      const message = err.response?.data?.error || 'Invalid credentials or server unavailable';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const setPreset = (role: 'PARTICIPANT' | 'ADMIN') => {
    setActiveTab(role);
    setError(null);
    if (role === 'PARTICIPANT') {
      setEmail('ashwin@techauction.com');
      setPassword('pass123');
    } else {
      setEmail('admin@techauction.com');
      setPassword('admin123');
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Background Cybernetic Glow Lines */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header Bar */}
      <header className="relative z-10 px-8 py-6 flex items-center justify-between border-b border-slate-800/60 backdrop-blur-md bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-[1px] shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-[#0a0e1a] rounded-[11px] flex items-center justify-center">
              <Terminal className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
              TECH AUCTION
            </h1>
            <p className="text-[10px] tracking-widest text-slate-400 uppercase font-mono">
              Competitive Coding Arena
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>SYSTEM ONLINE</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Futuristic Terminal Card */}
          <div className="relative glass rounded-2xl p-8 border border-slate-700/50 shadow-2xl shadow-cyan-950/40">
            {/* Top decorative badge */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                <Cpu className="w-4 h-4" />
                <span>SECURE ACCESS PORTAL</span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">v1.0.0</span>
            </div>

            {/* Role Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/90 rounded-xl border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => setPreset('PARTICIPANT')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  activeTab === 'PARTICIPANT'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-md shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Participant</span>
              </button>

              <button
                type="button"
                onClick={() => setPreset('ADMIN')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  activeTab === 'ADMIN'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-md shadow-purple-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Administrator</span>
              </button>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-1">
                {activeTab === 'PARTICIPANT' ? 'Participant Login' : 'Admin Control Center'}
              </h2>
              <p className="text-xs text-slate-400">
                {activeTab === 'PARTICIPANT'
                  ? 'Enter your assigned credentials to start your coding session.'
                  : 'Administrative credentials required for event control and security.'}
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-5 p-3 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start gap-2.5 text-red-300 text-xs"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p>{error}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                  {activeTab === 'PARTICIPANT' ? 'Participant Email / ID' : 'Admin Email'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={activeTab === 'PARTICIPANT' ? 'ashwin@techauction.com' : 'admin@techauction.com'}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/70 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/70 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                    activeTab === 'PARTICIPANT'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/25'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>AUTHENTICATING...</span>
                    </>
                  ) : (
                    <>
                      <span>ENTER EVENT PORTAL</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Demo Credentials Assistant */}
            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-2">
                <span>QUICK LOGIN FILL:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setPreset('PARTICIPANT')}
                  className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-left transition-colors text-cyan-400"
                >
                  <span className="block text-slate-500 text-[10px]">Participant</span>
                  ashwin / pass123
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('ADMIN')}
                  className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-left transition-colors text-purple-400"
                >
                  <span className="block text-slate-500 text-[10px]">Admin</span>
                  admin / admin123
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-8 py-4 border-t border-slate-800/40 text-center text-xs text-slate-500 font-mono">
        TECH AUCTION COMPETITIVE CODING PLATFORM • REAL-TIME ANTI-CHEAT ARCHITECTURE
      </footer>
    </div>
  );
};
