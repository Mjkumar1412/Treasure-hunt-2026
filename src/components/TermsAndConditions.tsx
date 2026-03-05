import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScrollText, Check, X, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { TermsVersion } from '../types';
import confetti from 'canvas-confetti';

interface TermsAndConditionsProps {
  onAccept: (version: string) => void;
  onDecline: () => void;
}

const TermsAndConditions: React.FC<TermsAndConditionsProps> = ({ onAccept, onDecline }) => {
  const [terms, setTerms] = useState<TermsVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);

  useEffect(() => {
    fetch('/api/terms/active')
      .then(res => res.json())
      .then(data => {
        setTerms(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch terms:', err);
        setLoading(false);
      });
  }, []);

  const handleAccept = () => {
    if (!terms || !accepted) return;
    
    setShowSuccess(true);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#F59E0B', '#10B981', '#3B82F6']
    });

    setTimeout(() => {
      onAccept(terms.version);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-6">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Loading Terms & Conditions...</p>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12 }}
          className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6"
        >
          <Check size={40} />
        </motion.div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">ACCEPTED!</h2>
        <p className="text-slate-500 mb-8">Thank you for accepting the Terms & Conditions. Redirecting to team setup...</p>
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </motion.div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-50 z-[100] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
          <ScrollText size={24} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">Terms & Conditions</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Version {terms?.version || '1.0'}</p>
        </div>
      </header>

      {/* Content */}
      <main className="flex-grow overflow-y-auto p-6">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6"
        >
          <div className="flex items-center gap-2 mb-4 text-indigo-600">
            <ShieldCheck size={20} />
            <span className="text-sm font-bold uppercase tracking-wider">Treasure Hunt Rules</span>
          </div>
          
          <div className="prose prose-slate prose-sm max-w-none markdown-body">
            <Markdown>{terms?.content || ''}</Markdown>
          </div>
        </motion.div>

        <div className="space-y-4 mb-8">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-1">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              <div className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${
                accepted ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200 group-hover:border-indigo-300'
              }`}>
                <AnimatePresence>
                  {accepted && (
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                    >
                      <Check size={14} className="text-white stroke-[3px]" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <span className="text-sm text-slate-600 font-medium select-none">
              I have read and agree to the Terms & Conditions
            </span>
          </label>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 p-6 space-y-3 shrink-0">
        <button
          disabled={!accepted}
          onClick={handleAccept}
          className={`w-full h-14 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
            accepted 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 active:scale-95' 
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          Accept & Continue
          {accepted && (
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Check size={18} />
            </motion.div>
          )}
        </button>
        
        <button
          onClick={() => setShowDeclineConfirm(true)}
          className="w-full h-12 rounded-2xl font-bold text-sm uppercase tracking-widest text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
        >
          Decline
        </button>

        <p className="text-[10px] text-center text-slate-400 font-medium">
          Last Updated: {terms ? new Date(terms.createdDate).toLocaleDateString() : 'March 2026'}
        </p>
      </footer>

      {/* Decline Confirmation Modal */}
      <AnimatePresence>
        {showDeclineConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeclineConfirm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-[32px] p-8 text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Terms Not Accepted</h3>
              <p className="text-slate-500 mb-8">You must accept the Terms & Conditions to participate in the treasure hunt. Declining will redirect you to the login page.</p>
              
              <div className="space-y-3">
                <button
                  onClick={onDecline}
                  className="w-full h-14 bg-rose-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-rose-200 active:scale-95 transition-all"
                >
                  Confirm Decline
                </button>
                <button
                  onClick={() => setShowDeclineConfirm(false)}
                  className="w-full h-12 text-slate-400 font-bold text-sm uppercase tracking-widest hover:text-slate-600 transition-all"
                >
                  Go Back
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TermsAndConditions;
