import React from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  XCircle,
  X,
  Target,
  Clock,
} from 'lucide-react';

interface GoldenDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoldenDemoModal: React.FC<GoldenDemoModalProps> = ({ isOpen, onClose }) => {
  const selectLot = useBurnInStore((state) => state.selectLot);
  const selectChip = useBurnInStore((state) => state.selectChip);
  const setCheckpoint = useBurnInStore((state) => state.setCheckpoint);
  const setView3DMode = useBurnInStore((state) => state.setView3DMode);
  const chips = useBurnInStore((state) => state.chips);
  const setActivePanelTab = useBurnInStore((state) => state.setActivePanelTab);

  if (!isOpen) return null;

  const handleLaunchStarDemo = () => {
    selectLot('LOT-2026-04');
    setCheckpoint(24);
    setView3DMode('CHAMBER');
    const starChip = chips.find((c) => c.part_id === 'CHIP-LOT04-042') || chips[41];
    if (starChip) {
      selectChip(starChip.part_id);
    }
    setActivePanelTab('EXPLAIN');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-[var(--surface-elevated)] border border-amber-500/40 rounded-[10px] shadow-[var(--shadow-floating)] overflow-hidden flex flex-col max-h-[90vh] text-[var(--text-primary)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[7px] bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-500">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-display font-bold tracking-tight flex items-center gap-2">
                SIH Golden Star Demo: Part CHIP-LOT04-042
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                  Critical Latent Defect
                </span>
              </h2>
              <p className="text-xs font-sans text-[var(--text-muted)]">
                Environmental Stress Screening (ESS) at 125°C — Why Static Datasheet Limits Fail
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[7px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 overflow-y-auto font-sans text-sm text-[var(--text-secondary)]">
          {/* Headline Comparison Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 space-y-2">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-mono font-bold text-xs uppercase">
                <XCircle className="w-4 h-4 text-rose-500" /> Conventional Static Limit Testing
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Static limit is <strong>50.00 µA</strong>. The component measures <strong>10.20 µA</strong> at 0h, <strong>11.10 µA</strong> at 24h, and <strong>28.50 µA</strong> at 168h.
              </p>
              <div className="px-3 py-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-mono font-bold flex items-center justify-between">
                <span>Datasheet Static Verdict:</span>
                <span className="text-emerald-600 dark:text-emerald-400">PASS (False Negative!)</span>
              </div>
              <p className="text-[11px] text-rose-600 dark:text-rose-300/80 italic">
                A dangerous flight hazard escapes screening and enters spacecraft integration.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20 space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs uppercase">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 5-Stage Latent-Defect Detection Pipeline
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                At <strong>24h</strong>, drift slope is <strong>0.362 µA/h</strong> (breaches dynamic safety slope). The 5-stage pipeline catches the runaway trajectory 144 hours early.
              </p>
              <div className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-bold flex items-center justify-between">
                <span>Pipeline Stage 5 Decision:</span>
                <span className="text-rose-600 dark:text-rose-400">EARLY REJECT @ 24H</span>
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-300/80 italic">
                Defect caught early. 144 hours of chamber burn-in oven runtime saved per defective die!
              </p>
            </div>
          </div>

          {/* Parametric Trajectory Table */}
          <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950/60 font-mono text-xs">
            <div className="px-4 py-2 bg-slate-200/80 dark:bg-slate-800/60 border-b border-[var(--border)] font-bold text-[var(--text-primary)] flex items-center justify-between">
              <span>Parametric Degradation Profile (Iddq at 125°C)</span>
              <span className="text-amber-600 dark:text-amber-400 text-[11px]">Static Limit = 50.00 µA</span>
            </div>
            <div className="grid grid-cols-5 p-3 text-center border-b border-[var(--border)] text-[var(--text-muted)] font-semibold">
              <div>Checkpoint</div>
              <div>Measured Iddq</div>
              <div>Lot Median</div>
              <div>Static Test</div>
              <div>BurnWatch AI</div>
            </div>
            <div className="divide-y divide-[var(--border)] text-[var(--text-secondary)]">
              <div className="grid grid-cols-5 p-3 text-center items-center">
                <span className="font-bold text-[var(--accent)]">0h (Initial)</span>
                <span>10.20 µA</span>
                <span className="text-[var(--text-muted)]">10.00 µA</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">PASS</span>
                <span className="text-[var(--accent)]">Baseline</span>
              </div>
              <div className="grid grid-cols-5 p-3 text-center items-center bg-amber-500/10 border-l-2 border-amber-500">
                <span className="font-bold text-amber-600 dark:text-amber-300">24h (AI Gate)</span>
                <span className="font-bold text-amber-700 dark:text-amber-200">11.10 µA</span>
                <span className="text-[var(--text-muted)]">10.20 µA</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">PASS</span>
                <span className="text-rose-600 dark:text-rose-400 font-bold">REJECT (Early Gate)</span>
              </div>
              <div className="grid grid-cols-5 p-3 text-center items-center">
                <span>96h (Intermediate)</span>
                <span>14.80 µA</span>
                <span className="text-[var(--text-muted)]">10.50 µA</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">PASS</span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">Defect Confirmed</span>
              </div>
              <div className="grid grid-cols-5 p-3 text-center items-center">
                <span>168h (Final)</span>
                <span className="text-rose-600 dark:text-rose-300 font-bold">28.50 µA</span>
                <span className="text-[var(--text-muted)]">10.80 µA</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">PASS (&lt; 50 µA)</span>
                <span className="text-rose-600 dark:text-rose-400 font-bold">Latent Failure</span>
              </div>
            </div>
          </div>

          {/* Time Saved Metric Box */}
          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--accent-soft)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white dark:text-slate-950 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-mono font-bold text-[var(--accent)]">
                  Burn-In Chamber Energy & Throughput Savings
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  Early detection at 24h cuts remaining 144 hours of thermal stressing per defective die.
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base font-bold font-mono text-[var(--accent)]">+144.0 hrs</span>
              <span className="block text-[10px] text-[var(--text-muted)]">Saved / Part</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] bg-slate-100/90 dark:bg-slate-950 flex items-center justify-between">
          <div className="text-xs text-[var(--text-muted)] font-mono">
            Lot: <span className="text-amber-600 dark:text-amber-400 font-bold">LOT-2026-04</span> | Component:{' '}
            <span className="text-amber-600 dark:text-amber-400 font-bold">CHIP-LOT04-042</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={handleLaunchStarDemo}
              className="px-5 py-2 text-xs font-mono font-bold rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Inspect in 3D Chamber Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
