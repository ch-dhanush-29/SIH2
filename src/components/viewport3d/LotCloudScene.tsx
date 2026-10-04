import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { useBurnInStore } from '../../state/useBurnInStore';
import { PARAMETER_CONFIGS } from '../../types/burnIn';

const COLOR_NORMAL = new THREE.Color('#00ff88');
const COLOR_SUSPECT = new THREE.Color('#ffaa00');
const COLOR_REJECT = new THREE.Color('#ff3366');
const COLOR_EARLY_REJECT = new THREE.Color('#ff00aa');
const COLOR_SELECTED = new THREE.Color('#00f0ff');

const CB_NORMAL = new THREE.Color('#0072b2');
const CB_SUSPECT = new THREE.Color('#e69f00');
const CB_REJECT = new THREE.Color('#d55e00');
const CB_EARLY_REJECT = new THREE.Color('#cc79a7');
const CB_SELECTED = new THREE.Color('#56b4e9');

const tempObject = new THREE.Object3D();

import { getThemeConfig } from '../../theme/themeTokens';

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

  // Geometry for lot cloud points
  const sphereGeo = useMemo(() => new THREE.SphereGeometry(0.24, 16, 16), []);

  useEffect(() => {
    if (!meshRef.current || chipCount === 0 || !stats) return;

    // Normalization factors for 3D coordinates
    // X-axis: 0 to staticLimit*1.2 mapped to [-12, 12]
    // Y-axis: Drift slope 0 to safetySlope*2.5 mapped to [-6, 10]
    // Z-axis: Time (0h to 168h) mapped to [-8, 8]
    const xMin = 0;
    const xMax = pcfg.staticLimit * 1.15;
    const yMax = Math.max(0.4, (stats.safetySlope || 0.1) * 2.8);

    for (let i = 0; i < chipCount; i++) {
      const chip = chips[i];
      const val = chip.currentValue;
      const slope = chip.predictedSlope;

      const posX = ((val - xMin) / (xMax - xMin) - 0.5) * 24;
      const posY = Math.max(-5, (slope / yMax) * 12 - 3);
      const posZ = ((checkpoint / 168) - 0.5) * 14;

      tempObject.position.set(posX, posY, posZ);

      if (chip.part_id === selectedChipId) {
        tempObject.scale.set(2.2, 2.2, 2.2);
      } else if (chip.part_id === hoveredChipId) {
        tempObject.scale.set(1.6, 1.6, 1.6);
      } else {
        tempObject.scale.set(1.0, 1.0, 1.0);
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

  // Static limit position on X-axis
  const staticLimitX = stats
    ? ((pcfg.staticLimit / (pcfg.staticLimit * 1.15)) - 0.5) * 24
    : 8;

  // Dynamic safety slope position on Y-axis
  const yMax = stats ? Math.max(0.4, stats.safetySlope * 2.8) : 0.5;
  const safetySlopeY = stats ? (stats.safetySlope / yMax) * 12 - 3 : 2;

  const textColor = theme === 'dark' ? '#00f0ff' : '#0284c7';
  const gridColor1 = theme === 'dark' ? '#00f0ff' : '#0284c7';
  const gridColor2 = theme === 'dark' ? '#1f293d' : '#cbd5e1';

  return (
    <group position={[0, 0, 0]}>
      {/* 3D Coordinate Grid Planes */}
      <gridHelper args={[26, 26, gridColor1, gridColor2]} position={[0, -5, 0]} />

      {/* Static Datasheet Limit Plane (Vertical Red Boundary) */}
      <mesh position={[staticLimitX, 2, 0]}>
        <boxGeometry args={[0.06, 14, 16]} />
        <meshBasicMaterial color="#ff3366" transparent opacity={0.22} wireframe />
      </mesh>
      <Text
        position={[staticLimitX, 9.2, 0]}
        fontSize={0.65}
        color="#ff3366"
        anchorX="center"
      >
        {`STATIC DATASHEET LIMIT (${pcfg.staticLimit} ${pcfg.unit})`}
      </Text>

      {/* Dynamic Lot Safety Slope Plane (Horizontal Amber Boundary) */}
      <mesh position={[0, safetySlopeY, 0]}>
        <boxGeometry args={[26, 0.06, 16]} />
        <meshBasicMaterial color="#ffaa00" transparent opacity={0.22} wireframe />
      </mesh>
      <Text
        position={[0, safetySlopeY + 0.45, 8.2]}
        fontSize={0.6}
        color="#ffaa00"
        anchorX="center"
      >
        {`DYNAMIC SAFETY SLOPE BOUNDARY (${stats?.safetySlope.toFixed(3) || '0.1'} ${pcfg.unit}/h)`}
      </Text>

      {/* Axis Labels */}
      <Text position={[13.5, -4.8, 0]} fontSize={0.65} color={textColor} anchorX="left">
        {`X: ${pcfg.label} (${pcfg.unit}) →`}
      </Text>
      <Text position={[-13.5, 9, 0]} fontSize={0.65} color={textColor} anchorX="left">
        {`Y: Drift Slope (${pcfg.unit}/h) ↑`}
      </Text>
      <Text position={[0, -4.8, 9.5]} fontSize={0.65} color={textColor} anchorX="center">
        {`Z: Burn-In Checkpoint: ${checkpoint}h`}
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
        <meshStandardMaterial roughness={0.3} metalness={0.8} />
      </instancedMesh>
    </group>
  );
};
