import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, ArrowLeft, Lock } from 'lucide-react';
import { Admin } from '../types';
import { apiFetch } from '../utils/api';

interface AdminLoginProps {
  onLogin: (admin: Admin) => void;
  onBack: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await apiFetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) throw new Error('Invalid credentials');
      const admin = await res.json();
      onLogin(admin);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <motion.button 
          whileHover={{ x: -5 }}
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Back to Participant Login
        </motion.button>

        <div className="text-center mb-8">
          <motion.div 
            animate={{ 
              filter: ["drop-shadow(0 0 0px #4f46e5)", "drop-shadow(0 0 15px #4f46e5)", "drop-shadow(0 0 0px #4f46e5)"]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 mb-4"
          >
            <ShieldCheck size={32} />
          </motion.div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white relative overflow-hidden group">
            <span className="relative z-10">Admin Portal</span>
            <div className="absolute inset-0 animate-shimmer opacity-10 pointer-events-none" />
          </h1>
          <p className="text-slate-400 mt-2">Secure access for game organizers</p>
        </div>

        <form onSubmit={handleSubmit} className={`space-y-4 ${error ? 'animate-shake' : ''}`}>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Username</label>
            <motion.input
              whileFocus={{ scale: 1.01 }}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-indigo-500 outline-none transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Password</label>
            <div className="relative">
              <motion.input
                whileFocus={{ scale: 1.01 }}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 pl-10 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-indigo-500 outline-none transition-all"
                required
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-red-400 text-sm font-medium"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-display font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-500/20"
          >
            {loading ? (
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto"
              />
            ) : 'Login to Dashboard'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
