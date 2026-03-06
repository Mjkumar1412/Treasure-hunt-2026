import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users, Plus, Trash2, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Team } from '../types';
import { apiFetch } from '../utils/api';

interface TeamSetupProps {
  team: Team;
  onComplete: (updatedTeam: Team) => void;
}

const TeamSetup: React.FC<TeamSetupProps> = ({ team, onComplete }) => {
  const [teamName, setTeamName] = useState('');
  const [members, setMembers] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMember = () => setMembers([...members, '']);
  const removeMember = (index: number) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index));
    }
  };

  const updateMember = (index: number, value: string) => {
    const newMembers = [...members];
    newMembers[index] = value;
    setMembers(newMembers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    
    const filteredMembers = members.filter(m => m.trim());
    if (filteredMembers.length === 0) return;

    setLoading(true);
    try {
      const res = await apiFetch(`/api/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamName,
          members: filteredMembers
        }),
      });

      if (!res.ok) throw new Error('Failed to save team info');
      
      onComplete({
        ...team,
        name: teamName,
        members: JSON.stringify(filteredMembers)
      });
    } catch (err) {
      setError('Error saving team info. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 flex flex-col items-center pt-[calc(1rem+env(safe-area-inset-top))]">
      <div className="w-full max-w-md">
        {/* Error Notification */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500 text-white rounded-2xl shadow-lg flex items-center gap-3"
          >
            <ShieldAlert size={20} />
            <p className="text-sm font-bold">{error}</p>
          </motion.div>
        )}

        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500 text-white mb-4 shadow-lg shadow-indigo-200">
            <Users size={32} />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Team Setup</h1>
          <p className="text-slate-500 text-sm sm:text-base max-w-[280px] mx-auto mt-2">
            Your first act of collaboration: Define your team and its members.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Team Name</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. The Code Breakers"
              className="w-full h-14 px-4 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none transition-all text-base"
              required
            />
          </div>

          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Team Members</label>
            {members.map((member, index) => (
              <motion.div 
                key={index}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={member}
                  onChange={(e) => updateMember(index, e.target.value)}
                  placeholder={`Member ${index + 1}`}
                  className="flex-grow h-14 px-4 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none transition-all text-base"
                  required
                />
                {members.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMember(index)}
                    className="h-14 w-14 flex items-center justify-center text-red-400 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 size={24} />
                  </button>
                )}
              </motion.div>
            ))}
            
            <button
              type="button"
              onClick={addMember}
              className="w-full h-14 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-all flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest"
            >
              <Plus size={20} />
              Add Member
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-16 brutal-btn bg-indigo-500 text-white flex items-center justify-center gap-2 text-lg"
          >
            {loading ? 'Saving...' : 'Start Adventure'}
            <ArrowRight size={24} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default TeamSetup;
