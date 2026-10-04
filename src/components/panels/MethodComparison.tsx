import React, { useMemo } from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { DetectionMethod } from '../../types/burnIn';
import { evaluateLotOutliers } from '../../algorithms/dynamicOutlier';
import { calculateEvaluationMetrics } from '../../algorithms/driftPredictor';
import { Check, Layers } from 'lucide-react';

export const MethodComparison: React.FC = () => {
  const chips = useBurnInStore((state) => state.chips);
  const parameter = useBurnInStore((state) => state.parameter);
  const checkpoint = useBurnInStore((state) => state.checkpoint);
  const sensitivity = useBurnInStore((state) => state.sensitivity);
  const activeMethod = useBurnInStore((state) => state.method);
  const setMethod = useBurnInStore((state) => state.setMethod);

  // Evaluate all 4 methods side by side on the active lot and checkpoint
  const comparisonResults = useMemo(() => {
    const methods: { id: DetectionMethod; name: string; type: string }[] = [
      { id: 'ENSEMBLE', name: 'Ensemble Fusion (0-100)', type: 'Multi-Modal Physics & AI' },
      { id: 'ROBUST_Z', name: 'Robust Z-Score (MAD)', type: 'Non-Parametric Median' },
      { id: 'IQR', name: 'Tukey IQR Upper Fence', type: 'Quantile Spread' },
      { id: 'ISOLATION_FOREST', name: 'Isolation Forest', type: 'Random Space Partitioning' },
    ];

    return methods.map((m) => {
      const { updatedChips } = evaluateLotOutliers(chips, {
        parameter,
        checkpoint,
        method: m.id,
        sensitivity,
      });
      const metrics = calculateEvaluationMetrics(updatedChips, parameter);
      const flagged = updatedChips.filter((c) => c.verdict !== 'PASS').length;
      const earlyRejects = updatedChips.filter((c) => c.earlyReject).length;

      return {
        ...m,
        metrics,
        flagged,
        earlyRejects,
        isActive: activeMethod === m.id,
      };
    });
  }, [chips, parameter, checkpoint, sensitivity, activeMethod]);

  return (
    <div className="flex flex-col gap-4 p-4 text-slate-800 dark:text-slate-200">
      <div className="pb-2 border-b border-slate-200 dark:border-cyan-500/20">
        <h2 className="text-sm font-bold font-mono text-cyan-800 dark:text-cyan-300 flex items-center gap-2 uppercase tracking-wide">
          <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>Multi-Method Outlier Comparison Benchmark</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Evaluate how different screening algorithms perform on the current lot at{' '}
          <strong className="text-cyan-700 dark:text-cyan-300 font-mono">{checkpoint}h</strong> with{' '}
          <strong className="text-cyan-700 dark:text-cyan-300 font-mono">{(sensitivity * 100).toFixed(0)}%</strong> recall sensitivity.
        </p>
      </div>

      {/* Comparison Cards Grid */}
      <div className="grid grid-cols-1 gap-3">
        {comparisonResults.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-xl border transition-all ${
              item.isActive
                ? 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-400 dark:border-cyan-400/60 shadow-lg shadow-cyan-950/20 ring-1 ring-cyan-400/40'
                : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{item.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                    {item.type}
                  </span>
                </div>
              </div>

              {/* Active Toggle Button */}
              {item.isActive ? (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-500/40">
                  <Check className="w-3.5 h-3.5" /> ACTIVE ENGINE
                </span>
              ) : (
                <button
                  onClick={() => setMethod(item.id)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors"
                >
                  Activate Engine
                </button>
              )}
            </div>

            {/* Performance Stats Row */}
            <div className="grid grid-cols-4 gap-2 pt-3 font-mono text-center">
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase block">Recall</span>
                <span className={`text-base font-bold ${item.metrics.recall === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {item.metrics.recall.toFixed(1)}%
                </span>
              </div>

              <div className="p-2 rounded bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase block">Escaped (FN)</span>
                <span className={`text-base font-bold ${item.metrics.escapedDefects === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {item.metrics.escapedDefects}
                </span>
              </div>

              <div className="p-2 rounded bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase block">F2-Score</span>
                <span className="text-base font-bold text-cyan-700 dark:text-cyan-300">
                  {item.metrics.f2Score.toFixed(1)}%
                </span>
              </div>

              <div className="p-2 rounded bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase block">Total Flagged</span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {item.flagged} ICs
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
