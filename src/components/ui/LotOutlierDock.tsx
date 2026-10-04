import React, { useMemo } from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { PARAMETER_CONFIGS } from '../../types/burnIn';
import { DraggableWindow } from '../common/DraggableWindow';
import {
  Radar,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  Target,
  ArrowUpRight,
  Sparkles,
  Layers,
} from 'lucide-react';

export const LotOutlierDock: React.FC = () => {
  const chips = useBurnInStore((state) => state.chips);
  const stats = useBurnInStore((state) => state.stats);
  const parameter = useBurnInStore((state) => state.parameter);
  const checkpoint = useBurnInStore((state) => state.checkpoint);
  const method = useBurnInStore((state) => state.method);
  const selectedChipId = useBurnInStore((state) => state.selectedChipId);
  const selectChip = useBurnInStore((state) => state.selectChip);
  const setCameraViewMode = useBurnInStore((state) => state.setCameraViewMode);
  const setActivePanelTab = useBurnInStore((state) => state.setActivePanelTab);

  const pcfg = PARAMETER_CONFIGS[parameter];

  // Extract outliers and latent suspects
  const outlierChips = useMemo(() => {
    return chips
      .filter((c) => c.verdict !== 'PASS')
      .sort((a, b) => b.predictedSlope - a.predictedSlope);
  }, [chips]);

  const latentCount = chips.filter((c) => c.verdict === 'LATENT_SUSPECT').length;
  const hardRejectCount = chips.filter((c) => c.verdict === 'HARD_REJECT').length;
  const earlyRejectCount = chips.filter((c) => c.verdict === 'EARLY_REJECT').length;

  const handleSelectChip = (partId: string) => {
    selectChip(partId);
    setCameraViewMode('CLOSEUP');
  };

  return (
    <DraggableWindow
      id="lot-outlier"
      title="LOT OUTLIER MATRIX"
      icon={<Radar className="w-4 h-4 text-rose-500" />}
      width="w-96 sm:w-[460px]"
      maxHeight="max-h-[calc(100vh-165px)]"
      closable={true}
      minimizedContent={
        <div className="flex items-center gap-2">
          <span className="text-rose-400 font-bold font-mono">{outlierChips.length} OUTLIERS</span>
          <span className="text-slate-500">•</span>
          <span className="text-cyan-400 font-mono">DYN: {stats ? stats.dynamicUpperLimit.toFixed(1) : '--'}</span>
          <span className="text-slate-500">•</span>
          <span className="text-emerald-400 font-bold">0 ESCAPES</span>
        </div>
      }
      headerRight={
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold mr-1">
          {outlierChips.length} ANOMALIES
        </span>
      }
    >
      <div className="p-3.5 space-y-3.5 text-xs font-sans">
        {/* SECTION 1: DYNAMIC THRESHOLD VS STATIC SPEC */}
        <div className="p-3 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[var(--text-muted)] font-semibold">
            <span className="flex items-center gap-1.5 text-[var(--accent)]">
              <Target className="w-3.5 h-3.5" />
              DYNAMIC VS STATIC THRESHOLD
            </span>
            <span className="text-[var(--text-primary)] font-bold">{method.replace('_', ' ')}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono text-xs">
            <div className="p-2 rounded bg-slate-900/40 border border-slate-800">
              <span className="text-[10px] text-[var(--text-muted)] block">DYNAMIC UPPER LIMIT</span>
              <strong className="text-cyan-400 font-bold text-sm">
                {stats ? stats.dynamicUpperLimit.toFixed(2) : '--'} {pcfg.unit}
              </strong>
              <span className="text-[9px] text-slate-500 block">Median + 3.0×MAD</span>
            </div>
            <div className="p-2 rounded bg-slate-900/40 border border-slate-800">
              <span className="text-[10px] text-[var(--text-muted)] block">STATIC SPEC LIMIT</span>
              <strong className="text-rose-400 font-bold text-sm">
                {pcfg.staticLimit.toFixed(1)} {pcfg.unit}
              </strong>
              <span className="text-[9px] text-slate-500 block">Manufacturer Datasheet</span>
            </div>
          </div>

          {/* Safety Slope Margin Banner */}
          <div className="flex items-center justify-between pt-1 border-t border-[var(--border)] text-[11px] font-mono">
            <span className="text-[var(--text-muted)]">LOT SAFETY DRIFT SLOPE:</span>
            <span className="text-amber-400 font-bold">
              {stats ? stats.safetySlope.toFixed(4) : '0.0220'} {pcfg.unit}/h
            </span>
          </div>
        </div>

        {/* SECTION 2: OUTLIER CLASSIFICATION PILLS */}
        <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
          <div className="p-2 rounded-[6px] bg-amber-500/10 border border-amber-500/30">
            <span className="text-[9px] text-[var(--text-muted)] block uppercase">LATENT SUSPECTS</span>
            <strong className="text-amber-400 text-sm font-bold">{latentCount}</strong>
          </div>
          <div className="p-2 rounded-[6px] bg-fuchsia-500/10 border border-fuchsia-500/30">
            <span className="text-[9px] text-[var(--text-muted)] block uppercase">EARLY REJECTS</span>
            <strong className="text-fuchsia-400 text-sm font-bold">{earlyRejectCount}</strong>
          </div>
          <div className="p-2 rounded-[6px] bg-rose-500/10 border border-rose-500/30">
            <span className="text-[9px] text-[var(--text-muted)] block uppercase">HARD REJECTS</span>
            <strong className="text-rose-400 text-sm font-bold">{hardRejectCount}</strong>
          </div>
        </div>

        {/* SECTION 3: INTERACTIVE OUTLIER IC LIST */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[var(--text-muted)] font-semibold">
            <span className="flex items-center gap-1.5 text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              IDENTIFIED OUTLIER ICS ({outlierChips.length})
            </span>
            <span className="text-[9px] text-slate-500">CLICK TO INSPECT</span>
          </div>

          <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-1 pr-1 font-mono text-xs">
            {outlierChips.length === 0 ? (
              <div className="p-4 text-center text-slate-500">No outliers detected in current lot.</div>
            ) : (
              outlierChips.map((chip) => {
                const isSelected = chip.part_id === selectedChipId;
                const val = chip.measurements[parameter][`v_${checkpoint}h`];

                return (
                  <div
                    key={chip.part_id}
                    onClick={() => handleSelectChip(chip.part_id)}
                    className={`p-2 rounded-[6px] border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--text-primary)] shadow-sm'
                        : 'bg-[var(--surface)] hover:bg-[var(--surface)]/90 border-[var(--border)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      <div>
                        <span className="font-bold text-[var(--text-primary)] block">{chip.part_id}</span>
                        <span className="text-[10px] text-slate-500">
                          Row {chip.row}, Col {chip.col}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold text-rose-400">
                        {val.toFixed(2)} {pcfg.unit}
                      </div>
                      <div className="text-[10px] text-amber-400">
                        +{chip.predictedSlope.toFixed(3)}/h drift
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SECTION 4: ACTIONS */}
        <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
          <button
            onClick={() => handleSelectChip('IC-042')}
            className="py-1.5 px-3 rounded-[6px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 font-display font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>FOCUS STAR OUTLIER (DUT-42)</span>
          </button>

          <button
            onClick={() => setActivePanelTab('EVALUATION')}
            className="text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-1 font-mono text-xs transition-colors"
          >
            <span>FULL EVALUATION</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </DraggableWindow>
  );
};
export default LotOutlierDock;
