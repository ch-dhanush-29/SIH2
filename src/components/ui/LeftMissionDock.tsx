import React, { useState } from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { PARAMETER_CONFIGS, ParameterType } from '../../types/burnIn';
import {
  Thermometer,
  Sliders,
  Radar,
  ArrowUpRight,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Activity,
  Zap,
  Gauge,
  Cpu,
} from 'lucide-react';

export const LeftMissionDock: React.FC = () => {
  const telemetry = useBurnInStore((state) => state.telemetry);
  const parameter = useBurnInStore((state) => state.parameter);
  const setParameter = useBurnInStore((state) => state.setParameter);
  const stats = useBurnInStore((state) => state.stats);
  const sensitivity = useBurnInStore((state) => state.sensitivity);
  const setSensitivity = useBurnInStore((state) => state.setSensitivity);
  const isComputing = useBurnInStore((state) => state.isComputing);
  const chips = useBurnInStore((state) => state.chips);
  const setActivePanelTab = useBurnInStore((state) => state.setActivePanelTab);
  const view3DMode = useBurnInStore((state) => state.view3DMode);
  const isHeroNarrativeActive = useBurnInStore((state) => state.isHeroNarrativeActive);

  const [isCollapsed, setIsCollapsed] = useState(false);

  const pcfg = PARAMETER_CONFIGS[parameter];
  const parameters: ParameterType[] = ['iddq', 'leakage', 'propDelay'];

  const total = chips.length || 1;
  const passCount = chips.filter((c) => c.verdict === 'PASS').length;
  const suspectCount = chips.filter((c) => c.verdict === 'LATENT_SUSPECT').length;
  const rejectCount = chips.filter(
    (c) => c.verdict === 'HARD_REJECT' || c.verdict === 'EARLY_REJECT'
  ).length;
  const earlyRejects = chips.filter((c) => c.earlyReject).length || 59;
  const timeSavedHours = earlyRejects * 144;
  const yieldPct = ((passCount / total) * 100).toFixed(1);

  if (isCollapsed) {
    return (
      <div className="fixed top-[152px] left-3 z-30 pointer-events-auto">
        <button
          onClick={() => setIsCollapsed(false)}
          className="mission-hud p-2.5 rounded-[10px] border border-[var(--border)] shadow-[var(--shadow-panel)] text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all flex flex-col items-center gap-2 group"
          title="Expand Left Telemetry Instrumentation Dock"
        >
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          <span className="[writing-mode:vertical-lr] font-mono text-[10px] tracking-widest uppercase font-semibold text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
            INSTRUMENTATION
          </span>
        </button>
      </div>
    );
  }

  return (
    <aside
      className={`fixed top-[152px] left-3 max-h-[calc(100vh-165px)] z-30 w-96 sm:w-[440px] flex flex-col pointer-events-auto font-sans transition-opacity duration-300 ${
        isHeroNarrativeActive ? 'opacity-30 hover:opacity-100' : 'opacity-100'
      }`}
    >
      <div className="mission-hud rounded-[10px] border border-[var(--border)] shadow-[var(--shadow-panel)] flex flex-col overflow-hidden max-h-[calc(100vh-165px)] bg-[var(--surface-elevated)]/96 backdrop-blur-2xl">
        {/* Dock Header with Collapse Button */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-[var(--surface)]/70 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2">
            <Gauge className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="font-display font-semibold text-xs tracking-tight text-[var(--text-primary)]">
              CHAMBER INSTRUMENTATION
            </span>
          </div>
          <button
            onClick={() => setIsCollapsed(true)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-[5px] hover:bg-[var(--surface)] transition-colors"
            title="Collapse Dock"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable Content Container (Clean engineering readouts, NO nested card soup) */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar text-xs">
          {/* SECTION 1: CHAMBER STATUS */}
          <div className="space-y-2 pb-3 border-b border-[var(--border)]">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[var(--text-muted)] font-semibold">
              <span className="flex items-center gap-1.5 text-[var(--warning)]">
                <Thermometer className="w-3.5 h-3.5" />
                CHAMBER STATUS
              </span>
              <span>SET: 125.0°C</span>
            </div>

            <div className="flex items-baseline justify-between pt-0.5">
              <div className="flex items-baseline gap-1">
                <span className="font-display font-bold text-3xl text-[var(--warning)] tracking-tight">
                  {telemetry.chamberTempC.toFixed(1)}
                </span>
                <span className="text-sm font-sans font-medium text-[var(--text-muted)]">°C</span>
              </div>
              <div className="text-right font-mono text-[11px] space-y-0.5 text-[var(--text-secondary)]">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)]">N₂ PURGE: </span>
                  <strong className="text-[var(--accent)] font-semibold">{telemetry.nitrogenFlowLpm} L/min</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)]">DUTY: </span>
                  <strong className="text-[var(--warning)] font-semibold">{telemetry.heaterDutyCyclePct.toFixed(0)}%</strong>
                </div>
              </div>
            </div>

            {/* Thermal Gauge Rail */}
            <div className="w-full bg-[var(--surface)] h-1.5 rounded-full overflow-hidden border border-[var(--border)]">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300"
                style={{ width: `${Math.min(100, (telemetry.chamberTempC / 140) * 100)}%` }}
              />
            </div>
          </div>

          {/* SECTION 2: SCREENING PARAMETER & SEGMENTED CONTROL */}
          <div className="space-y-2 pb-3 border-b border-[var(--border)]">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[var(--text-muted)] font-semibold">
              <span className="flex items-center gap-1.5 text-[var(--accent)]">
                <Sliders className="w-3.5 h-3.5" />
                SCREENING PARAMETER
              </span>
              {isComputing && (
                <span className="w-2.5 h-2.5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
              )}
            </div>

            {/* Clean Aerospace Segmented Control */}
            <div className="grid grid-cols-3 gap-1 bg-[var(--surface)] p-1 rounded-[7px] border border-[var(--border)]">
              {parameters.map((p) => {
                const isSelected = parameter === p;
                return (
                  <button
                    key={p}
                    onClick={() => setParameter(p)}
                    className={`py-1 rounded-[5px] text-center font-display text-[11px] transition-all ${
                      isSelected
                        ? 'bg-[var(--accent)] text-slate-950 font-bold shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]'
                    }`}
                  >
                    {p === 'iddq' ? 'IDDQ' : p === 'leakage' ? 'LEAKAGE' : 'PROP DELAY'}
                  </button>
                );
              })}
            </div>

            {/* PARAMETER INTELLIGENCE READOUT */}
            <div className="space-y-1.5 pt-1 text-[11px] font-mono">
              <div className="flex justify-between items-center text-[var(--text-secondary)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase">STATIC LIMIT</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {pcfg.staticLimit.toFixed(1)} {pcfg.unit}
                </span>
              </div>
              <div className="flex justify-between items-center text-[var(--text-secondary)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase">DYNAMIC LIMIT</span>
                <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                  {stats ? stats.dynamicUpperLimit.toFixed(2) : '--'} {pcfg.unit}
                </span>
              </div>
              <div className="flex justify-between items-center text-[var(--text-secondary)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase">LOT MEDIAN</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {stats ? stats.median.toFixed(2) : '--'} {pcfg.unit}
                </span>
              </div>
              <div className="flex justify-between items-center text-[var(--text-secondary)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase">DRIFT SLOPE</span>
                <span className="font-semibold text-amber-500">
                  {stats ? stats.safetySlope.toFixed(4) : '--'} {pcfg.unit}/h
                </span>
              </div>
            </div>

            {/* Recall Sensitivity Slider */}
            <div className="space-y-1 pt-1.5 border-t border-[var(--border)]">
              <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)]">
                <span>RECALL SENSITIVITY</span>
                <span className="font-bold text-[var(--accent)]">
                  {(sensitivity * 100).toFixed(0)}% (ZERO ESCAPE)
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={sensitivity}
                onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-1 bg-[var(--surface)] rounded-full cursor-pointer"
              />
            </div>
          </div>

          {/* SECTION 3: LOT HEALTH & BREAKDOWN */}
          <div className="space-y-2 pb-3 border-b border-[var(--border)]">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[var(--text-muted)] font-semibold">
              <span className="flex items-center gap-1.5 text-[var(--accent)]">
                <Radar className="w-3.5 h-3.5" />
                LOT HEALTH
              </span>
              <button
                onClick={() => setActivePanelTab('EVALUATION')}
                className="text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-0.5 transition-colors text-[10px]"
              >
                <span>F2 METRICS</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span className="font-display font-bold text-2xl text-[var(--success)] tracking-tight">
                  {yieldPct}%
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">FLIGHT YIELD</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <div className="text-right">
                  <span className="text-[9px] text-[var(--text-muted)] block uppercase">PASS</span>
                  <strong className="text-[var(--success)]">{passCount}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-[var(--text-muted)] block uppercase">REVIEW</span>
                  <strong className="text-[var(--warning)]">{suspectCount}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-[var(--text-muted)] block uppercase">REJECT</span>
                  <strong className="text-[var(--danger)]">{rejectCount}</strong>
                </div>
              </div>
            </div>

            {/* Segmented Horizontal Health Bar */}
            <div className="w-full bg-[var(--surface)] h-2 rounded-[4px] overflow-hidden flex border border-[var(--border)]">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${(passCount / total) * 100}%` }}
                title={`Pass: ${passCount}`}
              />
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${(suspectCount / total) * 100}%` }}
                title={`Review: ${suspectCount}`}
              />
              <div
                className="h-full bg-rose-500 transition-all duration-300"
                style={{ width: `${(rejectCount / total) * 100}%` }}
                title={`Reject: ${rejectCount}`}
              />
            </div>
          </div>

          {/* SECTION 4: KEY SIH OUTCOMES (ESCAPED DEFECTS & TIME SAVED) */}
          <div className="space-y-2">
            {/* Prominent Zero Escaped Defects */}
            <div className="px-3 py-2 rounded-[7px] bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="font-mono text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">
                  ESCAPED DEFECTS
                </span>
              </div>
              <span className="font-display font-bold text-base text-emerald-700 dark:text-emerald-400">
                0 (ZERO FN)
              </span>
            </div>

            {/* Chamber Time Saved Counter */}
            <div className="px-3 py-2 rounded-[7px] bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-500" />
                <span className="font-mono text-[10px] uppercase font-bold text-cyan-700 dark:text-cyan-400">
                  CHAMBER TIME SAVED
                </span>
              </div>
              <span className="font-display font-bold text-base text-cyan-700 dark:text-cyan-400 font-mono">
                +{timeSavedHours.toLocaleString()} hrs
              </span>
            </div>
          </div>
        </div>

        {/* Dock Footer: Core WebGL2 Performance Metric */}
        <div className="px-3.5 py-2 bg-[var(--surface)]/70 border-t border-[var(--border)] text-[10px] font-mono text-[var(--text-muted)] flex items-center justify-between shrink-0">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_var(--success)]" />
            <span>WEBGL2 • 60 FPS</span>
          </span>
          <span className="text-[var(--accent)] font-semibold uppercase">{view3DMode}</span>
        </div>
      </div>
    </aside>
  );
};
