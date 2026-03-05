import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Activity, Users, Trophy, Clock, MapPin, Search } from 'lucide-react';
import { Game, Team } from '../types';
import socket from '../lib/socket';

interface AdminMonitoringProps {
  gameId: string;
  onBack: () => void;
}

const AdminMonitoring: React.FC<AdminMonitoringProps> = ({ gameId, onBack }) => {
  const [game, setGame] = useState<Game | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();

    socket.on('team_progress', ({ teamId, sequence }) => {
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, currentClueSequence: sequence, lastScanTime: new Date().toISOString() } : t));
    });

    socket.on('game_over', ({ winnerId }) => {
      setGame(prev => prev ? { ...prev, status: 'finished', winnerId } : null);
      fetchData();
    });

    return () => {
      socket.off('team_progress');
      socket.off('game_over');
    };
  }, [gameId]);

  const fetchData = async () => {
    const [gRes, tRes] = await Promise.all([
      fetch('/api/games'),
      fetch(`/api/games/${gameId}/teams`)
    ]);
    const games = await gRes.json();
    setGame(games.find((x: Game) => x.id === gameId));
    setTeams(await tRes.json());
  };

  const filteredTeams = teams.filter(t => 
    (t.name || '').toLowerCase().includes(search.toLowerCase()) || 
    t.loginId.includes(search)
  ).sort((a, b) => b.currentClueSequence - a.currentClueSequence);

  const getProgress = (team: Team) => {
    const totalClues = cluesCount[team.id] || 1;
    const current = Number(team.currentClueSequence) || 1;
    const progress = ((current - 1) / totalClues) * 100;
    return isNaN(progress) ? 0 : Math.min(Math.max(0, progress), 100);
  };

  const [cluesCount, setCluesCount] = useState<Record<string, number>>({});

  useEffect(() => {
    const counts: Record<string, number> = {};
    const fetchCluesCounts = async () => {
      const res = await fetch(`/api/games/${gameId}/clues`);
      const clues = await res.json();
      teams.forEach(t => {
        counts[t.id] = clues.filter((c: any) => !c.teamId || c.teamId === t.id).length;
      });
      setCluesCount(counts);
    };
    if (teams.length > 0) fetchCluesCounts();
  }, [teams, gameId]);

  if (!game) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display font-bold text-lg">Live Monitoring</h1>
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{game.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${game.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                <span className="text-sm font-bold capitalize">{game.status}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Teams</p>
              <p className="text-sm font-bold">{teams.length}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-8">
        {game.status === 'finished' && game.winnerId && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-amber-500 text-white p-8 rounded-3xl shadow-xl shadow-amber-200 flex items-center justify-between"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Trophy size={40} />
              </div>
              <div>
                <h2 className="text-3xl font-display font-bold">Game Over!</h2>
                <p className="text-amber-100 font-medium">
                  Winner: <span className="text-white font-bold">{teams.find(t => t.id === game.winnerId)?.name || 'Unknown Team'}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">Final Time</p>
              <p className="text-2xl font-mono font-bold">
                {teams.find(t => t.id === game.winnerId)?.lastScanTime ? new Date(teams.find(t => t.id === game.winnerId)!.lastScanTime!).toLocaleTimeString() : '--:--'}
              </p>
            </div>
          </motion.div>
        )}

        {/* Search & Filter */}
        <div className="mb-8 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search teams by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white border border-slate-200 focus:border-indigo-500 outline-none transition-all shadow-sm"
          />
        </div>

        {/* Leaderboard / Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team, idx) => (
            <motion.div 
              key={`team-${team.id}-${idx}`}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`bg-white rounded-3xl p-6 border-2 transition-all ${
                game.winnerId === team.id ? 'border-amber-400 shadow-lg shadow-amber-100' : 'border-slate-100'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold ${
                    idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 line-clamp-1">{team.name || 'Unnamed Team'}</h3>
                    <p className="text-[10px] font-mono text-slate-400 uppercase">ID: {team.loginId}</p>
                  </div>
                </div>
                {game.winnerId === team.id && (
                  <Trophy size={20} className="text-amber-500" />
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                    <span>Progress</span>
                    <span>Clue {team.currentClueSequence}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${getProgress(team)}%` }}
                      className="h-full bg-indigo-500 rounded-full"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock size={14} />
                    <span className="text-[10px] font-medium uppercase tracking-widest">
                      {team.lastScanTime ? new Date(team.lastScanTime).toLocaleTimeString() : 'No scans'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${team.isLoggedIn ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {team.isLoggedIn ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminMonitoring;
