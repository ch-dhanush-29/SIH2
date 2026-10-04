import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { useBurnInStore } from '../../state/useBurnInStore';
import { PARAMETER_CONFIGS } from '../../types/burnIn';
import { getThemeConfig } from '../../theme/themeTokens';

const CB_NORMAL = new THREE.Color('#0072b2');
const CB_SUSPECT = new THREE.Color('#e69f00');
const CB_REJECT = new THREE.Color('#d55e00');
const CB_EARLY_REJECT = new THREE.Color('#cc79a7');
const CB_SELECTED = new THREE.Color('#56b4e9');

const tempObject = new THREE.Object3D();

export const LotCloudScene: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const chips = useBurnInStore((state) => state.chips);
  const stats = useBurnInStore((state) => state.stats);
  const parameter = useBurnInStore((state) => state.parameter);
  const checkpoint = useBurnInStore((state) => state.checkpoint);
  const selectedChipId = useBurnInStore((state) => state.selectedChipId);
  const hoveredChipId = useBurnInStore((state) => state.hoveredChipId);
  const selectChip = useBurnInStore((state) => state.selectChip);
  const setHoveredChip = useBurnInStore((state) => state.setHoveredChip);
  const isColorblindMode = useBurnInStore((state) => state.isColorblindMode);
  const theme = useBurnInStore((state) => state.theme);

  const pcfg = PARAMETER_CONFIGS[parameter];
  const chipCount = chips.length;

  // Geometry for lot cloud points - subtle, precise points
  const sphereGeo = useMemo(() => new THREE.SphereGeometry(0.18, 16, 16), []);

  useEffect(() => {
    if (!meshRef.current || chipCount === 0 || !stats) return;

    // Coordinate mapping: Centered around (0, 0, 0)
    // X: Parameter value (centered on lot median)
    // Y: Drift slope
    // Z: Checkpoint time
    const median = stats.median || 10.4;
    const xSpread = pcfg.staticLimit * 0.6;
    const yMax = Math.max(0.35, (stats.safetySlope || 0.05) * 3.2);

    for (let i = 0; i < chipCount; i++) {
      const chip = chips[i];
      const val = chip.currentValue;
      const slope = chip.predictedSlope;

      // Centered spatial coordinates
      const posX = ((val - median) / xSpread) * 10;
      const posY = (slope / yMax) * 8 - 2.5;
      const posZ = ((checkpoint / 168) - 0.5) * 10;

      tempObject.position.set(posX, posY, posZ);

      // Scaled point size based on risk and selection (Section 17)
      if (chip.part_id === selectedChipId) {
        tempObject.scale.set(2.4, 2.4, 2.4);
      } else if (chip.part_id === hoveredChipId) {
        tempObject.scale.set(1.8, 1.8, 1.8);
      } else if (chip.verdict === 'HARD_REJECT' || chip.verdict === 'EARLY_REJECT') {
        tempObject.scale.set(1.4, 1.4, 1.4);
      } else if (chip.verdict === 'LATENT_SUSPECT') {
        tempObject.scale.set(1.2, 1.2, 1.2);
      } else {
        tempObject.scale.set(0.85, 0.85, 0.85); // Normal points are small and restrained
      }

      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);

      const cfg = getThemeConfig(theme);
      let col: THREE.Color;
      if (chip.part_id === selectedChipId) {
        col = isColorblindMode ? CB_SELECTED : cfg.three.chipSelectedColor;
      } else if (chip.verdict === 'HARD_REJECT') {
        col = isColorblindMode ? CB_REJECT : cfg.three.chipRejectColor;
      } else if (chip.verdict === 'EARLY_REJECT') {
        col = isColorblindMode ? CB_EARLY_REJECT : cfg.three.chipEarlyRejectColor;
      } else if (chip.verdict === 'LATENT_SUSPECT') {
        col = isColorblindMode ? CB_SUSPECT : cfg.three.chipSuspectColor;
      } else {
        col = isColorblindMode ? CB_NORMAL : cfg.three.chipNormalColor;
      }

      meshRef.current.setColorAt(i, col);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [chips, stats, parameter, checkpoint, selectedChipId, hoveredChipId, isColorblindMode, chipCount, pcfg, theme]);

  // Static limit position on X-axis relative to center
  const median = stats?.median || 10.4;
  const xSpread = pcfg.staticLimit * 0.6;
  const staticLimitX = ((pcfg.staticLimit - median) / xSpread) * 10;

  // Dynamic safety slope position on Y-axis
  const yMax = stats ? Math.max(0.35, stats.safetySlope * 3.2) : 0.4;
  const safetySlopeY = stats ? (stats.safetySlope / yMax) * 8 - 2.5 : 1.2;

  const textColor = theme === 'dark' ? '#7D92A5' : '#475569';
  const gridColor1 = theme === 'dark' ? '#20D6E8' : '#087EA4';
  const gridColor2 = theme === 'dark' ? '#101C28' : '#CBD5E1';

  return (
    <group position={[0, 0, 0]}>
      {/* 3D Scientific Coordinate Grid Ground */}
      <gridHelper args={[22, 22, gridColor1, gridColor2]} position={[0, -3.5, 0]} />

      {/* Static Datasheet Limit Plane (Vertical Restrained Boundary) */}
      <mesh position={[staticLimitX, 1.5, 0]}>
        <boxGeometry args={[0.04, 10, 14]} />
        <meshBasicMaterial color="#FF4268" transparent opacity={0.12} wireframe />
      </mesh>
      <Text
        position={[staticLimitX, 6.8, 0]}
        fontSize={0.34}
        color="#FF4268"
        anchorX="center"
        fillOpacity={0.8}
      >
        {`STATIC CEILING: ${pcfg.staticLimit} ${pcfg.unit}`}
      </Text>

      {/* Dynamic Lot Safety Slope Plane (Horizontal Amber Threshold) */}
      <mesh position={[0, safetySlopeY, 0]}>
        <boxGeometry args={[22, 0.04, 14]} />
        <meshBasicMaterial color="#FFB020" transparent opacity={0.12} wireframe />
      </mesh>
      <Text
        position={[0, safetySlopeY + 0.35, 6.8]}
        fontSize={0.32}
        color="#FFB020"
        anchorX="center"
        fillOpacity={0.8}
      >
        {`SAFETY SLOPE THRESHOLD: ${stats?.safetySlope.toFixed(4) || '0.022'} ${pcfg.unit}/h`}
      </Text>

      {/* Compact Scientific Axis Labels (Section 18) */}
      <Text position={[10.5, -3.2, 0]} fontSize={0.36} color={textColor} anchorX="left" fillOpacity={0.75}>
        {`X / ${pcfg.label.split(' ')[0]} (${pcfg.unit}) →`}
      </Text>
      <Text position={[-10.5, 6.5, 0]} fontSize={0.36} color={textColor} anchorX="left" fillOpacity={0.75}>
        {`Y / DRIFT (${pcfg.unit}/h) ↑`}
      </Text>
      <Text position={[0, -3.2, 7.5]} fontSize={0.36} color={textColor} anchorX="center" fillOpacity={0.75}>
        {`Z / TIME: ${checkpoint}h`}
      </Text>

      {/* Instanced lot cloud points */}
      <instancedMesh
        ref={meshRef}
        args={[sphereGeo, undefined as any, Math.max(1, chipCount)]}
        onPointerDown={(e) => {
          e.stopPropagation();
          const instanceId = e.instanceId;
          if (instanceId !== undefined && chips[instanceId]) {
            selectChip(chips[instanceId].part_id);
          }
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          const instanceId = e.instanceId;
          if (instanceId !== undefined && chips[instanceId]) {
            setHoveredChip(chips[instanceId].part_id);
          }
        }}
        onPointerOut={() => {
          setHoveredChip(null);
        }}
      >
        <meshStandardMaterial roughness={0.35} metalness={0.7} />
      </instancedMesh>
    </group>
  );
};
