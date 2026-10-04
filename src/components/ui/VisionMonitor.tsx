import React, { useState, useEffect } from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { DraggableWindow } from '../common/DraggableWindow';
import {
  Video,
  Maximize2,
  Minimize2,
  ZoomIn,
  Target,
  Layers,
  Flame,
  Camera,
  Crosshair,
} from 'lucide-react';

export const VisionMonitor: React.FC = () => {
  const selectedChipId = useBurnInStore((state) => state.selectedChipId);
  const chips = useBurnInStore((state) => state.chips);
  const checkpoint = useBurnInStore((state) => state.checkpoint);
  const parameter = useBurnInStore((state) => state.parameter);
  const visionFeedMode = useBurnInStore((state) => state.visionFeedMode);
  const view3DMode = useBurnInStore((state) => state.view3DMode);
  const setCameraViewMode = useBurnInStore((state) => state.setCameraViewMode);
  const selectChip = useBurnInStore((state) => state.selectChip);
  const isInspectionOpen = useBurnInStore((state) => state.isInspectionOpen);
  const isHeroNarrativeActive = useBurnInStore((state) => state.isHeroNarrativeActive);
  const narrativePhase = useBurnInStore((state) => state.narrativePhase);
  const setView3DMode = useBurnInStore((state) => state.setView3DMode);

  const [isExpanded, setIsExpanded] = useState(false);
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

  // Gracefully yield right dock zone when inspector or full-screen live vision is active
  const isRightDockOccupied =
    isInspectionOpen ||
    view3DMode === 'LIVE_VISION' ||
    (isHeroNarrativeActive && (narrativePhase === 'AI_EXPLANATION' || narrativePhase === 'RECOMMENDED_ACTION'));

  if (isRightDockOccupied) return null;
  if (!selectedChip) return null;

  const isAnomaly = selectedChip.verdict !== 'PASS';
  const val = selectedChip.measurements[parameter][`v_${checkpoint}h`];
  const shouldExpand = isExpanded;

  // Dynamic junction temperature calculation based on Iddq and 125°C ambient
  const junctionTemp = (125.0 + val * 0.12).toFixed(1);

  // Hotspot pulse scale based on value
  const hotspotIntensity = Math.min(1.0, Math.max(0.2, (val - 10) / 35));

  const handleFlyToComponent = () => {
    selectChip(selectedChip.part_id);
    setCameraViewMode('CLOSEUP');
  };

  return (
    <DraggableWindow
      id="vision-monitor"
      title="LIVE OPTICAL INSPECTION"
      icon={<Camera className="w-4 h-4 text-[var(--accent)]" />}
      width={shouldExpand ? 'w-[520px]' : 'w-96 sm:w-[440px]'}
      maxHeight="max-h-[calc(100vh-165px)]"
      closable={true}
      minimizedContent={
        <div className="flex items-center gap-2 font-mono">
          <span className="text-amber-400 font-bold">{junctionTemp}°C</span>
          <span className="text-slate-500">•</span>
          <span className="text-cyan-400 font-semibold">{localMode}</span>
          <span className="text-slate-500">•</span>
          <span className="text-rose-400 font-bold">LIVE</span>
        </div>
      }
      headerRight={
        <div className="flex items-center gap-1.5 mr-1">
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-rose-500/10 border border-rose-500/30 text-rose-500 font-mono text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            LIVE
          </span>
          <button
            onClick={() => setView3DMode('LIVE_VISION')}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded hover:bg-[var(--surface)] transition-colors"
            title="Enter Full Screen Real-Time Telemetry Lab"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      }
    >
      <div className="flex flex-col">
        {/* Main Feed Viewport */}
        <div
          className={`relative bg-slate-950 overflow-hidden transition-all duration-300 border-b border-[var(--border)] ${
            shouldExpand ? 'h-64' : 'h-48'
          }`}
        >
          {/* Authentic Sensor Feed Imagery or Real-Time Synthetic Shader */}
          <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden">
            {localMode === 'THERMAL' && (
              <div
                className="w-full h-full relative"
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 50%, rgba(244, 63, 94, 0.45) 0%, rgba(249, 115, 22, 0.3) 35%, rgba(15, 23, 42, 0.95) 75%)',
                }}
              >
                {/* Simulated thermal heat contours */}
                <div
                  className="absolute inset-0 opacity-40 mix-blend-screen"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 48% 48%, rgba(251, 191, 36, 0.8) 0%, rgba(239, 68, 68, 0.5) 25%, transparent 60%)',
                    transform: `scale(${1 + hotspotIntensity * 0.15})`,
                  }}
                />

                {/* Hotspot indicator ring */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
                  <div
                    className="w-16 h-16 rounded-full border border-rose-500/60 animate-ping"
                    style={{ animationDuration: '2s' }}
                  />
                  <div className="absolute -bottom-6 font-mono text-[9px] bg-rose-950/80 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/40">
                    T_JUNC: {junctionTemp}°C
                  </div>
                </div>
              </div>
            )}

            {localMode === 'OPTICAL' && (
              <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                {/* Silicon Die Micro-Pattern Grid */}
                <div
                  className="w-full h-full opacity-30"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(32, 214, 232, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(32, 214, 232, 0.2) 1px, transparent 1px)',
                    backgroundSize: zoomLevel === '50X' ? '8px 8px' : zoomLevel === '20X' ? '16px 16px' : '32px 32px',
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 border-2 border-cyan-500/40 rounded flex items-center justify-center text-cyan-400 font-mono text-[10px]">
                    DIE {selectedChip.part_id}
                  </div>
                </div>
              </div>
            )}

            {localMode === 'CSAM' && (
              <div
                className="w-full h-full relative"
                style={{
                  background:
                    'radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.25) 0%, rgba(15, 23, 42, 0.98) 70%)',
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-sky-400">
                  ACOUSTIC DELAMINATION: NONE DETECTED
                </div>
              </div>
            )}

            {localMode === 'AI_BOUNDING' && (
              <div className="w-full h-full bg-slate-950 relative flex items-center justify-center">
                <div className="w-36 h-28 border-2 border-dashed border-rose-500/80 rounded-sm relative flex flex-col justify-between p-1">
                  <span className="font-mono text-[9px] bg-rose-500 text-white px-1 self-start font-bold">
                    ANOMALY CONF: 98.4%
                  </span>
                  <span className="font-mono text-[8px] text-rose-300 self-end">
                    OXIDE_LEAKAGE_DRIFT
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Crosshair Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <Crosshair className="w-8 h-8 text-cyan-400/40" />
          </div>

          {/* Telemetry OSD Header */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-[9px] font-mono text-cyan-300 pointer-events-none drop-shadow-md">
            <span>CHAMBER: #01-A</span>
            <span>ZOOM: {zoomLevel}</span>
            <span>FRAME: #{frameCounter}</span>
          </div>

          {/* Bottom OSD Bar */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-mono text-slate-300 pointer-events-none drop-shadow-md">
            <span>DUT: {selectedChip.part_id}</span>
            <span>
              STATUS:{' '}
              <strong className={isAnomaly ? 'text-rose-400' : 'text-emerald-400'}>
                {selectedChip.verdict}
              </strong>
            </span>
          </div>
        </div>

        {/* Camera Control Footer Bar */}
        <div className="p-2.5 bg-[var(--surface)]/70 flex items-center justify-between gap-2 border-t border-[var(--border)] text-xs font-sans">
          {/* Mode Switcher */}
          <div className="grid grid-cols-4 gap-1 flex-1 bg-[var(--surface-elevated)] p-0.5 rounded-[6px] border border-[var(--border)]">
            {(['THERMAL', 'OPTICAL', 'CSAM', 'AI_BOUNDING'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setLocalMode(m)}
                className={`py-1 rounded-[4px] text-center font-display text-[10px] transition-all ${
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
    </DraggableWindow>
  );
};
export default VisionMonitor;
