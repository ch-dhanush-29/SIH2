import React from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { CheckpointHour, CHECKPOINTS } from '../../types/burnIn';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export const CinematicTimeline: React.FC = () => {
  const checkpoint = useBurnInStore((state) => state.checkpoint);
  const setCheckpoint = useBurnInStore((state) => state.setCheckpoint);
  const isPlaying = useBurnInStore((state) => state.isPlaying);
  const setIsPlaying = useBurnInStore((state) => state.setIsPlaying);
  const playSpeed = useBurnInStore((state) => state.playSpeed);
  const setPlaySpeed = useBurnInStore((state) => state.setPlaySpeed);

  const checkpointEvents: Record<CheckpointHour, { title: string; desc: string; icon: React.ReactNode; isGate?: boolean }> = {
    0: {
      title: '0h Baseline',
      desc: 'Room temp insertion & initial 125°C ramp',
      icon: <Clock className="w-3 h-3 text-cyan-400" />,
    },
    24: {
      title: '24h Early Gate',
      desc: 'AI screening intercept • 144h saved per defect',
      icon: <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />,
      isGate: true,
    },
    96: {
      title: '96h Midway',
      desc: 'Secondary stabilization & oxide check',
      icon: <AlertTriangle className="w-3 h-3 text-slate-400" />,
    },
    168: {
      title: '168h Final',
      desc: 'Full qualification completion limit',
      icon: <ShieldCheck className="w-3 h-3 text-emerald-400" />,
    },
  };

  const handleReplay = () => {
    setCheckpoint(0);
    setIsPlaying(true);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4 pointer-events-auto">
      <div className="mission-hud p-3 rounded-2xl border border-cyan-500/25 shadow-2xl space-y-2.5 backdrop-blur-xl">
        {/* Upper Track Bar: Time & Playback Controls */}
        <div className="flex items-center justify-between font-mono text-xs text-slate-300">
          <div className="flex items-center gap-2">
            {/* Play / Pause Toggle */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-all shadow"
              title={isPlaying ? 'Pause Burn-In Simulation' : 'Play Burn-In Simulation'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            </button>

            {/* Replay */}
            <button
              onClick={handleReplay}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Replay from 0h"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Play Speed Multiplier */}
            <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-slate-800 text-[10px]">
              {[1, 2, 4].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaySpeed(spd)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    playSpeed === spd
                      ? 'bg-cyan-500/30 text-cyan-300 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Active Checkpoint Telemetry */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[10px]">CHECKPOINT:</span>
            <span className="text-sm font-bold text-cyan-300 tracking-wider">
              T+{checkpoint}h
            </span>
            <span className="text-[10px] text-slate-500">/ 168h</span>
          </div>
        </div>

        {/* Visual Timeline Track with Event Nodes */}
        <div className="relative pt-1 pb-1">
          {/* Background Connecting Rail */}
          <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-slate-800/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-amber-400 to-rose-500 transition-all duration-300"
              style={{ width: `${(checkpoint / 168) * 100}%` }}
            />
          </div>

          {/* Checkpoint Clickable Nodes */}
          <div className="relative flex justify-between">
            {CHECKPOINTS.map((chk) => {
              const ev = checkpointEvents[chk];
              const isSelected = checkpoint === chk;
              const isPast = checkpoint >= chk;

              return (
                <div
                  key={chk}
                  onClick={() => setCheckpoint(chk)}
                  className="flex flex-col items-center cursor-pointer group select-none"
                >
                  {/* Pin Dot */}
                  <div
                    className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center z-10 ${
                      isSelected
                        ? 'bg-cyan-400 border-white shadow-[0_0_12px_rgba(0,240,255,1)] scale-125'
                        : isPast
                        ? 'bg-slate-900 border-cyan-400 text-cyan-400'
                        : 'bg-slate-950 border-slate-700 text-slate-600'
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-slate-950' : isPast ? 'bg-cyan-400' : 'bg-transparent'
                      }`}
                    />
                  </div>

                  {/* Label & Description */}
                  <div className="mt-1.5 text-center">
                    <div
                      className={`text-[11px] font-mono font-bold tracking-tight transition-colors ${
                        isSelected
                          ? 'text-cyan-300 glow-cyan'
                          : isPast
                          ? 'text-slate-300'
                          : 'text-slate-500'
                      }`}
                    >
                      {ev.title}
                    </div>
                    <div className="text-[9px] font-mono text-slate-400 hidden sm:block max-w-[110px] truncate">
                      {ev.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
