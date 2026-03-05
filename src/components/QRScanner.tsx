import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, Zap, ZapOff, Compass, Heart, Star, Search, Map as MapIcon, Key, Box, Hexagon, Diamond, Triangle, Droplets } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScannerStyle } from '../types';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  style?: ScannerStyle;
  teamName?: string;
  nextClueNumber?: number;
  fallbackMode?: boolean;
  fallbackMessage?: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({ 
  onScan, 
  onClose, 
  style, 
  teamName, 
  nextClueNumber,
  fallbackMode,
  fallbackMessage
}) => {
  const [isDetected, setIsDetected] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        html5QrCodeRef.current = html5QrCode;

        const config = { 
          fps: 10, 
          qrbox: (viewWidth: number, viewHeight: number) => {
            const size = Math.min(viewWidth, viewHeight) * 0.7;
            return { width: size, height: size };
          }
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            setIsDetected(true);
            if (style?.vibrationEnabled) {
              window.navigator.vibrate?.(100);
            }
            setTimeout(() => {
              onScan(decodedText);
            }, 300);
          },
          () => {}
        );

        // Check for flash support
        if (typeof (html5QrCode as any).getRunningTrack === 'function') {
          const track = (html5QrCode as any).getRunningTrack();
          if (track && track.getCapabilities) {
            const capabilities = track.getCapabilities() as any;
            if (capabilities.torch) {
              setHasFlash(true);
            }
          }
        }
      } catch (err: any) {
        console.error("Scanner start error:", err);
        setError("Could not access camera. Please ensure permissions are granted.");
      }
    };

    startScanner();

    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(err => console.error("Stop error:", err));
      }
    };
  }, [onScan, style?.vibrationEnabled]);

  const toggleFlash = async () => {
    if (!html5QrCodeRef.current || !hasFlash) return;
    if (typeof (html5QrCodeRef.current as any).applyVideoConstraints !== 'function') {
      console.warn("applyVideoConstraints is not supported by this version of html5-qrcode");
      return;
    }
    try {
      const newState = !isFlashOn;
      await (html5QrCodeRef.current as any).applyVideoConstraints({
        advanced: [{ torch: newState }] as any
      });
      setIsFlashOn(newState);
    } catch (err) {
      console.error("Flash toggle error:", err);
    }
  };

  const renderFrameIcon = () => {
    const iconSize = 120;
    const iconClass = "text-emerald-500 opacity-20";
    
    switch (style?.frameShape) {
      case 'compass': return <Compass size={iconSize} className={iconClass} />;
      case 'heart': return <Heart size={iconSize} className={iconClass} />;
      case 'star': return <Star size={iconSize} className={iconClass} />;
      case 'magnifier': return <Search size={iconSize} className={iconClass} />;
      case 'map': return <MapIcon size={iconSize} className={iconClass} />;
      case 'keyhole': return <Key size={iconSize} className={iconClass} />;
      case 'chest': return <Box size={iconSize} className={iconClass} />;
      case 'hexagon': return <Hexagon size={iconSize} className={iconClass} />;
      case 'diamond': return <Diamond size={iconSize} className={iconClass} />;
      case 'pyramid': return <Triangle size={iconSize} className={iconClass} />;
      case 'bubbles': return <Droplets size={iconSize} className={iconClass} />;
      default: return null;
    }
  };

  const getFrameClass = () => {
    const base = "relative w-64 h-64 sm:w-80 sm:h-80 border-2 border-white/30 overflow-hidden";
    switch (style?.frameShape) {
      case 'circle': return `${base} rounded-full`;
      case 'rounded': return `${base} rounded-[40px]`;
      case 'heart': return `${base} rounded-[50%_50%_0_0]`;
      case 'star': return `${base} clip-path-star`;
      case 'hexagon': return `${base} clip-path-hexagon`;
      case 'diamond': return `${base} clip-path-diamond`;
      case 'pyramid': return `${base} clip-path-pyramid`;
      default: return `${base} rounded-3xl`;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
    >
      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent pt-[env(safe-area-inset-top)]">
        <button 
          onClick={onClose}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20"
        >
          <X size={24} />
        </button>
        
        <div className="flex items-center gap-2">
          {hasFlash && (
            <button 
              onClick={toggleFlash}
              className={`w-12 h-12 flex items-center justify-center rounded-full backdrop-blur-md border border-white/20 transition-all ${
                isFlashOn ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'
              }`}
            >
              {isFlashOn ? <ZapOff size={24} /> : <Zap size={24} />}
            </button>
          )}
        </div>
      </div>

      {/* Camera View */}
      <div className="relative flex-grow flex items-center justify-center overflow-hidden">
        <div id="reader" className="w-full h-full object-cover"></div>
        
        {/* Scanning Overlay */}
        <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center">
          <div className={`${getFrameClass()} ${style?.animation === 'flicker' ? 'animate-flicker' : ''} ${style?.animation === 'pulse' ? 'animate-pulse-border' : ''}`}>
            {/* Animation Effects */}
            {style?.animation === 'line' && <div className="scanner-line"></div>}
            
            {style?.animation === 'glow' && (
              <motion.div 
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-emerald-500/20 shadow-[inset_0_0_50px_rgba(16,185,129,0.5)]"
              />
            )}

            {style?.animation === 'rotating' && (
              <div className="absolute inset-0 border-4 border-dashed border-emerald-500/40 rounded-inherit animate-rotating" />
            )}

            {style?.animation === 'ripple' && (
              <div className="absolute inset-0 flex items-center justify-center">
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, opacity: 0.5 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}
                    className="absolute w-20 h-20 border-2 border-emerald-500 rounded-full"
                  />
                ))}
              </div>
            )}

            {style?.animation === 'particles' && (
              <div className="absolute inset-0">
                {[...Array(10)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      x: [Math.random() * 300, Math.random() * 300],
                      y: [Math.random() * 300, Math.random() * 300],
                      opacity: [0, 1, 0]
                    }}
                    transition={{ duration: 2 + Math.random() * 2, repeat: Infinity }}
                    className="absolute w-1 h-1 bg-emerald-400 rounded-full"
                  />
                ))}
              </div>
            )}
            
            {/* Corner Accents */}
            {(style?.frameShape === 'rectangle' || style?.frameShape === 'rounded') && (
              <>
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-xl"></div>
              </>
            )}

            <div className="absolute inset-0 flex items-center justify-center">
              {renderFrameIcon()}
            </div>
          </div>
          
          <div className="mt-8 flex flex-col items-center gap-4">
            <p className="text-white/80 font-medium text-sm tracking-wide bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
              Align QR code within the {style?.frameShape || 'frame'}
            </p>
            
            {(teamName || nextClueNumber) && (
              <div className="bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center min-w-[200px]">
                {teamName && <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest mb-1">{teamName}</p>}
                {nextClueNumber && <p className="text-white font-display font-bold">Next Clue: #{nextClueNumber}</p>}
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isDetected && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-white/60 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-24 h-24 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xl"
              >
                <Camera size={48} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Status/Error */}
      <div className="bg-black/80 backdrop-blur-md p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-center space-y-4">
        {fallbackMode && fallbackMessage && (
          <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl">
            <p className="text-amber-400 text-[10px] font-bold uppercase tracking-widest mb-1">Scanner Issues?</p>
            <p className="text-white text-xs font-medium">{fallbackMessage}</p>
          </div>
        )}
        
        {error ? (
          <div className="text-red-400 text-sm font-medium flex flex-col items-center gap-2">
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white/10 rounded-lg text-white text-xs uppercase tracking-widest font-bold"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 text-emerald-400">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-emerald-400"
            />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Scanner Active</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
