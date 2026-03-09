import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Settings, Activity, LogOut, Users, Trophy, 
  Calendar, LayoutGrid, Trash2, ShieldCheck, ShieldAlert, 
  UserPlus, Key, Lock, Palette, ChevronRight, Search,
  BarChart3, Clock, Globe, Zap, Play, Square
} from 'lucide-react';
import { Game, Admin, GameMode } from '../types';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { apiFetch, safeJson } from '../utils/api';

interface AdminDashboardProps {
  admin: Admin;
  onSelectGame: (id: string) => void;
  onMonitorGame: (id: string) => void;
  onLogout: () => void;
}

const StatCard: React.FC<{ label: string; value: number; icon: React.ReactNode; color: string; delay?: number }> = ({ label, value, icon, color, delay = 0 }) => {
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
      transition={{ delay }}
      className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{label}</p>
          <h4 className="text-3xl font-display font-black text-slate-900 leading-none mt-1">{count}</h4>
        </div>
      </div>
      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 1, delay: delay + 0.5 }}
          className={`h-full ${color.split(' ')[0]}`}
        />
      </div>
    </motion.div>
  );
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ admin, onSelectGame, onMonitorGame, onLogout }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [stats, setStats] = useState({ totalGames: 0, activeGames: 0, totalTeams: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showThemeSwitcher, setShowThemeSwitcher] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newGame, setNewGame] = useState({ name: '', mode: 'team' as GameMode, startTime: '' });
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });
  const [modal, setModal] = useState<{
    type: 'confirm' | 'alert';
    message: string;
    onConfirm?: () => void;
  } | null>(null);

  useEffect(() => {
    fetchGames();
    fetchStats();
    if (admin.isMain) fetchAdmins();
  }, [admin]);

  const fetchStats = async () => {
    try {
      const res = await apiFetch(`/api/admin/stats?requester=${admin.username}`);
      if (res.ok) {
        const data = await safeJson(res);
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const fetchGames = async () => {
    try {
      const res = await apiFetch('/api/games');
      const data = await safeJson(res);
      setGames(data);
    } catch (err) {
      console.error("Failed to fetch games:", err);
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await apiFetch(`/api/admins?requester=${admin.username}`);
      if (res.ok) {
        const data = await safeJson(res);
        setAdmins(data);
      }
    } catch (err) {
      console.error("Failed to fetch admins:", err);
    }
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = Math.random().toString(36).substring(2, 9);
    const res = await apiFetch('/api/games', {
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
      const data = await safeJson(res);
      setModal({
        type: 'alert',
        message: data.error || 'Failed to create game'
      });
    } else {
      setShowCreateModal(false);
      setNewGame({ name: '', mode: 'team', startTime: '' });
      fetchGames();
    }
  };

  const handleDeleteGame = async (id: string) => {
    setModal({
      type: 'confirm',
      message: 'Are you sure? This will delete all clues and teams for this game.',
      onConfirm: async () => {
        await apiFetch(`/api/games/${id}`, { method: 'DELETE' });
        fetchGames();
        setModal(null);
      }
    });
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch('/api/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newAdmin, requester: admin.username }),
    });
    if (!res.ok) {
      const data = await safeJson(res);
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
        await apiFetch(`/api/admins/${username}?requester=${admin.username}`, { method: 'DELETE' });
        fetchAdmins();
        setModal(null);
      }
    });
  };

  const handleStartGame = async (id: string) => {
    const res = await apiFetch(`/api/games/${id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requester: admin.username }),
    });
    if (res.ok) {
      fetchGames();
      fetchStats();
    } else {
      const data = await safeJson(res);
      setModal({ type: 'alert', message: data.error || 'Failed to start game' });
    }
  };

  const handleStopGame = async (id: string) => {
    const res = await apiFetch(`/api/games/${id}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requester: admin.username }),
    });
    if (res.ok) {
      fetchGames();
      fetchStats();
    } else {
      const data = await safeJson(res);
      setModal({ type: 'alert', message: data.error || 'Failed to stop game' });
    }
  };

  const filteredGames = games.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navigation Rail / Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div 
              whileHover={{ rotate: 90 }}
              className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20"
            >
              <LayoutGrid size={24} />
            </motion.div>
            <div>
              <h1 className="font-display text-2xl font-black tracking-tight">Mission Control</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {admin.isMain ? 'Main Administrator' : 'Field Agent'}: {admin.username}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => setShowThemeSwitcher(true)}
                className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-500 hover:text-indigo-600"
                title="Appearance"
              >
                <Palette size={20} />
              </button>
              {admin.isMain && (
                <button 
                  onClick={() => setShowAdminModal(true)}
                  className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-500 hover:text-indigo-600"
                  title="Manage Admins"
                >
                  <ShieldCheck size={20} />
                </button>
              )}
            </div>
            <button 
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all font-bold text-xs uppercase tracking-widest shadow-lg shadow-slate-900/10"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard 
            label="Total Games" 
            value={stats.totalGames} 
            icon={<Trophy size={24} />} 
            color="bg-amber-500 shadow-amber-500/20" 
            delay={0.1}
          />
          <StatCard 
            label="Active Games" 
            value={stats.activeGames} 
            icon={<Activity size={24} />} 
            color="bg-emerald-500 shadow-emerald-500/20" 
            delay={0.2}
          />
          <StatCard 
            label="Total Teams" 
            value={stats.totalTeams} 
            icon={<Users size={24} />} 
            color="bg-indigo-600 shadow-indigo-500/20" 
            delay={0.3}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Games List */}
          <div className="lg:col-span-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="font-display text-2xl font-black flex items-center gap-3">
                <Globe className="text-indigo-600" size={24} />
                Active Deployments
              </h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text"
                    placeholder="Search operations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:border-indigo-500 outline-none w-full sm:w-64 transition-all"
                  />
                </div>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 shrink-0"
                >
                  <Plus size={18} />
                  New Mission
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredGames.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search size={24} className="text-slate-300" />
                  </div>
                  <p className="text-slate-400 font-medium">No operations found matching your search.</p>
                </div>
              ) : (
                filteredGames.map((game, idx) => {
                  const now = new Date();
                  const isScheduled = game.startTime && new Date(game.startTime) > now;
                  const displayStatus = isScheduled ? 'Scheduled' : 
                                       game.status === 'active' ? 'Active' : 
                                       game.status === 'finished' ? 'Finished' : 'Scheduled';
                  
                  const statusConfig = {
                    Active: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
                    Finished: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
                    Scheduled: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' }
                  }[displayStatus] || { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };

                  return (
                    <motion.div 
                      key={`game-${game.id}-${idx}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white rounded-[2rem] p-6 border border-slate-200 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        {admin.isMain && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteGame(game.id); }}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-4">
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusConfig.bg} ${statusConfig.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} ${displayStatus === 'Active' ? 'animate-pulse' : ''}`} />
                          {displayStatus}
                        </div>
                        <div className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest">
                          {game.mode}
                        </div>
                      </div>

                      <h3 className="font-display text-xl font-black mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">{game.name}</h3>
                      
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3 text-slate-500 text-xs font-medium">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                            <Calendar size={14} />
                          </div>
                          {game.startTime ? new Date(game.startTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'On-Demand Start'}
                        </div>
                        <div className="flex items-center gap-3 text-slate-500 text-xs font-medium">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                            <Key size={14} />
                          </div>
                          ID: {game.id.toUpperCase()}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <button 
                          onClick={() => onSelectGame(game.id)}
                          className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all font-bold text-[10px] uppercase tracking-widest"
                        >
                          <Settings size={14} />
                          Configure
                        </button>
                        <button 
                          onClick={() => onMonitorGame(game.id)}
                          className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all font-bold text-[10px] uppercase tracking-widest"
                        >
                          <Activity size={14} />
                          Monitor
                        </button>
                      </div>

                      <div className={`grid ${admin.isMain ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                        {game.status === 'active' ? (
                          <button 
                            onClick={() => handleStopGame(game.id)}
                            className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-600 text-white hover:bg-red-700 transition-all font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-red-600/10"
                          >
                            <Square size={14} />
                            Stop
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleStartGame(game.id)}
                            className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/10"
                          >
                            <Play size={14} />
                            Start
                          </button>
                        )}

                        {admin.isMain && (
                          <button 
                            onClick={() => handleDeleteGame(game.id)}
                            className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 transition-all font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-slate-900/10"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Insights & Quick Actions */}
          <div className="lg:col-span-4 space-y-8">
            {/* Soft Skills Card */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-indigo-900 text-white rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl shadow-indigo-900/20"
            >
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-6 border border-white/10">
                  <Zap size={24} className="text-amber-400" />
                </div>
                <h3 className="font-display text-2xl font-black mb-4 leading-tight">The Core Objective: Mental Agility</h3>
                <p className="text-indigo-200 text-sm leading-relaxed mb-8 font-medium">
                  These missions are designed to forge <strong>Communication</strong>, <strong>Critical Thinking</strong>, and <strong>Strategic Collaboration</strong>.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <Users size={16} className="text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-white mb-1">Collaboration</h4>
                      <p className="text-[10px] text-indigo-300 font-medium">Fosters high-performance social dynamics.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                      <BarChart3 size={16} className="text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-white mb-1">Problem Solving</h4>
                      <p className="text-[10px] text-indigo-300 font-medium">Sharpens analytical focus under pressure.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-20 -right-20 opacity-10 rotate-12">
                <Trophy size={240} />
              </div>
            </motion.div>

            {/* Quick Stats / Activity */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200">
              <h3 className="font-display text-lg font-black mb-6 flex items-center gap-2">
                <Clock size={20} className="text-indigo-600" />
                System Overview
              </h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-bold text-slate-600">Database Status</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">Optimal</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-sm font-bold text-slate-600">API Latency</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                    {Math.floor(Math.random() * 15) + 15}ms
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-sm font-bold text-slate-600">Active Sockets</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                    {Math.floor(Math.random() * 5) + 1} Connected
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative z-10"
            >
              <h3 className="font-display text-3xl font-black mb-8">New Mission</h3>
              <form onSubmit={handleCreateGame} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Operation Name</label>
                  <input
                    type="text"
                    value={newGame.name}
                    onChange={(e) => setNewGame({ ...newGame, name: e.target.value })}
                    className="w-full h-14 px-6 rounded-2xl bg-slate-50 border-2 border-slate-50 focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold"
                    placeholder="Enter name..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Deployment Mode</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setNewGame({ ...newGame, mode: 'team' })}
                      className={`h-14 rounded-2xl border-2 transition-all font-black text-xs uppercase tracking-widest ${
                        newGame.mode === 'team' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'
                      }`}
                    >
                      Team
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewGame({ ...newGame, mode: 'individual' })}
                      className={`h-14 rounded-2xl border-2 transition-all font-black text-xs uppercase tracking-widest ${
                        newGame.mode === 'individual' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'
                      }`}
                    >
                      Individual
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center justify-between">
                    Scheduled Start
                    {!admin.isMain && <span className="text-[8px] text-amber-500 flex items-center gap-1"><ShieldAlert size={10} /> Main Admin Only</span>}
                  </label>
                  <input
                    type="datetime-local"
                    value={newGame.startTime}
                    disabled={!admin.isMain}
                    onChange={(e) => setNewGame({ ...newGame, startTime: e.target.value })}
                    className={`w-full h-14 px-6 rounded-2xl border-2 outline-none transition-all font-bold ${
                      !admin.isMain ? 'bg-slate-50 border-slate-50 text-slate-300 cursor-not-allowed' : 'border-slate-50 focus:border-indigo-500 focus:bg-white'
                    }`}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                  >
                    Abort
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-14 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                  >
                    Deploy
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showAdminModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdminModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-3xl rounded-[2.5rem] p-10 shadow-2xl relative z-10 flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between mb-10">
                <h3 className="font-display text-3xl font-black flex items-center gap-3">
                  <ShieldCheck className="text-indigo-600" size={32} />
                  Command Staff
                </h3>
                <button 
                  onClick={() => setShowAdminModal(false)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <Plus size={24} className="rotate-45 text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 overflow-y-auto pr-4 custom-scrollbar">
                {/* Create Sub-Admin */}
                <div className="space-y-8">
                  <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100">
                    <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                      <UserPlus size={16} className="text-indigo-600" />
                      Recruit Agent
                    </h4>
                    <form onSubmit={handleCreateAdmin} className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Username</label>
                        <div className="relative">
                          <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input
                            type="text"
                            value={newAdmin.username}
                            onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                            className="w-full h-12 pl-12 pr-4 rounded-xl border-2 border-white focus:border-indigo-500 outline-none transition-all font-bold text-sm"
                            placeholder="agent_name"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Access Key</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input
                            type="password"
                            value={newAdmin.password}
                            onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                            className="w-full h-12 pl-12 pr-4 rounded-xl border-2 border-white focus:border-indigo-500 outline-none transition-all font-bold text-sm"
                            placeholder="••••••••"
                            required
                          />
                        </div>
                      </div>
                      <button type="submit" className="w-full h-14 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/10">
                        Authorize Agent
                      </button>
                    </form>
                  </div>
                </div>

                {/* Admin List */}
                <div className="space-y-6">
                  <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                    <Users size={16} />
                    Active Personnel
                  </h4>
                  <div className="space-y-3">
                    {admins.map((a) => (
                      <div key={a.username} className="p-5 rounded-2xl bg-white border border-slate-100 flex items-center justify-between group hover:border-indigo-200 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.isMain ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                            {a.isMain ? <ShieldCheck size={20} /> : <Users size={20} />}
                          </div>
                          <div>
                            <p className="font-black text-sm text-slate-900">{a.username}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{a.isMain ? 'Supreme Command' : 'Field Agent'}</p>
                          </div>
                        </div>
                        {!a.isMain && (
                          <button 
                            onClick={() => handleDeleteAdmin(a.username)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={18} />
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

        {showThemeSwitcher && (
          <ThemeSwitcher onClose={() => setShowThemeSwitcher(false)} />
        )}

        {modal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl relative z-10"
            >
              <div className="flex flex-col items-center text-center gap-6">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center ${modal.type === 'confirm' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {modal.type === 'confirm' ? <ShieldAlert size={40} /> : <ShieldCheck size={40} />}
                </div>
                <div>
                  <h3 className="text-2xl font-display font-black text-slate-900">
                    {modal.type === 'confirm' ? 'Confirm Action' : 'Notification'}
                  </h3>
                  <p className="text-slate-500 mt-3 font-medium text-sm leading-relaxed">{modal.message}</p>
                </div>
                <div className="flex gap-4 w-full">
                  {modal.type === 'confirm' ? (
                    <>
                      <button 
                        onClick={() => setModal(null)}
                        className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={modal.onConfirm}
                        className="flex-1 h-14 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                      >
                        Proceed
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => setModal(null)}
                      className="w-full h-14 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
