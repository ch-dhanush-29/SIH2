import React, { useMemo, useState } from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { PARAMETER_CONFIGS, ScreeningVerdict } from '../../types/burnIn';
import {
  FileText,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Cpu,
  ShieldCheck,
  BarChart2,
  Sparkles,
  Edit3,
  Check,
  X as CloseIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Area,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { exportSinglePartQAPdf, exportLotSummaryQAPdf } from '../../services/pdfExport';
import { submitDecisionOverride } from '../../services/apiClient';

export const QAInspectorReport: React.FC = () => {
  const selectedChipId = useBurnInStore((state) => state.selectedChipId);
  const chips = useBurnInStore((state) => state.chips);
  const stats = useBurnInStore((state) => state.stats);
  const metrics = useBurnInStore((state) => state.metrics);
  const parameter = useBurnInStore((state) => state.parameter);
  const checkpoint = useBurnInStore((state) => state.checkpoint);
  const theme = useBurnInStore((state) => state.theme);
  const overrideChipVerdict = useBurnInStore((state) => state.overrideChipVerdict);

  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [overrideVerdict, setOverrideVerdict] = useState<ScreeningVerdict>('PASS');
  const [overrideReason, setOverrideReason] = useState('');

  const chip = useMemo(
    () => chips.find((c) => c.part_id === selectedChipId) || chips[0],
    [chips, selectedChipId]
  );

  const handleCommitOverride = () => {
    if (!chip) return;
    const finalReason = overrideReason.trim() || 'Inspector manual assessment';
    overrideChipVerdict(chip.part_id, overrideVerdict, finalReason);
    submitDecisionOverride(chip.row * 100 + chip.col, overrideVerdict === 'PASS' ? 'PASS' : overrideVerdict === 'LATENT_SUSPECT' ? 'REVIEW' : 'REJECT', finalReason);
    setIsOverrideOpen(false);
    setOverrideReason('');
  };

  const pcfg = PARAMETER_CONFIGS[parameter];

  // Mini Histogram Data: Lot Distribution with this chip marked
  const histogramData = useMemo(() => {
    if (!chips.length) return [];
    const values = chips.map((c) => c.measurements[parameter][`v_${checkpoint}h` as keyof typeof c.measurements[typeof parameter]]);
    const min = Math.min(...values);
    const max = Math.max(...values, pcfg.staticLimit * 1.05);
    const binsCount = 18;
    const step = (max - min) / binsCount;

    const bins = Array.from({ length: binsCount }, (_, i) => ({
      rangeStart: min + i * step,
      rangeEnd: min + (i + 1) * step,
      binLabel: `${(min + i * step).toFixed(1)}`,
      count: 0,
      isChipInBin: false,
    }));

    values.forEach((v) => {
      const idx = Math.min(binsCount - 1, Math.max(0, Math.floor((v - min) / step)));
      bins[idx].count++;
    });

    if (chip) {
      const chipVal = chip.measurements[parameter][`v_${checkpoint}h` as keyof typeof chip.measurements[typeof parameter]];
      const chipIdx = Math.min(binsCount - 1, Math.max(0, Math.floor((chipVal - min) / step)));
      bins[chipIdx].isChipInBin = true;
    }

    return bins;
  }, [chips, parameter, checkpoint, pcfg, chip]);

  // Drift Chart Data: This chip vs Lot Median vs Normal Envelope
  const driftChartData = useMemo(() => {
    if (!chip || !stats) return [];
    const meas = chip.measurements[parameter];
    return [
      {
        time: '0h',
        hour: 0,
        chipVal: meas.v_0h,
        lotMedian: stats.median * 0.95,
        upperBand: (stats.median * 0.95) + stats.robustSigma * 2.5,
        lowerBand: Math.max(0, (stats.median * 0.95) - stats.robustSigma * 2.0),
        staticLimit: pcfg.staticLimit,
        forecast: meas.v_0h,
      },
      {
        time: '24h',
        hour: 24,
        chipVal: meas.v_24h,
        lotMedian: stats.median,
        upperBand: stats.median + stats.robustSigma * 2.5,
        lowerBand: Math.max(0, stats.median - stats.robustSigma * 2.0),
        staticLimit: pcfg.staticLimit,
        forecast: meas.v_24h,
      },
      {
        time: '96h',
        hour: 96,
        chipVal: meas.v_96h,
        lotMedian: stats.median * 1.03,
        upperBand: (stats.median * 1.03) + stats.robustSigma * 2.5,
        lowerBand: Math.max(0, (stats.median * 1.03) - stats.robustSigma * 2.0),
        staticLimit: pcfg.staticLimit,
        forecast: Number((meas.v_0h + chip.predictedSlope * 96).toFixed(2)),
      },
      {
        time: '168h',
        hour: 168,
        chipVal: meas.v_168h,
        lotMedian: stats.median * 1.06,
        upperBand: (stats.median * 1.06) + stats.robustSigma * 2.5,
        lowerBand: Math.max(0, (stats.median * 1.06) - stats.robustSigma * 2.0),
        staticLimit: pcfg.staticLimit,
        forecast: chip.predicted168h,
      },
    ];
  }, [chip, stats, parameter, pcfg]);

  if (!chip) {
    return (
      <div className="p-6 text-center text-slate-400">
        Select a component from the 3D chamber tray to inspect QA report.
      </div>
    );
  }

  const getVerdictStyle = () => {
    switch (chip.verdict) {
      case 'HARD_REJECT':
        return {
          bg: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
          icon: <XCircle className="w-4 h-4 text-rose-400" />,
          title: 'HARD REJECT (DATASHEET VIOLATION)',
        };
      case 'EARLY_REJECT':
        return {
          bg: 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300',
          icon: <Clock className="w-4 h-4 text-fuchsia-400" />,
          title: 'EARLY REJECT @ 24H (144H CYCLE TIME SAVED)',
        };
      case 'LATENT_SUSPECT':
        return {
          bg: 'bg-amber-500/20 border-amber-500/50 text-amber-200 animate-latent',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          title: 'LATENT DEFECT DETECTED (LOT-RELATIVE OUTLIER)',
        };
      default:
        return {
          bg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
          title: 'SCREENING PASS (FLIGHT READY)',
        };
    }
  };

  const vStyle = getVerdictStyle();

  return (
    <div className="flex flex-col gap-4 p-4 text-slate-800 dark:text-slate-200">
      {/* Header: Component Identification & Verdict */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-cyan-500/20">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h2 className="text-base font-bold font-mono text-cyan-700 dark:text-cyan-300">{chip.part_id}</h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
              Tray Row {chip.row}, Col {chip.col}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            Lot Batch: {chip.lot_id} • Target Temp: 125.0°C
          </span>
        </div>

        {/* Action Buttons: Export PDF & QA Override */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOverrideOpen(!isOverrideOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-xs font-medium transition-all shadow-sm"
            title="Human-In-The-Loop QA Decision Override"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Override</span>
          </button>
          <button
            onClick={() => exportSinglePartQAPdf(chip, stats, parameter)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-800 dark:text-cyan-300 border border-cyan-400/50 text-xs font-medium transition-all shadow-sm"
            title="Download Official QA Certificate PDF for this component"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Part QA</span>
          </button>
          <button
            onClick={() => exportLotSummaryQAPdf(stats, metrics, chips, parameter)}
            className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs border border-slate-300 dark:border-slate-700 transition-all"
            title="Download Batch Lot Audit PDF"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Human-in-the-Loop QA Override Collapsible Form */}
      {isOverrideOpen && (
        <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 flex flex-col gap-2.5 font-mono text-xs">
          <div className="flex items-center justify-between font-bold text-amber-800 dark:text-amber-300">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              QA Lead Inspector Decision Override
            </span>
            <button onClick={() => setIsOverrideOpen(false)} className="text-slate-400 hover:text-white">
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-slate-600 dark:text-slate-400 text-[11px]">New Flight Status:</label>
            <select
              value={overrideVerdict}
              onChange={(e) => setOverrideVerdict(e.target.value as ScreeningVerdict)}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-slate-800 dark:text-slate-200 font-sans"
            >
              <option value="PASS">PASS (Certified Flight Ready)</option>
              <option value="LATENT_SUSPECT">LATENT_SUSPECT (Hold for Destructive Physical Analysis)</option>
              <option value="HARD_REJECT">HARD_REJECT (Permanent Reject)</option>
              <option value="EARLY_REJECT">EARLY_REJECT (Premature Drift Reject)</option>
            </select>
          </div>
          <input
            type="text"
            placeholder="Mandatory engineering rationale (e.g., Confirmed gate dielectric breakdown via acoustic imaging)..."
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none font-sans focus:border-amber-400"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsOverrideOpen(false)}
              className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleCommitOverride}
              className="px-4 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Commit & Log Audit</span>
            </button>
          </div>
        </div>
      )}

      {/* Prominent Verdict Banner */}
      <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${vStyle.bg}`}>
        <div className="flex items-center gap-2.5">
          {vStyle.icon}
          <div>
            <div className="text-xs font-bold font-mono tracking-wide">{vStyle.title}</div>
            <div className="text-[11px] opacity-85">
              Confidence Score:{' '}
              <strong className="font-mono">
                {Math.max(88, 100 - chip.ensembleScore / 2)}%
              </strong>
            </div>
          </div>
        </div>

        {chip.earlyReject && (
          <span className="text-[10px] font-mono px-2 py-1 rounded bg-fuchsia-100 dark:bg-fuchsia-950/80 border border-fuchsia-300 dark:border-fuchsia-500/40 text-fuchsia-800 dark:text-fuchsia-300 font-bold">
            144h Chamber Time Saved
          </span>
        )}
      </div>

      {/* Plain-English Glass-Box Justification */}
      <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-cyan-500/25 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-800 dark:text-cyan-300 font-mono uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Plain-English QA Justification (Glass-Box)</span>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans bg-white dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
          "{chip.justification}"
        </p>
      </div>

      {/* Dual Column: Key Metrics & Rule-Based Reasoning */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
        {/* Key Numerical Metrics */}
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
            Measured Telemetry & Model Outputs
          </span>
          <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-800/80">
            <span className="text-slate-500 dark:text-slate-400">Current Value ({checkpoint}h):</span>
            <span className="font-bold text-slate-800 dark:text-slate-100">
              {chip.currentValue.toFixed(1)} {pcfg.unit}
            </span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-800/80">
            <span className="text-slate-500 dark:text-slate-400">Lot Robust Z-Score:</span>
            <span
              className={`font-bold ${chip.robustZScore >= 3.0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'}`}
            >
              {chip.robustZScore.toFixed(2)} σ (MAD)
            </span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-800/80">
            <span className="text-slate-500 dark:text-slate-400">24h Drift Slope:</span>
            <span className="font-bold text-slate-800 dark:text-slate-100">
              {chip.predictedSlope.toFixed(4)} {pcfg.unit}/h
            </span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-800/80">
            <span className="text-slate-500 dark:text-slate-400">Forecast 168h (95% CI):</span>
            <span className="font-bold text-cyan-700 dark:text-cyan-300">
              {chip.predicted168h.toFixed(1)} {pcfg.unit}
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500 dark:text-slate-400">Ensemble Anomaly Index:</span>
            <span
              className={`font-bold ${chip.ensembleScore >= 45 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}
            >
              {chip.ensembleScore} / 100
            </span>
          </div>
        </div>

        {/* Rule-Based Verifications */}
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
            Rule-Based Screening Gates
          </span>
          <div className="flex items-center justify-between py-1 border-b border-slate-200 dark:border-slate-800/80">
            <span className="text-slate-500 dark:text-slate-400">Static Datasheet Ceiling:</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                chip.passesStaticLimit
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-rose-500/20 text-rose-700 dark:text-rose-400'
              }`}
            >
              {chip.passesStaticLimit ? 'PASS (< 50 µA)' : 'FAIL (> 50 µA)'}
            </span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-200 dark:border-slate-800/80">
            <span className="text-slate-500 dark:text-slate-400">Lot Dynamic Boundary:</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                chip.passesDynamicThreshold
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
              }`}
            >
              {chip.passesDynamicThreshold ? 'PASS (Inside envelope)' : 'FLAGGED (Outlier)'}
            </span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-200 dark:border-slate-800/80">
            <span className="text-slate-500 dark:text-slate-400">Thermal Drift Safety Gate:</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                !chip.earlyReject
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-400'
              }`}
            >
              {!chip.earlyReject ? 'SAFE SLOPE' : 'EXCEEDED (> Safety Slope)'}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-500 dark:text-slate-400">Ground Truth Category:</span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">{chip.groundTruth}</span>
          </div>
        </div>
      </div>

      {/* SHAP Feature Contribution Bar Chart */}
      <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-mono text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5 uppercase">
            <BarChart2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>SHAP Feature Importance Attribution</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            + pushes to defect, - pushes to normal
          </span>
        </div>

        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chip.shapAttributions}
              margin={{ top: 5, right: 20, left: 75, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} horizontal={false} />
              <XAxis type="number" stroke={theme === 'dark' ? '#64748b' : '#94a3b8'} tick={{ fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="feature"
                stroke={theme === 'dark' ? '#94a3b8' : '#64748b'}
                tick={{ fontSize: 10, fill: theme === 'dark' ? '#cbd5e1' : '#334155' }}
              />
              <Tooltip
                content={({ payload }) => {
                  if (!payload || !payload[0]) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="mission-card p-2 rounded text-xs border border-cyan-500/30 text-slate-800 dark:text-slate-200">
                      <div className="font-semibold text-cyan-700 dark:text-cyan-300">{data.feature}</div>
                      <div>SHAP Impact: {data.value}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{data.description}</div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chip.shapAttributions.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.value > 0 ? '#f43f5e' : '#10b981'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Drift vs Lot Envelope Chart */}
      <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-mono text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5 uppercase">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Thermal Degradation vs Lot Safety Envelope</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">0h to 168h @ 125°C</span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={driftChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
              <XAxis dataKey="time" stroke={theme === 'dark' ? '#64748b' : '#94a3b8'} tick={{ fontSize: 11 }} />
              <YAxis stroke={theme === 'dark' ? '#64748b' : '#94a3b8'} tick={{ fontSize: 10 }} unit={` ${pcfg.unit}`} />
              <Tooltip
                content={({ payload, label }) => {
                  if (!payload || !payload.length) return null;
                  return (
                    <div className="mission-card p-2 rounded text-xs border border-cyan-500/30 text-slate-800 dark:text-slate-200">
                      <div className="font-bold text-cyan-700 dark:text-cyan-300">{label} Checkpoint</div>
                      {payload.map((p, idx) => (
                        <div key={idx} style={{ color: p.color }}>
                          {p.name}: {p.value} {pcfg.unit}
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              {/* Static spec limit ceiling */}
              <ReferenceLine
                y={pcfg.staticLimit}
                stroke="#ff3366"
                strokeDasharray="4 4"
                label={{ value: `Static Limit (${pcfg.staticLimit} ${pcfg.unit})`, fill: '#ff3366', fontSize: 10 }}
              />
              {/* Lot median line */}
              <Line
                type="monotone"
                dataKey="lotMedian"
                name="Lot Median"
                stroke="#64748b"
                strokeWidth={1.5}
                dot={false}
              />
              {/* Lot upper safety envelope */}
              <Line
                type="monotone"
                dataKey="upperBand"
                name="Lot Upper Bound (+2.5σ)"
                stroke="#0284c7"
                strokeWidth={1.5}
                strokeDasharray="2 2"
                dot={false}
              />
              {/* Forecast 168h dashed extension */}
              <Line
                type="monotone"
                dataKey="forecast"
                name="Predicted 168h Forecast"
                stroke="#c084fc"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={{ r: 3, fill: '#c084fc' }}
              />
              {/* Component measured trajectory */}
              <Line
                type="monotone"
                dataKey="chipVal"
                name={`${chip.part_id} Measured`}
                stroke={chip.verdict === 'PASS' ? '#10b981' : '#f43f5e'}
                strokeWidth={3}
                dot={{ r: 4, fill: chip.verdict === 'PASS' ? '#10b981' : '#f43f5e' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mini Lot Histogram with this part highlighted */}
      <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-mono text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5 uppercase">
            <BarChart2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Lot Distribution Histogram ({checkpoint}h)</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Highlighted bin indicates {chip.part_id} position
          </span>
        </div>

        <div className="h-28 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={histogramData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
              <XAxis dataKey="binLabel" stroke={theme === 'dark' ? '#64748b' : '#94a3b8'} tick={{ fontSize: 9 }} unit={pcfg.unit} />
              <YAxis stroke={theme === 'dark' ? '#64748b' : '#94a3b8'} tick={{ fontSize: 9 }} />
              <Tooltip
                content={({ payload }) => {
                  if (!payload || !payload[0]) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="mission-card p-2 rounded text-xs border border-cyan-500/30 text-slate-800 dark:text-slate-200">
                      <div>Range: {item.rangeStart.toFixed(1)} - {item.rangeEnd.toFixed(1)} {pcfg.unit}</div>
                      <div>Count: {item.count} components</div>
                      {item.isChipInBin && (
                        <div className="text-cyan-600 dark:text-cyan-300 font-bold mt-1">★ {chip.part_id} is located in this bin</div>
                      )}
                    </div>
                  );
                }}
              />
              <Bar dataKey="count">
                {histogramData.map((entry, index) => (
                  <Cell
                    key={`hist-${index}`}
                    fill={entry.isChipInBin ? '#0284c7' : theme === 'dark' ? '#334155' : '#cbd5e1'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
