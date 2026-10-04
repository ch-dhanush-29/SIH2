import React, { useState, useEffect } from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { Video, Maximize2, Minimize2 } from 'lucide-react';

export const VisionMonitor: React.FC = () => {
  const selectedChipId = useBurnInStore((state) => state.selectedChipId);
  const chips = useBurnInStore((state) => state.chips);
  const checkpoint = useBurnInStore((state) => state.checkpoint);
  const parameter = useBurnInStore((state) => state.parameter);
  const visionFeedMode = useBurnInStore((state) => state.visionFeedMode);
  const setVisionFeedMode = useBurnInStore((state) => state.setVisionFeedMode);
  const view3DMode = useBurnInStore((state) => state.view3DMode);

  const [isExpanded, setIsExpanded] = useState(false);
  const [frameCounter, setFrameCounter] = useState(24891);

  const selectedChip = chips.find((c) => c.part_id === selectedChipId) || chips[41] || chips[0];

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameCounter((prev) => prev + 1);
    }, 66); // ~15 FPS camera tick
    return () => clearInterval(interval);
  }, []);

  if (!selectedChip) return null;

  const isAnomaly = selectedChip.verdict !== 'PASS';
  const val = selectedChip.measurements[parameter][`v_${checkpoint}h`];
  const shouldExpand = isExpanded || view3DMode === 'LIVE_VISION';

  return (
    <div
      className={`fixed top-20 right-4 z-30 transition-all duration-300 pointer-events-auto ${
        shouldExpand ? 'w-96' : 'w-72'
      }`}
    >
      <div className="mission-hud rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden corner-accent">
        {/* Top Camera Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-100/90 dark:bg-black/60 border-b border-[var(--border)] text-[10px] font-mono">
          <div className="flex items-center gap-1.5 text-[var(--accent)] font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <Video className="w-3.5 h-3.5" />
            <span>LIVE CHAMBER CAM-01</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <span>59.8 FPS</span>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title="Expand / Minimize Camera View"
            >
              {shouldExpand ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Video Screen Viewport (Scientific camera imagery preserved without CSS inversion) */}
        <div className="relative h-44 bg-[#05070c] overflow-hidden flex items-center justify-center">
          {/* Subtle Scanlines overlay */}
          <div className="absolute inset-0 scanlines opacity-60 z-10 pointer-events-none" />

          {/* Sweeping laser scanline */}
          <div className="absolute inset-x-0 h-12 bg-gradient-to-b from-cyan-400/0 via-cyan-400/15 to-transparent animate-sweep pointer-events-none z-10" />

          {/* Synthetic Optical / Thermal Semiconductor Imagery */}
          <div
            className={`w-full h-full flex items-center justify-center transition-colors duration-500 relative ${
              visionFeedMode === 'THERMAL'
                ? 'bg-gradient-to-br from-indigo-950 via-amber-950 to-rose-900'
                : 'bg-gradient-to-br from-slate-900 via-slate-950 to-black'
            }`}
          >
            {/* Macro Die Package Graphic */}
            <div className="relative w-28 h-28 border-2 border-slate-700 bg-slate-900/90 rounded-md shadow-2xl flex flex-col items-center justify-center p-2 text-center">
              {/* Die Orientation Notch */}
              <div className="absolute top-1 left-1 w-2 h-2 rounded-full border border-cyan-400/80 bg-cyan-400/20" />

              {/* Lead Pins (Left and Right) */}
              <div className="absolute -left-2 top-2 bottom-2 flex flex-col justify-between">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-2 h-1 bg-amber-400/70 rounded-l-xs shadow-sm" />
                ))}
              </div>
              <div className="absolute -right-2 top-2 bottom-2 flex flex-col justify-between">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-2 h-1 bg-amber-400/70 rounded-r-xs shadow-sm" />
                ))}
              </div>

              {/* Die Laser Inscription */}
              <div className="font-mono text-[8px] text-slate-400">ISRO-RADHARD</div>
              <div className="font-mono text-[10px] font-bold text-slate-100 my-0.5">
                {selectedChip.part_id}
              </div>
              <div className="font-mono text-[7px] text-cyan-400/80">RH-FPGA-500K</div>

              {/* Thermal hotspot glow in thermal mode */}
              {visionFeedMode === 'THERMAL' && (
                <div className="absolute inset-0 bg-radial from-rose-500/40 via-amber-500/20 to-transparent animate-pulse" />
              )}
            </div>

            {/* AI Bounding Box & Target Locking Rings */}
            <div
              className={`absolute inset-4 rounded-xl border pointer-events-none transition-all ${
                isAnomaly
                  ? 'border-rose-500/80 shadow-[0_0_16px_rgba(244,63,94,0.4)]'
                  : 'border-cyan-500/50 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
              }`}
            >
              {/* Corner crosshairs */}
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-300" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-300" />
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-300" />
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-300" />

              {/* AI Detection Label Tag */}
              <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/80 border border-slate-700 font-mono text-[9px] text-slate-200">
                <span className={isAnomaly ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {selectedChip.verdict}
                </span>{' '}
                • {val.toFixed(1)} µA
              </div>

              {isAnomaly && (
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-300 font-mono text-[9px] font-bold animate-pulse">
                  AI CONF: 94.7%
                </div>
              )}
            </div>
          </div>

          {/* Timestamp & Frame Counter Overlay */}
          <div className="absolute bottom-1.5 left-2.5 font-mono text-[8px] text-slate-400 z-20">
            FRAME #{frameCounter} • 125.1°C
          </div>
        </div>

        {/* Vision Feed Mode Switcher */}
        <div className="grid grid-cols-3 p-1.5 bg-slate-100/90 dark:bg-black/40 border-t border-[var(--border)] text-[10px] font-mono gap-1">
          <button
            onClick={() => setVisionFeedMode('OPTICAL')}
            className={`py-1 rounded text-center transition-colors ${
              visionFeedMode === 'OPTICAL'
                ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-bold border border-[var(--border-accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            OPTICAL
          </button>
          <button
            onClick={() => setVisionFeedMode('THERMAL')}
            className={`py-1 rounded text-center transition-colors ${
              visionFeedMode === 'THERMAL'
                ? 'bg-amber-500/20 text-amber-500 font-bold border border-amber-500/40'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            THERMAL
          </button>
          <button
            onClick={() => setVisionFeedMode('AI_BOUNDING')}
            className={`py-1 rounded text-center transition-colors ${
              visionFeedMode === 'AI_BOUNDING'
                ? 'bg-rose-500/20 text-rose-500 font-bold border border-rose-500/40'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            AI OVERLAY
          </button>
        </div>
      </div>
    </div>
  );
};
