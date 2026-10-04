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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3 text-rose-500" /> HARD REJECT
          </span>
        );
      case 'EARLY_REJECT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400 border border-fuchsia-500/30">
            <Clock className="w-3 h-3 text-fuchsia-500" /> EARLY REJECT (24h)
          </span>
        );
      case 'LATENT_SUSPECT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-amber-500" /> LATENT DEFECT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> PASS
          </span>
        );
    }
  };

  return (
    <div className="absolute top-4 left-4 z-20 pointer-events-none transition-all duration-150">
      <div className="mission-card px-3.5 py-2.5 rounded-xl border border-[var(--border)] text-xs shadow-2xl backdrop-blur-md max-w-xs">
        <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-[var(--border)]">
          <span className="font-mono font-bold text-[var(--accent)] text-sm">{chip.part_id}</span>
          {getVerdictBadge()}
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[var(--text-secondary)]">
          <div>
            <span className="text-[var(--text-muted)]">Current ({checkpoint}h):</span>{' '}
            <span className="font-mono font-semibold text-[var(--text-primary)]">
              {chip.currentValue.toFixed(1)} {pcfg.unit}
            </span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Robust Z:</span>{' '}
            <span className={`font-mono font-semibold ${chip.robustZScore >= 3 ? 'text-[var(--warning)]' : 'text-[var(--text-primary)]'}`}>
              {chip.robustZScore.toFixed(2)}σ
            </span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">24h Drift Rate:</span>{' '}
            <span className="font-mono text-[var(--text-primary)]">
              {chip.predictedSlope.toFixed(3)} {pcfg.unit}/h
            </span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Ensemble Score:</span>{' '}
            <span className={`font-mono font-bold ${chip.ensembleScore >= 50 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
              {chip.ensembleScore} / 100
            </span>
          </div>
        </div>

        <div className="mt-1.5 pt-1 border-t border-[var(--border)] flex items-center justify-between text-[11px]">
          <span className="text-[var(--text-muted)]">Datasheet Limit:</span>
          <span className={chip.passesStaticLimit ? 'text-[var(--success)] font-semibold' : 'text-[var(--danger)] font-bold'}>
            {chip.passesStaticLimit ? 'PASS (< 50 µA)' : 'FAIL (> 50 µA)'}
          </span>
        </div>
      </div>
    </div>
  );
};
