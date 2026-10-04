import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
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
import { FullscreenVisionView } from './FullscreenVisionView';
import { ChipTooltip3D } from './ChipTooltip3D';
import { SpatialAnomalyCallout } from './SpatialAnomalyCallout';
import { SpatialTrajectoryRibbon } from './SpatialTrajectoryRibbon';
import { SpatialPulsingEffects } from './SpatialPulsingEffects';
import { Crosshair, Target } from 'lucide-react';

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

// Advanced Camera Director with seamless Pointer-Anchored Zoom and cinematic flight
const CameraDirector: React.FC<{
  onZoomEvent?: (clientX: number, clientY: number, inOrOut: 'IN' | 'OUT') => void;
}> = ({ onZoomEvent }) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera, gl } = useThree();
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

  // Dedicated Pointer-Anchored Background Zoom
  // Only zooms the background scene, precisely targeted wherever the user points their mouse pointer
  useEffect(() => {
    const domElement = gl.domElement;
    if (!domElement) return;

    const handleWheel = (e: WheelEvent) => {
      // Do not zoom background if scrolling inside an open UI window/card
      const target = e.target as HTMLElement;
      if (target.closest('.mission-hud, input, select, textarea, [role="dialog"], button')) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const rect = domElement.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Raycast from camera through pointer location
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

      // Determine focal plane
      let focalPlane: THREE.Plane;
      const controls = controlsRef.current;
      const targetPoint = controls ? controls.target.clone() : new THREE.Vector3(0, 0, 0);

      if (view3DMode === 'LOT_CLOUD' || view3DMode === 'TRAJECTORY') {
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        focalPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(camDir.negate(), targetPoint);
      } else {
        // Horizontal wafer tray plane at y = 0
        focalPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      }

      const hitPoint = new THREE.Vector3();
      const didHit = raycaster.ray.intersectPlane(focalPlane, hitPoint);
      if (!didHit) {
        // Fallback: 14 units along the ray
        raycaster.ray.at(14, hitPoint);
      }

      // Controlled, smooth pointer-anchored zoom (decreased to balanced rate)
      const zoomSensitivity = 0.0026;
      const clampedDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 140);
      const factor = Math.exp(clampedDelta * zoomSensitivity);

      // Notify parent for visual feedback pulse
      if (onZoomEvent) {
        onZoomEvent(e.clientX, e.clientY, e.deltaY < 0 ? 'IN' : 'OUT');
      }

      // Calculate new camera position relative to hitPoint
      const offset = camera.position.clone().sub(hitPoint);
      const newPos = hitPoint.clone().add(offset.multiplyScalar(factor));

      // Calculate distance to ensure bounds (expanded bounds 0.9 to 95.0 for deep inspection)
      const dist = newPos.distanceTo(hitPoint);
      if (dist >= 0.9 && dist <= 95.0) {
        camera.position.copy(newPos);

        // Also scale controls.target towards hitPoint so orbiting revolves around the pointer-anchored target
        if (controls) {
          const targetOffset = controls.target.clone().sub(hitPoint);
          controls.target.copy(hitPoint.clone().add(targetOffset.multiplyScalar(factor)));
          controls.update();
        }
      }
    };

    domElement.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      domElement.removeEventListener('wheel', handleWheel);
    };
  }, [gl, camera, view3DMode, onZoomEvent]);

  // Smooth frame-by-frame camera animation and flight
  useFrame(({ clock }, delta) => {
    if (!controlsRef.current) return;
    const factor = Math.min(1.0, delta * 3.6);

    if (
      (view3DMode === 'CHAMBER' || view3DMode === 'THERMAL' || view3DMode === 'ANOMALY_MAP') &&
      selectedChip
    ) {
      if (cameraViewMode === 'CLOSEUP') {
        const targetPos = new THREE.Vector3(
          selectedChip.trayX,
          selectedChip.trayY + 0.35,
          selectedChip.trayZ
        );
        const camPos = new THREE.Vector3(
          selectedChip.trayX + 2.2,
          selectedChip.trayY + 2.5,
          selectedChip.trayZ + 3.2
        );
        controlsRef.current.target.lerp(targetPos, factor);
        controlsRef.current.object.position.lerp(camPos, factor);
        controlsRef.current.update();
      } else if (cameraViewMode === 'ANOMALY_FOLLOW') {
        const t = clock.getElapsedTime() * 0.45;
        const radius = 4.2;
        const targetY = selectedChip.trayY + 0.4;
        const targetPos = new THREE.Vector3(selectedChip.trayX, targetY, selectedChip.trayZ);
        const orbitCamPos = new THREE.Vector3(
          selectedChip.trayX + Math.sin(t) * radius,
          selectedChip.trayY + 2.6,
          selectedChip.trayZ + Math.cos(t) * radius
        );
        controlsRef.current.target.lerp(targetPos, factor);
        controlsRef.current.object.position.lerp(orbitCamPos, factor);
        controlsRef.current.update();
      }
    }
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
      enableZoom={false} // Disabled default center-dolly so our pointer-anchored zoom handles it with 100% precision
    />
  );
};

