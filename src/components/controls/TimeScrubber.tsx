import React, { useEffect, useRef } from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { CHECKPOINTS } from '../../types/burnIn';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';

export const TimeScrubber: React.FC = () => {
  const checkpoint = useBurnInStore((state) => state.checkpoint);
  const setCheckpoint = useBurnInStore((state) => state.setCheckpoint);
  const isPlaying = useBurnInStore((state) => state.isPlaying);
  const setIsPlaying = useBurnInStore((state) => state.setIsPlaying);
  const playSpeed = useBurnInStore((state) => state.playSpeed);
  const setPlaySpeed = useBurnInStore((state) => state.setPlaySpeed);

  const timerRef = useRef<number | null>(null);

  // Playback loop through 0h -> 24h -> 96h -> 168h
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const interval = Math.max(800, 2400 / playSpeed);
    timerRef.current = window.setInterval(() => {
      const currentIndex = CHECKPOINTS.indexOf(checkpoint);
      const nextIndex = (currentIndex + 1) % CHECKPOINTS.length;
      setCheckpoint(CHECKPOINTS[nextIndex]);
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, checkpoint, playSpeed, setCheckpoint]);

  return (
    <div className="mission-card rounded-xl p-3 flex flex-col gap-2.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span className="font-semibold text-slate-800 dark:text-slate-200 tracking-wide uppercase font-mono text-[11px]">
            Burn-In Stress Timeline
          </span>
        </div>

        {/* Early screening callout */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <span className="text-slate-500 dark:text-slate-400">Current Time:</span>
          <span className="px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 font-bold border border-cyan-300 dark:border-cyan-500/40">
            {checkpoint} Hours @ 125°C
          </span>
        </div>
      </div>

      {/* Scrubber checkpoints line */}
      <div className="relative pt-2 pb-1 px-3">
        <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full relative">
          {/* Active progress fill */}
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-300"
            style={{
              width: `${(CHECKPOINTS.indexOf(checkpoint) / (CHECKPOINTS.length - 1)) * 100}%`,
            }}
          />
        </div>

        {/* Checkpoint Nodes */}
        <div className="flex justify-between items-center -mt-2.5 relative">
          {CHECKPOINTS.map((chk) => {
            const isActive = checkpoint === chk;
            const isEarlyPoint = chk === 24;

            return (
              <button
                key={chk}
                onClick={() => setCheckpoint(chk)}
                className="group flex flex-col items-center focus:outline-none"
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-cyan-500 ring-4 ring-cyan-500/30 shadow-lg scale-110'
                      : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-500 border-2 border-white dark:border-slate-900'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${isActive ? 'bg-white dark:bg-slate-950' : 'bg-slate-600 dark:bg-slate-400'}`}
                  />
                </div>

                <div className="mt-1 flex flex-col items-center">
                  <span
                    className={`text-xs font-mono font-semibold transition-colors ${
                      isActive ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'
                    }`}
                  >
                    {chk}h
                  </span>
                  {isEarlyPoint && (
                    <span className="text-[9px] font-mono text-fuchsia-700 dark:text-fuchsia-400 font-bold bg-fuchsia-100 dark:bg-fuchsia-950/70 px-1 rounded border border-fuchsia-300 dark:border-fuchsia-500/30">
                      Early AI Gate
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Play Controls & Speed Buttons */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800/80 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all ${
              isPlaying
                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40'
                : 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 hover:bg-cyan-200 dark:hover:bg-cyan-500/30'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play Timeline'}</span>
          </button>

          <button
            onClick={() => setCheckpoint(0)}
            className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
            title="Reset to 0h"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Speed Factor */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-mono">
          {[1, 2, 4].map((spd) => (
            <button
              key={spd}
              onClick={() => setPlaySpeed(spd)}
              className={`px-2 py-0.5 rounded ${
                playSpeed === spd
                  ? 'bg-cyan-500/30 text-cyan-800 dark:text-cyan-300 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
