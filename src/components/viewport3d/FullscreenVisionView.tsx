import React, { useState, useEffect } from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import {
  Camera,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Target,
  Sparkles,
  Radio,
  Flame,
  Layers,
  Crosshair,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sliders,
  ChevronRight,
  ShieldAlert,
  Compass,
} from 'lucide-react';

type FeedSource = 'CHAMBER_RACK' | 'INSPECTION_STATION' | 'WAFER_PROBER';
type OpticalFilter = 'REAL_OPTICAL' | 'THERMAL_HEATMAP' | 'AI_BOUNDING' | 'CSAM_ACOUSTIC';

const FEEDS: { id: FeedSource; name: string; subtitle: string; image: string; tag: string }[] = [
  {
    id: 'CHAMBER_RACK',
    name: '125°C Burn-In Oven Chamber Rack',
    subtitle: 'High-density populated Burn-In Boards (BIBs) with IC test sockets',
    image: '/images/chamber_rack.png',
    tag: 'THERMAL OVEN RACK',
  },
  {
    id: 'INSPECTION_STATION',
    name: 'Cleanroom AOI & ATE Workstation',
    subtitle: 'Automated Optical Inspection multi-monitor screening conveyor',
    image: '/images/inspection_station.png',
    tag: 'AOI CLEANROOM',
  },
  {
    id: 'WAFER_PROBER',
    name: 'Silicon Wafer Die Prober Stage',
    subtitle: 'Automated prober head inspecting patterned flight-grade dies',
    image: '/images/wafer_prober.png',
    tag: 'WAFER PROBER',
  },
];

