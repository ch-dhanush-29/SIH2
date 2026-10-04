import React from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { PARAMETER_CONFIGS, ParameterType } from '../../types/burnIn';
import {
  Thermometer,
  Gauge,
  Wind,
  Cpu,
  ShieldAlert,
  Sliders,
  CheckCircle,
  TrendingDown,
  Info,
} from 'lucide-react';

export const TelemetryHUD: React.FC = () => {
  const telemetry = useBurnInStore((state) => state.telemetry);
  const parameter = useBurnInStore((state) => state.parameter);
  const setParameter = useBurnInStore((state) => state.setParameter);
  const stats = useBurnInStore((state) => state.stats);
  const sensitivity = useBurnInStore((state) => state.sensitivity);
  const setSensitivity = useBurnInStore((state) => state.setSensitivity);
  const isComputing = useBurnInStore((state) => state.isComputing);

  const pcfg = PARAMETER_CONFIGS[parameter];

  const parameters: ParameterType[] = ['iddq', 'leakage', 'propDelay'];

  return (
    <div className="fixed top-20 left-4 z-30 w-72 flex flex-col gap-2.5 pointer-events-auto">
      {/* System Status Panel (Bloomberg-density micro HUD) */}
      <div className="mission-hud p-3 rounded-2xl border border-cyan-500/20 shadow-2xl space-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[10px] font-mono">
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            SYSTEM NOMINAL
          </span>
          <span className="text-slate-400">LATENCY: 18ms</span>
        </div>

        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono text-slate-400">
          <div className="flex justify-between">
            <span>AI ENGINE:</span>
            <span className="text-cyan-300 font-bold">ONLINE</span>
          </div>
          <div className="flex justify-between">
            <span>MODEL:</span>
            <span className="text-cyan-300 font-bold">BW-v1.4.2</span>
          </div>
          <div className="flex justify-between">
            <span>TELEMETRY:</span>
            <span className="text-slate-200">1.2k/s</span>
          </div>
          <div className="flex justify-between">
            <span>DATABASE:</span>
            <span className="text-emerald-400 font-bold">SYNCED</span>
          </div>
        </div>
      </div>

      {/* 125°C Chamber Environmental Telemetry */}
      <div className="mission-hud p-3 rounded-2xl border border-amber-500/20 shadow-2xl space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-amber-400 font-bold pb-1 border-b border-slate-800">
          <span className="flex items-center gap-1">
            <Thermometer className="w-3.5 h-3.5" />
            CHAMBER THERMAL ESS
          </span>
          <span className="text-slate-400">SET: 125.0°C</span>
        </div>

        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-amber-300 tracking-tight">
              {telemetry.chamberTempC.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-400">°C</span>
          </div>
          <div className="text-right text-[10px] font-mono text-slate-400">
            <div>DUTY: <strong className="text-amber-300">{telemetry.heaterDutyCyclePct.toFixed(0)}%</strong></div>
            <div>N2: <strong className="text-cyan-300">{telemetry.nitrogenFlowLpm} L/m</strong></div>
          </div>
        </div>

        <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300"
            style={{ width: `${Math.min(100, (telemetry.chamberTempC / 140) * 100)}%` }}
          />
        </div>
      </div>

      {/* Parameter Switcher & Dynamic Threshold Pill */}
      <div className="mission-hud p-3 rounded-2xl border border-cyan-500/20 shadow-2xl space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1 text-cyan-400 font-bold">
            <Sliders className="w-3.5 h-3.5" />
            SCREENING PARAMETER
          </span>
          {isComputing && (
            <span className="w-2.5 h-2.5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          )}
        </div>

        <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-xl border border-slate-800">
          {parameters.map((p) => {
            const isSelected = parameter === p;
            return (
              <button
                key={p}
                onClick={() => setParameter(p)}
                className={`py-1 text-[10px] font-mono rounded-lg transition-all ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p === 'iddq' ? 'Iddq' : p === 'leakage' ? 'Leakage' : 'Prop Delay'}
              </button>
            );
          })}
        </div>

        {/* Dynamic vs Static Limits Side-by-Side */}
        {stats && (
          <div className="pt-1.5 space-y-1.5 font-mono text-[10px]">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Datasheet Static Limit:</span>
              <strong className="text-slate-200">{stats.staticLimit.toFixed(1)} {pcfg.unit}</strong>
            </div>
            <div className="flex justify-between items-center text-cyan-300">
              <span className="text-slate-400">Dynamic AI Lot Limit:</span>
              <strong className="text-cyan-300 font-bold">{stats.dynamicUpperLimit.toFixed(2)} {pcfg.unit}</strong>
            </div>
            <div className="flex justify-between items-center text-amber-300">
              <span className="text-slate-400">Lot Safety Drift Slope:</span>
              <strong className="text-amber-300 font-bold">{stats.safetySlope.toFixed(4)}/h</strong>
            </div>
          </div>
        )}

        {/* Recall Sensitivity Slider */}
        <div className="pt-1 border-t border-slate-800/80 space-y-1">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-slate-400">Recall Sensitivity:</span>
            <span className="text-emerald-400 font-bold">{(sensitivity * 100).toFixed(0)}% (Zero FN)</span>
          </div>
          <input
            type="range"
            min="0.4"
            max="0.98"
            step="0.02"
            value={sensitivity}
            onChange={(e) => setSensitivity(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-1 bg-slate-800 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};
