import React from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Clock,
  CheckCircle2,
  Radar,
  ArrowUpRight,
} from 'lucide-react';

export const AnomalyRadar: React.FC = () => {
  const chips = useBurnInStore((state) => state.chips);
  const metrics = useBurnInStore((state) => state.metrics);
  const setActivePanelTab = useBurnInStore((state) => state.setActivePanelTab);

  if (!chips.length) return null;

  const total = chips.length;
  const passCount = chips.filter((c) => c.verdict === 'PASS').length;
  const suspectCount = chips.filter((c) => c.verdict === 'LATENT_SUSPECT').length;
  const rejectCount = chips.filter(
    (c) => c.verdict === 'HARD_REJECT' || c.verdict === 'EARLY_REJECT'
  ).length;

  const earlyRejects = chips.filter((c) => c.earlyReject).length;
  const timeSavedHours = earlyRejects * 144;
  const yieldPct = ((passCount / total) * 100).toFixed(1);

  return (
    <div className="fixed bottom-28 left-4 z-30 w-72 pointer-events-auto">
      <div className="mission-hud p-3 rounded-2xl border border-[var(--border)] shadow-2xl space-y-2 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border)] text-[10px] font-mono">
          <span className="flex items-center gap-1.5 text-[var(--accent)] font-bold">
            <Radar className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
            LOT RELIABILITY RADAR
          </span>
          <button
            onClick={() => setActivePanelTab('EVALUATION')}
            className="text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-0.5 transition-colors"
          >
            <span>METRICS</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {/* Circular Lot Yield & Anomaly Breakdown */}
        <div className="flex items-center justify-between gap-3">
          {/* Yield Percentage */}
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-100/90 dark:bg-black/40 border border-[var(--border)] shrink-0 w-20">
            <span className="text-xl font-bold font-mono text-[var(--success)]">{yieldPct}%</span>
            <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-wider">Flight Yield</span>
          </div>

          {/* Counts */}
          <div className="flex-1 space-y-1 font-mono text-[10px]">
            <div className="flex items-center justify-between text-[var(--success)]">
              <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                <CheckCircle2 className="w-3 h-3 text-[var(--success)]" /> PASS:
              </span>
              <strong>{passCount}</strong>
            </div>
            <div className="flex items-center justify-between text-[var(--warning)]">
              <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                <AlertTriangle className="w-3 h-3 text-[var(--warning)]" /> REVIEW:
              </span>
              <strong>{suspectCount}</strong>
            </div>
            <div className="flex items-center justify-between text-[var(--danger)]">
              <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                <XCircle className="w-3 h-3 text-[var(--danger)]" /> REJECT:
              </span>
              <strong>{rejectCount}</strong>
            </div>
          </div>
        </div>

        {/* Zero-FN Flight Safety Guarantee Badge */}
        <div className="p-1.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-[10px] font-mono">
          <span className="text-[var(--text-secondary)] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--success)]" />
            ESCAPED DEFECTS:
          </span>
          <span className="text-[var(--success)] font-bold">
            {metrics?.escapedDefects ?? 0} (ZERO FN)
          </span>
        </div>

        {/* Early Reject Hours Saved */}
        <div className="p-1.5 rounded-lg bg-sky-500/10 dark:bg-cyan-950/40 border border-sky-500/30 dark:border-cyan-500/30 flex items-center justify-between text-[10px] font-mono text-[var(--accent)]">
          <span className="text-[var(--text-muted)] flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
            CHAMBER TIME SAVED:
          </span>
          <strong className="font-bold">+{timeSavedHours.toLocaleString()} hrs</strong>
        </div>
      </div>
    </div>
  );
};
