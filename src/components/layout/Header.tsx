import React from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import {
  Flame,
  Radio,
  Eye,
  Layers,
  Thermometer,
  Sun,
  Moon,
  Wifi,
  Sparkles,
  Bot,
  ShieldCheck,
} from 'lucide-react';

interface HeaderProps {
  onOpenGoldenDemo?: () => void;
  onOpenAuditLog?: () => void;
  onOpenAiAssistant?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenGoldenDemo,
  onOpenAuditLog,
  onOpenAiAssistant,
}) => {
  const presetLots = useBurnInStore((state) => state.presetLots);
  const selectedLotConfig = useBurnInStore((state) => state.selectedLotConfig);
  const selectLot = useBurnInStore((state) => state.selectLot);
  const telemetry = useBurnInStore((state) => state.telemetry);
  const toggleStreaming = useBurnInStore((state) => state.toggleStreaming);
  const isColorblindMode = useBurnInStore((state) => state.isColorblindMode);
  const toggleColorblindMode = useBurnInStore((state) => state.toggleColorblindMode);
  const theme = useBurnInStore((state) => state.theme);
  const toggleTheme = useBurnInStore((state) => state.toggleTheme);

  return (
    <header className="w-full bg-white dark:bg-[#080b13] border-b border-slate-200 dark:border-cyan-500/20 px-4 py-2 flex flex-wrap items-center justify-between gap-3 select-none z-30 transition-colors duration-200">
      {/* Brand & Subtitle */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-rose-500/20 border border-cyan-500/40 shadow-sm">
          <Flame className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-wider font-mono text-cyan-700 dark:text-cyan-300 m-0 leading-none">
              BurnWatch 3D
            </h1>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-500/40 font-mono">
              ISRO-SIH26170
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono hidden sm:inline-block">
            AI-Driven Anomaly Detection in Component Burn-In & Screening
          </span>
        </div>
      </div>

      {/* Chamber Telemetry Live Display */}
      <div className="hidden xl:flex items-center gap-4 bg-slate-100 dark:bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-300">
          <Thermometer className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          <span className="text-slate-500 dark:text-slate-400">CHAMBER:</span>
          <span className="font-bold">{telemetry.chamberTempC.toFixed(1)}°C</span>
        </div>

        <div className="w-[1px] h-3.5 bg-slate-300 dark:bg-slate-800" />

        <div className="flex items-center gap-1.5 text-cyan-700 dark:text-cyan-300">
          <span className="text-slate-500 dark:text-slate-400">DUTY:</span>
          <span className="font-bold">{telemetry.heaterDutyCyclePct.toFixed(0)}%</span>
        </div>

        <div className="w-[1px] h-3.5 bg-slate-300 dark:bg-slate-800" />

        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-semibold">ZERO-FN FLIGHT BIAS</span>
        </div>
      </div>

      {/* Mission Control Actions & Toggles */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Golden Star Demo Button */}
        {onOpenGoldenDemo && (
          <button
            onClick={onOpenGoldenDemo}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 shadow-sm transition-all"
            title="Inspect ISRO Star Demo Component CHIP-LOT04-042"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>Golden Demo</span>
          </button>
        )}

        {/* AI Screening Copilot Button */}
        {onOpenAiAssistant && (
          <button
            onClick={onOpenAiAssistant}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 transition-all"
            title="Open Zero-Hallucination AI Engineering Assistant"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Copilot</span>
          </button>
        )}

        {/* Audit Log Button */}
        {onOpenAuditLog && (
          <button
            onClick={onOpenAuditLog}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:text-cyan-400 transition-all"
            title="View Immutable Audit Trail"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Audit</span>
          </button>
        )}

        {/* Lot Selector Dropdown */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 rounded-lg px-2.5 py-1 text-xs">
          <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <select
            value={selectedLotConfig.lotId}
            onChange={(e) => selectLot(e.target.value)}
            className="bg-transparent text-slate-800 dark:text-slate-200 text-xs font-mono focus:outline-none cursor-pointer max-w-[140px] sm:max-w-none truncate"
          >
            {presetLots.map((lot) => (
              <option key={lot.lotId} value={lot.lotId} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                {lot.name} ({lot.chipCount} ICs)
              </option>
            ))}
          </select>
        </div>

        {/* Live Chamber Telemetry Stream Button */}
        <button
          onClick={toggleStreaming}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
            telemetry.isStreaming
              ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/50 shadow-sm animate-pulse'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          title="Toggle Real-Time 125°C Chamber Stream Telemetry"
        >
          <Radio className="w-3 h-3" />
          <span className="hidden sm:inline">{telemetry.isStreaming ? 'STREAMING' : 'STREAM: OFF'}</span>
        </button>

        {/* Colorblind Accessibility Toggle */}
        <button
          onClick={toggleColorblindMode}
          className={`p-1.5 rounded-lg text-xs transition-colors border ${
            isColorblindMode
              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          title="Toggle Colorblind-Safe High Contrast Palette"
        >
          <Eye className="w-4 h-4" />
        </button>

        {/* Light / Dark Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg text-xs transition-all border bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-amber-300 border-slate-300 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
          aria-label="Toggle Light and Dark Theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-300" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>
      </div>
    </header>
  );
};
