import React from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { CheckpointHour, CHECKPOINTS } from '../../types/burnIn';
import { DraggableWindow } from '../common/DraggableWindow';
import {
  Play,
  Pause,
  RotateCcw,
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
  const theme = useBurnInStore((state) => state.theme);

  const checkpointEvents: Record<
    CheckpointHour,
    { title: string; desc: string; icon: React.ReactNode; isGate?: boolean }
  > = {
    0: {
      title: '0h Baseline',
      desc: 'Room temp insertion & ramp',
      icon: <Clock className="w-3 h-3 text-[var(--accent)]" />,
    },
    24: {
      title: '24h Early Gate',
      desc: 'AI screening intercept • 144h saved',
      icon: <Sparkles className="w-3 h-3 text-[var(--warning)] animate-pulse" />,
      isGate: true,
    },
    96: {
      title: '96h Midway',
      desc: 'Stabilization & oxide check',
      icon: <AlertTriangle className="w-3 h-3 text-[var(--text-muted)]" />,
    },
    168: {
      title: '168h Final',
      desc: 'Qualification completion limit',
      icon: <ShieldCheck className="w-3 h-3 text-[var(--success)]" />,
    },
  };

  const handleReplay = () => {
    setCheckpoint(0);
    setIsPlaying(true);
  };

  return (
    <DraggableWindow
      id="checkpoint-timeline"
      title="CHECKPOINT & TIMELINE"
      icon={<Clock className="w-4 h-4" />}
      width="w-[720px] max-w-[calc(100vw-32px)]"
      maxHeight="max-h-64"
      minimizedContent={
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-bold font-mono">T+{checkpoint}h</span>
          <span className="text-slate-500">•</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsPlaying(!isPlaying);
            }}
            className="p-1 rounded bg-[var(--accent-soft)] hover:bg-[var(--accent)] hover:text-slate-950 text-[var(--accent)] transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
          </button>
        </div>
      }
      headerRight={
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--accent)] mr-1">
          <span>{isPlaying ? 'SIMULATING' : 'READY'}</span>
        </div>
      }
    >
      <div className="p-3 space-y-2.5">
        {/* Upper Track Bar: Time & Playback Controls */}
        <div className="flex items-center justify-between text-xs text-[var(--text-primary)]">
          <div className="flex items-center gap-2">
            {/* Play / Pause Toggle */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded-[7px] bg-[var(--accent-soft)] hover:opacity-90 text-[var(--accent)] border border-[var(--border-accent)] transition-all shadow-sm flex items-center gap-1.5"
              title={isPlaying ? 'Pause Burn-In Simulation' : 'Play Burn-In Simulation'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span className="font-display font-semibold text-[11px] hidden sm:inline">
                {isPlaying ? 'PAUSE' : 'PLAY'}
              </span>
            </button>

            {/* Replay */}
            <button
              onClick={handleReplay}
              className="p-1.5 rounded-[7px] bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-[var(--text-secondary)] transition-colors border border-[var(--border)]"
              title="Replay from 0h"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Play Speed Multiplier */}
            <div className="flex items-center bg-slate-100/90 dark:bg-black/40 rounded-[6px] p-0.5 border border-[var(--border)] font-mono text-[10px]">
              {[1, 2, 4].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaySpeed(spd)}
                  className={`px-2 py-0.5 rounded-[4px] transition-colors ${
                    playSpeed === spd
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Active Checkpoint Telemetry */}
          <div className="flex items-center gap-1.5">
            <span className="font-sans text-[var(--text-muted)] text-[10px] font-semibold tracking-wider">CHECKPOINT:</span>
            <span className="font-mono text-sm font-bold text-[var(--accent)] tracking-wider">
              T+{checkpoint}h
            </span>
            <span className="font-mono text-[10px] text-[var(--text-muted)]">/ 168h</span>
          </div>
        </div>

        {/* Visual Timeline Track with Event Nodes */}
        <div className="relative pt-2 pb-1">
          {/* Background Connecting Rail */}
          <div className="absolute top-[13px] left-4 right-4 h-1 bg-slate-200 dark:bg-slate-800/80 rounded-full overflow-hidden z-0">
            <div
              className={`h-full transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-500'
                  : 'bg-gradient-to-r from-sky-500 via-amber-500 to-rose-600'
              }`}
              style={{ width: `${(checkpoint / 168) * 100}%` }}
            />
          </div>

          {/* Checkpoint Clickable Nodes */}
          <div className="relative flex justify-between z-10 px-1">
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
                  {/* Pin Dot: 16px circle with centered 6px core */}
                  <div
                    className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center z-10 ${
                      isSelected
                        ? 'bg-[var(--accent)] border-white dark:border-white shadow-[0_0_12px_var(--accent)] scale-110'
                        : isPast
                        ? 'bg-white dark:bg-slate-900 border-[var(--accent)] text-[var(--accent)]'
                        : 'bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected
                          ? 'bg-slate-950 dark:bg-slate-950'
                          : isPast
                          ? 'bg-[var(--accent)]'
                          : 'bg-transparent'
                      }`}
                    />
                  </div>

                  {/* Label & Description */}
                  <div className="mt-1 text-center">
                    <div
                      className={`text-[11px] font-display font-semibold tracking-tight transition-colors ${
                        isSelected
                          ? 'text-[var(--accent)]'
                          : isPast
                          ? 'text-[var(--text-primary)]'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {ev.title}
                    </div>
                    <div className="text-[9px] font-sans text-[var(--text-muted)] hidden sm:block max-w-[120px] truncate leading-tight">
                      {ev.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DraggableWindow>
  );
};
export default CinematicTimeline;
