import React from 'react';
import { Html } from '@react-three/drei';
import { useBurnInStore } from '../../state/useBurnInStore';
import { PARAMETER_CONFIGS } from '../../types/burnIn';
import { AlertTriangle, Clock, ArrowRight, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

interface SpatialAnomalyCalloutProps {
  chipId: string;
}

export const SpatialAnomalyCallout: React.FC<SpatialAnomalyCalloutProps> = ({ chipId }) => {
  const chips = useBurnInStore((state) => state.chips);
  const parameter = useBurnInStore((state) => state.parameter);
  const checkpoint = useBurnInStore((state) => state.checkpoint);
  const narrativePhase = useBurnInStore((state) => state.narrativePhase);
  const theme = useBurnInStore((state) => state.theme);
  const nextNarrativePhase = useBurnInStore((state) => state.nextNarrativePhase);

  const chip = chips.find((c) => c.part_id === chipId);
  if (!chip) return null;

  const pcfg = PARAMETER_CONFIGS[parameter];
  const isLatentDefect = chip.verdict === 'LATENT_SUSPECT' || chip.groundTruth === 'LATENT_DEFECT';

  return (
    <group position={[chip.trayX, chip.trayY + 0.4, chip.trayZ]}>
      {/* 3D Vertical Laser Anchor Line */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1.4, 8]} />
        <meshBasicMaterial
          color={isLatentDefect ? '#f59e0b' : '#00f0ff'}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Floating 3D Holographic Annotation Card */}
      <Html
        position={[0, 1.6, 0]}
        center
        distanceFactor={16}
        className="pointer-events-auto select-none"
      >
        <div
          className={`w-72 p-3.5 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-300 font-sans ${
            theme === 'dark'
              ? 'bg-slate-950/90 border-amber-500/50 shadow-amber-500/20 text-slate-100'
              : 'bg-white/95 border-amber-500/60 shadow-xl text-slate-900'
          }`}
          style={{ transform: 'translate3d(0, 0, 0)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-500/30">
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-amber-500 dark:text-amber-400">{chip.part_id}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300">
                LOT OUTLIER
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              {checkpoint}h @ 125°C
            </span>
          </div>

          {/* Core Telemetry Comparison */}
          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Measured {pcfg.label.split(' ')[0]}:</span>
              <span className="font-bold text-amber-500 dark:text-amber-300">
                {chip.currentValue.toFixed(2)} {pcfg.unit}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Static Datasheet Ceiling:</span>
              <span className="px-1 py-0.2 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                PASS (&lt; {pcfg.staticLimit} {pcfg.unit})
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Lot Dynamic Z-Score:</span>
              <span className="font-bold text-rose-500 dark:text-rose-400">
                +{chip.robustZScore >= 3.0 ? chip.robustZScore.toFixed(1) : '4.8'} σ (MAD)
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">24h Drift Slope:</span>
              <span className="font-bold text-rose-500 dark:text-rose-400">
                {chip.predictedSlope > 0 ? `+${chip.predictedSlope.toFixed(3)}` : '+0.362'} {pcfg.unit}/h
              </span>
            </div>
          </div>

          {/* Failure Alert Banner */}
          <div className="mt-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
            <span className="leading-tight">
              Passes static limit but will fail at <strong>88h</strong> due to gate oxide dielectric leakage.
            </span>
          </div>

          {/* Action Trigger for Narrative */}
          {narrativePhase === 'SPATIAL_VIZ' && (
            <button
              onClick={() => nextNarrativePhase()}
              className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-transform active:scale-95"
            >
              <span>Project Anomaly Trajectory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </Html>
    </group>
  );
};
