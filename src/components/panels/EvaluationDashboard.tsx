import React, { useMemo } from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { PARAMETER_CONFIGS } from '../../types/burnIn';
import {
  ShieldAlert,
  ShieldCheck,
  Target,
  Activity,
} from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

export const EvaluationDashboard: React.FC = () => {
  const metrics = useBurnInStore((state) => state.metrics);
  const chips = useBurnInStore((state) => state.chips);
  const parameter = useBurnInStore((state) => state.parameter);
  const theme = useBurnInStore((state) => state.theme);

  const pcfg = PARAMETER_CONFIGS[parameter];

  // Predicted vs Actual 168h Scatter Plot Data
  const scatterData = useMemo(() => {
    return chips.map((c) => ({
      part_id: c.part_id,
      predicted168: c.predicted168h,
      actual168: c.measurements[parameter].v_168h,
      verdict: c.verdict,
      groundTruth: c.groundTruth,
      isAnomalous: c.isGroundTruthDefect,
    }));
  }, [chips, parameter]);

  if (!metrics) {
    return (
      <div className="p-6 text-center text-slate-500 dark:text-slate-400">Loading evaluation telemetry...</div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 text-slate-800 dark:text-slate-200">
      {/* Headline Metric Banner: ESCAPED DEFECTS (False Negatives) */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
          metrics.escapedDefects === 0
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-500/80 text-rose-900 dark:text-rose-200 animate-radar'
        }`}
      >
        <div className="flex items-center gap-3">
          {metrics.escapedDefects === 0 ? (
            <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-500/50">
              <ShieldAlert className="w-6 h-6" />
            </div>
          )}

          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider opacity-80 block">
              Headline Screening Metric (SIH Objective)
            </span>
            <div className="text-lg font-bold font-mono">
              {metrics.escapedDefects === 0 ? (
                <span className="text-emerald-700 dark:text-emerald-400">ZERO ESCAPED DEFECTS (100% RECALL)</span>
              ) : (
                <span className="text-rose-700 dark:text-rose-400">
                  {metrics.escapedDefects} CATASTROPHIC ESCAPED DEFECT(S)!
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {metrics.escapedDefects === 0
                ? 'All latent oxide breakdowns & degradation anomalies successfully intercepted before flight integration.'
                : 'Defective parts evaded detection. In flight hardware, this causes premature in-orbit mission failure.'}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-black font-mono">
            {metrics.recall.toFixed(1)}%
          </div>
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Screening Recall</span>
        </div>
      </div>

      {/* Grid of 4 Key SIH Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 font-mono">
        {/* Recall */}
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Recall Rate</span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {metrics.recall.toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-500 mt-1">Goal: 100%</span>
        </div>

        {/* F2 Score */}
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">F2-Score (Recall 5x)</span>
          <span className="text-xl font-bold text-cyan-700 dark:text-cyan-300 mt-0.5">
            {metrics.f2Score.toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-500 mt-1">Weighted Harmonic Mean</span>
        </div>

        {/* MAE for 168h Forecast */}
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">168h Forecast MAE</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-bold text-amber-600 dark:text-amber-300">{metrics.mae168h}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{pcfg.unit}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Drift Prediction Error</span>
        </div>

        {/* Cost-Weighted Risk Penalty */}
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Risk Cost Penalty</span>
          <span
            className={`text-xl font-bold mt-0.5 ${metrics.costPenalty > 500 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}
          >
            ${metrics.costPenalty.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 mt-1">FN=$1,000 | FP=$10</span>
        </div>
      </div>

      {/* 2x2 Confusion Matrix */}
      <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-cyan-500/25 flex flex-col gap-2">
        <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold font-mono text-cyan-800 dark:text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Screening Confusion Matrix (Ground Truth vs Model)</span>
          </span>
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
            Total Components: {chips.length}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center font-mono mt-1">
          {/* True Positive */}
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 flex flex-col items-center">
            <span className="text-[10px] uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
              True Positives (TP)
            </span>
            <span className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-1">{metrics.tp}</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-500/90 mt-0.5">
              Defects correctly caught
            </span>
          </div>

          {/* False Positive */}
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 flex flex-col items-center">
            <span className="text-[10px] uppercase text-amber-700 dark:text-amber-400 tracking-wider">
              False Positives (FP)
            </span>
            <span className="text-2xl font-black text-amber-800 dark:text-amber-300 mt-1">{metrics.fp}</span>
            <span className="text-[10px] text-amber-600 dark:text-amber-500/90 mt-0.5">
              Normal re-tested ($10 penalty)
            </span>
          </div>

          {/* False Negative (CRITICAL) */}
          <div
            className={`p-3 rounded-lg flex flex-col items-center border ${
              metrics.fn > 0
                ? 'bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-500 font-bold text-rose-800 dark:text-rose-300 animate-pulse'
                : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
            }`}
          >
            <span className="text-[10px] uppercase tracking-wider text-rose-700 dark:text-rose-400 font-semibold">
              False Negatives (FN) [ESCAPES]
            </span>
            <span
              className={`text-2xl font-black mt-1 ${metrics.fn > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`}
            >
              {metrics.fn}
            </span>
            <span className="text-[10px] text-rose-600 dark:text-rose-400/90 mt-0.5">
              {metrics.fn > 0 ? 'FLIGHT DISASTER RISK ($1,000/part)' : 'Zero Escapes Verified'}
            </span>
          </div>

          {/* True Negative */}
          <div className="p-3 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col items-center">
            <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              True Negatives (TN)
            </span>
            <span className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">{metrics.tn}</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Normal parts passed</span>
          </div>
        </div>
      </div>

      {/* Predicted vs Actual 168h Drift Scatter Plot */}
      <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-mono text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5 uppercase">
            <Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Predicted vs Actual 168h Drift Scatter Plot</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Identity Line (y=x) indicates perfect 168h forecast
          </span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
              <XAxis
                type="number"
                dataKey="actual168"
                name="Actual 168h"
                stroke={theme === 'dark' ? '#64748b' : '#94a3b8'}
                tick={{ fontSize: 10 }}
                unit={` ${pcfg.unit}`}
              />
              <YAxis
                type="number"
                dataKey="predicted168"
                name="Predicted 168h"
                stroke={theme === 'dark' ? '#64748b' : '#94a3b8'}
                tick={{ fontSize: 10 }}
                unit={` ${pcfg.unit}`}
              />
              <Tooltip
                content={({ payload }) => {
                  if (!payload || !payload.length) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="mission-card p-2 rounded text-xs border border-cyan-500/30 text-slate-800 dark:text-slate-200">
                      <div className="font-bold text-cyan-700 dark:text-cyan-300">{item.part_id}</div>
                      <div>Actual 168h: {item.actual168} {pcfg.unit}</div>
                      <div>Predicted 168h: {item.predicted168} {pcfg.unit}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        Category: {item.groundTruth} • Verdict: {item.verdict}
                      </div>
                    </div>
                  );
                }}
              />
              {/* Identity 45 degree line: y = x */}
              <ReferenceLine
                stroke={theme === 'dark' ? '#00f0ff' : '#0284c7'}
                strokeDasharray="3 3"
                segment={[
                  { x: 0, y: 0 },
                  { x: pcfg.staticLimit * 1.2, y: pcfg.staticLimit * 1.2 },
                ]}
              />
              <Scatter
                name="Components"
                data={scatterData}
                fill="#38bdf8"
                shape={(props: any) => {
                  const { cx, cy, payload } = props;
                  const isAnom = payload.isAnomalous;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isAnom ? 4 : 2}
                      fill={isAnom ? '#f43f5e' : '#10b981'}
                      opacity={isAnom ? 0.95 : 0.55}
                    />
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
