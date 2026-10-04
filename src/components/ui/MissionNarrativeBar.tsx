import React from 'react';
import { useBurnInStore, NARRATIVE_PHASES } from '../../state/useBurnInStore';
import { DemoStoryPhase } from '../../types/burnIn';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Flame,
  Radio,
  AlertTriangle,
  Sparkles,
  Camera,
  Activity,
  TrendingUp,
  BrainCircuit,
  ShieldCheck,
  X,
  RotateCcw,
} from 'lucide-react';

interface PhaseMeta {
  phase: DemoStoryPhase;
  title: string;
  shortLabel: string;
  icon: React.ReactNode;
  description: string;
}

const PHASES_META: PhaseMeta[] = [
  {
    phase: 'NORMAL_CHAMBER',
    title: '1. Steady State Chamber',
    shortLabel: 'Oven 125°C',
    icon: <Flame className="w-3.5 h-3.5" />,
    description: '1,000 components in steady-state 125°C thermal burn-in chamber. All look nominal.',
  },
  {
    phase: 'LIVE_TELEMETRY',
    title: '2. Live Sensor Telemetry',
    shortLabel: 'Telemetry',
    icon: <Radio className="w-3.5 h-3.5" />,
    description: 'Chamber advances to 24h calibration checkpoint. Parametric stream flows.',
  },
  {
    phase: 'DRIFT_DETECTED',
    title: '3. AI Detects Drift Spike',
    shortLabel: 'AI Detection',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    description: 'Ensemble ML engine flags CHIP-LOT04-042: +4.8σ MAD Outlier despite passing 50µA static ceiling.',
  },
  {
    phase: 'CHIP_PULSING',
    title: '4. IC Starts 3D Pulsing',
    shortLabel: '3D Strobe',
    icon: <Sparkles className="w-3.5 h-3.5" />,
    description: 'Suspect component lifts from tray with intense thermal beacon & acoustic ripple.',
  },
  {
    phase: 'CAMERA_APPROACH',
    title: '5. Camera Fly-In (Macro 45°)',
    shortLabel: 'Camera Fly-To',
    icon: <Camera className="w-3.5 h-3.5" />,
    description: 'Camera cinematically glides from wide chamber down to close-up macro die angle.',
  },
  {
    phase: 'SPATIAL_VIZ',
    title: '6. Spatial Hotspot & Callout',
    shortLabel: '3D Callout',
    icon: <Activity className="w-3.5 h-3.5" />,
    description: 'Holographic annotation anchors above the package in 3D space with leader line.',
  },
  {
    phase: 'TRAJECTORY_RENDER',
    title: '7. 3D Runaway Trajectory',
    shortLabel: '3D Trajectory',
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    description: '3D degradation curve shoots upward, predicting catastrophic limit breach at 88 hours.',
  },
  {
    phase: 'AI_EXPLANATION',
    title: '8. AI Glass-Box Explanation',
    shortLabel: 'AI Reason',
    icon: <BrainCircuit className="w-3.5 h-3.5" />,
    description: 'SHAP waterfall reveals Arrhenius gate oxide dielectric wearout causality.',
  },
  {
    phase: 'RECOMMENDED_ACTION',
    title: '9. Action: 24h Early Reject',
    shortLabel: 'Early Reject',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    description: 'Component pulled from chamber @ 24h: 144 hours saved, payload latch-up prevented.',
  },
];

