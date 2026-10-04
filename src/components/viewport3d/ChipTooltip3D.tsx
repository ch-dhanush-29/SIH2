import React from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { PARAMETER_CONFIGS } from '../../types/burnIn';
import { AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react';

export const ChipTooltip3D: React.FC = () => {
  const hoveredChipId = useBurnInStore((state) => state.hoveredChipId);
  const chips = useBurnInStore((state) => state.chips);
  const parameter = useBurnInStore((state) => state.parameter);
  const checkpoint = useBurnInStore((state) => state.checkpoint);

  if (!hoveredChipId) return null;

  const chip = chips.find((c) => c.part_id === hoveredChipId);
  if (!chip) return null;

  const pcfg = PARAMETER_CONFIGS[parameter];

  const getVerdictBadge = () => {
    switch (chip.verdict) {
      case 'HARD_REJECT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/40">
            <XCircle className="w-3 h-3" /> HARD REJECT
          </span>
        );
      case 'EARLY_REJECT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/40">
            <Clock className="w-3 h-3" /> EARLY REJECT (24h)
          </span>
        );
      case 'LATENT_SUSPECT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
            <AlertTriangle className="w-3 h-3" /> LATENT DEFECT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3" /> PASS
          </span>
        );
    }
  };

  return (
    <div className="absolute top-4 left-4 z-20 pointer-events-none transition-all duration-150">
      <div className="mission-card px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-cyan-500/30 text-xs shadow-2xl backdrop-blur-md max-w-xs">
        <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-slate-200 dark:border-cyan-500/20">
          <span className="font-mono font-bold text-cyan-800 dark:text-cyan-300 text-sm">{chip.part_id}</span>
          {getVerdictBadge()}
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-700 dark:text-slate-300">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Current ({checkpoint}h):</span>{' '}
            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
              {chip.currentValue.toFixed(1)} {pcfg.unit}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Robust Z:</span>{' '}
            <span className={`font-mono font-semibold ${chip.robustZScore >= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}`}>
              {chip.robustZScore.toFixed(2)}σ
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">24h Drift Rate:</span>{' '}
            <span className="font-mono text-slate-900 dark:text-slate-100">
              {chip.predictedSlope.toFixed(3)} {pcfg.unit}/h
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Ensemble Score:</span>{' '}
            <span className={`font-mono font-bold ${chip.ensembleScore >= 50 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {chip.ensembleScore} / 100
            </span>
          </div>
        </div>

        <div className="mt-1.5 pt-1 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between text-[11px]">
          <span className="text-slate-500 dark:text-slate-400">Datasheet Limit:</span>
          <span className={chip.passesStaticLimit ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
            {chip.passesStaticLimit ? 'PASS (< 50 µA)' : 'FAIL (> 50 µA)'}
          </span>
        </div>
      </div>
    </div>
  );
};
