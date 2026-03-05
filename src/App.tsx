import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Game, Team, Admin } from './types';
import { Map, Lock } from 'lucide-react';
import socket from './lib/socket';
import ParticipantLogin from './views/ParticipantLogin';
import TeamSetup from './views/TeamSetup';
import ParticipantDashboard from './views/ParticipantDashboard';
import AdminLogin from './views/AdminLogin';
import AdminDashboard from './views/AdminDashboard';
import AdminGameEditor from './views/AdminGameEditor';
import AdminMonitoring from './views/AdminMonitoring';

import TermsAndConditions from './components/TermsAndConditions';

type View = 'participant-login' | 'terms-and-conditions' | 'team-setup' | 'participant-dashboard' | 'admin-login' | 'admin-dashboard' | 'admin-editor' | 'admin-monitoring';

import { ThemeProvider } from './ThemeContext';

export default function App() {
  const [view, setView] = useState<View>('participant-login');
  const [team, setTeam] = useState<Team | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutMessage, setLogoutMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check local storage for sessions
    const savedTeam = localStorage.getItem('team');
    const savedAdmin = localStorage.getItem('admin');

    setTimeout(() => {
      if (savedAdmin) {
        setAdmin(JSON.parse(savedAdmin));
        setView('admin-dashboard');
      } else if (savedTeam) {
        const t = JSON.parse(savedTeam);
        setTeam(t);
        socket.emit('register_team', t.id);
        
        if (!t.termsAccepted) {
          setView('terms-and-conditions');
        } else {
          setView(t.name ? 'participant-dashboard' : 'team-setup');
        }
      }
      setLoading(false);
    }, 1500);

    socket.on('force_logout', ({ message }) => {
      setLogoutMessage(message);
      setTimeout(() => {
        handleLogout();
        setLogoutMessage(null);
      }, 3000);
    });

    return () => {
      socket.off('force_logout');
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('team');
    localStorage.removeItem('admin');
    setTeam(null);
    setAdmin(null);
    setView('participant-login');
  };

  const renderView = () => {
    switch (view) {
      case 'participant-login':
        return <ParticipantLogin onLogin={(t) => {
          setTeam(t);
          localStorage.setItem('team', JSON.stringify(t));
          socket.emit('register_team', t.id);
          
          if (!t.termsAccepted) {
            setView('terms-and-conditions');
          } else {
            setView(t.name ? 'participant-dashboard' : 'team-setup');
          }
        }} onAdminClick={() => setView('admin-login')} />;
      
      case 'terms-and-conditions':
        return team && <TermsAndConditions 
          onAccept={async (version) => {
            try {
              const res = await fetch(`/api/teams/${team.id}/accept-terms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  version,
                  ipAddress: '127.0.0.1', // In a real app, get this from server or a service
                  userAgent: navigator.userAgent
                })
              });
              if (res.ok) {
                const updatedTeam = { ...team, termsAccepted: true };
                setTeam(updatedTeam);
                localStorage.setItem('team', JSON.stringify(updatedTeam));
                setView(updatedTeam.name ? 'participant-dashboard' : 'team-setup');
              }
            } catch (err) {
              console.error('Failed to accept terms:', err);
            }
          }}
          onDecline={() => handleLogout()}
        />;
      
      case 'team-setup':
        return team && <TeamSetup team={team} onComplete={(updatedTeam) => {
          setTeam(updatedTeam);
          localStorage.setItem('team', JSON.stringify(updatedTeam));
          setView('participant-dashboard');
        }} />;

      case 'participant-dashboard':
        return team && <ParticipantDashboard 
          team={team} 
          onLogout={handleLogout} 
          onUpdateTeam={(updatedTeam) => {
            setTeam(updatedTeam);
            localStorage.setItem('team', JSON.stringify(updatedTeam));
          }}
        />;

      case 'admin-login':
        return <AdminLogin onLogin={(a) => {
          setAdmin(a);
          localStorage.setItem('admin', JSON.stringify(a));
          setView('admin-dashboard');
        }} onBack={() => setView('participant-login')} />;

      case 'admin-dashboard':
        return admin && <AdminDashboard 
          admin={admin} 
          onSelectGame={(id) => {
            setSelectedGameId(id);
            setView('admin-editor');
          }}
          onMonitorGame={(id) => {
            setSelectedGameId(id);
            setView('admin-monitoring');
          }}
          onLogout={handleLogout} 
        />;

      case 'admin-editor':
        return admin && selectedGameId && <AdminGameEditor 
          admin={admin}
          gameId={selectedGameId} 
          onBack={() => setView('admin-dashboard')} 
        />;

      case 'admin-monitoring':
        return admin && selectedGameId && <AdminMonitoring 
          gameId={selectedGameId} 
          onBack={() => setView('admin-dashboard')} 
        />;

      default:
        return <div>View not found</div>;
    }
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col">
        <AnimatePresence>
          {logoutMessage && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md px-4"
            >
              <div className="bg-red-500 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Lock size={20} />
                </div>
                <p className="text-sm font-bold">{logoutMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loader"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-24 h-24 rounded-3xl bg-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/20 mb-6"
              >
                <Map size={48} />
              </motion.div>
              <motion.p
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-indigo-400 font-display font-bold uppercase tracking-[0.3em] text-xs"
              >
                Loading Treasure Map...
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="app"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col min-h-screen"
            >
              <main className="flex-grow">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={view}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full"
                  >
                    {renderView()}
                  </motion.div>
                </AnimatePresence>
              </main>

              <footer className="py-6 text-center text-slate-400 text-xs border-t border-slate-100 bg-white">
                <p className="font-medium tracking-widest uppercase">Designed by M.J KUMAR</p>
              </footer>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ThemeProvider>
  );
}
