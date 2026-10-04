import React, { useState, useEffect } from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { Video, Maximize2, Minimize2, ZoomIn, Target, Radio, Layers, Flame, Eye, ChevronRight, ChevronLeft, Camera, Crosshair, Sparkles } from 'lucide-react';

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
          className="mission-hud p-2.5 rounded-[10px] border border-[var(--border)] shadow-[var(--shadow-panel)] text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all flex flex-col items-center gap-2 group"
          title="Expand Vision Feed"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span className="[writing-mode:vertical-lr] font-mono text-[10px] tracking-widest uppercase font-semibold text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
            VISION MONITOR
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
        shouldExpand ? 'w-[480px]' : 'w-80 sm:w-84'
      }`}
    >
      <div className="mission-hud rounded-[10px] border border-[var(--border)] shadow-[var(--shadow-panel)] overflow-hidden bg-[var(--surface-elevated)]/96 backdrop-blur-2xl">
        {/* Top Camera Header (Section 24) */}
        <div className="flex items-center justify-between px-3.5 py-2 bg-[var(--surface)]/70 border-b border-[var(--border)] text-[11px] font-sans">
          <div className="flex items-center gap-2">
            <Camera className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="font-display font-semibold text-xs tracking-tight text-[var(--text-primary)]">
              LIVE OPTICAL INSPECTION
            </span>
            <span className="flex items-center gap-1 px-1.5 py-0.2 rounded-[4px] bg-rose-500/10 border border-rose-500/30 text-rose-500 font-mono text-[9px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              LIVE
            </span>
          </div>

          <div className="flex items-center gap-1 text-[var(--text-muted)]">
            <span className="text-[10px] font-mono text-[var(--warning)] font-semibold">{junctionTemp}°C</span>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded hover:bg-[var(--surface)] transition-colors"
              title={shouldExpand ? 'Minimize Window' : 'Maximize Inspection View'}
            >
              {shouldExpand ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsCollapsed(true)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded hover:bg-[var(--surface)] transition-colors"
              title="Collapse Vision Monitor"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Video Screen Viewport with Corner Brackets & Scanlines (Section 25) */}
        <div className={`relative ${shouldExpand ? 'h-72' : 'h-48'} bg-[#020509] overflow-hidden flex items-center justify-center transition-all duration-300`}>
          {/* Subtle Scanlines overlay */}
          <div className="absolute inset-0 scanlines opacity-50 z-10 pointer-events-none" />

          {/* Precision Corner Brackets (Scientific inspection framing) */}
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400/80 z-20 pointer-events-none" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400/80 z-20 pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400/80 z-20 pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400/80 z-20 pointer-events-none" />

          {/* Sweeping laser scanline */}
          <div className="absolute inset-x-0 h-10 bg-gradient-to-b from-cyan-400/0 via-cyan-400/10 to-transparent animate-sweep pointer-events-none z-10" />

          {/* Camera OSD Micro Metadata */}
          <div className="absolute top-2 left-6 z-20 font-mono text-[8px] text-cyan-300/80 flex items-center gap-2 pointer-events-none">
            <span>CAM-02: IN-SITU</span>
            <span>•</span>
            <span>FRAME #{frameCounter}</span>
            <span>•</span>
            <span>FPS: 30</span>
          </div>

          <div className="absolute top-2 right-6 z-20 font-mono text-[8px] text-cyan-300/80 pointer-events-none">
            MAG: {zoomLevel}
          </div>

          {/* Synthetic Optical / Thermal / Acoustic Semiconductor Package */}
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
              className={`relative border border-slate-700 bg-slate-900/95 rounded-[4px] shadow-2xl flex flex-col items-center justify-center p-2 text-center transition-all duration-300 ${
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
                  <div key={i} className="w-2.5 h-1 bg-amber-400/80 rounded-l-xs shadow-xs" />
                ))}
              </div>
              <div className="absolute -right-2.5 top-2 bottom-2 flex flex-col justify-between">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-2.5 h-1 bg-amber-400/80 rounded-r-xs shadow-xs" />
                ))}
              </div>

              {/* Silicon Die Internal Pattern */}
              <div className="absolute inset-2.5 border border-slate-700/60 rounded-[3px] bg-slate-950/80 overflow-hidden flex items-center justify-center">
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
                className={`absolute inset-4 rounded-[6px] border pointer-events-none transition-all ${
                  isAnomaly
                    ? 'border-rose-500/80 shadow-[0_0_16px_rgba(244,63,94,0.3)]'
                    : 'border-cyan-500/50 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                }`}
              >
                {/* AI Detection Label Tag */}
                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-[4px] bg-black/85 border border-slate-700 font-mono text-[9px] text-slate-200">
                  <span className={isAnomaly ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {selectedChip.verdict}
                  </span>{' '}
                  • {val.toFixed(1)} µA
                </div>

                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-[4px] bg-black/85 border border-slate-700 font-mono text-[9px] text-cyan-300">
                  CONFIDENCE: 98.4%
                </div>
              </div>
            )}
          </div>

          {/* Fly-to camera crosshair trigger */}
          <button
            onClick={handleFlyToComponent}
            className="absolute bottom-2 left-4 z-20 px-2 py-0.5 rounded-[4px] bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-mono text-[9px] flex items-center gap-1 shadow-md transition-colors"
            title="Fly 3D Camera to Component in Tray"
          >
            <Crosshair className="w-3 h-3" />
            <span>FOCUS 3D</span>
          </button>
        </div>

        {/* Media Control Strip: Mode Selector & Magnification (Section 24) */}
        <div className="px-3 py-2 bg-[var(--surface)]/70 border-t border-[var(--border)] flex items-center justify-between text-[10px] font-sans">
          {/* Inspection Modality Switcher */}
          <div className="flex items-center gap-1 font-display">
            {(['OPTICAL', 'THERMAL', 'CSAM', 'AI_BOUNDING'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setLocalMode(m)}
                className={`px-2 py-0.5 rounded-[4px] transition-colors ${
                  localMode === m
                    ? 'bg-[var(--accent)] text-slate-950 font-bold shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]'
                }`}
              >
                {m === 'AI_BOUNDING' ? 'AI OVERLAY' : m}
              </button>
            ))}
          </div>

          {/* Zoom Toggle */}
          <div className="flex items-center gap-0.5 font-mono text-[9px]">
            {(['1X', '20X', '50X'] as const).map((z) => (
              <button
                key={z}
                onClick={() => setZoomLevel(z)}
                className={`px-1.5 py-0.5 rounded-[3px] transition-colors ${
                  zoomLevel === z
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-bold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {z}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
