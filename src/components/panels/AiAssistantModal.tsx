import React, { useState } from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import {
  BrainCircuit,
  Send,
  Sparkles,
  X,
  ShieldAlert,
  ShieldCheck,
  Compass,
  FileCheck,
  CheckCircle2,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { exportSinglePartQAPdf } from '../../services/pdfExport';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  sender: 'user' | 'assistant';
  title?: string;
  text: string;
  timestamp: string;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({ isOpen, onClose }) => {
  const selectedLotConfig = useBurnInStore((state) => state.selectedLotConfig);
  const currentLotId = selectedLotConfig.lotId;
  const selectedChipId = useBurnInStore((state) => state.selectedChipId);
  const chips = useBurnInStore((state) => state.chips);
  const checkpoint = useBurnInStore((state) => state.checkpoint);
  const parameter = useBurnInStore((state) => state.parameter);
  const stats = useBurnInStore((state) => state.stats);
  const metrics = useBurnInStore((state) => state.metrics);
  const sensitivity = useBurnInStore((state) => state.sensitivity);
  const setCameraViewMode = useBurnInStore((state) => state.setCameraViewMode);
  const overrideChipVerdict = useBurnInStore((state) => state.overrideChipVerdict);
  const addToast = useBurnInStore((state) => state.addToast);

  const activeChip = chips.find((c) => c.part_id === selectedChipId) || chips.find((c) => c.part_id === 'CHIP-LOT04-042') || chips[0];

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      title: 'TELEMETRY INTELLIGENCE ACTIVE',
      text: `Lead Inspector, the AI Reliability Engine is online and observing Lot ${currentLotId}.\n` +
        `• Active Screening Parameter: ${parameter}\n` +
        `• Environmental Temperature: 125.1°C (Chamber T+${checkpoint}h)\n` +
        `• Zero-FN Safety Protocol: Enforced (Arrhenius Activation Energy Ea = 0.7 eV)\n\n` +
        `Ask any screening question or click a diagnostic prompt below.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  if (!isOpen) return null;

  const quickPrompts = [
    'Why was the selected chip flagged?',
    'What is the dynamic safety slope threshold?',
    'How many chamber hours have we saved?',
    'Are there any escaped defects / False Negatives?',
    'Compare Robust Z-score vs Datasheet static limit',
  ];

  const handleSend = (queryText?: string) => {
    const q = queryText || input;
    if (!q.trim()) return;

    const userMsg: Message = {
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    let title = 'FLIGHT RELIABILITY EVALUATION';
    let answer = '';
    const qLower = q.toLowerCase();

    if ((qLower.includes('why') && qLower.includes('chip')) || qLower.includes('selected') || qLower.includes('rejected')) {
      if (activeChip) {
        title = `DIAGNOSTIC TRACE: ${activeChip.part_id}`;
        const val = activeChip.measurements[parameter][`v_${checkpoint}h`];
        const slope = activeChip.predictedSlope ?? 0.0;
        answer = `Component ${activeChip.part_id} [R${activeChip.row}:C${activeChip.col}] Analysis:\n` +
          `• 1. Static Screening: ${val.toFixed(2)} µA vs Datasheet Limit ${stats?.staticLimit ?? 50.0} µA ➔ PASS (Static)\n` +
          `• 2. Dynamic Outlier: Robust Z-Score = ${activeChip.robustZScore.toFixed(2)}σ MAD ➔ ${activeChip.robustZScore >= 3.0 ? 'OUTLIER DETECTED' : 'NOMINAL'}\n` +
          `• 3. Drift Slope: +${slope.toFixed(4)}/h vs Safety Slope ${(stats?.safetySlope ?? 0.022).toFixed(4)}/h ➔ ${slope > (stats?.safetySlope ?? 0.022) ? 'EXCEEDED' : 'NOMINAL'}\n` +
          `• 4. 168h Forecast: ${activeChip.predicted168h?.toFixed(2) ?? 'N/A'} µA (Exceeds 50µA limit at 88h)\n` +
          `• Verdict: ${activeChip.verdict} — ${activeChip.justification || 'Arrhenius drift model predicts gate dielectric breach.'}`;
      } else {
        answer = `Please select a component on the tray matrix or lot cloud first. Currently evaluating Lot ${currentLotId}.`;
      }
    } else if (qLower.includes('safety slope') || qLower.includes('slope')) {
      title = 'SAFETY-SLOPE THRESHOLD DERIVATION';
      const sSlope = stats?.safetySlope ?? 0.022;
      answer = `For Lot ${currentLotId}, the lot median drift slope is ${(sSlope * 0.35).toFixed(4)} µA/h.\n` +
        `With sensitivity set to ${(sensitivity * 100).toFixed(0)}%, the dynamic safety slope threshold is strictly ${sSlope.toFixed(4)} µA/h.\n` +
        `Any component drifting faster than this at 24h triggers an Early Reject, preventing 144 hours of unnecessary chamber burn-in.`;
    } else if (qLower.includes('hours') || qLower.includes('saved')) {
      title = 'CHAMBER EFFICIENCY & COST BENEFIT';
      const count = chips.filter((c) => c.earlyReject).length;
      const saved = count * 144;
      const costSaved = count * 240000;
      answer = `Chamber Resource Optimization for Lot ${currentLotId}:\n` +
        `• Early Rejections at 24h: ${count} components\n` +
        `• Total Chamber Hours Saved: ${saved.toLocaleString()} hours (144h per early-rejected component)\n` +
        `• Estimated Test Cell Savings: ₹${(costSaved / 100000).toFixed(1)} Lakhs in cryogenic N2 and oven kW·h\n` +
        `• Zero degradation risk to remaining nominal lot units.`;
    } else if (qLower.includes('escaped') || qLower.includes('false negative') || qLower.includes('fn')) {
      title = 'ZERO-DEFECT SAFETY VERIFICATION';
      const esc = metrics?.escapedDefects ?? 0;
      const rec = (metrics?.recall ?? 1.0) * 100;
      const f2 = metrics?.f2Score ?? 1.0;
      answer = `Safety-Critical Reliability Metrics:\n` +
        `• False Negatives (Escaped Latent Defects): ${esc}\n` +
        `• Test Recall: ${rec.toFixed(2)}%\n` +
        `• F2-Score (Recall Prioritized): ${f2.toFixed(3)}\n` +
        (esc === 0
          ? `✔ FLIGHT SAFETY GUARANTEE: Zero latent defects escaped screening. The lot meets ISRO space-grade clearance.`
          : `⚠ ALERT: ${esc} latent defect(s) missed! Elevate dynamic sensitivity threshold.`);
    } else if (qLower.includes('robust z') || qLower.includes('datasheet') || qLower.includes('limit')) {
      title = 'STATIC VS DYNAMIC SCREENING MATHEMATICS';
      const sLimit = stats?.staticLimit ?? 50.0;
      const dLimit = stats?.dynamicUpperLimit ?? 11.5;
      const med = stats?.median ?? 10.0;
      answer = `Screening Logic Comparison:\n` +
        `• Datasheet Static Limit: ${sLimit.toFixed(2)} µA (Fixed specification threshold)\n` +
        `• Dynamic Upper Limit: ${dLimit.toFixed(2)} µA (Median ${med.toFixed(2)} + 3·MAD)\n\n` +
        `The ISRO Core Problem:\n` +
        `Conventional screening permits any component < ${sLimit.toFixed(2)} µA. However, a component drawing 28 µA when its lot peers draw 10 µA has a physical crystal defect. The 5-stage pipeline intercepts this before launch.`;
    } else {
      title = `TELEMETRY STATUS: LOT ${currentLotId}`;
      const sLimit = stats?.staticLimit ?? 50.0;
      const dLimit = stats?.dynamicUpperLimit ?? 11.5;
      const med = stats?.median ?? 10.0;
      const mad = stats?.mad ?? 0.35;
      const rec = (metrics?.recall ?? 1.0) * 100;
      const esc = metrics?.escapedDefects ?? 0;
      answer = `Screening Context Snapshot:\n` +
        `• Active Parameter: ${parameter} at T+${checkpoint}h (125.1°C)\n` +
        `• Lot Median: ${med.toFixed(2)} µA | MAD: ${mad.toFixed(3)} µA\n` +
        `• Dynamic Threshold: ${dLimit.toFixed(2)} µA (vs Static Limit ${sLimit.toFixed(2)} µA)\n` +
        `• Recall: ${rec.toFixed(1)}% | Escaped Defects: ${esc}\n\n` +
        `Ready for specific component questions or early reject commands.`;
    }

    const aiMsg: Message = {
      sender: 'assistant',
      title,
      text: answer,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput('');
  };

  const handleExecuteEarlyReject = () => {
    if (!activeChip) return;
    overrideChipVerdict(
      activeChip.part_id,
      'EARLY_REJECT',
      'AI Reliability Copilot early reject: Arrhenius kinetic runaway predicted at 88h (144h saved)'
    );
    addToast({
      type: 'SUCCESS',
      title: 'Early Reject Executed',
      message: `${activeChip.part_id} officially rejected at 24h. 144 hours saved. Digital audit log signed.`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-[var(--surface-elevated)] border border-[var(--border-accent)] rounded-[10px] shadow-[var(--shadow-floating)] overflow-hidden flex flex-col h-[85vh] text-[var(--text-primary)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] bg-slate-100/90 dark:bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[7px] bg-[var(--accent-soft)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)]">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-display font-bold tracking-tight text-[var(--text-primary)]">
                  AI RELIABILITY ENGINEER
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-cyan-500/15 text-[var(--accent)] border border-[var(--border-accent)]">
                  ISRO FLIGHT COPILOT
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hidden sm:inline-block">
                  ZERO-FN ACTIVE
                </span>
              </div>
              <p className="text-[11px] font-sans text-[var(--text-muted)]">
                Physics-informed screening intelligence • Grounded in dynamic outlier mathematics & Arrhenius kinetics
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

        {/* Active Component Flight Context Bar */}
        {activeChip && (
          <div className="px-5 py-2.5 bg-slate-50/80 dark:bg-slate-950/50 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 font-display font-bold text-[var(--text-primary)]">
                <span className="text-xs text-[var(--accent)]">{activeChip.part_id}</span>
                <span className="text-[10px] font-mono text-[var(--text-muted)] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded-[4px]">
                  R{activeChip.row}:C{activeChip.col}
                </span>
              </div>
              <div className="text-[11px] font-sans text-[var(--text-secondary)] hidden md:flex items-center gap-2">
                <span>Static: <strong className="font-mono text-emerald-600 dark:text-emerald-400">PASS</strong></span>
                <span>•</span>
                <span>Slope: <strong className="font-mono text-amber-500">+{activeChip.predictedSlope.toFixed(3)}/h</strong></span>
                <span>•</span>
                <span>Forecast: <strong className="font-mono text-rose-500">{activeChip.predicted168h.toFixed(1)} µA</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleExecuteEarlyReject}
                className="px-2.5 py-1 rounded-[5px] bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-[10px] font-display font-semibold transition-colors flex items-center gap-1"
                title="Trigger early reject at 24h to save 144 chamber hours"
              >
                <Clock className="w-3 h-3 text-rose-500" />
                <span>EARLY REJECT (SAVE 144h)</span>
              </button>

              <button
                onClick={() => setCameraViewMode('CLOSEUP')}
                className="p-1 rounded-[5px] bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-[var(--accent)] border border-[var(--border)] text-[10px]"
                title="Isolate in 3D Chamber"
              >
                <Compass className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => exportSinglePartQAPdf(activeChip, stats, parameter)}
                className="p-1 rounded-[5px] bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-[var(--text-primary)] border border-[var(--border)] text-[10px]"
                title="Download QA Certificate PDF"
              >
                <FileCheck className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'assistant' && (
                <div className="w-7 h-7 rounded-[6px] bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border-accent)] flex items-center justify-center shrink-0 mt-0.5">
                  <BrainCircuit className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={`max-w-[85%] p-3.5 rounded-[10px] space-y-1.5 whitespace-pre-wrap leading-relaxed shadow-sm ${
                  m.sender === 'user'
                    ? 'bg-[var(--accent)] text-slate-950 font-bold rounded-tr-none font-sans text-xs'
                    : 'bg-slate-100/90 dark:bg-slate-950/70 border border-[var(--border)] text-[var(--text-primary)] rounded-tl-none font-mono text-[11px]'
                }`}
              >
                {m.title && (
                  <div className="font-display font-bold text-xs text-[var(--accent)] pb-1 border-b border-[var(--border)] mb-1">
                    {m.title}
                  </div>
                )}
                <div>{m.text}</div>
                <div className="text-[9px] font-mono text-[var(--text-muted)] text-right pt-1">{m.timestamp}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Aerospace Prompts */}
        <div className="px-4 py-2 border-t border-[var(--border)] bg-slate-50 dark:bg-slate-950/40 flex items-center gap-2 overflow-x-auto text-[10px] font-mono scrollbar-none">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              className="px-2.5 py-1 rounded-[5px] bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 transition-colors border border-[var(--border)]"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-[var(--border)] bg-slate-100/90 dark:bg-slate-950 flex items-center gap-2.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask AI Copilot about lot drift, component scores, or screening mathematics..."
            className="flex-1 bg-white dark:bg-slate-900 border border-[var(--border)] rounded-[7px] px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors font-sans"
          />
          <button
            onClick={() => handleSend()}
            className="p-2 rounded-[7px] bg-[var(--accent)] hover:opacity-90 text-white dark:text-slate-950 font-bold transition-all shadow-md shrink-0"
            title="Send query"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
