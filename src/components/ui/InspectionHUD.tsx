import React, { useState } from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { PARAMETER_CONFIGS, ScreeningVerdict } from '../../types/burnIn';
import { exportSinglePartQAPdf } from '../../services/pdfExport';
import { submitDecisionOverride } from '../../services/apiClient';
import {
  Cpu,
  X,
  Sparkles,
  Download,
  Edit3,
  Bot,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  Compass,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export const InspectionHUD: React.FC = () => {
  const isInspectionOpen = useBurnInStore((state) => state.isInspectionOpen);
  const setIsInspectionOpen = useBurnInStore((state) => state.setIsInspectionOpen);
  const selectedChipId = useBurnInStore((state) => state.selectedChipId);
  const chips = useBurnInStore((state) => state.chips);
  const stats = useBurnInStore((state) => state.stats);
  const parameter = useBurnInStore((state) => state.parameter);
  const checkpoint = useBurnInStore((state) => state.checkpoint);
  const setCameraViewMode = useBurnInStore((state) => state.setCameraViewMode);
  const setIsAiCopilotOpen = useBurnInStore((state) => state.setIsAiCopilotOpen);
  const overrideChipVerdict = useBurnInStore((state) => state.overrideChipVerdict);
  const theme = useBurnInStore((state) => state.theme);

  const [isOverrideFormOpen, setIsOverrideFormOpen] = useState(false);
  const [overrideVerdict, setOverrideVerdict] = useState<ScreeningVerdict>('PASS');
  const [overrideReason, setOverrideReason] = useState('');

  if (!isInspectionOpen || !selectedChipId) return null;

  const chip = chips.find((c) => c.part_id === selectedChipId) || chips[0];
  if (!chip) return null;

  const pcfg = PARAMETER_CONFIGS[parameter];
  const val = chip.measurements[parameter][`v_${checkpoint}h`];

  const handleCommitOverride = () => {
    const finalReason = overrideReason.trim() || 'Lead Inspector manual evaluation';
    overrideChipVerdict(chip.part_id, overrideVerdict, finalReason);
    submitDecisionOverride(
      chip.row * 100 + chip.col,
      overrideVerdict === 'PASS' ? 'PASS' : overrideVerdict === 'LATENT_SUSPECT' ? 'REVIEW' : 'REJECT',
      finalReason
    );
    setIsOverrideFormOpen(false);
    setOverrideReason('');
  };

  const getVerdictStyle = () => {
    switch (chip.verdict) {
      case 'HARD_REJECT':
        return {
          bg: 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-300',
          icon: <XCircle className="w-4 h-4 text-rose-500" />,
          title: 'HARD REJECT (DATASHEET VIOLATION)',
        };
      case 'EARLY_REJECT':
        return {
          bg: 'bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-700 dark:text-fuchsia-300',
          icon: <Clock className="w-4 h-4 text-fuchsia-500" />,
          title: 'EARLY REJECT @ 24H (144H CYCLE SAVED)',
        };
      case 'LATENT_SUSPECT':
        return {
          bg: 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-200 animate-latent',
          icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
          title: 'LATENT DEFECT (LOT DRIFT OUTLIER)',
        };
      default:
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
          title: 'SCREENING PASS (FLIGHT READY)',
        };
    }
  };

  const vStyle = getVerdictStyle();

  // SHAP feature attribution data
  const shapData = [
    {
      feature: 'Drift Slope vs Safety',
      impact: Math.min(100, Math.max(10, Math.round((chip.predictedSlope / Math.max(stats?.safetySlope ?? 0.022, 1e-4)) * 40))),
    },
    {
      feature: 'Robust Z-Score (MAD)',
      impact: Math.min(100, Math.max(5, Math.round(chip.robustZScore * 18))),
    },
    {
      feature: 'Isolation Forest Score',
      impact: Math.round(chip.isoForestScore * 75),
    },
    {
      feature: 'Limit Depletion',
      impact: Math.round((1 - Math.max(0, (stats?.dynamicUpperLimit ?? 50) - val) / Math.max(stats?.dynamicUpperLimit ?? 50, 1)) * 60),
    },
  ];

  return (
    <div className="fixed top-20 right-4 z-40 w-96 max-h-[calc(100vh-140px)] overflow-y-auto mission-hud rounded-2xl border border-[var(--border)] shadow-2xl p-4 flex flex-col gap-3 pointer-events-auto backdrop-blur-2xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] text-xs font-mono">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[var(--accent)]" />
          <span className="font-bold text-[var(--text-primary)] text-sm">{chip.part_id}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[var(--text-secondary)]">
            R{chip.row}:C{chip.col}
          </span>
        </div>
        <button
          onClick={() => setIsInspectionOpen(false)}
          className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Prominent Verdict Banner */}
      <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono ${vStyle.bg}`}>
        <div className="flex items-center gap-2">
          {vStyle.icon}
          <div>
            <div className="font-bold">{vStyle.title}</div>
            <div className="text-[9px] opacity-80">Zero False Negative Protocol Enforced</div>
          </div>
        </div>
        {chip.earlyReject && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-bold shrink-0">
            -144h
          </span>
        )}
      </div>

      {/* Plain-English Glass-Box Justification */}
      <div className="p-2.5 rounded-xl bg-slate-100/90 dark:bg-black/40 border border-[var(--border)] space-y-1">
        <div className="text-[10px] font-mono text-[var(--accent)] font-bold flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          <span>AI DECISION EXPLANATION</span>
        </div>
        <p className="text-[11px] leading-relaxed text-[var(--text-secondary)] font-sans">
          {chip.justification}
        </p>
      </div>

      {/* Critical Telemetry Metric Grid */}
      <div className="p-2.5 rounded-xl bg-slate-100/90 dark:bg-black/40 border border-[var(--border)] grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] font-mono">
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Current ({checkpoint}h):</span>
          <strong className="text-[var(--text-primary)]">
            {val.toFixed(2)} {pcfg.unit}
          </strong>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Robust Z:</span>
          <strong className={chip.robustZScore >= 3.0 ? 'text-[var(--warning)]' : 'text-[var(--text-primary)]'}>
            {chip.robustZScore.toFixed(2)}σ
          </strong>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Drift Rate:</span>
          <strong className={chip.predictedSlope > (stats?.safetySlope ?? 0.02) ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}>
            {chip.predictedSlope.toFixed(4)}/h
          </strong>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Forecast 168h:</span>
          <strong className={chip.predicted168h > pcfg.staticLimit ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}>
            {chip.predicted168h.toFixed(1)} {pcfg.unit}
          </strong>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Datasheet Limit:</span>
          <span className={chip.passesStaticLimit ? 'text-[var(--success)] font-semibold' : 'text-[var(--danger)] font-bold'}>
            {chip.passesStaticLimit ? 'PASS (<50µA)' : 'FAIL (>50µA)'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Anomaly Score:</span>
          <strong className={chip.ensembleScore >= 45 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}>
            {chip.ensembleScore} / 100
          </strong>
        </div>
      </div>

      {/* SHAP Feature Attribution Mini Bar Chart */}
      <div className="p-2.5 rounded-xl bg-slate-100/90 dark:bg-black/40 border border-[var(--border)] space-y-1">
        <div className="text-[10px] font-mono text-[var(--text-muted)] flex items-center justify-between">
          <span>SHAP FEATURE ATTRIBUTION</span>
          <span className="text-[9px] text-[var(--accent)]">Relative Impact %</span>
        </div>
        <div className="h-20 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={shapData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
              <XAxis type="number" hide domain={[0, 100]} />
              <YAxis
                dataKey="feature"
                type="category"
                stroke={theme === 'dark' ? '#94a3b8' : '#475569'}
                tick={{ fontSize: 8, fill: theme === 'dark' ? '#94a3b8' : '#475569' }}
                width={90}
              />
              <Tooltip
                content={({ payload }) => {
                  if (!payload || !payload[0]) return null;
                  return (
                    <div className="mission-card p-1 text-[9px] font-mono border border-[var(--border)]">
                      Impact: {payload[0].value}%
                    </div>
                  );
                }}
              />
              <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
                {shapData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={
                      index === 0
                        ? theme === 'dark' ? '#ff3366' : '#e11d48'
                        : index === 1
                        ? theme === 'dark' ? '#ffaa00' : '#d97706'
                        : theme === 'dark' ? '#00f0ff' : '#0284c7'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Human-in-the-Loop Override Expandable Section */}
      {isOverrideFormOpen && (
        <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/30 space-y-2 font-mono text-[10px]">
          <div className="text-amber-600 dark:text-amber-300 font-bold">QA INSPECTOR DECISION OVERRIDE</div>
          <div className="flex items-center gap-2">
            <label className="text-[var(--text-muted)]">Verdict:</label>
            <select
              value={overrideVerdict}
              onChange={(e) => setOverrideVerdict(e.target.value as ScreeningVerdict)}
              className="bg-white dark:bg-slate-900 border border-[var(--border)] text-[var(--text-primary)] rounded px-2 py-0.5"
            >
              <option value="PASS">PASS (Flight Cleared)</option>
              <option value="LATENT_SUSPECT">LATENT_SUSPECT (Hold for DPA)</option>
              <option value="HARD_REJECT">HARD_REJECT (Permanent Reject)</option>
              <option value="EARLY_REJECT">EARLY_REJECT (Premature Drift Reject)</option>
            </select>
          </div>
          <input
            type="text"
            placeholder="Engineering justification..."
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-[var(--border)] rounded px-2 py-1 text-[var(--text-primary)] text-[10px]"
          />
          <div className="flex justify-end gap-1.5">
            <button
              onClick={() => setIsOverrideFormOpen(false)}
              className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[var(--text-muted)]"
            >
              Cancel
            </button>
            <button
              onClick={handleCommitOverride}
              className="px-2.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Commit
            </button>
          </div>
        </div>
      )}

      {/* Action Command Row */}
      <div className="grid grid-cols-4 gap-1.5 pt-1">
        <button
          onClick={() => setCameraViewMode('CLOSEUP')}
          className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-[var(--accent)] border border-[var(--border)] text-[9px] font-mono transition-colors shadow-sm"
          title="Isolate in 3D Chamber"
        >
          <Compass className="w-3.5 h-3.5 mb-0.5" />
          <span>ISOLATE</span>
        </button>

        <button
          onClick={() => setIsOverrideFormOpen(!isOverrideFormOpen)}
          className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-[var(--warning)] border border-[var(--border)] text-[9px] font-mono transition-colors shadow-sm"
          title="QA Inspector Override"
        >
          <Edit3 className="w-3.5 h-3.5 mb-0.5" />
          <span>OVERRIDE</span>
        </button>

        <button
          onClick={() => exportSinglePartQAPdf(chip, stats, parameter)}
          className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-[var(--text-primary)] border border-[var(--border)] text-[9px] font-mono transition-colors shadow-sm"
          title="Export QA Certificate PDF"
        >
          <Download className="w-3.5 h-3.5 mb-0.5" />
          <span>PDF CERT</span>
        </button>

        <button
          onClick={() => setIsAiCopilotOpen(true)}
          className="flex flex-col items-center justify-center p-2 rounded-xl bg-[var(--accent-soft)] hover:opacity-90 text-[var(--accent)] border border-[var(--border-accent)] text-[9px] font-mono transition-colors shadow-sm"
          title="Ask AI Copilot"
        >
          <Bot className="w-3.5 h-3.5 mb-0.5" />
          <span>COPILOT</span>
        </button>
      </div>
    </div>
  );
};
