import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, Trash2, Printer, Play, Users, Key, FileText, CheckCircle2, ShieldAlert, Edit2, Scan, X, Filter, Palette, QrCode } from 'lucide-react';
import { Game, Clue, Team, Admin, QRStyle, ScannerStyle, QRShape, QRColorType } from '../types';
import QRCodeStyled from '../components/QRCodeStyled';
import { QRScanner } from '../components/QRScanner';

interface AdminGameEditorProps {
  admin: Admin;
  gameId: string;
  onBack: () => void;
}

const AdminGameEditor: React.FC<AdminGameEditorProps> = ({ admin, gameId, onBack }) => {
  const [game, setGame] = useState<Game | null>(null);
  const [clues, setClues] = useState<Clue[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTab, setActiveTab] = useState<'clues' | 'teams' | 'customize' | 'print'>('clues');
  
  // Customization State
  const [qrStyle, setQrStyle] = useState<QRStyle>({
    shape: 'square',
    colorType: 'solid',
    primaryColor: '#6366f1',
    frameType: 'none'
  });
  const [scannerStyle, setScannerStyle] = useState<ScannerStyle>({
    frameShape: 'rectangle',
    animation: 'line',
    soundEnabled: true,
    vibrationEnabled: true
  });
  const [newClue, setNewClue] = useState({ content: '', teamId: '', code: '' });
  const [editingClue, setEditingClue] = useState<Clue | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [newTeamCount, setNewTeamCount] = useState(1);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [printFilterTeamId, setPrintFilterTeamId] = useState<string>('all');

  useEffect(() => {
    fetchData();
    generateNewCode();
  }, [gameId]);

  const generateNewCode = () => {
    setNewClue(prev => ({ 
      ...prev, 
      code: Math.random().toString(36).substring(2, 10).toUpperCase() 
    }));
  };

  const fetchData = async () => {
    const [gRes, cRes, tRes] = await Promise.all([
      fetch(`/api/games/${gameId}`),
      fetch(`/api/games/${gameId}/clues`),
      fetch(`/api/games/${gameId}/teams`)
    ]);
    const gameData = await gRes.json();
    setGame(gameData);
    setClues(await cRes.json());
    setTeams(await tRes.json());

    if (gameData.qrStyle) setQrStyle(JSON.parse(gameData.qrStyle));
    if (gameData.scannerStyle) setScannerStyle(JSON.parse(gameData.scannerStyle));
  };

  const handleDeleteClue = async (id: string) => {
    if (!confirm('Delete this clue?')) return;
    await fetch(`/api/clues/${id}?requester=${admin.username}`, { method: 'DELETE' });
    fetchData();
  };

  const handleAddClue = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = Math.random().toString(36).substring(2, 9);
    const sequence = clues.filter(c => c.teamId === (newClue.teamId || null)).length + 1;

    await fetch('/api/clues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newClue, id, gameId, sequence, requester: admin.username }),
    });
    setNewClue({ content: '', teamId: '', code: '' });
    generateNewCode();
    fetchData();
  };

  const handleGenerateTeams = async () => {
    for (let i = 0; i < newTeamCount; i++) {
      const id = Math.random().toString(36).substring(2, 9);
      const loginId = Math.floor(1000 + Math.random() * 9000).toString();
      await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, gameId, loginId, requester: admin.username }),
      });
    }
    fetchData();
  };

  const handleStartGame = async () => {
    if (!confirm('Are you sure you want to start the game now?')) return;
    const res = await fetch(`/api/games/${gameId}/start`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requester: admin.username })
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to start game');
    }
    fetchData();
  };

  const handleUpdateClue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClue) return;

    await fetch(`/api/clues/${editingClue.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        content: editingClue.content, 
        code: editingClue.code, 
        teamId: editingClue.teamId || null,
        requester: admin.username 
      }),
    });
    setEditingClue(null);
    fetchData();
  };

  const handleTestScan = (code: string) => {
    const clue = clues.find(c => c.code === code);
    if (clue) {
      setScanResult({ 
        success: true, 
        message: `Success! Clue #${clue.sequence}: ${clue.content.substring(0, 30)}...` 
      });
    } else {
      setScanResult({ 
        success: false, 
        message: "Invalid QR Code! This code does not belong to any clue in this game." 
      });
    }
    setShowScanner(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleUpdateStartTime = async (startTime: string) => {
    await fetch(`/api/games/${gameId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startTime, requester: admin.username }),
    });
    fetchData();
  };

  const handleSaveCustomization = async () => {
    await fetch(`/api/games/${gameId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        qrStyle, 
        scannerStyle,
        requester: admin.username 
      }),
    });
    fetchData();
    alert('Customization saved successfully!');
  };

  if (!game) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Admin Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3 sm:py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display font-bold text-base sm:text-lg">{game.name}</h1>
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                {game.mode} mode • {game.status}
              </p>
            </div>
          </div>
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
              {game.status === 'scheduled' && admin.isMain && (
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStartGame}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold text-[10px] sm:text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 animate-pulse-glow"
                >
                  <Play size={14} fill="currentColor" />
                  <span className="hidden xs:inline">Start Game</span>
                  <span className="xs:hidden">Start</span>
                </motion.button>
              )}
              <button 
                onClick={() => setShowScanner(true)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg font-bold text-[10px] sm:text-xs uppercase tracking-widest hover:bg-indigo-200 transition-all"
              >
                <Scan size={14} />
                <span className="hidden xs:inline">Test Scanner</span>
                <span className="xs:hidden">Test</span>
              </button>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-800 text-white rounded-lg font-bold text-[10px] sm:text-xs uppercase tracking-widest hover:bg-slate-900 transition-all"
              >
                <Printer size={14} />
                <span className="hidden xs:inline">Print All</span>
                <span className="xs:hidden">Print</span>
              </button>
            </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        {/* Game Info / Settings */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm mb-8 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Game Mode</span>
              <span className="font-bold text-slate-700 capitalize flex items-center gap-2">
                <Users size={14} className="text-indigo-500" />
                {game.mode}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Status</span>
              <span className={`font-bold capitalize flex items-center gap-2 ${game.status === 'active' ? 'text-emerald-500' : game.status === 'finished' ? 'text-slate-400' : 'text-indigo-500'}`}>
                <div className={`w-2 h-2 rounded-full ${game.status === 'active' ? 'bg-emerald-500 animate-pulse' : game.status === 'finished' ? 'bg-slate-400' : 'bg-indigo-500'}`} />
                {game.status}
              </span>
            </div>
            {game.startTime && (
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Scheduled Start</span>
                <span className="font-bold text-slate-700 flex items-center gap-2">
                  <FileText size={14} className="text-indigo-500" />
                  {new Date(game.startTime).toLocaleString()}
                </span>
              </div>
            )}
          </div>
          
          {admin.isMain && game.status === 'scheduled' && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Set/Update Start Time</span>
              <input 
                type="datetime-local"
                value={game.startTime || ''}
                onChange={(e) => handleUpdateStartTime(e.target.value)}
                className="px-4 py-2 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
              />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-200 p-1 rounded-xl w-fit mb-8 print:hidden">
          <button 
            onClick={() => setActiveTab('clues')}
            className={`px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'clues' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Clues
          </button>
          <button 
            onClick={() => setActiveTab('teams')}
            className={`px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'teams' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Teams
          </button>
          <button 
            onClick={() => setActiveTab('customize')}
            className={`px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'customize' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Customize
          </button>
          <button 
            onClick={() => setActiveTab('print')}
            className={`px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'print' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Print View
          </button>
        </div>

        {activeTab === 'clues' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
            {/* Clue Form */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm sticky top-24">
                <h3 className="font-display font-bold text-lg mb-6 flex items-center gap-2">
                  <Plus size={20} className="text-indigo-500" />
                  Add New Clue
                </h3>
                <form onSubmit={handleAddClue} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Clue Content / Instruction</label>
                    <textarea
                      value={newClue.content}
                      onChange={(e) => setNewClue({ ...newClue, content: e.target.value })}
                      className="w-full h-24 p-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all resize-none text-sm"
                      placeholder="e.g. Look under the old oak tree in the park..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">QR Code Value</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={newClue.code}
                          onChange={(e) => setNewClue({ ...newClue, code: e.target.value.toUpperCase() })}
                          className="w-full h-12 pl-4 pr-10 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all text-sm font-mono"
                          required
                        />
                        <button 
                          type="button"
                          onClick={generateNewCode}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Regenerate Code"
                        >
                          <Key size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-center p-2 bg-slate-50 rounded-xl border border-slate-100">
                      {newClue.code && <QRCodeStyled value={newClue.code} style={qrStyle} size={60} />}
                    </div>
                  </div>

                  {game.mode === 'team' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Assign to Team (Optional)</label>
                      <select
                        value={newClue.teamId}
                        onChange={(e) => setNewClue({ ...newClue, teamId: e.target.value })}
                        className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all text-sm"
                      >
                        <option value="">Shared Clue (All Teams)</option>
                        {teams.map(t => (
                          <option key={t.id} value={t.id}>{t.name || t.loginId}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button type="submit" className="w-full h-14 brutal-btn bg-indigo-600 text-white">
                    Save Clue
                  </button>
                </form>
              </div>
            </div>

            {/* Clue List */}
            <div className="lg:col-span-2 space-y-4">
              {clues.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 text-slate-400">
                  No clues added yet.
                </div>
              ) : (
                clues.map((clue, idx) => (
                  <motion.div 
                    key={clue.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white rounded-2xl p-6 border border-slate-200 flex items-start gap-6 group hover:border-indigo-500 transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-mono font-bold shrink-0">
                      {clue.sequence}
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">
                          {clue.teamId ? `Team Clue: ${teams.find(t => t.id === clue.teamId)?.name || 'Unknown'}` : 'Shared Clue'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-300">ID: {clue.id}</span>
                      </div>
                      <p className="text-slate-700 font-medium">{clue.content}</p>
                      <div className="mt-4 flex items-center gap-4">
                        <div className="px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-mono font-bold text-slate-500 uppercase">
                          Code: {clue.code}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-center gap-2">
                      <QRCodeStyled 
                        value={clue.code} 
                        style={clue.qrStyle ? JSON.parse(clue.qrStyle) : qrStyle} 
                        size={80} 
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setEditingClue(clue)}
                          className="p-2 text-slate-300 hover:text-indigo-500 transition-colors"
                          title="Edit Clue"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClue(clue.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          title="Delete Clue"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="space-y-8 print:hidden">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
              <h3 className="font-display font-bold text-lg mb-6 flex items-center gap-2">
                <Users size={20} className="text-indigo-500" />
                Generate Teams
              </h3>
              <div className="flex items-end gap-4">
                <div className="space-y-2 flex-grow">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Number of Teams to Create</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newTeamCount}
                    onChange={(e) => setNewTeamCount(parseInt(e.target.value))}
                    className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <button 
                  onClick={handleGenerateTeams}
                  className="h-12 px-8 brutal-btn bg-indigo-600 text-white whitespace-nowrap"
                >
                  Generate IDs
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <div key={team.id} className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center justify-between group hover:border-indigo-500 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
                      <QRCodeStyled 
                        value={team.loginId} 
                        style={team.qrStyle ? JSON.parse(team.qrStyle) : qrStyle} 
                        size={40} 
                      />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-slate-900">{team.name || 'Unnamed Team'}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Key size={12} className="text-slate-400" />
                        <span className="text-sm font-mono font-bold text-indigo-600">{team.loginId}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setEditingTeam(team)}
                      className="p-2 text-slate-300 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Palette size={18} />
                    </button>
                    <div className={`w-3 h-3 rounded-full ${team.isLoggedIn ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'customize' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* QR Customization */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                <h3 className="font-display text-xl font-bold mb-6 flex items-center gap-2">
                  <QrCode className="text-indigo-600" />
                  QR Code Customization
                </h3>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">QR Shape</label>
                      <select 
                        value={qrStyle.shape}
                        onChange={(e) => setQrStyle({ ...qrStyle, shape: e.target.value as QRShape })}
                        className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all text-sm"
                      >
                        <option value="square">Classic Square</option>
                        <option value="circle">Circle Dots</option>
                        <option value="rounded">Rounded Square</option>
                        <option value="diamond">Diamond</option>
                        <option value="leaf">Leaf Dots</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Color Type</label>
                      <select 
                        value={qrStyle.colorType}
                        onChange={(e) => setQrStyle({ ...qrStyle, colorType: e.target.value as QRColorType })}
                        className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all text-sm"
                      >
                        <option value="solid">Solid Color</option>
                        <option value="gradient">Gradient</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Primary Color</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={qrStyle.primaryColor}
                          onChange={(e) => setQrStyle({ ...qrStyle, primaryColor: e.target.value })}
                          className="w-12 h-12 rounded-xl border-2 border-slate-100 p-1 cursor-pointer"
                        />
                        <input 
                          type="text" 
                          value={qrStyle.primaryColor}
                          onChange={(e) => setQrStyle({ ...qrStyle, primaryColor: e.target.value })}
                          className="flex-grow h-12 px-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all text-sm font-mono"
                        />
                      </div>
                    </div>
                    {qrStyle.colorType === 'gradient' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Secondary Color</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            value={qrStyle.secondaryColor || '#000000'}
                            onChange={(e) => setQrStyle({ ...qrStyle, secondaryColor: e.target.value })}
                            className="w-12 h-12 rounded-xl border-2 border-slate-100 p-1 cursor-pointer"
                          />
                          <input 
                            type="text" 
                            value={qrStyle.secondaryColor || '#000000'}
                            onChange={(e) => setQrStyle({ ...qrStyle, secondaryColor: e.target.value })}
                            className="flex-grow h-12 px-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all text-sm font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Frame Style</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['none', 'simple', 'thick', 'glow'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setQrStyle({ ...qrStyle, frameType: f })}
                          className={`h-10 rounded-lg border-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                            qrStyle.frameType === f ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      onClick={handleSaveCustomization}
                      className="w-full h-14 brutal-btn bg-indigo-600 text-white"
                    >
                      Save QR Style
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                <h3 className="font-display text-xl font-bold mb-6 flex items-center gap-2">
                  <Scan className="text-indigo-600" />
                  Scanner Customization
                </h3>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Scanner Frame Shape</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['rectangle', 'rounded', 'circle', 'heart', 'star', 'chest', 'magnifier', 'compass', 'diamond', 'hexagon', 'keyhole', 'map', 'neon', 'pyramid', 'bubbles'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setScannerStyle({ ...scannerStyle, frameShape: s })}
                          className={`h-10 rounded-lg border-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                            scannerStyle.frameShape === s ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Scan Animation</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['line', 'glow', 'ripple', 'pulse', 'rotating', 'particles', 'flicker'] as const).map((a) => (
                        <button
                          key={a}
                          onClick={() => setScannerStyle({ ...scannerStyle, animation: a })}
                          className={`h-10 rounded-lg border-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                            scannerStyle.animation === a ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-slate-400">
                        <Palette size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Haptic Feedback</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Vibrate on scan</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setScannerStyle({ ...scannerStyle, vibrationEnabled: !scannerStyle.vibrationEnabled })}
                      className={`w-12 h-6 rounded-full transition-all relative ${scannerStyle.vibrationEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${scannerStyle.vibrationEnabled ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="pt-4">
                    <button 
                      onClick={handleSaveCustomization}
                      className="w-full h-14 brutal-btn bg-slate-800 text-white"
                    >
                      Save Scanner Style
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm sticky top-24">
                <h3 className="font-display text-xl font-bold mb-6">Live Preview</h3>
                
                <div className="flex flex-col items-center gap-8">
                  <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 w-full flex flex-col items-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6">QR Code Preview</p>
                    <QRCodeStyled value="PREVIEW-CODE" style={qrStyle} size={200} />
                    <p className="mt-6 font-mono text-xs font-bold text-slate-400">VALUE: PREVIEW-CODE</p>
                  </div>

                  <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 w-full flex flex-col items-center overflow-hidden relative min-h-[300px]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-6 z-10">Scanner Preview</p>
                    
                    {/* Mock Scanner Frame */}
                    <div className={`relative w-48 h-48 border-2 border-indigo-500/50 flex items-center justify-center overflow-hidden ${
                      scannerStyle.frameShape === 'circle' ? 'rounded-full' : 
                      scannerStyle.frameShape === 'rounded' ? 'rounded-[32px]' :
                      scannerStyle.frameShape === 'heart' ? 'rounded-[50%_50%_0_0]' : 
                      scannerStyle.frameShape === 'star' ? 'clip-path-star' : 
                      scannerStyle.frameShape === 'hexagon' ? 'clip-path-hexagon' :
                      scannerStyle.frameShape === 'diamond' ? 'clip-path-diamond' :
                      scannerStyle.frameShape === 'pyramid' ? 'clip-path-pyramid' : 'rounded-2xl'
                    } ${scannerStyle.animation === 'flicker' ? 'animate-flicker' : ''}`}>
                      {scannerStyle.animation === 'line' && (
                        <motion.div 
                          animate={{ top: ['0%', '100%', '0%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          className="absolute left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_10px_indigo]"
                        />
                      )}
                      {scannerStyle.animation === 'pulse' && (
                        <motion.div 
                          animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 border-4 border-indigo-500 rounded-inherit"
                        />
                      )}
                      {scannerStyle.animation === 'rotating' && (
                        <div className="absolute inset-0 border-2 border-dashed border-indigo-500/30 rounded-inherit animate-rotating" />
                      )}
                      {scannerStyle.animation === 'ripple' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          {[1, 2].map((i) => (
                            <motion.div
                              key={i}
                              initial={{ scale: 0, opacity: 0.5 }}
                              animate={{ scale: 2, opacity: 0 }}
                              transition={{ duration: 2, repeat: Infinity, delay: i * 1 }}
                              className="absolute w-10 h-10 border border-indigo-500 rounded-full"
                            />
                          ))}
                        </div>
                      )}
                      <Scan size={48} className="text-indigo-500/30" />
                    </div>
                    
                    <p className="mt-6 text-xs text-indigo-300/50 text-center max-w-[200px]">
                      Scanner will use {scannerStyle.frameShape} frame with {scannerStyle.animation} effect.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'print' && (
          <div className="space-y-12">
            <div className="print:hidden bg-indigo-50 p-6 rounded-3xl border border-indigo-100 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <FileText className="text-indigo-500" size={32} />
                <div>
                  <h4 className="font-bold text-indigo-900">Print Ready View</h4>
                  <p className="text-sm text-indigo-700">All QR codes are formatted for printing. Use Ctrl+P to print.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-indigo-200">
                  <Filter size={16} className="text-indigo-400" />
                  <select 
                    value={printFilterTeamId}
                    onChange={(e) => setPrintFilterTeamId(e.target.value)}
                    className="text-sm font-bold text-indigo-900 outline-none bg-transparent"
                  >
                    <option value="all">All Teams</option>
                    <option value="shared">Shared Only</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>Team: {t.name || t.loginId}</option>
                    ))}
                  </select>
                </div>
                <button onClick={handlePrint} className="brutal-btn bg-indigo-600 text-white whitespace-nowrap">Print Now</button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 print:grid-cols-3 print:gap-4">
              {clues
                .filter(c => {
                  if (printFilterTeamId === 'all') return true;
                  if (printFilterTeamId === 'shared') return !c.teamId;
                  return c.teamId === printFilterTeamId;
                })
                .map((clue) => (
                <div key={clue.id} className="flex flex-col items-center gap-4 p-6 border-2 border-slate-200 rounded-2xl break-inside-avoid">
                  <QRCodeStyled 
                    value={clue.code} 
                    style={clue.qrStyle ? JSON.parse(clue.qrStyle) : qrStyle} 
                    size={200} 
                  />
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                      {clue.teamId ? `TEAM: ${teams.find(t => t.id === clue.teamId)?.name || 'SPECIFIC'}` : 'SHARED CLUE'}
                    </p>
                    <p className="text-xs font-medium text-slate-600 line-clamp-2">{clue.content}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-20 pt-20 border-t-2 border-dashed border-slate-200 page-break-before">
              <h3 className="font-display font-bold text-xl mb-8 text-center uppercase tracking-widest">Team Login IDs</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {teams
                  .filter(t => printFilterTeamId === 'all' || t.id === printFilterTeamId)
                  .map(t => (
                  <div key={t.id} className="p-4 border-2 border-slate-200 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t.name || 'TEAM'}</p>
                    <p className="text-2xl font-mono font-bold text-indigo-600">{t.loginId}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Team Modal */}
      <AnimatePresence>
        {editingTeam && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display font-bold text-xl flex items-center gap-2">
                  <Palette size={24} className="text-indigo-500" />
                  Team Customization: {editingTeam.name || editingTeam.loginId}
                </h3>
                <button onClick={() => setEditingTeam(null)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Team QR Shape</label>
                    <select 
                      value={editingTeam.qrStyle ? JSON.parse(editingTeam.qrStyle).shape : qrStyle.shape}
                      onChange={(e) => {
                        const currentStyle = editingTeam.qrStyle ? JSON.parse(editingTeam.qrStyle) : { ...qrStyle };
                        setEditingTeam({ ...editingTeam, qrStyle: JSON.stringify({ ...currentStyle, shape: e.target.value }) });
                      }}
                      className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all text-sm"
                    >
                      <option value="square">Classic Square</option>
                      <option value="circle">Circle Dots</option>
                      <option value="rounded">Rounded Square</option>
                      <option value="diamond">Diamond</option>
                      <option value="leaf">Leaf Dots</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Team Color</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={editingTeam.qrStyle ? JSON.parse(editingTeam.qrStyle).primaryColor : qrStyle.primaryColor}
                        onChange={(e) => {
                          const currentStyle = editingTeam.qrStyle ? JSON.parse(editingTeam.qrStyle) : { ...qrStyle };
                          setEditingTeam({ ...editingTeam, qrStyle: JSON.stringify({ ...currentStyle, primaryColor: e.target.value }) });
                        }}
                        className="w-12 h-12 rounded-xl border-2 border-slate-100 p-1 cursor-pointer"
                      />
                      <input 
                        type="text" 
                        value={editingTeam.qrStyle ? JSON.parse(editingTeam.qrStyle).primaryColor : qrStyle.primaryColor}
                        onChange={(e) => {
                          const currentStyle = editingTeam.qrStyle ? JSON.parse(editingTeam.qrStyle) : { ...qrStyle };
                          setEditingTeam({ ...editingTeam, qrStyle: JSON.stringify({ ...currentStyle, primaryColor: e.target.value }) });
                        }}
                        className="flex-grow h-12 px-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => setEditingTeam(null)}
                      className="flex-grow h-14 rounded-xl border-2 border-slate-100 font-bold text-slate-500 hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={async () => {
                        await fetch(`/api/teams/${editingTeam.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            qrStyle: editingTeam.qrStyle ? JSON.parse(editingTeam.qrStyle) : null,
                            requester: admin.username 
                          }),
                        });
                        setEditingTeam(null);
                        fetchData();
                      }}
                      className="flex-grow h-14 brutal-btn bg-indigo-600 text-white"
                    >
                      Save Team Style
                    </button>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6">Team QR Preview</p>
                  <QRCodeStyled 
                    value={editingTeam.loginId} 
                    style={editingTeam.qrStyle ? JSON.parse(editingTeam.qrStyle) : qrStyle} 
                    size={200} 
                  />
                  <p className="mt-4 font-mono text-xs font-bold text-slate-400">LOGIN ID: {editingTeam.loginId}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Clue Modal */}
      <AnimatePresence>
        {editingClue && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display font-bold text-xl flex items-center gap-2">
                  <Edit2 size={24} className="text-indigo-500" />
                  Edit Clue #{editingClue.sequence}
                </h3>
                <button onClick={() => setEditingClue(null)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateClue} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Clue Content</label>
                  <textarea
                    value={editingClue.content}
                    onChange={(e) => setEditingClue({ ...editingClue, content: e.target.value })}
                    className="w-full h-32 p-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all resize-none text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">QR Code Value</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editingClue.code}
                        onChange={(e) => setEditingClue({ ...editingClue, code: e.target.value.toUpperCase() })}
                        className="w-full h-12 pl-4 pr-10 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all text-sm font-mono"
                        required
                      />
                      <button 
                        type="button"
                        onClick={() => setEditingClue({ ...editingClue, code: Math.random().toString(36).substring(2, 10).toUpperCase() })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        <Key size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-center p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <QRCodeStyled value={editingClue.code} style={qrStyle} size={80} />
                  </div>
                </div>

                {game.mode === 'team' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Assign to Team</label>
                    <select
                      value={editingClue.teamId || ''}
                      onChange={(e) => setEditingClue({ ...editingClue, teamId: e.target.value || null })}
                      className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all text-sm"
                    >
                      <option value="">Shared Clue (All Teams)</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name || t.loginId}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setEditingClue(null)}
                    className="flex-grow h-14 rounded-xl border-2 border-slate-100 font-bold text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="flex-grow h-14 brutal-btn bg-indigo-600 text-white">
                    Update Clue
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <QRScanner 
            onScan={handleTestScan} 
            onClose={() => setShowScanner(false)} 
          />
        )}
      </AnimatePresence>

      {/* Scan Result Notification */}
      <AnimatePresence>
        {scanResult && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-4"
          >
            <div className={`p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 ${scanResult.success ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
              <div className="flex items-center gap-3">
                {scanResult.success ? <CheckCircle2 size={24} /> : <ShieldAlert size={24} />}
                <p className="text-sm font-bold">{scanResult.message}</p>
              </div>
              <button onClick={() => setScanResult(null)} className="p-1 hover:bg-white/20 rounded-lg">
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminGameEditor;
