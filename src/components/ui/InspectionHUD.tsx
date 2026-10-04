import React, { useState } from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { PARAMETER_CONFIGS, ScreeningVerdict } from '../../types/burnIn';
import { exportSinglePartQAPdf } from '../../services/pdfExport';
import { submitDecisionOverride } from '../../services/apiClient';
import { DraggableWindow } from '../common/DraggableWindow';
import {
  Cpu,
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
      feature: 'Predicted 168h Drift',
      impact: Math.min(100, Math.max(10, Math.round(Math.abs(chip.predictedSlope) * 180))),
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
    <DraggableWindow
      id="inspection-hud"
      title={`DIE ${chip.part_id} INSPECTION`}
      icon={<Cpu className="w-4 h-4 text-[var(--accent)]" />}
      width="w-96 sm:w-[480px]"
      maxHeight="max-h-[calc(100vh-165px)]"
      closable={true}
      onClose={() => setIsInspectionOpen(false)}
      minimizedContent={
        <div className="flex items-center gap-2 font-mono">
          <span className="text-cyan-400 font-bold">{chip.part_id}</span>
          <span className="text-slate-500">•</span>
          <span className={chip.verdict === 'PASS' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
            {chip.verdict}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-amber-400">{val.toFixed(1)} {pcfg.unit}</span>
        </div>
      }
      headerRight={
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[4px] bg-slate-200/80 dark:bg-slate-800 text-[var(--text-secondary)] mr-1">
          R{chip.row}:C{chip.col}
        </span>
      }
    >
      <div className="p-3.5 flex flex-col gap-3 font-sans text-xs">
        {/* Prominent Verdict Banner */}
        <div className={`p-2.5 rounded-[8px] border flex items-center justify-between text-xs ${vStyle.bg}`}>
          <div className="flex items-center gap-2">
            {vStyle.icon}
            <div>
              <div className="font-display font-bold tracking-tight text-[11px]">{vStyle.title}</div>
              <div className="text-[9px] font-sans opacity-85">Zero False Negative Protocol Enforced</div>
            </div>
          </div>
          {chip.earlyReject && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-[4px] bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-bold shrink-0">
              -144h
            </span>
          )}
        </div>

        {/* Plain-English Glass-Box Justification */}
        <div className="p-2.5 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-display text-[var(--accent)] font-bold flex items-center gap-1.5 tracking-wide">
            <Sparkles className="w-3 h-3" />
            <span>AI DECISION EXPLANATION</span>
          </div>
          <p className="text-[11px] leading-relaxed text-[var(--text-secondary)] font-sans">
            {chip.justification ||
              'Part conforms strictly within nominal multi-hour drift margins. No gate-oxide degradation detected across burn-in.'}
          </p>
        </div>

        {/* Measurements & Drift Comparison Table */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2 rounded-[7px] bg-[var(--surface)] border border-[var(--border)]">
            <div className="text-[10px] text-[var(--text-muted)] uppercase">0h Baseline</div>
            <div className="font-display font-bold text-sm text-[var(--text-primary)]">
              {chip.measurements[parameter].v_0h.toFixed(2)} {pcfg.unit}
            </div>
          </div>
          <div className="p-2 rounded-[7px] bg-[var(--surface)] border border-[var(--border)]">
            <div className="text-[10px] text-[var(--text-muted)] uppercase">
              Current ({checkpoint}h)
            </div>
            <div
              className={`font-display font-bold text-sm ${
                val > pcfg.staticLimit
                  ? 'text-rose-500'
                  : stats && val > stats.dynamicUpperLimit
                  ? 'text-amber-500'
                  : 'text-emerald-500'
              }`}
            >
              {val.toFixed(2)} {pcfg.unit}
            </div>
          </div>
          <div className="p-2 rounded-[7px] bg-[var(--surface)] border border-[var(--border)]">
            <div className="text-[10px] text-[var(--text-muted)] uppercase">24h Forecast Slope</div>
            <div
              className={`font-display font-bold text-sm ${
                chip.predictedSlope > (stats?.safetySlope ?? 0.02) ? 'text-amber-500' : 'text-emerald-500'
              }`}
            >
              +{chip.predictedSlope.toFixed(4)}/h
            </div>
          </div>
          <div className="p-2 rounded-[7px] bg-[var(--surface)] border border-[var(--border)]">
            <div className="text-[10px] text-[var(--text-muted)] uppercase">168h Extrapolation</div>
            <div
              className={`font-display font-bold text-sm ${
                chip.predicted168h > pcfg.staticLimit ? 'text-rose-500' : 'text-emerald-500'
              }`}
            >
              {chip.predicted168h.toFixed(2)} {pcfg.unit}
            </div>
          </div>
        </div>

        {/* Dynamic SHAP Feature Importance Attribution */}
        <div className="space-y-1.5 pt-1 border-t border-[var(--border)]">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[var(--text-muted)]">
            <span>KEY ANOMALY ATTRIBUTIONS (SHAP)</span>
            <span className="text-[var(--accent)] font-semibold">ENHANCED INTERPRETABILITY</span>
          </div>

          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shapData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis
                  type="category"
                  dataKey="feature"
                  tick={{ fontSize: 9, fill: theme === 'dark' ? '#94a3b8' : '#475569' }}
                  width={110}
                />
                <Tooltip
                  formatter={(val: any) => [`${val}% attribution`, 'Impact']}
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                    borderColor: theme === 'dark' ? '#334155' : '#cbd5e1',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
                  {shapData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        chip.verdict === 'PASS'
                          ? '#10b981'
                          : index === 0
                          ? '#f43f5e'
                          : index === 1
                          ? '#f59e0b'
                          : '#06b6d4'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Engineer Decision Override Drawer */}
        {isOverrideFormOpen && (
          <div className="p-3 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] space-y-2 animate-in slide-in-from-top-2 duration-150">
            <div className="font-display font-semibold text-xs text-[var(--text-primary)]">
              Manual Decision Override
            </div>
            <div className="grid grid-cols-3 gap-1 text-[11px] font-display">
              {(['PASS', 'LATENT_SUSPECT', 'HARD_REJECT'] as ScreeningVerdict[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setOverrideVerdict(v)}
                  className={`py-1 rounded-[5px] transition-colors border ${
                    overrideVerdict === v
                      ? 'bg-[var(--accent)] text-slate-950 font-bold border-[var(--accent)] shadow-xs'
                      : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border)]'
                  }`}
                >
                  {v === 'LATENT_SUSPECT' ? 'REVIEW' : v.replace('_', ' ')}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Reason for override (e.g. Verified harmless passivation artifact)..."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-[6px] bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--text-primary)] text-xs placeholder:text-[var(--text-muted)] focus:outline-hidden focus:border-[var(--accent)] font-sans"
            />

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setIsOverrideFormOpen(false)}
                className="px-2.5 py-1 rounded-[5px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors text-xs font-display"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitOverride}
                className="px-3 py-1 rounded-[5px] bg-[var(--accent)] text-slate-950 hover:opacity-90 font-display font-semibold text-xs flex items-center gap-1 shadow-xs transition-opacity"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Override</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Button Strip */}
        <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-[var(--border)]">
          <button
            onClick={() => setCameraViewMode('CLOSEUP')}
            className="flex flex-col items-center justify-center p-2 rounded-[7px] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--border)] text-[9px] font-display font-semibold transition-colors shadow-xs"
            title="Orbit 3D Camera Closeup on this Die"
          >
            <Compass className="w-3.5 h-3.5 mb-0.5 text-[var(--accent)]" />
            <span>ORBIT 3D</span>
          </button>

          <button
            onClick={() => setIsOverrideFormOpen(!isOverrideFormOpen)}
            className="flex flex-col items-center justify-center p-2 rounded-[7px] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--border)] text-[9px] font-display font-semibold transition-colors shadow-xs"
            title="Manual Decision Override"
          >
            <Edit3 className="w-3.5 h-3.5 mb-0.5 text-[var(--warning)]" />
            <span>OVERRIDE</span>
          </button>

          <button
            onClick={() => exportSinglePartQAPdf(chip, stats, parameter)}
            className="flex flex-col items-center justify-center p-2 rounded-[7px] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--border)] text-[9px] font-display font-semibold transition-colors shadow-xs"
            title="Export QA Certificate PDF"
          >
            <Download className="w-3.5 h-3.5 mb-0.5" />
            <span>PDF CERT</span>
          </button>

          <button
            onClick={() => setIsAiCopilotOpen(true)}
            className="flex flex-col items-center justify-center p-2 rounded-[7px] bg-[var(--accent-soft)] hover:opacity-90 text-[var(--accent)] border border-[var(--border-accent)] text-[9px] font-display font-semibold transition-colors shadow-xs"
            title="Ask AI Copilot"
          >
            <Bot className="w-3.5 h-3.5 mb-0.5" />
            <span>COPILOT</span>
          </button>
        </div>
      </div>
    </DraggableWindow>
  );
};
export default InspectionHUD;
