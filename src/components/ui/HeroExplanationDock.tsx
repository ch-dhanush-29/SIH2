import React from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { PARAMETER_CONFIGS } from '../../types/burnIn';
import { DraggableWindow } from '../common/DraggableWindow';
import {
  BrainCircuit,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  FileCheck,
  XCircle,
} from 'lucide-react';
import { exportSinglePartQAPdf } from '../../services/pdfExport';

export const HeroExplanationDock: React.FC = () => {
  const chips = useBurnInStore((state) => state.chips);
  const selectedChipId = useBurnInStore((state) => state.selectedChipId);
  const parameter = useBurnInStore((state) => state.parameter);
  const checkpoint = useBurnInStore((state) => state.checkpoint);
  const stats = useBurnInStore((state) => state.stats);
  const narrativePhase = useBurnInStore((state) => state.narrativePhase);
  const isHeroNarrativeActive = useBurnInStore((state) => state.isHeroNarrativeActive);
  const overrideChipVerdict = useBurnInStore((state) => state.overrideChipVerdict);
  const addToast = useBurnInStore((state) => state.addToast);

  // Only display when narrative is in AI_EXPLANATION or RECOMMENDED_ACTION, or when explicitly requested
  if (!isHeroNarrativeActive || (narrativePhase !== 'AI_EXPLANATION' && narrativePhase !== 'RECOMMENDED_ACTION')) {
    return null;
  }

  const chip = chips.find((c) => c.part_id === selectedChipId) || chips[41];
  if (!chip) return null;

  const pcfg = PARAMETER_CONFIGS[parameter];

  const handleExecuteEarlyReject = () => {
    overrideChipVerdict(
      chip.part_id,
      'EARLY_REJECT',
      'AI-Driven Early Reject: Arrhenius drift model predicts gate dielectric breach @ 88h (144h saved)'
    );
    addToast({
      type: 'SUCCESS',
      title: 'Early Reject Executed',
      message: `${chip.part_id} officially rejected at 24h. 144 hours saved. Digital audit log signed.`,
    });
  };

  return (
    <DraggableWindow
      id="hero-explanation"
      title="GLASS-BOX AI REASONING"
      icon={<BrainCircuit className="w-4 h-4 text-amber-500 animate-pulse" />}
      width="w-96 sm:w-[480px]"
      maxHeight="max-h-[calc(100vh-165px)]"
      closable={false}
      minimizedContent={
        <div className="flex items-center gap-2 font-mono">
          <span className="text-amber-400 font-bold">{chip.part_id}</span>
          <span className="text-slate-500">•</span>
          <span className="text-rose-400 font-bold">LATENT DEFECT</span>
          <span className="text-slate-500">•</span>
          <span className="text-cyan-400 font-semibold">-144h</span>
        </div>
      }
      headerRight={
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-rose-500/20 text-rose-500 border border-rose-500/30 font-bold mr-1">
          LATENT DEFECT
        </span>
      }
    >
      <div className="p-3.5 text-[var(--text-primary)] flex flex-col gap-3 font-sans text-xs">
        {/* Subtitle */}
        <div className="flex items-center justify-between pb-1 border-b border-[var(--border)]">
          <h3 className="text-sm font-display font-bold text-[var(--text-primary)] tracking-tight">
            {chip.part_id} Anomaly Diagnosis
          </h3>
          <span className="font-mono text-[10px] text-amber-400">T+{checkpoint}h INTERCEPT</span>
        </div>

        {/* The 5-Stage Latent-Defect Pipeline Diagnosis */}
        <div className="p-2.5 rounded-[8px] bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1.5">
          <div className="text-[10px] font-display text-amber-500 font-bold uppercase tracking-wider border-b border-[var(--border)] pb-1 flex items-center justify-between">
            <span>5-Stage Screening Pipeline:</span>
            <span className="text-slate-400 font-mono text-[9px]">MIL-STD-883 / AEC-Q100</span>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">1. Static Spec Limit:</span>
              <span className="text-emerald-400 font-mono font-semibold">PASS (14.2 &lt; 50.0 µA)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">2. Dynamic Lot Outlier:</span>
              <span className="text-amber-400 font-mono font-bold">SUSPECT (+3.42σ from Median)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">3. Drift Trajectory:</span>
              <span className="text-rose-400 font-mono font-bold">+0.362 µA/h (vs 0.022 lot nominal)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">4. Safety-Slope Risk:</span>
              <span className="text-rose-400 font-mono font-bold">16.4× LOT TOLERANCE</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-800/80 pt-1">
              <span className="text-slate-300 font-semibold">5. AI Screening Action:</span>
              <span className="text-rose-400 font-mono font-bold">EARLY REJECT @ 24H</span>
            </div>
          </div>
        </div>

        {/* Physical Failure Mechanism Explanation */}
        <div className="space-y-1.5 p-2.5 rounded-[8px] bg-[var(--surface)] border border-[var(--border)]">
          <div className="text-[10px] font-display text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Root Cause Physics (Arrhenius Extrapolation)</span>
          </div>
          <p className="text-[11px] leading-relaxed text-[var(--text-secondary)] font-sans">
            Device displays progressive gate oxide tunneling leakage. At 125°C Arrhenius acceleration, activation energy <span className="font-mono text-cyan-400">Ea = 0.72 eV</span> indicates time-dependent dielectric breakdown (TDDB) expected at <strong className="text-rose-400 font-mono">T+88h</strong>.
          </p>
        </div>

        {/* Metric Comparison Cards */}
        <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
          <div className="p-2 rounded-[6px] bg-[var(--surface)] border border-[var(--border)]">
            <span className="text-[9px] text-[var(--text-muted)] block uppercase">0h Base</span>
            <strong className="text-xs text-[var(--text-primary)]">10.42 µA</strong>
          </div>
          <div className="p-2 rounded-[6px] bg-[var(--surface)] border border-[var(--border)]">
            <span className="text-[9px] text-[var(--text-muted)] block uppercase">24h Actual</span>
            <strong className="text-xs text-amber-500">19.11 µA</strong>
          </div>
          <div className="p-2 rounded-[6px] bg-[var(--surface)] border border-[var(--border)]">
            <span className="text-[9px] text-[var(--text-muted)] block uppercase">168h Extrap</span>
            <strong className="text-xs text-rose-500">71.24 µA</strong>
          </div>
        </div>

        {/* Action Decision Card */}
        <div className="p-2.5 rounded-[8px] bg-emerald-500/10 border border-emerald-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-display font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              RECOMMENDED FLIGHT SAFETY ACTION
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-1.5 rounded-[5px] bg-black/20 border border-emerald-500/20">
              <span className="font-sans text-[var(--text-muted)] block text-[9px]">Chamber Time</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">Save 144 Hours</span>
            </div>
            <div className="p-1.5 rounded-[5px] bg-black/20 border border-emerald-500/20">
              <span className="font-sans text-[var(--text-muted)] block text-[9px]">Cost Savings</span>
              <span className="font-mono font-bold text-amber-500">₹2,40,000 / Lot</span>
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex gap-2 pt-0.5">
            <button
              onClick={handleExecuteEarlyReject}
              className="flex-1 py-1.5 px-3 rounded-[7px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-transform active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>EARLY REJECT @ 24H</span>
            </button>

            <button
              onClick={() => exportSinglePartQAPdf(chip, stats, parameter)}
              className="p-1.5 rounded-[7px] bg-[var(--surface)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--text-secondary)] transition-colors"
              title="Download Signed QA Certificate PDF"
            >
              <FileCheck className="w-4 h-4 text-cyan-500" />
            </button>
          </div>
        </div>
      </div>
    </DraggableWindow>
  );
};
export default HeroExplanationDock;
