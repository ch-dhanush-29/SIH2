import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useBurnInStore } from '../../state/useBurnInStore';
import { getThemeConfig } from '../../theme/themeTokens';
import { ChamberEnvironment } from '../3d/ChamberEnvironment';
import { ThermalField } from '../3d/ThermalField';
import { InstancedChips } from './InstancedChips';
import { LotCloudScene } from './LotCloudScene';
import { TrajectoryScene } from './TrajectoryScene';
import { Fallback2DView } from './Fallback2DView';
import { ChipTooltip3D } from './ChipTooltip3D';

// Dynamic lighting controller that smoothly interpolates lighting across theme changes
const DynamicThemeLighting: React.FC<{ theme: 'dark' | 'light' }> = ({ theme }) => {
  const cfg = getThemeConfig(theme);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const dirRef = useRef<THREE.DirectionalLight>(null);
  const targetColor = useMemo(() => new THREE.Color(), []);
  const targetDirColor = useMemo(() => new THREE.Color(), []);

  useFrame((_, delta) => {
    const factor = Math.min(1.0, delta * 4.5);
    if (ambientRef.current) {
      targetColor.set(cfg.three.ambientColor);
      ambientRef.current.color.lerp(targetColor, factor);
      ambientRef.current.intensity = THREE.MathUtils.lerp(
        ambientRef.current.intensity,
        cfg.three.ambientIntensity,
        factor
      );
    }
    if (dirRef.current) {
      targetDirColor.set(cfg.three.dirLightColor);
      dirRef.current.color.lerp(targetDirColor, factor);
      dirRef.current.intensity = THREE.MathUtils.lerp(
        dirRef.current.intensity,
        cfg.three.dirLightIntensity,
        factor
      );
    }
  });

  return (
    <>
      <ambientLight
        ref={ambientRef}
        intensity={cfg.three.ambientIntensity}
        color={cfg.three.ambientColor}
      />
      <directionalLight
        ref={dirRef}
        position={[10, 20, 12]}
        intensity={cfg.three.dirLightIntensity}
        color={cfg.three.dirLightColor}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight
        position={[-12, 10, -8]}
        intensity={cfg.three.fillLightIntensity}
        color={cfg.three.fillLightColor}
      />
    </>
  );
};

// Advanced Camera Director with seamless OrbitControls and cinematic lerping
const CameraDirector: React.FC = () => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const selectedChipId = useBurnInStore((state) => state.selectedChipId);
  const chips = useBurnInStore((state) => state.chips);
  const cameraResetCount = useBurnInStore((state) => state.cameraResetCount);
  const view3DMode = useBurnInStore((state) => state.view3DMode);
  const cameraViewMode = useBurnInStore((state) => state.cameraViewMode);

  const selectedChip = chips.find((c) => c.part_id === selectedChipId);

  // Mode or manual reset camera alignment
  useEffect(() => {
    if (!controlsRef.current) return;

    if (view3DMode === 'LOT_CLOUD') {
      controlsRef.current.object.position.set(0, 12, 26);
      controlsRef.current.target.set(0, 2, 0);
    } else if (view3DMode === 'TRAJECTORY') {
      controlsRef.current.object.position.set(16, 14, 20);
      controlsRef.current.target.set(0, 2, 0);
    } else {
      // Chamber, Thermal, Anomaly Map
      controlsRef.current.object.position.set(0, 17, 22);
      controlsRef.current.target.set(0, 0, 0);
    }
    controlsRef.current.update();
  }, [cameraResetCount, view3DMode]);

  // Fly-to selected chip in Close-up view
  useEffect(() => {
    if (!controlsRef.current || !selectedChip) return;
    if (view3DMode !== 'CHAMBER' && view3DMode !== 'THERMAL' && view3DMode !== 'ANOMALY_MAP') return;

    const targetPos = new THREE.Vector3(selectedChip.trayX, selectedChip.trayY + 0.3, selectedChip.trayZ);
    const cameraPos = new THREE.Vector3(
      selectedChip.trayX + 2.2,
      selectedChip.trayY + 3.8,
      selectedChip.trayZ + 4.8
    );

    controlsRef.current.target.lerp(targetPos, 0.95);
    controlsRef.current.object.position.lerp(cameraPos, 0.95);
    controlsRef.current.update();
  }, [selectedChipId, selectedChip, view3DMode, cameraViewMode]);

  // Continuous subtle orbital follow when ANOMALY_FOLLOW mode is engaged
  useFrame(({ clock }) => {
    if (!controlsRef.current || !selectedChip || cameraViewMode !== 'ANOMALY_FOLLOW') return;

    const t = clock.getElapsedTime() * 0.4;
    const radius = 5.2;
    const targetY = selectedChip.trayY + 0.4;

    controlsRef.current.target.set(selectedChip.trayX, targetY, selectedChip.trayZ);
    controlsRef.current.object.position.set(
      selectedChip.trayX + Math.sin(t) * radius,
      selectedChip.trayY + 3.4,
      selectedChip.trayZ + Math.cos(t) * radius
    );
    controlsRef.current.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={2.5}
      maxDistance={70}
      maxPolarAngle={Math.PI / 2.05} // prevent clipping under the tray
    />
  );
};

export const BurnInCanvas: React.FC = () => {
  const view3DMode = useBurnInStore((state) => state.view3DMode);
  const theme = useBurnInStore((state) => state.theme);
  const cfg = getThemeConfig(theme);

  // If 2D Grid carrier mode is selected, render high-density 2D fallback view
  if (view3DMode === '2D_GRID') {
    return (
      <div className="relative w-full h-full bg-[var(--bg-primary)] overflow-hidden select-none transition-colors duration-300">
        <Fallback2DView />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[var(--bg-primary)] overflow-hidden select-none transition-colors duration-300">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: theme === 'dark' ? 1.15 : 1.05,
        }}
      >
        <color attach="background" args={[cfg.three.bgColor]} />
        <fog attach="fog" args={[cfg.three.bgColor, 22, 65]} />
        <PerspectiveCamera makeDefault position={[0, 17, 22]} fov={45} />
        <CameraDirector />

        {/* Dynamic Theme Lighting */}
        <DynamicThemeLighting theme={theme} />

        {/* Active Scene Content based on view mode */}
        {view3DMode === 'LOT_CLOUD' && <LotCloudScene />}
        {view3DMode === 'TRAJECTORY' && <TrajectoryScene />}
        {(view3DMode === 'CHAMBER' ||
          view3DMode === 'THERMAL' ||
          view3DMode === 'ANOMALY_MAP' ||
          view3DMode === 'LIVE_VISION') && (
          <group>
            <ChamberEnvironment />
            <InstancedChips />
            <ThermalField />
          </group>
        )}
      </Canvas>

      {/* Floating 3D Hover Tooltip */}
      <ChipTooltip3D />

      {/* Bottom Left Telemetry Status */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none flex items-center gap-2">
        <div className="mission-hud px-3 py-1.5 rounded-lg text-[10px] font-mono flex items-center gap-2.5 shadow-xl">
          <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse shadow-[0_0_8px_var(--success)]" />
          <span className="tracking-wider text-[var(--text-secondary)]">WEBGL2 CORE • 60 FPS • DUAL LIGHTING</span>
          <span className="text-[var(--text-muted)]">|</span>
          <span className="text-[var(--accent)] font-semibold uppercase">{view3DMode} SCENE</span>
        </div>
      </div>
    </div>
  );
};
