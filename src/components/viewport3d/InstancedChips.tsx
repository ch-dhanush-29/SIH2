import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useBurnInStore } from '../../state/useBurnInStore';

// Color definitions for mission-control palette
const COLOR_NORMAL = new THREE.Color('#00f0ff');       // Cyan
const COLOR_SUSPECT = new THREE.Color('#ffaa00');      // Glowing amber
const COLOR_REJECT = new THREE.Color('#ff3366');       // Crimson red
const COLOR_EARLY_REJECT = new THREE.Color('#ff00aa'); // Neon magenta
const COLOR_SELECTED = new THREE.Color('#ffffff');     // Diamond white
const COLOR_SUBDUED = new THREE.Color('#151b28');      // Subdued slate for anomaly map

// Colorblind-safe palette (Tol / Wong palette)
const CB_NORMAL = new THREE.Color('#0072b2');
const CB_SUSPECT = new THREE.Color('#e69f00');
const CB_REJECT = new THREE.Color('#d55e00');
const CB_EARLY_REJECT = new THREE.Color('#cc79a7');
const CB_SELECTED = new THREE.Color('#ffffff');

const tempObject = new THREE.Object3D();
const tempPinObject = new THREE.Object3D();

export const InstancedChips: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const pinsMeshRef = useRef<THREE.InstancedMesh>(null);
  const targetRingRef = useRef<THREE.Mesh>(null);
  const dataBeamRef = useRef<THREE.Mesh>(null);

  const chips = useBurnInStore((state) => state.chips);
  const selectedChipId = useBurnInStore((state) => state.selectedChipId);
  const hoveredChipId = useBurnInStore((state) => state.hoveredChipId);
  const selectChip = useBurnInStore((state) => state.selectChip);
  const setHoveredChip = useBurnInStore((state) => state.setHoveredChip);
  const checkpoint = useBurnInStore((state) => state.checkpoint);
  const isColorblindMode = useBurnInStore((state) => state.isColorblindMode);
  const view3DMode = useBurnInStore((state) => state.view3DMode);

  const chipCount = chips.length;

  // Selected chip object for the laser ring and beam
  const selectedChip = useMemo(
    () => chips.find((c) => c.part_id === selectedChipId),
    [chips, selectedChipId]
  );

  // Geometry: Beveled molded epoxy IC package body
  const chipGeometry = useMemo(() => {
    return new THREE.BoxGeometry(0.44, 0.14, 0.44);
  }, []);

  // Geometry: Lead pins extending on sides
  const pinGeometry = useMemo(() => {
    return new THREE.BoxGeometry(0.56, 0.03, 0.38);
  }, []);

  // Compute base matrix transforms and colors
  useEffect(() => {
    if (!meshRef.current || chipCount === 0) return;

    for (let i = 0; i < chipCount; i++) {
      const chip = chips[i];
      let posX = chip.trayX;
      let posY = chip.trayY;
      let posZ = chip.trayZ;

      // In Chamber or Anomaly View: Drifting / Latent suspect chips visibly "LIFT" out of the tray
      if (view3DMode === 'CHAMBER' || view3DMode === 'ANOMALY_MAP') {
        if (chip.verdict === 'LATENT_SUSPECT') {
          const liftHeight = 0.45 + (checkpoint / 168) * 0.85;
          posY += liftHeight;
        } else if (chip.verdict === 'HARD_REJECT') {
          posY += 1.35;
        } else if (chip.verdict === 'EARLY_REJECT') {
          posY += 1.05;
        }
      }

      tempObject.position.set(posX, posY, posZ);
      tempObject.rotation.set(0, 0, 0);

      // Selected chip is slightly larger for visual emphasis
      if (chip.part_id === selectedChipId) {
        tempObject.scale.set(1.4, 1.45, 1.4);
      } else if (chip.part_id === hoveredChipId) {
        tempObject.scale.set(1.2, 1.25, 1.2);
      } else {
        tempObject.scale.set(1.0, 1.0, 1.0);
      }

      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);

      if (pinsMeshRef.current) {
        tempPinObject.position.set(posX, posY - 0.02, posZ);
        tempPinObject.scale.copy(tempObject.scale);
        tempPinObject.updateMatrix();
        pinsMeshRef.current.setMatrixAt(i, tempPinObject.matrix);
      }

      // Determine instance color based on visual mode
      let baseColor: THREE.Color;

      if (view3DMode === 'THERMAL') {
        // Continuous thermal gradient: 124°C (blue) to 125°C (orange) to 126°C+ (red)
        const tVal = 124.6 + (chip.currentValue % 1.2);
        if (tVal > 125.4) {
          baseColor = COLOR_REJECT;
        } else if (tVal > 124.9) {
          baseColor = COLOR_SUSPECT;
        } else {
          baseColor = COLOR_NORMAL;
        }
      } else if (view3DMode === 'ANOMALY_MAP') {
        // Normal chips are subdued into dark slate, anomalous chips vividly spotlighted
        if (chip.verdict === 'PASS') {
          baseColor = COLOR_SUBDUED;
        } else if (chip.verdict === 'LATENT_SUSPECT') {
          baseColor = isColorblindMode ? CB_SUSPECT : COLOR_SUSPECT;
        } else {
          baseColor = isColorblindMode ? CB_REJECT : COLOR_REJECT;
        }
      } else {
        // Standard Chamber View
        if (chip.part_id === selectedChipId) {
          baseColor = isColorblindMode ? CB_SELECTED : COLOR_SELECTED;
        } else if (chip.verdict === 'HARD_REJECT') {
          baseColor = isColorblindMode ? CB_REJECT : COLOR_REJECT;
        } else if (chip.verdict === 'EARLY_REJECT') {
          baseColor = isColorblindMode ? CB_EARLY_REJECT : COLOR_EARLY_REJECT;
        } else if (chip.verdict === 'LATENT_SUSPECT') {
          baseColor = isColorblindMode ? CB_SUSPECT : COLOR_SUSPECT;
        } else {
          baseColor = isColorblindMode ? CB_NORMAL : COLOR_NORMAL;
        }
      }

      meshRef.current.setColorAt(i, baseColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
    if (pinsMeshRef.current) {
      pinsMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [chips, chipCount, selectedChipId, hoveredChipId, checkpoint, isColorblindMode, view3DMode]);

  // Animation frame for laser target ring and vertical data beam
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (targetRingRef.current && selectedChip) {
      targetRingRef.current.rotation.z = t * 2.0;
      targetRingRef.current.scale.setScalar(1.0 + 0.15 * Math.sin(t * 5.0));
    }
    if (dataBeamRef.current && selectedChip) {
      dataBeamRef.current.position.y = 3.5 + 0.5 * Math.sin(t * 3.0);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Main IC Package Bodies */}
      <instancedMesh
        ref={meshRef}
        args={[chipGeometry, undefined, chipCount]}
        castShadow
        receiveShadow
        onClick={(e) => {
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
        <meshStandardMaterial
          roughness={0.25}
          metalness={0.75}
          toneMapped={false}
        />
      </instancedMesh>

      {/* 2. Metallic Lead Pins Protruding from IC Bodies */}
      <instancedMesh
        ref={pinsMeshRef}
        args={[pinGeometry, undefined, chipCount]}
      >
        <meshStandardMaterial
          color="#d1d5db"
          metalness={0.95}
          roughness={0.15}
        />
      </instancedMesh>

      {/* 3. Dynamic Laser Scanning Target Ring for Selected Component */}
      {selectedChip && (
        <group position={[selectedChip.trayX, selectedChip.trayY + 0.05, selectedChip.trayZ]}>
          <mesh ref={targetRingRef} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.45, 0.55, 32]} />
            <meshBasicMaterial
              color="#00f0ff"
              transparent
              opacity={0.85}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* 4. Vertical Telemetry Laser Beam Rising to AI Layer */}
          <mesh ref={dataBeamRef} position={[0, 3.5, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 7.0, 16]} />
            <meshBasicMaterial
              color={selectedChip.verdict !== 'PASS' ? '#ff3366' : '#00f0ff'}
              transparent
              opacity={0.65}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};
