import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Terminal, Radio, ShieldCheck } from 'lucide-react';
import { useBurnInStore } from '../../state/useBurnInStore';

export const BootSequence: React.FC = () => {
  const bootCompleted = useBurnInStore((state) => state.bootCompleted);
  const setBootCompleted = useBurnInStore((state) => state.setBootCompleted);

  const [progress, setProgress] = useState(0);
  const [logIndex, setLogIndex] = useState(0);

  const diagnosticLogs = [
    'CONNECTING TO 125°C THERMAL OVEN TELEMETRY...',
    'CALIBRATING ARRHENIUS DEGRADATION KINETICS (Ea = 0.7 eV)...',
    'LOADING HIGH-DENSITY COMPONENT MATRIX (640 ICs)...',
    'ENFORCING ZERO-FN FLIGHT SAFETY SLOPES...',
    'ISRO RELIABILITY PLATFORM READY.',
  ];

  const handleDismiss = useCallback(() => {
    setBootCompleted(true);
  }, [setBootCompleted]);

  // Snappy ~1.2s total boot sequence
  useEffect(() => {
    if (bootCompleted) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setBootCompleted(true), 250);
          return 100;
        }
        return prev + 25;
      });
      setLogIndex((prev) => Math.min(prev + 1, diagnosticLogs.length - 1));
    }, 220);

    return () => clearInterval(interval);
  }, [bootCompleted, setBootCompleted, diagnosticLogs.length]);

  // Allow Esc key to instantly skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDismiss]);

  return (
    <AnimatePresence>
      {!bootCompleted && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.01 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          onClick={handleDismiss}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#030508]/90 backdrop-blur-md text-slate-100 select-none cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md p-5 rounded-[10px] bg-slate-950/90 border border-cyan-500/30 shadow-[var(--shadow-floating)] relative overflow-hidden mission-hud"
          >
            {/* Top scanning accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />

            <div className="flex items-center gap-3 mb-3.5">
              <div className="w-9 h-9 rounded-[7px] bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Flame className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h1 className="text-sm font-display font-bold tracking-wider text-cyan-300">
                  BURNWATCH 3D
                </h1>
                <div className="text-[10px] font-sans text-slate-400 tracking-wide">
                  ISRO PS SIH26170 • RELIABILITY DIGITAL TWIN
                </div>
              </div>
            </div>

            {/* Diagnostic Log Output */}
            <div className="bg-black/60 rounded-[6px] p-2.5 border border-slate-800/80 text-[10px] h-20 overflow-hidden flex flex-col justify-end space-y-1 font-mono">
              <div className="text-slate-500 text-[9px] flex items-center gap-1.5 pb-1 border-b border-slate-900">
                <Terminal className="w-3 h-3 text-cyan-400" />
                <span>SYSTEM DIAGNOSTIC STREAM</span>
              </div>
              <div className="text-cyan-400 text-[10px] truncate flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
                <span className="truncate">{diagnosticLogs[logIndex]}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3.5 space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="font-sans text-slate-400">INITIALIZING HARDWARE LINK</span>
                <span className="font-mono text-cyan-300 font-bold">{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.8)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="mt-3.5 pt-2.5 border-t border-slate-900 flex items-center justify-between text-[10px]">
              <button
                onClick={handleDismiss}
                className="font-mono text-slate-500 hover:text-cyan-400 transition-colors"
              >
                [CLICK OR PRESS ESC TO ENTER]
              </button>
              <span className="text-emerald-400 flex items-center gap-1 font-mono">
                <Radio className="w-3 h-3" /> ONLINE
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
