import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Settings, Activity, LogOut, Users, Trophy, Calendar, LayoutGrid, Trash2, ShieldCheck, ShieldAlert, UserPlus, Key, Lock, Palette } from 'lucide-react';
import { Game, Admin, GameMode } from '../types';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

interface AdminDashboardProps {
  admin: Admin;
  onSelectGame: (id: string) => void;
  onMonitorGame: (id: string) => void;
  onLogout: () => void;
}

const StatCard: React.FC<{ label: string; value: number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const end = Number(value);
    if (isNaN(end)) {
      setCount(0);
      return;
    }
    
    let start = 0;
    if (start === end) {
      setCount(end);
      return;
    }
    
    const totalDuration = 1000;
    const incrementTime = Math.max(10, totalDuration / Math.abs(end || 1));
    
    const timer = setInterval(() => {
      start += end > 0 ? 1 : -1;
      setCount(start);
      if (start === end) clearInterval(timer);
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg`}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
          <h4 className="text-2xl font-display font-black text-slate-900">{count}</h4>
        </div>
      </div>
    </motion.div>
  );
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ admin, onSelectGame, onMonitorGame, onLogout }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showThemeSwitcher, setShowThemeSwitcher] = useState(false);
  const [newGame, setNewGame] = useState({ name: '', mode: 'team' as GameMode, startTime: '' });
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });
  const [modal, setModal] = useState<{
    type: 'confirm' | 'alert';
    message: string;
    onConfirm?: () => void;
  } | null>(null);

  useEffect(() => {
    fetchGames();
    if (admin.isMain) fetchAdmins();
  }, [admin]);

  const fetchGames = async () => {
    const res = await fetch('/api/games');
    const data = await res.json();
    setGames(data);
  };

  const fetchAdmins = async () => {
    const res = await fetch(`/api/admins?requester=${admin.username}`);
    if (res.ok) {
      const data = await res.json();
      setAdmins(data);
    }
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = Math.random().toString(36).substring(2, 9);
    const res = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...newGame, 
        id, 
        requester: admin.username,
        pdfEnabled: true,
        qrStyle: {
          shape: 'square',
          colorType: 'gradient',
          primaryColor: '#3b82f6',
          secondaryColor: '#10b981',
          frameType: 'none'
        }
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setModal({
        type: 'alert',
        message: data.error || 'Failed to create game'
      });
    } else {
      setShowCreateModal(false);
      fetchGames();
    }
  };

  const handleDeleteGame = async (id: string) => {
    setModal({
      type: 'confirm',
      message: 'Are you sure? This will delete all clues and teams for this game.',
      onConfirm: async () => {
        await fetch(`/api/games/${id}`, { method: 'DELETE' });
        fetchGames();
        setModal(null);
      }
    });
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newAdmin, requester: admin.username }),
    });
    if (!res.ok) {
      const data = await res.json();
      setModal({
        type: 'alert',
        message: data.error || 'Failed to create admin'
      });
    } else {
      setNewAdmin({ username: '', password: '' });
      fetchAdmins();
    }
  };

  const handleDeleteAdmin = async (username: string) => {
    setModal({
      type: 'confirm',
      message: `Delete sub-admin ${username}?`,
      onConfirm: async () => {
        await fetch(`/api/admins/${username}?requester=${admin.username}`, { method: 'DELETE' });
        fetchAdmins();
        setModal(null);
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar/Header */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
            <LayoutGrid size={24} />
          </div>
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight">Admin Dashboard</h1>
            <p className="text-slate-400 text-[10px] sm:text-xs font-medium uppercase tracking-widest">Logged in as {admin.username}</p>
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100">
          <button 
            onClick={() => setShowThemeSwitcher(true)}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors font-bold text-[10px] sm:text-xs uppercase tracking-widest"
          >
            <Palette size={18} />
            <span className="hidden xs:inline">Appearance</span>
            <span className="xs:hidden">Theme</span>
          </button>
          {admin.isMain && (
            <button 
              onClick={() => setShowAdminModal(true)}
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors font-bold text-[10px] sm:text-xs uppercase tracking-widest"
            >
              <ShieldCheck size={18} />
              <span className="hidden xs:inline">Manage Admins</span>
              <span className="xs:hidden">Admins</span>
            </button>
          )}
          <button onClick={onLogout} className="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors font-medium text-xs sm:text-sm">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </motion.header>

      <div className="p-4 sm:p-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard 
            label="Total Games" 
            value={games.length} 
            icon={<Trophy size={24} />} 
            color="bg-amber-500" 
          />
          <StatCard 
            label="Active Hunts" 
            value={games.filter(g => g.status === 'active').length} 
            icon={<Activity size={24} />} 
            color="bg-emerald-500" 
          />
          <StatCard 
            label="Total Admins" 
            value={admins.length || 1} 
            icon={<ShieldCheck size={24} />} 
            color="bg-indigo-600" 
          />
        </div>

        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <Trophy size={20} className="text-amber-500" />
            Your Games
          </h2>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="brutal-btn bg-indigo-600 text-white flex items-center gap-2"
          >
            <Plus size={20} />
            New Game
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Soft Skills Insight Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="col-span-full bg-indigo-900 text-white rounded-3xl p-8 mb-4 overflow-hidden relative"
          >
            <div className="relative z-10 max-w-2xl">
              <h3 className="font-display text-2xl font-bold mb-4">The "Hidden" Treasure: Soft Skills</h3>
              <p className="text-indigo-100 text-sm leading-relaxed mb-6">
                Your treasure hunts are more than just games. They are masterclasses in <strong>Communication & Collaboration</strong> and <strong>Critical Thinking</strong>. 
                Whether in Team Mode or Individual, participants are training their mental agility, strategic planning, and social dynamics under pressure.
              </p>
              <div className="flex gap-4">
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex-1">
                  <h4 className="font-bold text-xs uppercase tracking-widest mb-1">Collaboration</h4>
                  <p className="text-[10px] text-indigo-200">Shared goals and task division foster high-performance teamwork.</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex-1">
                  <h4 className="font-bold text-xs uppercase tracking-widest mb-1">Problem Solving</h4>
                  <p className="text-[10px] text-indigo-200">Decoding clues and navigating sequences sharpens analytical focus.</p>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 opacity-10">
              <Trophy size={300} />
            </div>
          </motion.div>

          {games.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-medium">No games created yet. Start by creating your first treasure hunt!</p>
            </div>
          ) : (
            games.map((game, idx) => (
              <motion.div 
                key={`game-${game.id}-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-indigo-500 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    game.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 
                    game.status === 'finished' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {game.status}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                      {game.mode} mode
                    </div>
                    {admin.isMain && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteGame(game.id); }}
                        className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="font-display text-xl font-bold mb-2 group-hover:text-indigo-600 transition-colors">{game.name}</h3>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Calendar size={14} />
                    {game.startTime ? new Date(game.startTime).toLocaleString() : 'Not scheduled'}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Users size={14} />
                    {game.id.substring(0, 6).toUpperCase()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => onSelectGame(game.id)}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all font-bold text-xs uppercase tracking-widest"
                  >
                    <Settings size={14} />
                    Manage
                  </button>
                  <button 
                    onClick={() => onMonitorGame(game.id)}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all font-bold text-xs uppercase tracking-widest"
                  >
                    <Activity size={14} />
                    Monitor
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Create Game Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
          >
            <h3 className="font-display text-2xl font-bold mb-6">Create New Game</h3>
            <form onSubmit={handleCreateGame} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Game Name</label>
                <input
                  type="text"
                  value={newGame.name}
                  onChange={(e) => setNewGame({ ...newGame, name: e.target.value })}
                  className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Game Mode</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setNewGame({ ...newGame, mode: 'team' })}
                    className={`h-12 rounded-xl border-2 transition-all font-bold text-xs uppercase tracking-widest ${
                      newGame.mode === 'team' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'
                    }`}
                  >
                    Team
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewGame({ ...newGame, mode: 'individual' })}
                    className={`h-12 rounded-xl border-2 transition-all font-bold text-xs uppercase tracking-widest ${
                      newGame.mode === 'individual' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'
                    }`}
                  >
                    Individual
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center justify-between">
                  Start Time (Optional)
                  {!admin.isMain && <span className="text-[8px] text-amber-500 flex items-center gap-1"><ShieldAlert size={10} /> Main Admin Only</span>}
                </label>
                <input
                  type="datetime-local"
                  value={newGame.startTime}
                  disabled={!admin.isMain}
                  onChange={(e) => setNewGame({ ...newGame, startTime: e.target.value })}
                  className={`w-full h-12 px-4 rounded-xl border-2 outline-none transition-all ${
                    !admin.isMain ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed' : 'border-slate-100 focus:border-indigo-500'
                  }`}
                />
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-grow h-14 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-grow h-14 brutal-btn bg-indigo-600 text-white"
                >
                  Create Game
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Admin Management Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-display text-2xl font-bold flex items-center gap-2">
                <ShieldCheck className="text-indigo-600" />
                Admin Management
              </h3>
              <button 
                onClick={() => setShowAdminModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Plus size={24} className="rotate-45 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto pr-2">
              {/* Create Sub-Admin */}
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                  <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
                    <UserPlus size={16} className="text-indigo-600" />
                    Create Sub-Admin
                  </h4>
                  <form onSubmit={handleCreateAdmin} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Username</label>
                      <div className="relative">
                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          value={newAdmin.username}
                          onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                          className="w-full h-11 pl-11 pr-4 rounded-xl border-2 border-white focus:border-indigo-500 outline-none transition-all text-sm"
                          placeholder="sub_admin_name"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="password"
                          value={newAdmin.password}
                          onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                          className="w-full h-11 pl-11 pr-4 rounded-xl border-2 border-white focus:border-indigo-500 outline-none transition-all text-sm"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full h-12 brutal-btn bg-indigo-600 text-white text-xs">
                      Create Account
                    </button>
                  </form>
                </div>
              </div>

              {/* Admin List */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <Users size={16} className="text-slate-400" />
                  Existing Admins
                </h4>
                <div className="space-y-2">
                  {admins.map((a) => (
                    <div key={a.username} className="p-4 rounded-xl bg-white border border-slate-100 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${a.isMain ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                          {a.isMain ? <ShieldCheck size={16} /> : <Users size={16} />}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-700">{a.username}</p>
                          <p className="text-[10px] uppercase tracking-widest text-slate-400">{a.isMain ? 'Main Admin' : 'Sub-Admin'}</p>
                        </div>
                      </div>
                      {!a.isMain && (
                        <button 
                          onClick={() => handleDeleteAdmin(a.username)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Theme Switcher */}
      {showThemeSwitcher && (
        <ThemeSwitcher onClose={() => setShowThemeSwitcher(false)} />
      )}

      {/* Custom Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${modal.type === 'confirm' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {modal.type === 'confirm' ? <ShieldAlert size={32} /> : <ShieldCheck size={32} />}
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold text-slate-900">
                    {modal.type === 'confirm' ? 'Confirmation' : 'Notification'}
                  </h3>
                  <p className="text-slate-500 mt-2">{modal.message}</p>
                </div>
                <div className="flex gap-3 w-full mt-4">
                  {modal.type === 'confirm' ? (
                    <>
                      <button 
                        onClick={() => setModal(null)}
                        className="flex-1 h-12 rounded-xl border-2 border-slate-100 font-bold text-slate-500 hover:bg-slate-50 transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={modal.onConfirm}
                        className="flex-1 h-12 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                      >
                        Confirm
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => setModal(null)}
                      className="w-full h-12 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
