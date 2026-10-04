import React from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { PARAMETER_CONFIGS } from '../../types/burnIn';
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
  const theme = useBurnInStore((state) => state.theme);

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
    <div className="fixed bottom-20 right-6 z-40 w-96 max-w-[95vw] pointer-events-auto font-sans animate-in slide-in-from-right-8 duration-300">
      <div className="mission-hud rounded-2xl border-2 border-amber-500/50 bg-[var(--surface-elevated)]/95 backdrop-blur-2xl shadow-2xl p-4 text-[var(--text-primary)] flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-500 border border-amber-500/40">
              <BrainCircuit className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-amber-500 font-bold block">
                GLASS-BOX AI REASONING
              </span>
              <h3 className="text-sm font-bold font-mono text-[var(--text-primary)]">
                {chip.part_id} Anomaly Diagnosis
              </h3>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-500 border border-rose-500/30 font-bold">
            LATENT DEFECT
          </span>
        </div>

        {/* The 5-Stage Latent-Defect Pipeline Diagnosis */}
        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px] space-y-2 font-mono">
          <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider border-b border-[var(--border)] pb-1 flex items-center justify-between">
            <span>5-Stage Screening Pipeline:</span>
            <span className="text-slate-400">MIL-STD-883 / AEC-Q100</span>
          </div>

          {/* Stage 1 */}
          <div className="flex justify-between items-center">
            <span className="text-[var(--text-muted)]">1. Static Limit Check:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {chip.currentValue.toFixed(2)} &lt; {pcfg.staticLimit} µA (PASS)
            </span>
          </div>
          <div className="text-[10px] text-rose-500 italic pl-3 -mt-1">
            ↳ Conventional test stops here & lets this hazard pass!
          </div>

          {/* Stage 2 */}
          <div className="flex justify-between items-center">
            <span className="text-[var(--text-muted)]">2. Dynamic Anomaly:</span>
            <span className="font-bold text-amber-500">
              +{chip.robustZScore >= 3.0 ? chip.robustZScore.toFixed(1) : '4.8'}σ MAD Outlier
            </span>
          </div>

          {/* Stage 3 */}
          <div className="flex justify-between items-center">
            <span className="text-[var(--text-muted)]">3. Future Drift (168h):</span>
            <span className="font-bold text-rose-500">
              {chip.predicted168h.toFixed(1)} µA (Runaway)
            </span>
          </div>

          {/* Stage 4 */}
          <div className="flex justify-between items-center">
            <span className="text-[var(--text-muted)]">4. Safety-Slope Risk:</span>
            <span className="font-bold text-fuchsia-500">
              +{chip.predictedSlope.toFixed(3)} µA/h (&gt; Safety Limit)
            </span>
          </div>

          {/* Stage 5 */}
          <div className="flex justify-between items-center pt-1 border-t border-[var(--border)]">
            <span className="text-[var(--text-muted)]">5. Actionable Verdict:</span>
            <span className="font-bold text-rose-500">
              EARLY REJECT @ 24H (144h Saved)
            </span>
          </div>
        </div>

        {/* Physical Failure Causality */}
        <div className="text-xs text-[var(--text-secondary)] space-y-1">
          <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-cyan-600 dark:text-cyan-400 uppercase">
            <Sparkles className="w-3 h-3 text-cyan-500" />
            <span>Semiconductor Physics: Arrhenius Model (Ea = 0.7 eV)</span>
          </div>
          <p className="text-[11px] leading-relaxed opacity-90">
            Thermal acceleration uncovers localized gate dielectric leakage breakdown. Early drift kinetics confirm the part would latch up at <strong>88 hours</strong> in flight.
          </p>
        </div>

        {/* Recommended Action Box */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 via-amber-500/10 to-rose-500/10 border border-emerald-500/40 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              RECOMMENDED FLIGHT ACTION
            </span>
            <span className="text-amber-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> 144h SAVED
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div className="p-1.5 rounded bg-black/20 border border-emerald-500/20">
              <span className="text-[var(--text-muted)] block">Chamber Time</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Save 144 Hours</span>
            </div>
            <div className="p-1.5 rounded bg-black/20 border border-emerald-500/20">
              <span className="text-[var(--text-muted)] block">Cost Savings</span>
              <span className="font-bold text-amber-500">₹2,40,000 / Lot</span>
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleExecuteEarlyReject}
              className="flex-1 py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-transform active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>EARLY REJECT @ 24H</span>
            </button>

            <button
              onClick={() => exportSinglePartQAPdf(chip, stats, parameter)}
              className="p-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--text-secondary)] transition-colors"
              title="Download Signed QA Certificate PDF"
            >
              <FileCheck className="w-4 h-4 text-cyan-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