export const BurnInCanvas: React.FC = () => {
  const view3DMode = useBurnInStore((state) => state.view3DMode);
  const selectedChipId = useBurnInStore((state) => state.selectedChipId);
  const narrativePhase = useBurnInStore((state) => state.narrativePhase);
  const isHeroNarrativeActive = useBurnInStore((state) => state.isHeroNarrativeActive);
  const isInspectionOpen = useBurnInStore((state) => state.isInspectionOpen);
  const theme = useBurnInStore((state) => state.theme);
  const cfg = getThemeConfig(theme);

  // Pointer Zoom Visual Feedback State
  const [zoomFeedback, setZoomFeedback] = useState<{
    x: number;
    y: number;
    inOrOut: 'IN' | 'OUT';
    visible: boolean;
  }>({
    x: 0,
    y: 0,
    inOrOut: 'IN',
    visible: false,
  });

  const zoomTimerRef = useRef<number | null>(null);

  const handleZoomEvent = useCallback((clientX: number, clientY: number, inOrOut: 'IN' | 'OUT') => {
    setZoomFeedback({
      x: clientX,
      y: clientY,
      inOrOut,
      visible: true,
    });

    if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
    zoomTimerRef.current = window.setTimeout(() => {
      setZoomFeedback((prev) => ({ ...prev, visible: false }));
    }, 450);
  }, []);

  // If 2D Grid carrier mode is selected, render high-density 2D fallback view
  if (view3DMode === '2D_GRID') {
    return (
      <div className="relative w-full h-full bg-[var(--bg-primary)] overflow-hidden select-none transition-colors duration-300">
        <Fallback2DView />
      </div>
    );
  }

  // If Live Vision mode is selected, render full-screen hardware camera feed
  if (view3DMode === 'LIVE_VISION') {
    return (
      <div className="relative w-full h-full bg-black overflow-hidden select-none transition-colors duration-300">
        <FullscreenVisionView />
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
        <CameraDirector onZoomEvent={handleZoomEvent} />

        {/* Dynamic Theme Lighting */}
        <DynamicThemeLighting theme={theme} />

        {/* Active Scene Content based on view mode */}
        {view3DMode === 'LOT_CLOUD' && <LotCloudScene />}
        {view3DMode === 'TRAJECTORY' && <TrajectoryScene />}
        {(view3DMode === 'CHAMBER' ||
          view3DMode === 'THERMAL' ||
          view3DMode === 'ANOMALY_MAP') && (
          <group>
            <ChamberEnvironment />
            <InstancedChips />
            <ThermalField />

            {/* Spatial 3D Narrative & Anomaly Overlays */}
            {selectedChipId && (
              <>
                <SpatialPulsingEffects chipId={selectedChipId} />
                {(narrativePhase === 'SPATIAL_VIZ' ||
                  narrativePhase === 'TRAJECTORY_RENDER' ||
                  !isHeroNarrativeActive) && (
                  <SpatialAnomalyCallout chipId={selectedChipId} />
                )}
                {(narrativePhase === 'TRAJECTORY_RENDER' ||
                  narrativePhase === 'AI_EXPLANATION' ||
                  narrativePhase === 'RECOMMENDED_ACTION' ||
                  (!isHeroNarrativeActive && isInspectionOpen)) && (
                  <SpatialTrajectoryRibbon chipId={selectedChipId} />
                )}
              </>
            )}
          </group>
        )}
      </Canvas>

      {/* Subtle Pointer-Anchored Zoom Reticle Indicator */}
      {zoomFeedback.visible && (
        <div
          style={{
            left: `${zoomFeedback.x}px`,
            top: `${zoomFeedback.y}px`,
          }}
          className="fixed -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 flex items-center justify-center transition-opacity"
        >
          {/* Animated focal ring */}
          <div className="w-12 h-12 rounded-full border-2 border-[var(--accent)] animate-ping opacity-75" />
          <div className="absolute w-8 h-8 rounded-full border border-[var(--accent)] flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
          </div>
          <div className="absolute -bottom-6 font-mono text-[10px] bg-slate-950/85 text-[var(--accent)] px-1.5 py-0.5 rounded border border-[var(--border-accent)] whitespace-nowrap shadow-lg">
            ZOOM {zoomFeedback.inOrOut} • POINTER ANCHOR
          </div>
        </div>
      )}

      {/* Floating 3D Hover Tooltip */}
      <ChipTooltip3D />
    </div>
  );
};

export default BurnInCanvas;
