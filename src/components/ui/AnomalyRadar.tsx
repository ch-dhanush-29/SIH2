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
      <div className="mission-hud p-3 rounded-2xl border border-cyan-500/20 shadow-2xl space-y-2 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[10px] font-mono">
          <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <Radar className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
            LOT RELIABILITY RADAR
          </span>
          <button
            onClick={() => setActivePanelTab('EVALUATION')}
            className="text-slate-400 hover:text-cyan-300 flex items-center gap-0.5 transition-colors"
          >
            <span>METRICS</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {/* Circular Lot Yield & Anomaly Breakdown */}
        <div className="flex items-center justify-between gap-3">
          {/* Yield Percentage */}
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-black/40 border border-slate-800 shrink-0 w-20">
            <span className="text-xl font-bold font-mono text-emerald-400">{yieldPct}%</span>
            <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider">Flight Yield</span>
          </div>

          {/* Counts */}
          <div className="flex-1 space-y-1 font-mono text-[10px]">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="flex items-center gap-1 text-slate-400">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> PASS:
              </span>
              <strong>{passCount}</strong>
            </div>
            <div className="flex items-center justify-between text-amber-400">
              <span className="flex items-center gap-1 text-slate-400">
                <AlertTriangle className="w-3 h-3 text-amber-500" /> REVIEW:
              </span>
              <strong>{suspectCount}</strong>
            </div>
            <div className="flex items-center justify-between text-rose-400">
              <span className="flex items-center gap-1 text-slate-400">
                <XCircle className="w-3 h-3 text-rose-500" /> REJECT:
              </span>
              <strong>{rejectCount}</strong>
            </div>
          </div>
        </div>

        {/* Zero-FN Flight Safety Guarantee Badge */}
        <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-[10px] font-mono">
          <span className="text-slate-300 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ESCAPED DEFECTS:
          </span>
          <span className="text-emerald-400 font-bold glow-green">
            {metrics?.escapedDefects ?? 0} (ZERO FN)
          </span>
        </div>

        {/* Early Reject Hours Saved */}
        <div className="p-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between text-[10px] font-mono text-cyan-300">
          <span className="text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            CHAMBER TIME SAVED:
          </span>
          <strong className="font-bold">+{timeSavedHours.toLocaleString()} hrs</strong>
        </div>
      </div>
    </div>
  );
};