export const FullscreenVisionView: React.FC = () => {
  const selectedChipId = useBurnInStore((state) => state.selectedChipId);
  const selectChip = useBurnInStore((state) => state.selectChip);
  const chips = useBurnInStore((state) => state.chips);
  const checkpoint = useBurnInStore((state) => state.checkpoint);
  const parameter = useBurnInStore((state) => state.parameter);
  const setView3DMode = useBurnInStore((state) => state.setView3DMode);
  const overrideChipVerdict = useBurnInStore((state) => state.overrideChipVerdict);
  const addToast = useBurnInStore((state) => state.addToast);

  const [activeFeed, setActiveFeed] = useState<FeedSource>('CHAMBER_RACK');
  const [activeFilter, setActiveFilter] = useState<OpticalFilter>('AI_BOUNDING');
  const [zoom, setZoom] = useState<number>(1);
  const [frameNumber, setFrameNumber] = useState(38410);
  const [showOverlays, setShowOverlays] = useState(true);

  const starChip = chips.find((c) => c.part_id === selectedChipId) || chips.find((c) => c.part_id === 'CHIP-LOT04-042') || chips[41];

  // Simulating live camera tick
  useEffect(() => {
    const timer = setInterval(() => {
      setFrameNumber((f) => f + 1);
    }, 66);
    return () => clearInterval(timer);
  }, []);

  const handleEarlyReject = () => {
    if (!starChip) return;
    overrideChipVerdict(
      starChip.part_id,
      'EARLY_REJECT',
      'In-Situ Optical Telemetry Intercept: Thermal runaway & drift slope confirmed'
    );
    addToast({
      type: 'SUCCESS',
      title: 'Early Reject Committed',
      message: `${starChip.part_id} rejected at ${checkpoint}h. 144 hours saved.`,
    });
  };

  const currentFeedData = FEEDS.find((f) => f.id === activeFeed) || FEEDS[0];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none text-[var(--text-primary)]">
      {/* 1. Full-Screen High-Resolution Image Container */}
      <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center">
        <img
          src={currentFeedData.image}
          alt={currentFeedData.name}
          className={`w-full h-full object-cover transition-transform duration-500 ease-out ${
            activeFilter === 'THERMAL_HEATMAP'
              ? 'hue-rotate-180 contrast-125 saturate-200'
              : activeFilter === 'CSAM_ACOUSTIC'
              ? 'invert contrast-150 brightness-90 grayscale'
              : ''
          }`}
          style={{ transform: `scale(${zoom})` }}
        />

        {/* Ambient Vignette & Aerospace Scanlines */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />
        <div className="absolute inset-0 scanlines opacity-40 pointer-events-none" />

        {/* Sweeping Inspection Laser Line */}
        <div className="absolute inset-x-0 h-16 bg-gradient-to-b from-cyan-400/0 via-cyan-400/20 to-transparent animate-sweep pointer-events-none" />

        {/* Precision Screen Frame Corner Brackets */}
        <div className="absolute top-16 left-6 w-8 h-8 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
        <div className="absolute top-16 right-6 w-8 h-8 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
        <div className="absolute bottom-16 left-6 w-8 h-8 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
        <div className="absolute bottom-16 right-6 w-8 h-8 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />
      </div>

      {/* 2. Interactive Telemetry Bounding Box Over Identified Defect */}
      {showOverlays && starChip && (
        <div
          className={`absolute transition-all duration-300 pointer-events-auto ${
            activeFeed === 'CHAMBER_RACK'
              ? 'top-[42%] left-[46%]'
              : activeFeed === 'INSPECTION_STATION'
              ? 'top-[30%] left-[34%]'
              : 'top-[48%] left-[54%]'
          }`}
        >
          {/* Pulsing Target Reticle */}
          <div className="relative -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 border-2 border-rose-500 rounded-[8px] bg-rose-500/15 animate-radar flex items-center justify-center shadow-[0_0_24px_rgba(255,66,104,0.8)]">
              <Crosshair className="w-8 h-8 text-rose-400 animate-spin" style={{ animationDuration: '10s' }} />
            </div>

            {/* Target Label Callout */}
            <div className="absolute left-full ml-4 top-0 mission-hud p-3 rounded-[10px] border border-rose-500/60 shadow-[var(--shadow-floating)] min-w-[280px] bg-slate-950/95 backdrop-blur-xl">
              <div className="flex items-center justify-between pb-1 border-b border-rose-500/30">
                <span className="font-display font-bold text-sm text-rose-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  LATENT DEFECT DETECTED
                </span>
                <span className="font-mono text-xs text-[var(--warning)] font-bold">98.4% CONF</span>
              </div>

              <div className="py-2 space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-sans text-[var(--text-muted)]">Target Die:</span>
                  <span className="font-display font-bold text-white text-sm">{starChip.part_id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-sans text-[var(--text-muted)]">Coordinates:</span>
                  <span className="font-mono text-cyan-300">R{starChip.row}:C{starChip.col}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-sans text-[var(--text-muted)]">Drift Slope:</span>
                  <span className="font-mono font-bold text-rose-400">+{starChip.predictedSlope.toFixed(3)}/h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-sans text-[var(--text-muted)]">Chamber Temp:</span>
                  <span className="font-mono text-amber-400 font-bold">125.1°C</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border)] flex gap-2">
                <button
                  onClick={handleEarlyReject}
                  className="flex-1 py-1.5 px-3 rounded-[6px] bg-rose-500 hover:bg-rose-600 text-white font-display font-bold text-xs flex items-center justify-center gap-1 transition-all shadow-md"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>EARLY REJECT @ 24H</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Top Control Bar (Feed Switcher, Filters, Fullscreen Exit) */}
      <div className="absolute top-28 left-6 right-6 z-30 flex flex-wrap items-center justify-between gap-4 pointer-events-auto">
        {/* Source Feed Switcher Tabs */}
        <div className="flex items-center gap-2 p-1.5 rounded-[10px] bg-slate-950/85 backdrop-blur-xl border border-[var(--border)] shadow-[var(--shadow-floating)]">
          {FEEDS.map((feed) => (
            <button
              key={feed.id}
              onClick={() => setActiveFeed(feed.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-[7px] text-xs font-display font-bold transition-all ${
                activeFeed === feed.id
                  ? 'bg-[var(--accent)] text-slate-950 shadow-md scale-102'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>{feed.tag}</span>
            </button>
          ))}
        </div>

        {/* Optical Filter Controls */}
        <div className="flex items-center gap-2 p-1.5 rounded-[10px] bg-slate-950/85 backdrop-blur-xl border border-[var(--border)] shadow-[var(--shadow-floating)]">
          {(['REAL_OPTICAL', 'THERMAL_HEATMAP', 'AI_BOUNDING', 'CSAM_ACOUSTIC'] as OpticalFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-display font-semibold transition-all ${
                activeFilter === f
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* View Controls & Exit */}
        <div className="flex items-center gap-2 p-1.5 rounded-[10px] bg-slate-950/85 backdrop-blur-xl border border-[var(--border)] shadow-[var(--shadow-floating)]">
          <button
            onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
            className="p-2 rounded-[6px] text-[var(--text-secondary)] hover:text-white hover:bg-white/10 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs text-cyan-300 font-bold px-1.5">{zoom.toFixed(2)}x</span>
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
            className="p-2 rounded-[6px] text-[var(--text-secondary)] hover:text-white hover:bg-white/10 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowOverlays(!showOverlays)}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-display font-semibold transition-colors ${
              showOverlays ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
            }`}
          >
            {showOverlays ? 'OVERLAYS ON' : 'OVERLAYS OFF'}
          </button>

          <button
            onClick={() => setView3DMode('CHAMBER')}
            className="flex items-center gap-2 px-4 py-2 rounded-[7px] bg-[var(--accent)] hover:opacity-90 text-slate-950 font-display font-bold text-xs transition-all shadow-md ml-2"
          >
            <Compass className="w-4 h-4" />
            <span>RETURN TO 3D DIGITAL TWIN</span>
          </button>
        </div>
      </div>

      {/* 4. Bottom Scientific OSD Readout */}
      <div className="absolute bottom-20 left-6 right-6 z-30 flex items-center justify-between p-3 rounded-[10px] bg-slate-950/85 backdrop-blur-xl border border-[var(--border)] text-xs font-mono pointer-events-auto shadow-[var(--shadow-floating)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-bold uppercase tracking-wide">
              STREAM: {currentFeedData.name}
            </span>
          </div>
          <span className="text-slate-500">|</span>
          <span className="text-[var(--text-muted)]">{currentFeedData.subtitle}</span>
        </div>

        <div className="flex items-center gap-4 text-cyan-300">
          <span>FRAME: #{frameNumber}</span>
          <span>•</span>
          <span>4K UHD 60 FPS</span>
          <span>•</span>
          <span>N2 PURGE: 99.8%</span>
          <span>•</span>
          <span>OVEN: 125.1°C</span>
        </div>
      </div>
    </div>
  );
};
