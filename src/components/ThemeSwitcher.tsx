import React from 'react';
import { motion } from 'motion/react';
import { useTheme, ThemeType } from '../ThemeContext';
import { Check, X } from 'lucide-react';

interface ThemeSwitcherProps {
  onClose: () => void;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ onClose }) => {
  const { theme, setTheme, availableThemes } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-display text-2xl font-black text-slate-900 tracking-tight">Appearance</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Personalize your adventure</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-1 gap-3">
            {availableThemes.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  // Optional: close after selection on mobile
                }}
                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                  theme === t.id 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-slate-100 hover:border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{t.icon}</span>
                  <div className="text-left">
                    <p className={`font-bold text-sm ${theme === t.id ? 'text-indigo-600' : 'text-slate-700'}`}>
                      {t.name}
                    </p>
                    {theme === t.id && (
                      <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Current Theme</p>
                    )}
                  </div>
                </div>
                {theme === t.id && (
                  <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                    <Check size={14} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full h-14 brutal-btn bg-indigo-600 text-white"
          >
            Apply Theme
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
