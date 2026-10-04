import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, ShieldCheck, Cpu, Terminal, Radio } from 'lucide-react';
import { useBurnInStore } from '../../state/useBurnInStore';

export const BootSequence: React.FC = () => {
  const bootCompleted = useBurnInStore((state) => state.bootCompleted);
  const setBootCompleted = useBurnInStore((state) => state.setBootCompleted);

  const [progress, setProgress] = useState(0);
  const [logIndex, setLogIndex] = useState(0);

  const diagnosticLogs = [
    'CONNECTING TO 125°C THERMAL OVEN TELEMETRY...',
    'CALIBRATING ARRHENIUS DEGRADATION KINETICS...',
    'LOADING HIGH-DENSITY COMPONENT MATRIX...',
    'ENFORCING ZERO-FN FLIGHT SAFETY SLOPES...',
    'ISRO RELIABILITY PLATFORM READY.',
  ];

  useEffect(() => {
    if (bootCompleted) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setBootCompleted(true), 350);
          return 100;
        }
        return prev + 25;
      });
      setLogIndex((prev) => Math.min(prev + 1, diagnosticLogs.length - 1));
    }, 280);

    return () => clearInterval(interval);
  }, [bootCompleted, setBootCompleted]);

  return (
    <AnimatePresence>
      {!bootCompleted && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#030508] tech-grid-bg text-slate-100 font-mono select-none"
        >
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-950/80 border border-cyan-500/30 shadow-2xl backdrop-blur-xl relative overflow-hidden corner-accent">
            {/* Top scanning line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Flame className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-widest text-cyan-300 font-display">
                  BURNWATCH 3D
                </h1>
                <div className="text-[10px] text-slate-400 tracking-wider">
                  ISRO PS SIH26170 • RELIABILITY DIGITAL TWIN
                </div>
              </div>
            </div>

            {/* Diagnostic Log Output */}
            <div className="bg-black/60 rounded-lg p-3 border border-slate-800 text-[11px] h-24 overflow-hidden flex flex-col justify-end space-y-1">
              <div className="text-slate-500 text-[9px] flex items-center gap-1.5 pb-1 border-b border-slate-900">
                <Terminal className="w-3 h-3 text-cyan-400" />
                <span>SYSTEM DIAGNOSTIC STREAM</span>
              </div>
              <div className="text-cyan-400 text-[11px] truncate flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>{diagnosticLogs[logIndex]}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>INITIALIZING HARDWARE LINK</span>
                <span className="text-cyan-300 font-bold">{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.8)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500">
              <span>SECURITY: AIR-GAPPED</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <Radio className="w-3 h-3" /> ONLINE
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
