import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ArrowLeft, Lock, Eye, EyeOff, Activity, ShieldAlert } from 'lucide-react';
import { Admin } from '../types';
import { apiFetch, safeJson } from '../utils/api';

interface AdminLoginProps {
  onLogin: (admin: Admin) => void;
  onBack: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking' | 'db_error'>('checking');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await apiFetch('/api/health');
        const data = await safeJson(res);
        if (res.ok) {
          if (data.database === 'connected') setServerStatus('online');
          else setServerStatus('db_error');
        } else {
          setServerStatus('offline');
        }
      } catch {
        setServerStatus('offline');
      }
    };
    checkHealth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    try {

      const res = await apiFetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername, password: trimmedPassword }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        let errorMessage = data.error || 'Access denied. Check credentials.';
        if (errorMessage.includes('System authentication failure')) {
          errorMessage = 'System error: The database might not be configured correctly. Please ensure you have run the migration SQL in Supabase.';
        }
        throw new Error(errorMessage);
      }
      
      onLogin(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.1),transparent_50%)]" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-600/10 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <motion.button 
          whileHover={{ x: -5 }}
          onClick={onBack}
          className="mb-10 flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
        >
          <ArrowLeft size={14} />
          Return to Base
        </motion.button>

        <div className="bg-white/5 backdrop-blur-2xl p-10 rounded-[2.5rem] border border-white/10 shadow-2xl">
          <div className="text-center mb-10">
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-600 text-white shadow-2xl shadow-indigo-600/20 mb-6"
            >
              <ShieldCheck size={40} />
            </motion.div>
            <h1 className="font-display text-3xl font-black tracking-tight text-white mb-2">Command Staff</h1>
            <p className="text-slate-500 text-sm font-medium">Authorized personnel only</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Username</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-14 px-6 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 focus:bg-white/10 outline-none transition-all font-bold placeholder:text-slate-700"
                  placeholder="Enter username..."
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Access Key</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 px-6 pl-12 pr-12 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 focus:bg-white/10 outline-none transition-all font-bold placeholder:text-slate-700"
                  placeholder="••••••••"
                  required
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold leading-relaxed"
                >
                  <ShieldAlert size={16} className="shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full h-16 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl transition-all shadow-xl shadow-indigo-600/20 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              {loading ? (
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto"
                />
              ) : 'Authenticate'}
            </motion.button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                serverStatus === 'online' ? 'bg-emerald-500' : 
                serverStatus === 'db_error' ? 'bg-amber-500 animate-pulse' :
                serverStatus === 'checking' ? 'bg-slate-500 animate-pulse' : 'bg-rose-500'
              }`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                serverStatus === 'online' ? 'text-emerald-500' : 
                serverStatus === 'db_error' ? 'text-amber-500' :
                serverStatus === 'checking' ? 'text-slate-500' : 'text-rose-500'
              }`}>
                {serverStatus === 'online' ? 'System Online' : 
                 serverStatus === 'db_error' ? 'DB Setup Required' :
                 serverStatus === 'checking' ? 'Checking Link...' : 'System Offline'}
              </span>
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-700">
              v2.5.0-SECURE
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
