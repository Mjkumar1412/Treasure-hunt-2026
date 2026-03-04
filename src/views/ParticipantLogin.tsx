import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, ShieldCheck, Users, Activity } from 'lucide-react';
import { Team } from '../types';

interface ParticipantLoginProps {
  onLogin: (team: Team) => void;
  onAdminClick: () => void;
}

const ParticipantLogin: React.FC<ParticipantLoginProps> = ({ onLogin, onAdminClick }) => {
  const [loginId, setLoginId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginId.length !== 4) {
      setError('Please enter a 4-digit ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login failed');
      }

      const team = await res.json();
      onLogin(team);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-[90%] max-w-sm mx-auto"
      >
        <div className="text-center mb-8">
          <motion.div 
            animate={{ 
              filter: ["drop-shadow(0 0 0px #10b981)", "drop-shadow(0 0 15px #10b981)", "drop-shadow(0 0 0px #10b981)"]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-200 mb-6"
          >
            <LogIn size={40} />
          </motion.div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 relative overflow-hidden group">
            <span className="relative z-10">Treasure Hunt</span>
            <div className="absolute inset-0 animate-shimmer opacity-30 pointer-events-none" />
          </h1>
          <p className="text-slate-500 mt-2 text-sm sm:text-base">Enter your 4-digit Login ID to begin</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div 
            className={`relative ${error ? 'animate-shake' : ''}`}
            animate={loginId.length > 0 ? { scale: [1, 1.02, 1] } : {}}
          >
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={loginId}
              onChange={(e) => setLoginId(e.target.value.replace(/\D/g, ''))}
              placeholder="0000"
              className={`w-full h-20 text-center text-4xl font-display font-bold tracking-[0.5em] sm:tracking-[1em] pl-[0.5em] sm:pl-[1em] rounded-2xl border-2 outline-none transition-all ${
                error 
                  ? 'border-red-500 bg-red-50 text-red-900' 
                  : 'border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
              }`}
            />
          </motion.div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-red-500 text-sm font-medium"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading || loginId.length !== 4}
            className="w-full h-14 sm:h-16 brutal-btn bg-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {loading ? (
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto"
              />
            ) : 'Join Game'}
          </motion.button>
        </form>

        <button
          onClick={onAdminClick}
          className="w-full mt-8 flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium"
        >
          <ShieldCheck size={16} />
          Admin Access
        </button>

        {/* Soft Skills Section */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <h3 className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-6">Skills in Focus</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-2">
                <Users size={16} />
              </div>
              <h4 className="text-[10px] font-bold uppercase text-slate-700">Collaboration</h4>
            </div>
            <div className="text-center p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-2">
                <Activity size={16} />
              </div>
              <h4 className="text-[10px] font-bold uppercase text-slate-700">Problem Solving</h4>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ParticipantLogin;