export const MissionNarrativeBar: React.FC = () => {
  const isHeroNarrativeActive = useBurnInStore((state) => state.isHeroNarrativeActive);
  const narrativePhase = useBurnInStore((state) => state.narrativePhase);
  const narrativeAutoPlay = useBurnInStore((state) => state.narrativeAutoPlay);
  const startHeroNarrative = useBurnInStore((state) => state.startHeroNarrative);
  const stopHeroNarrative = useBurnInStore((state) => state.stopHeroNarrative);
  const setNarrativePhase = useBurnInStore((state) => state.setNarrativePhase);
  const nextNarrativePhase = useBurnInStore((state) => state.nextNarrativePhase);
  const prevNarrativePhase = useBurnInStore((state) => state.prevNarrativePhase);
  const toggleNarrativeAutoPlay = useBurnInStore((state) => state.toggleNarrativeAutoPlay);
  const theme = useBurnInStore((state) => state.theme);

  const currentIndex = NARRATIVE_PHASES.indexOf(narrativePhase);
  const currentMeta = PHASES_META[currentIndex] || PHASES_META[0];

  // If not active, render floating "⚡ RUN HERO SCREENING DEMO" pill
  if (!isHeroNarrativeActive) {
    return (
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-auto animate-bounce-subtle">
        <button
          onClick={() => startHeroNarrative(true)}
          className="group px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-slate-950 font-bold font-mono text-xs shadow-2xl flex items-center gap-2.5 transition-all duration-300 hover:scale-105 active:scale-95 border border-amber-300"
          title="Run cinematic 9-step SIH demo: Chamber → Drift Spike → Fly-to → 3D Trajectory → Early Reject"
        >
          <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
          <Sparkles className="w-4 h-4 text-slate-950" />
          <span className="tracking-wide">RUN HERO SCREENING DEMO (SIH-2026)</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950/20 text-slate-900 border border-slate-950/30">
            PRESS [G]
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-4xl pointer-events-auto font-sans">
      <div className="mission-hud rounded-2xl border border-amber-500/40 bg-[var(--surface-elevated)]/95 backdrop-blur-2xl shadow-2xl overflow-hidden p-3.5 text-[var(--text-primary)]">
        {/* Top Header & Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-500 border border-amber-500/30">
              {currentMeta.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-500 dark:text-amber-400">
                  SIH HERO NARRATIVE
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)] font-semibold">
                  STEP {currentIndex + 1} OF {NARRATIVE_PHASES.length}
                </span>
              </div>
              <h3 className="text-sm font-bold font-mono tracking-tight text-[var(--text-primary)]">
                {currentMeta.title}
              </h3>
            </div>
          </div>

          {/* Stepper Controls */}
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <button
              onClick={prevNarrativePhase}
              disabled={currentIndex === 0}
              className="p-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--border)] disabled:opacity-40 disabled:hover:bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] transition-colors"
              title="Previous Step"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={toggleNarrativeAutoPlay}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                narrativeAutoPlay
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                  : 'bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border)] hover:bg-[var(--border)]'
              }`}
            >
              {narrativeAutoPlay ? (
                <>
                  <Pause className="w-3.5 h-3.5" /> <span>PAUSE</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> <span>AUTO-PLAY</span>
                </>
              )}
            </button>

            <button
              onClick={nextNarrativePhase}
              disabled={currentIndex === NARRATIVE_PHASES.length - 1}
              className="p-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--border)] disabled:opacity-40 disabled:hover:bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] transition-colors"
              title="Next Step"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => startHeroNarrative(true)}
              className="p-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--border)] text-[var(--text-secondary)] border border-[var(--border)] transition-colors ml-1"
              title="Restart Demo from Step 1"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={stopHeroNarrative}
              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 transition-colors ml-1"
              title="Exit Narrative & Return to Free Orbit"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Narrative Description Line */}
        <p className="text-xs text-[var(--text-secondary)] my-2 leading-relaxed">
          {currentMeta.description}
        </p>

        {/* 9-Phase Visual Breadcrumb Track */}
        <div className="grid grid-cols-9 gap-1.5 pt-1">
          {PHASES_META.map((meta, idx) => {
            const isActive = idx === currentIndex;
            const isCompleted = idx < currentIndex;

            return (
              <button
                key={meta.phase}
                onClick={() => setNarrativePhase(meta.phase)}
                className={`group flex flex-col items-center gap-1 p-1 rounded-lg border transition-all text-center relative ${
                  isActive
                    ? 'bg-amber-500/20 border-amber-400 text-amber-500 font-bold shadow-md'
                    : isCompleted
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:border-slate-400'
                }`}
              >
                <div className="w-full h-1 rounded-full bg-slate-700/30 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      isActive
                        ? 'bg-amber-400 w-full animate-pulse'
                        : isCompleted
                        ? 'bg-emerald-400 w-full'
                        : 'w-0'
                    }`}
                  />
                </div>
                <span className="text-[9px] font-mono truncate w-full">
                  {meta.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
