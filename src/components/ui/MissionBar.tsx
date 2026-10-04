import React from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { View3DMode } from '../../types/burnIn';
import {
  Flame,
  Radio,
  Eye,
  Layers,
  Thermometer,
  Sun,
  Moon,
  Sparkles,
  Bot,
  ShieldCheck,
  UploadCloud,
  Box,
  CloudRain,
  Activity,
  Grid,
  Video,
  Radar,
  BarChart2,
  RotateCcw,
} from 'lucide-react';

export const MissionBar: React.FC = () => {
  const selectedLotConfig = useBurnInStore((state) => state.selectedLotConfig);
  const presetLots = useBurnInStore((state) => state.presetLots);
  const selectLot = useBurnInStore((state) => state.selectLot);
  const telemetry = useBurnInStore((state) => state.telemetry);
  const view3DMode = useBurnInStore((state) => state.view3DMode);
  const setView3DMode = useBurnInStore((state) => state.setView3DMode);
  const toggleStreaming = useBurnInStore((state) => state.toggleStreaming);
  const isColorblindMode = useBurnInStore((state) => state.isColorblindMode);
  const toggleColorblindMode = useBurnInStore((state) => state.toggleColorblindMode);
  const theme = useBurnInStore((state) => state.theme);
  const toggleTheme = useBurnInStore((state) => state.toggleTheme);
  const startGoldenDemo = useBurnInStore((state) => state.startGoldenDemo);
  const setIsAiCopilotOpen = useBurnInStore((state) => state.setIsAiCopilotOpen);
  const isAiCopilotOpen = useBurnInStore((state) => state.isAiCopilotOpen);
  const setIsAuditOpen = useBurnInStore((state) => state.setIsAuditOpen);
  const setActivePanelTab = useBurnInStore((state) => state.setActivePanelTab);
  const resetCamera = useBurnInStore((state) => state.resetCamera);
  const metrics = useBurnInStore((state) => state.metrics);

  const visualModes: { id: View3DMode; label: string; icon: React.ReactNode }[] = [
    { id: 'CHAMBER', label: 'CHAMBER', icon: <Box className="w-3 h-3" /> },
    { id: 'LOT_CLOUD', label: '3D CLOUD', icon: <CloudRain className="w-3 h-3" /> },
    { id: 'THERMAL', label: 'THERMAL', icon: <Thermometer className="w-3 h-3" /> },
    { id: 'ANOMALY_MAP', label: 'ANOMALY MAP', icon: <Radar className="w-3 h-3" /> },
    { id: 'TRAJECTORY', label: 'TRAJECTORY', icon: <Activity className="w-3 h-3" /> },
    { id: '2D_GRID', label: '2D WAFER', icon: <Grid className="w-3 h-3" /> },
    { id: 'LIVE_VISION', label: 'LIVE VISION', icon: <Video className="w-3 h-3" /> },
  ];

  return (
    <header className="fixed top-3 left-4 right-4 z-40 flex items-center justify-between pointer-events-auto">
      {/* Left Segment: Brand & Mission Identity */}
      <div className="flex items-center gap-3 mission-hud px-3.5 py-2 rounded-xl border border-cyan-500/25 shadow-xl">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-400">
          <Flame className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-xs font-bold tracking-wider text-cyan-400">
              BURNWATCH 3D
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 font-mono">
              ISRO SIH26170
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              LIVE DIGITAL TWIN
            </span>
            <span>•</span>
            <span>125°C ARRHENIUS CHAMBER</span>
          </div>
        </div>
      </div>

      {/* Center Segment: Mode Switcher */}
      <div className="hidden lg:flex items-center gap-1 mission-hud p-1 rounded-xl border border-slate-700/60 shadow-xl font-mono text-[11px]">
        {visualModes.map((m) => {
          const isActive = view3DMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setView3DMode(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,240,255,0.25)] font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {m.icon}
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right Segment: Critical Telemetry & Action Toggles */}
      <div className="flex items-center gap-2">
        {/* Lot Selector */}
        <div className="hidden sm:flex items-center gap-1.5 mission-hud px-2.5 py-1.5 rounded-xl border border-slate-700/60 font-mono text-xs text-slate-300">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <select
            value={selectedLotConfig.lotId}
            onChange={(e) => selectLot(e.target.value)}
            className="bg-transparent text-slate-200 text-xs font-mono outline-none cursor-pointer max-w-[150px] truncate"
          >
            {presetLots.map((l) => (
              <option key={l.lotId} value={l.lotId} className="bg-slate-900 text-slate-200">
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Golden Demo Hero Trigger */}
        <button
          onClick={startGoldenDemo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 shadow-[0_0_14px_rgba(245,158,11,0.3)] transition-all animate-pulse"
          title="Play ISRO Star Demo: Part CHIP-LOT04-042 Early Reject at 24h"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>GOLDEN DEMO</span>
        </button>

        {/* AI Copilot Button */}
        <button
          onClick={() => setIsAiCopilotOpen(!isAiCopilotOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all mission-hud border ${
            isAiCopilotOpen
              ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400'
              : 'text-slate-300 border-slate-700/60 hover:text-cyan-300'
          }`}
          title="Toggle Aerospace AI Copilot"
        >
          <Bot className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">AI COPILOT</span>
        </button>

        {/* Audit Log Trigger */}
        <button
          onClick={() => setIsAuditOpen(true)}
          className="p-2 rounded-xl mission-hud border border-slate-700/60 text-slate-400 hover:text-cyan-300 transition-colors"
          title="Open Immutable Audit Trail"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
        </button>

        {/* Reliability & F2 Metrics */}
        <button
          onClick={() => setActivePanelTab('EVALUATION')}
          className="p-2 rounded-xl mission-hud border border-slate-700/60 text-slate-400 hover:text-cyan-300 transition-colors"
          title="ISRO Reliability, F2 Score & Confusion Matrix"
        >
          <BarChart2 className="w-3.5 h-3.5" />
        </button>

        {/* Data Upload Tab Switcher */}
        <button
          onClick={() => setActivePanelTab('UPLOAD')}
          className="p-2 rounded-xl mission-hud border border-slate-700/60 text-slate-400 hover:text-cyan-300 transition-colors"
          title="Upload CSV / Data Ingestion"
        >
          <UploadCloud className="w-3.5 h-3.5" />
        </button>

        {/* Camera Reset */}
        <button
          onClick={resetCamera}
          className="p-2 rounded-xl mission-hud border border-slate-700/60 text-slate-400 hover:text-cyan-300 transition-colors"
          title="Reset Camera Overview (Key: R)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Colorblind Toggle */}
        <button
          onClick={toggleColorblindMode}
          className={`p-2 rounded-xl mission-hud border transition-colors ${
            isColorblindMode
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
              : 'border-slate-700/60 text-slate-400 hover:text-slate-200'
          }`}
          title="Colorblind-Safe Palette"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl mission-hud border border-slate-700/60 text-slate-400 hover:text-amber-300 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light Engineering' : 'Dark Mission'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};
