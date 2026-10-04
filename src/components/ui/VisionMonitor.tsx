import React, { useState, useEffect } from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { Video, Maximize2, Minimize2, ZoomIn, Target, Radio, Layers, Flame, Eye, ChevronRight, ChevronLeft } from 'lucide-react';

export const VisionMonitor: React.FC = () => {
  const selectedChipId = useBurnInStore((state) => state.selectedChipId);
  const chips = useBurnInStore((state) => state.chips);
  const checkpoint = useBurnInStore((state) => state.checkpoint);
  const parameter = useBurnInStore((state) => state.parameter);
  const visionFeedMode = useBurnInStore((state) => state.visionFeedMode);
  const setVisionFeedMode = useBurnInStore((state) => state.setVisionFeedMode);
  const view3DMode = useBurnInStore((state) => state.view3DMode);
  const setCameraViewMode = useBurnInStore((state) => state.setCameraViewMode);
  const selectChip = useBurnInStore((state) => state.selectChip);
  const isInspectionOpen = useBurnInStore((state) => state.isInspectionOpen);
  const isHeroNarrativeActive = useBurnInStore((state) => state.isHeroNarrativeActive);
  const narrativePhase = useBurnInStore((state) => state.narrativePhase);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<'1X' | '20X' | '50X'>('20X');
  const [localMode, setLocalMode] = useState<'OPTICAL' | 'THERMAL' | 'CSAM' | 'AI_BOUNDING'>('THERMAL');
  const [frameCounter, setFrameCounter] = useState(24891);

  const selectedChip = chips.find((c) => c.part_id === selectedChipId) || chips[41] || chips[0];

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameCounter((prev) => prev + 1);
    }, 66); // ~15 FPS camera tick
    return () => clearInterval(interval);
  }, []);

  // Sync store vision mode if changed from store
  useEffect(() => {
    if (visionFeedMode === 'THERMAL') setLocalMode('THERMAL');
    else if (visionFeedMode === 'OPTICAL') setLocalMode('OPTICAL');
    else if (visionFeedMode === 'AI_BOUNDING') setLocalMode('AI_BOUNDING');
  }, [visionFeedMode]);

  // Gracefully yield right dock zone when inspector or hero explanation is active
  const isRightDockOccupied =
    isInspectionOpen ||
    (isHeroNarrativeActive && (narrativePhase === 'AI_EXPLANATION' || narrativePhase === 'RECOMMENDED_ACTION'));

  if (isRightDockOccupied) return null;

  if (isCollapsed) {
    return (
      <div className="fixed top-[118px] right-3 z-30 pointer-events-auto">
        <button
          onClick={() => setIsCollapsed(false)}
          className="mission-hud p-2.5 rounded-xl border border-[var(--border)] shadow-2xl text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all flex flex-col items-center gap-2 group"
          title="Expand Vision Feed"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span className="[writing-mode:vertical-lr] font-mono text-[10px] tracking-widest uppercase font-bold text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
            VISION FEED
          </span>
        </button>
      </div>
    );
  }

  if (!selectedChip) return null;

  const isAnomaly = selectedChip.verdict !== 'PASS';
  const val = selectedChip.measurements[parameter][`v_${checkpoint}h`];
  const shouldExpand = isExpanded || view3DMode === 'LIVE_VISION';

  // Dynamic junction temperature calculation based on Iddq and 125°C ambient
  const junctionTemp = (125.0 + (val * 0.12)).toFixed(1);

  // Hotspot pulse scale based on value
  const hotspotIntensity = Math.min(1.0, Math.max(0.2, (val - 10) / 35));

  const handleFlyToComponent = () => {
    selectChip(selectedChip.part_id);
    setCameraViewMode('CLOSEUP');
  };

  return (
    <div
      className={`fixed top-[118px] right-3 z-30 transition-all duration-300 pointer-events-auto ${
        shouldExpand ? 'w-96' : 'w-72'
      }`}
    >
      <div className="mission-hud rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden corner-accent">
        {/* Top Camera Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-100/90 dark:bg-black/60 border-b border-[var(--border)] text-[10px] font-mono">
          <div className="flex items-center gap-1.5 text-[var(--accent)] font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <Video className="w-3.5 h-3.5" />
            <span>OPTICAL/THERMAL INSPECTION</span>
          </div>

          <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
            <span className="text-[9px]">{junctionTemp}°C</span>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-0.5 rounded"
              title="Expand / Minimize Camera View"
            >
              {shouldExpand ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </button>
            <button
              onClick={() => setIsCollapsed(true)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-0.5 rounded"
              title="Collapse Vision Monitor"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Video Screen Viewport */}
        <div className="relative h-48 bg-[#03060c] overflow-hidden flex items-center justify-center">
          {/* Subtle Scanlines overlay */}
          <div className="absolute inset-0 scanlines opacity-60 z-10 pointer-events-none" />

          {/* Sweeping laser scanline */}
          <div className="absolute inset-x-0 h-12 bg-gradient-to-b from-cyan-400/0 via-cyan-400/15 to-transparent animate-sweep pointer-events-none z-10" />

          {/* Synthetic Optical / Thermal / Acoustic Semiconductor Imagery */}
          <div
            className={`w-full h-full flex items-center justify-center transition-colors duration-500 relative ${
              localMode === 'THERMAL'
                ? 'bg-gradient-to-br from-indigo-950 via-slate-950 to-amber-950'
                : localMode === 'CSAM'
                ? 'bg-gradient-to-br from-slate-950 via-cyan-950 to-blue-950'
                : 'bg-gradient-to-br from-slate-900 via-slate-950 to-black'
            }`}
          >
            {/* Macro Die Package Graphic */}
            <div
              className={`relative border-2 border-slate-700 bg-slate-900/90 rounded-md shadow-2xl flex flex-col items-center justify-center p-2 text-center transition-all duration-300 ${
                zoomLevel === '50X'
                  ? 'w-44 h-44 scale-125'
                  : zoomLevel === '20X'
                  ? 'w-32 h-32 scale-100'
                  : 'w-24 h-24 scale-90'
              }`}
            >
              {/* Die Orientation Notch */}
              <div className="absolute top-1 left-1 w-2 h-2 rounded-full border border-cyan-400/80 bg-cyan-400/20" />

              {/* Lead Pins (Left and Right) */}
              <div className="absolute -left-2.5 top-2 bottom-2 flex flex-col justify-between">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-2.5 h-1 bg-amber-400/80 rounded-l-xs shadow-sm" />
                ))}
              </div>
              <div className="absolute -right-2.5 top-2 bottom-2 flex flex-col justify-between">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-2.5 h-1 bg-amber-400/80 rounded-r-xs shadow-sm" />
                ))}
              </div>

              {/* Silicon Die Internal Pattern */}
              <div className="absolute inset-3 border border-slate-700/60 rounded bg-slate-950/70 overflow-hidden flex items-center justify-center">
                {/* Circuit Grid Texture */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:6px_6px] opacity-40" />

                {/* Acoustic C-SAM Delamination Anomaly (Pinhole Void) */}
                {localMode === 'CSAM' && isAnomaly && (
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full border border-cyan-400 bg-cyan-400/20 flex items-center justify-center animate-ping" />
                    <span className="text-[7px] font-mono text-cyan-300 font-bold bg-black/80 px-1 rounded mt-1">
                      DELAMINATION VOID
                    </span>
                  </div>
                )}

                {/* Thermal Hotspot Glow proportional to leakage */}
                {(localMode === 'THERMAL' || localMode === 'AI_BOUNDING') && isAnomaly && (
                  <div
                    className="absolute w-14 h-14 rounded-full bg-radial from-rose-500/70 via-amber-500/40 to-transparent animate-pulse"
                    style={{
                      transform: `scale(${0.9 + hotspotIntensity * 0.6})`,
                      opacity: 0.6 + hotspotIntensity * 0.4,
                    }}
                  />
                )}
              </div>

              {/* Die Laser Inscription */}
              <div className="relative z-10 font-mono text-[7px] text-slate-400 tracking-wider">
                ISRO • {selectedChip.lot_id}
              </div>
              <div className="relative z-10 font-mono text-[10px] font-bold text-slate-100 my-0.5 tracking-tight">
                {selectedChip.part_id}
              </div>
              <div className="relative z-10 font-mono text-[7px] text-cyan-400/90">
                Tray R{selectedChip.row}:C{selectedChip.col}
              </div>
            </div>

            {/* AI Bounding Box & Target Locking Rings */}
            {(localMode === 'AI_BOUNDING' || isAnomaly) && (
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
                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/85 border border-slate-700 font-mono text-[9px] text-slate-200">
                  <span className={isAnomaly ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {selectedChip.verdict}
                  </span>{' '}
                  • {val.toFixed(1)} µA
                </div>

                {isAnomaly && (
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-rose-950/90 border border-rose-500/50 text-rose-300 font-mono text-[9px] font-bold animate-pulse">
                    AI CONF: 96.2%
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Interactive Zoom Controls Overlay */}
          <div className="absolute top-2 right-2 z-20 flex gap-1 bg-black/60 backdrop-blur-md p-0.5 rounded-lg border border-slate-700 font-mono text-[8px]">
            {(['1X', '20X', '50X'] as const).map((z) => (
              <button
                key={z}
                onClick={() => setZoomLevel(z)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  zoomLevel === z
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {z}
              </button>
            ))}
          </div>

          {/* Timestamp & Direct Fly-to Trigger */}
          <div className="absolute bottom-1.5 left-2.5 right-2.5 flex items-center justify-between font-mono text-[8px] text-slate-400 z-20">
            <span>FRAME #{frameCounter} • Tj: {junctionTemp}°C</span>
            <button
              onClick={handleFlyToComponent}
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded border border-cyan-500/30"
              title="Fly 3D Camera to this component"
            >
              <Target className="w-2.5 h-2.5" />
              <span>LOCK 3D</span>
            </button>
          </div>
        </div>

        {/* Vision Feed Mode Switcher */}
        <div className="grid grid-cols-4 p-1.5 bg-slate-100/90 dark:bg-black/40 border-t border-[var(--border)] text-[9px] font-mono gap-1">
          <button
            onClick={() => {
              setLocalMode('OPTICAL');
              setVisionFeedMode('OPTICAL');
            }}
            className={`py-1 rounded text-center transition-colors ${
              localMode === 'OPTICAL'
                ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-bold border border-[var(--border-accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            OPTICAL
          </button>
          <button
            onClick={() => {
              setLocalMode('THERMAL');
              setVisionFeedMode('THERMAL');
            }}
            className={`py-1 rounded text-center transition-colors ${
              localMode === 'THERMAL'
                ? 'bg-amber-500/20 text-amber-500 font-bold border border-amber-500/40'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            THERMAL
          </button>
          <button
            onClick={() => setLocalMode('CSAM')}
            className={`py-1 rounded text-center transition-colors ${
              localMode === 'CSAM'
                ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="Ultrasonic Acoustic Microscopy"
          >
            C-SAM
          </button>
          <button
            onClick={() => {
              setLocalMode('AI_BOUNDING');
              setVisionFeedMode('AI_BOUNDING');
            }}
            className={`py-1 rounded text-center transition-colors ${
              localMode === 'AI_BOUNDING'
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
