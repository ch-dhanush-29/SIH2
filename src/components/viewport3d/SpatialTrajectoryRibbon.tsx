import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import { useBurnInStore } from '../../state/useBurnInStore';
import { PARAMETER_CONFIGS } from '../../types/burnIn';

interface SpatialTrajectoryRibbonProps {
  chipId: string;
}

export const SpatialTrajectoryRibbon: React.FC<SpatialTrajectoryRibbonProps> = ({ chipId }) => {
  const chips = useBurnInStore((state) => state.chips);
  const parameter = useBurnInStore((state) => state.parameter);
  const theme = useBurnInStore((state) => state.theme);
  const narrativePhase = useBurnInStore((state) => state.narrativePhase);
  const nextNarrativePhase = useBurnInStore((state) => state.nextNarrativePhase);

  const chip = chips.find((c) => c.part_id === chipId);
  const pcfg = PARAMETER_CONFIGS[parameter];

  const pulseRef = useRef<THREE.Mesh>(null);

  // Trajectory points in 3D relative space anchored at chip origin
  const { pastPoints, futurePoints, breachPoint } = useMemo(() => {
    if (!chip) return { pastPoints: [], futurePoints: [], breachPoint: new THREE.Vector3() };

    // Anchor at chip position
    const origin = new THREE.Vector3(chip.trayX, chip.trayY + 0.1, chip.trayZ);

    // 0h Point: at the chip package
    const p0 = origin.clone();

    // 24h Point: slight lift and forward arch
    const p24 = origin.clone().add(new THREE.Vector3(0.2, 0.75, -0.4));

    // 88h Point: crosses the static limit ceiling height!
    const p88 = origin.clone().add(new THREE.Vector3(0.55, 1.85, -1.1));

    // 168h Point: catastrophic runaway failure
    const p168 = origin.clone().add(new THREE.Vector3(1.1, 3.2, -1.9));

    // Past curve (0h -> 24h)
    const pastCurve = new THREE.CatmullRomCurve3([p0, p24]);
    const pastPts = pastCurve.getPoints(24);

    // Future predicted curve (24h -> 88h -> 168h)
    const futureCurve = new THREE.CatmullRomCurve3([p24, p88, p168]);
    const futurePts = futureCurve.getPoints(40);

    return {
      pastPoints: pastPts,
      futurePoints: futurePts,
      breachPoint: p88,
    };
  }, [chip]);

  useFrame(({ clock }) => {
    if (pulseRef.current) {
      const s = 1.0 + 0.3 * Math.sin(clock.getElapsedTime() * 6.0);
      pulseRef.current.scale.set(s, s, s);
    }
  });

  if (!chip) return null;

  return (
    <group>
      {/* 1. Measured Historical Trajectory Line (0h -> 24h) */}
      {pastPoints.length > 1 && (
        <Line
          points={pastPoints}
          color="#00f0ff"
          lineWidth={3.5}
          transparent
          opacity={0.9}
        />
      )}

      {/* 2. Projected Future Drift Trajectory (24h -> 168h) - Pulsing Runaway Curve */}
      {futurePoints.length > 1 && (
        <Line
          points={futurePoints}
          color="#f43f5e"
          lineWidth={4}
          dashed
          dashScale={2}
          dashSize={0.25}
          gapSize={0.15}
          transparent
          opacity={0.95}
        />
      )}

      {/* 3. Static Limit Ceiling Plane Marker (50 µA Datasheet Boundary) */}
      <group position={[chip.trayX + 0.5, chip.trayY + 1.85, chip.trayZ - 1.1]}>
        {/* Horizontal Red Laser Fence */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.5, 2.0]} />
          <meshBasicMaterial
            color="#ff3366"
            transparent
            opacity={theme === 'dark' ? 0.18 : 0.12}
            side={THREE.DoubleSide}
            wireframe
          />
        </mesh>

        {/* 3D Static Limit Badge */}
        <Html position={[1.4, 0.1, 0]} center distanceFactor={14}>
          <div className="px-2 py-1 rounded bg-rose-500/20 border border-rose-500/50 backdrop-blur-md text-[10px] font-mono font-bold text-rose-500 whitespace-nowrap shadow-lg flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>STATIC LIMIT CEILING (50 µA)</span>
          </div>
        </Html>
      </group>

      {/* 4. Milestone 88h Catastrophic Breach Point */}
      <group position={[breachPoint.x, breachPoint.y, breachPoint.z]}>
        <mesh ref={pulseRef}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#ff0055" />
        </mesh>

        <Html position={[0, 0.35, 0]} center distanceFactor={14}>
          <div className="px-2 py-1 rounded-md bg-rose-950/90 border border-rose-500 text-rose-200 text-[10px] font-mono font-bold shadow-2xl flex flex-col items-center whitespace-nowrap">
            <span className="text-amber-300">★ PREDICTED BREACH @ 88H</span>
            <span className="text-[9px] text-slate-300 opacity-90">144h Early Warning Caught</span>
          </div>
        </Html>
      </group>

      {/* 5. 24h Current Time Marker */}
      {pastPoints.length > 0 && (
        <group position={[pastPoints[pastPoints.length - 1].x, pastPoints[pastPoints.length - 1].y, pastPoints[pastPoints.length - 1].z]}>
          <mesh>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshBasicMaterial color="#00f0ff" />
          </mesh>

          <Html position={[0, -0.3, 0]} center distanceFactor={14}>
            <div className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-[9px] font-mono font-semibold whitespace-nowrap">
              CURRENT (24h)
            </div>
          </Html>
        </group>
      )}

      {/* 6. Narrative Step Advance Trigger Button */}
      {narrativePhase === 'TRAJECTORY_RENDER' && (
        <Html
          position={[chip.trayX, chip.trayY + 2.5, chip.trayZ]}
          center
          distanceFactor={16}
        >
          <div className="mission-card p-3 rounded-xl border border-cyan-500/50 shadow-2xl backdrop-blur-xl flex flex-col gap-2 max-w-xs text-xs font-sans text-slate-100">
            <div className="font-mono font-bold text-cyan-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>PHYSICS-INFORMED DRIFT FORECAST</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-tight">
              Log-linear drift model forecasts rapid runaway beyond the 50 µA threshold in 64 hours.
            </p>
            <button
              onClick={() => nextNarrativePhase()}
              className="py-1.5 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow"
            >
              <span>View Glass-Box AI Explanation</span>
              <span>→</span>
            </button>
          </div>
        </Html>
      )}
    </group>
  );
};
