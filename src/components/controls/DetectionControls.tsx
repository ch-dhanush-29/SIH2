import React from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import {
  PARAMETER_CONFIGS,
  ParameterType,
  DetectionMethod,
} from '../../types/burnIn';
import {
  Sliders,
  ShieldAlert,
  Zap,
  Activity,
  Layers,
  Info,
} from 'lucide-react';

export const DetectionControls: React.FC = () => {
  const parameter = useBurnInStore((state) => state.parameter);
  const setParameter = useBurnInStore((state) => state.setParameter);
  const method = useBurnInStore((state) => state.method);
  const setMethod = useBurnInStore((state) => state.setMethod);
  const sensitivity = useBurnInStore((state) => state.sensitivity);
  const setSensitivity = useBurnInStore((state) => state.setSensitivity);
  const stats = useBurnInStore((state) => state.stats);
  const metrics = useBurnInStore((state) => state.metrics);

  const pcfg = PARAMETER_CONFIGS[parameter];

  const methods: { id: DetectionMethod; label: string; desc: string }[] = [
    { id: 'ENSEMBLE', label: 'Ensemble Fusion', desc: 'Weighted fusion of Z, IQR, IsoForest & Drift rate' },
    { id: 'ROBUST_Z', label: 'Robust Z (MAD)', desc: 'Median & Median Absolute Deviation (1.4826·MAD)' },
    { id: 'IQR', label: 'Tukey IQR', desc: 'Interquartile range (Q3 + k·IQR upper fence)' },
    { id: 'ISOLATION_FOREST', label: 'Isolation Forest', desc: 'Random tree partitioning anomaly depth' },
  ];

  return (
    <div className="mission-card rounded-xl p-4 flex flex-col gap-4">
      {/* Parameter Selection Tabs */}
      <div>
        <label className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Screening Parameter Under Test</span>
        </label>
        <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
          {(Object.keys(PARAMETER_CONFIGS) as ParameterType[]).map((pKey) => {
            const cfg = PARAMETER_CONFIGS[pKey];
            const isSelected = parameter === pKey;
            return (
              <button
                key={pKey}
                onClick={() => setParameter(pKey)}
                className={`py-1.5 px-2 rounded-md text-xs font-medium transition-all text-center flex flex-col items-center gap-0.5 ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-400/50 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <span className="font-semibold">{cfg.id.toUpperCase()}</span>
                <span className="text-[10px] opacity-75 font-mono">({cfg.unit})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Static Limit vs Dynamic Lot-Relative Threshold Side-by-Side */}
      <div className="grid grid-cols-2 gap-3 p-3 bg-slate-100/80 dark:bg-slate-950/70 rounded-lg border border-slate-200 dark:border-slate-800/90 font-mono">
        {/* Static Limit Card */}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400 tracking-wider">
            Static Datasheet Limit
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
              {pcfg.staticLimit.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{pcfg.unit}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">
            Absolute manufacturer ceiling
          </span>
        </div>

        {/* Dynamic Lot-Relative Threshold Card */}
        <div className="flex flex-col border-l border-slate-300 dark:border-slate-800 pl-3">
          <span className="text-[10px] uppercase text-cyan-700 dark:text-cyan-400 tracking-wider flex items-center gap-1">
            <Activity className="w-3 h-3 text-cyan-600 dark:text-cyan-400" /> Dynamic Lot Threshold
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-bold text-cyan-700 dark:text-cyan-300">
              {stats?.dynamicUpperLimit.toFixed(1) || '--'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{pcfg.unit}</span>
          </div>
          <span className="text-[10px] text-cyan-600/90 dark:text-cyan-500/80 mt-1">
            Lot Median ({stats?.median.toFixed(1) || '10.5'} {pcfg.unit}) + k·MAD
          </span>
        </div>
      </div>

      {/* Demo Case Callout Banner */}
      <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/30 text-xs text-amber-900 dark:text-amber-200/90 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <strong className="text-amber-800 dark:text-amber-300 font-semibold">SIH Demo Case:</strong> Lot median is{' '}
          <span className="font-mono text-cyan-700 dark:text-cyan-300">{stats?.median.toFixed(1)} {pcfg.unit}</span>. A latent-defect part at{' '}
          <span className="font-mono text-amber-700 dark:text-amber-300 font-bold">44.8 {pcfg.unit}</span> passes the static 50 µA limit, but is correctly flagged by BurnWatch 3D as a statistical outlier!
        </div>
      </div>

      {/* Detection Method Selection */}
      <div>
        <label className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Detection Algorithm</span>
          </span>
          <span className="text-[10px] text-slate-500 lowercase">Compare results</span>
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {methods.map((m) => {
            const isSelected = method === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`p-2 rounded-lg text-left transition-all border ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-900 dark:text-cyan-200 border-cyan-400/50 shadow-sm font-medium'
                    : 'bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
              >
                <div className="text-xs font-semibold">{m.label}</div>
                <div className="text-[10px] opacity-75 line-clamp-1">{m.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sensitivity Slider (Biased toward Recall) */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Recall-Biased Sensitivity</span>
          </label>
          <span className="font-mono text-xs font-bold text-cyan-700 dark:text-cyan-300">
            {(sensitivity * 100).toFixed(0)}%
          </span>
        </div>

        <input
          type="range"
          min="0.2"
          max="1.0"
          step="0.05"
          value={sensitivity}
          onChange={(e) => setSensitivity(parseFloat(e.target.value))}
          className="w-full accent-cyan-600 dark:accent-cyan-400 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
        />

        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-1">
          <span>Tolerant (High Precision)</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">Standard Recall (75%)</span>
          <span className="text-cyan-600 dark:text-cyan-400">Strict Aerospace (100%)</span>
        </div>

        {/* Live Warning when known defects escape! */}
        {metrics && metrics.escapedDefects > 0 && (
          <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-500/60 flex items-start gap-2 animate-radar">
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-rose-900 dark:text-rose-200">
              <strong className="text-rose-800 dark:text-rose-300 font-bold block">
                MISSION CRITICAL: {metrics.escapedDefects} Defect(s) Escaped!
              </strong>
              Threshold is too loose. High-risk latent defect parts would escape screening into flight hardware. Increase sensitivity to restore 100% recall.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
