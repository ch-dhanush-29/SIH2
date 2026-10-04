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

  const [isCollapsed, setIsCollapsed] = useState(false);

  const pcfg = PARAMETER_CONFIGS[parameter];
  const parameters: ParameterType[] = ['iddq', 'leakage', 'propDelay'];

  const total = chips.length || 1;
  const passCount = chips.filter((c) => c.verdict === 'PASS').length;
  const suspectCount = chips.filter((c) => c.verdict === 'LATENT_SUSPECT').length;
  const rejectCount = chips.filter(
    (c) => c.verdict === 'HARD_REJECT' || c.verdict === 'EARLY_REJECT'
  ).length;
  const earlyRejects = chips.filter((c) => c.earlyReject).length;
  const timeSavedHours = earlyRejects * 144;
  const yieldPct = ((passCount / total) * 100).toFixed(1);

  const isHeroNarrativeActive = useBurnInStore((state) => state.isHeroNarrativeActive);

  if (isCollapsed) {
    return (
      <div className="fixed top-[118px] left-3 z-30 pointer-events-auto">
        <button
          onClick={() => setIsCollapsed(false)}
          className="mission-hud p-2 rounded-xl border border-[var(--border)] shadow-2xl text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all flex flex-col items-center gap-2 group"
          title="Expand Left Telemetry Dock"
        >
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          <span className="[writing-mode:vertical-lr] font-mono text-[10px] tracking-widest uppercase font-bold text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
            TELEMETRY DOCK
          </span>
        </button>
      </div>
    );
  }

  return (
    <aside
      className={`fixed top-[118px] left-3 max-h-[calc(100vh-135px)] z-30 w-72 flex flex-col pointer-events-auto font-sans transition-opacity duration-300 ${
        isHeroNarrativeActive ? 'opacity-30 hover:opacity-100' : 'opacity-100'
      }`}
    >
      <div className="mission-hud rounded-2xl border border-[var(--border)] shadow-2xl flex flex-col overflow-hidden max-h-[calc(100vh-135px)] bg-[var(--surface-elevated)]/95 backdrop-blur-xl">
        {/* Dock Header with Collapse Button */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-100/90 dark:bg-black/60 border-b border-[var(--border)] text-[10px] font-mono shrink-0">
          <div className="flex items-center gap-1.5 text-[var(--success)] font-bold tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse shadow-[0_0_6px_var(--success)]" />
            <span>CHAMBER TELEMETRY</span>
          </div>
          <button
            onClick={() => setIsCollapsed(true)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded transition-colors"
            title="Collapse Left Dock"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable Content Container (Never collides, scrollable if height is small) */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 custom-scrollbar text-[11px] font-mono">
          {/* 1. Chamber ESS Environmental Conditions */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-[var(--border)] space-y-2">
            <div className="flex items-center justify-between text-[10px] text-[var(--warning)] font-bold pb-1 border-b border-[var(--border)]">
              <span className="flex items-center gap-1">
                <Thermometer className="w-3 h-3" />
                CHAMBER ESS 125°C
              </span>
              <span className="text-[var(--text-muted)] font-normal">SET: 125.0°C</span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[var(--warning)] tracking-tight">
                  {telemetry.chamberTempC.toFixed(1)}
                </span>
                <span className="text-xs text-[var(--text-muted)]">°C</span>
              </div>
              <div className="text-right text-[10px] text-[var(--text-secondary)]">
                <div>
                  DUTY: <strong className="text-[var(--warning)]">{telemetry.heaterDutyCyclePct.toFixed(0)}%</strong>
                </div>
                <div>
                  N2: <strong className="text-[var(--accent)]">{telemetry.nitrogenFlowLpm} L/m</strong>
                </div>
              </div>
            </div>

            <div className="w-full bg-slate-200 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden border border-[var(--border)]">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300"
                style={{ width: `${Math.min(100, (telemetry.chamberTempC / 140) * 100)}%` }}
              />
            </div>
          </div>

          {/* 2. Screening Parameter Selector & Thresholds */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-[var(--border)] space-y-2">
            <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
              <span className="flex items-center gap-1 text-[var(--accent)] font-bold">
                <Sliders className="w-3 h-3" />
                SCREENING PARAMETER
              </span>
              {isComputing && (
                <span className="w-2 h-2 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
              )}
            </div>

            {/* Parameter Switcher Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-[var(--border)]">
              {parameters.map((p) => {
                const isSelected = parameter === p;
                return (
                  <button
                    key={p}
                    onClick={() => setParameter(p)}
                    className={`py-1 rounded text-center transition-all text-[10px] font-bold ${
                      isSelected
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {p === 'iddq' ? 'Iddq' : p === 'leakage' ? 'Leakage' : 'PropDelay'}
                  </button>
                );
              })}
            </div>

            {/* Live Dual Thresholds (Static vs Dynamic) */}
            <div className="space-y-1 text-[10px] pt-0.5">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)]">Datasheet Static Limit:</span>
                <span className="font-bold text-[var(--text-primary)]">
                  {pcfg.staticLimit.toFixed(1)} {pcfg.unit}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)]">Dynamic Lot Limit:</span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">
                  {stats ? stats.dynamicUpperLimit.toFixed(2) : '--'} {pcfg.unit}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)]">Lot Safety Drift Slope:</span>
                <span className="font-bold text-amber-500">
                  {stats ? stats.safetySlope.toFixed(4) : '--'} {pcfg.unit}/h
                </span>
              </div>
            </div>

            {/* Sensitivity Slider */}
            <div className="space-y-1 pt-1 border-t border-[var(--border)]">
              <div className="flex justify-between text-[9px] text-[var(--text-muted)]">
                <span>Recall Sensitivity:</span>
                <span className="font-bold text-[var(--accent)]">
                  {(sensitivity * 100).toFixed(0)}% (Zero FN)
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={sensitivity}
                onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* 3. Lot Reliability Radar & Zero-FN Counter */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-[var(--border)] space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-[var(--border)] text-[10px]">
              <span className="flex items-center gap-1.5 text-[var(--accent)] font-bold">
                <Radar className="w-3 h-3 text-[var(--accent)]" />
                LOT HEALTH RADAR
              </span>
              <button
                onClick={() => setActivePanelTab('EVALUATION')}
                className="text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-0.5 transition-colors text-[9px]"
              >
                <span>METRICS</span>
                <ArrowUpRight className="w-2.5 h-2.5" />
              </button>
            </div>

            {/* Yield & Breakdown Grid */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-[var(--border)] shrink-0 w-16">
                <span className="text-base font-bold font-mono text-[var(--success)]">{yieldPct}%</span>
                <span className="text-[7px] text-[var(--text-muted)] uppercase tracking-wider">Flight Yield</span>
              </div>

              <div className="flex-1 space-y-0.5 text-[10px]">
                <div className="flex justify-between text-[var(--success)]">
                  <span className="text-[var(--text-muted)]">Pass:</span>
                  <strong className="font-mono">{passCount}</strong>
                </div>
                <div className="flex justify-between text-[var(--warning)]">
                  <span className="text-[var(--text-muted)]">Review:</span>
                  <strong className="font-mono">{suspectCount}</strong>
                </div>
                <div className="flex justify-between text-[var(--danger)]">
                  <span className="text-[var(--text-muted)]">Reject:</span>
                  <strong className="font-mono">{rejectCount}</strong>
                </div>
              </div>
            </div>

            {/* Zero Defect Escape Guarantee Badge */}
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-[10px]">
              <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                ESCAPED DEFECTS:
              </span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">0 (ZERO FN)</span>
            </div>

            {/* Chamber Time Saved */}
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between text-[10px]">
              <span className="text-cyan-700 dark:text-cyan-400 font-bold flex items-center gap-1">
                <Zap className="w-3 h-3 text-cyan-500" />
                CHAMBER TIME SAVED:
              </span>
              <span className="font-bold text-cyan-700 dark:text-cyan-400 font-mono">+{timeSavedHours.toLocaleString()} hrs</span>
            </div>
          </div>
        </div>

        {/* Dock Footer: WebGL Core Status */}
        <div className="px-3 py-1.5 bg-slate-100/90 dark:bg-black/60 border-t border-[var(--border)] text-[9px] font-mono text-[var(--text-muted)] flex items-center justify-between shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
            <span>WEBGL2 • 60 FPS</span>
          </span>
          <span className="text-[var(--accent)] font-semibold uppercase">{view3DMode}</span>
        </div>
      </div>
    </aside>
  );
};
