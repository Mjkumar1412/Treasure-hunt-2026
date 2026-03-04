import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, History, LogOut, MapPin, Trophy, Clock, ChevronRight, X, Settings, Palette } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Team, Game, Clue, ScanHistory } from '../types';
import { QRScanner } from '../components/QRScanner';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import socket from '../lib/socket';

interface ParticipantDashboardProps {
  team: Team;
  onLogout: () => void;
  onUpdateTeam: (team: Team) => void;
}

const TypingText: React.FC<{ text: string }> = ({ text }) => {
  return (
    <motion.div className="flex flex-wrap justify-center">
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.2 }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </motion.div>
  );
};

const ParticipantDashboard: React.FC<ParticipantDashboardProps> = ({ team, onLogout, onUpdateTeam }) => {
  const [game, setGame] = useState<Game | null>(null);
  const [history, setHistory] = useState<ScanHistory[]>([]);
  const [currentClue, setCurrentClue] = useState<Clue | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showThemeSwitcher, setShowThemeSwitcher] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>('');

  useEffect(() => {
    fetchGame();
    fetchHistory();
    fetchCurrentClue();

    socket.on('game_started', ({ gameId }) => {
      if (gameId === team.gameId) fetchGame();
    });

    socket.on('game_over', ({ winnerName }) => {
      fetchGame();
      alert(`Game Over! Winner: ${winnerName}`);
    });

    return () => {
      socket.off('game_started');
      socket.off('game_over');
    };
  }, [team.gameId]);

  useEffect(() => {
    if (game?.status === 'scheduled' && game.startTime) {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const start = new Date(game.startTime!).getTime();
        const diff = start - now;

        if (diff <= 0) {
          clearInterval(timer);
          setCountdown('Game is starting...');
          // Auto-start the game if it's past the start time and still scheduled
          fetch(`/api/games/${game.id}/start`, { method: 'POST' })
            .then(() => fetchGame())
            .catch(err => {
              console.error("Failed to auto-start game", err);
              fetchGame(); // Fallback to just fetching
            });
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setCountdown(`${hours}h ${minutes}m ${seconds}s`);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [game]);

  useEffect(() => {
    if (game?.status !== 'active') {
      setShowScanner(false);
    }
  }, [game?.status]);

  const fetchGame = async () => {
    const res = await fetch('/api/games');
    const games = await res.json();
    const g = games.find((x: Game) => x.id === team.gameId);
    setGame(g);
  };

  const fetchHistory = async () => {
    const res = await fetch(`/api/teams/${team.id}/history`);
    const data = await res.json();
    setHistory(data);
  };

  const fetchCurrentClue = async () => {
    const res = await fetch(`/api/teams/${team.id}/current-clue`);
    const data = await res.json();
    setCurrentClue(data);
  };

  const handleScan = async (code: string) => {
    if (game?.status !== 'active') {
      setError("Game is not active");
      setShowScanner(false);
      return;
    }
    setShowScanner(false);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: team.id, code }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Explicitly handle sequence errors with the requested message if needed, 
        // though the server already provides it.
        throw new Error(data.error);
      }

      if (data.status === 'winner') {
        setSuccess('CONGRATULATIONS! YOU FOUND THE TREASURE!');
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#fbbf24', '#3b82f6']
        });
      } else {
        setSuccess(`Correct! Clue #${data.clue.sequence} solved.`);
      }
      
      fetchHistory();
      // Update team sequence locally and globally
      const updatedTeam = { ...team, currentClueSequence: team.currentClueSequence + 1 };
      onUpdateTeam(updatedTeam);
      fetchCurrentClue();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="glass sticky top-0 z-30 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-slate-200 h-[60px]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <MapPin size={16} />
          </div>
          <div>
            <h2 className="font-display font-bold text-slate-900 text-sm sm:text-base">
              <TypingText text={team.name} />
            </h2>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">ID: {team.loginId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowThemeSwitcher(true)}
            className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
          >
            <Palette size={20} />
          </button>
          <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="flex-grow p-4 sm:p-6 space-y-6 pb-32">
        {/* Game Status Card */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100"
        >
          {game?.status === 'scheduled' ? (
            <div className="text-center space-y-4">
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 text-amber-500"
              >
                <Clock size={24} />
              </motion.div>
              <div>
                <motion.h3 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-display text-lg font-bold"
                >
                  Waiting for Start
                </motion.h3>
                <p className="text-slate-500 text-sm">The hunt begins in:</p>
              </div>
              <motion.div 
                key={countdown}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-4xl sm:text-5xl font-mono font-bold text-slate-900 tracking-tighter"
              >
                {countdown}
              </motion.div>
            </div>
          ) : game?.status === 'active' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-500">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-widest">Game Active</span>
                </div>
                <div className="text-xs font-mono font-bold text-slate-400">
                  Clue {team.currentClueSequence}
                </div>
              </div>
              
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="p-4 bg-slate-50 rounded-xl border border-slate-100"
              >
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Current Objective</p>
                <div className="text-slate-700 font-medium italic">
                  {currentClue ? (
                    <div className="space-y-2">
                      <p className="text-indigo-600 font-bold not-italic text-sm">Clue #{currentClue.sequence}:</p>
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="leading-relaxed text-base"
                      >
                        {currentClue.content}
                      </motion.p>
                    </div>
                  ) : (
                    <p className="text-sm">{history.length === 0 ? "Find the first clue to begin your journey!" : "Find the next QR code to progress."}</p>
                  )}
                </div>
              </motion.div>
            </div>
          ) : (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-4 py-4"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: 3 }}
              >
                <Trophy size={48} className="mx-auto text-amber-400" />
              </motion.div>
              <h3 className="font-display text-2xl font-extrabold">
                {game?.winnerId === team.id ? "🏆 CHAMPIONS! 🏆" : "Game Over"}
              </h3>
              <p className="text-slate-500">
                {game?.winnerId === team.id ? "You found the treasure first!" : "Better luck next time!"}
              </p>
            </motion.div>
          )}
        </motion.section>

        {/* FAB Scan Button */}
        {game?.status === 'active' && (
          <div className="fixed bottom-8 left-0 right-0 flex justify-center z-40 px-6">
            <motion.button 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowScanner(true)}
              className="w-full max-w-xs h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/40 animate-pulse-glow border-2 border-white/20"
            >
              <Camera size={28} />
              <span className="font-display font-bold uppercase tracking-widest text-lg">Scan QR Code</span>
            </motion.button>
          </div>
        )}

        {/* Feedback Messages */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <X size={16} />
              </div>
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-sm font-medium flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Trophy size={16} />
              </div>
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* History List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-slate-900 flex items-center gap-2">
              <History size={18} className="text-indigo-500" />
              Clue History
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded">
              {history.length} Solved
            </span>
          </div>

          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm italic">
                No clues solved yet.
              </div>
            ) : (
              history.slice().reverse().map((item, idx) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white p-4 rounded-xl border border-slate-100 flex items-start gap-4"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 font-mono font-bold text-xs">
                    {item.sequence}
                  </div>
                  <div className="flex-grow">
                    <p className="text-slate-800 text-sm font-medium">{item.content}</p>
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(item.scanTime).toLocaleTimeString()}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>
      </div>

      {showScanner && (
        <QRScanner 
          onScan={handleScan} 
          onClose={() => setShowScanner(false)} 
          style={game?.scannerStyle ? JSON.parse(game.scannerStyle) : undefined}
          teamName={team?.name || team?.loginId}
          nextClueNumber={team?.currentClueSequence}
        />
      )}

      <AnimatePresence>
        {showThemeSwitcher && (
          <ThemeSwitcher onClose={() => setShowThemeSwitcher(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ParticipantDashboard;
