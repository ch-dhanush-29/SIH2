import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useBurnInStore } from '../../state/useBurnInStore';

const targetPos = new THREE.Vector3();
const targetLookAt = new THREE.Vector3();
const currentLookAt = new THREE.Vector3();

export const CameraController: React.FC = () => {
  const { camera } = useThree();
  const cameraViewMode = useBurnInStore((state) => state.cameraViewMode);
  const view3DMode = useBurnInStore((state) => state.view3DMode);
  const selectedChipId = useBurnInStore((state) => state.selectedChipId);
  const chips = useBurnInStore((state) => state.chips);
  const cameraResetCount = useBurnInStore((state) => state.cameraResetCount);

  const selectedChip = chips.find((c) => c.part_id === selectedChipId);

  // Initialize lookAt
  const isInitialized = useRef(false);

  useEffect(() => {
    // Reset camera trigger
    targetPos.set(0, 15, 18);
    targetLookAt.set(0, 0, 0);
  }, [cameraResetCount]);

  useFrame((_, delta) => {
    // Compute desired camera position based on active mode
    if (view3DMode === 'LOT_CLOUD') {
      targetPos.set(0, 12, 22);
      targetLookAt.set(0, 3, 0);
    } else if (view3DMode === 'TRAJECTORY') {
      targetPos.set(-14, 11, 17);
      targetLookAt.set(0, 2, 0);
    } else if (cameraViewMode === 'CLOSEUP' && selectedChip) {
      targetPos.set(
        selectedChip.trayX + 1.8,
        selectedChip.trayY + 2.8,
        selectedChip.trayZ + 3.8
      );
      targetLookAt.set(selectedChip.trayX, selectedChip.trayY + 0.2, selectedChip.trayZ);
    } else if (cameraViewMode === 'ANOMALY_FOLLOW' && selectedChip) {
      // Dynamic orbital offset
      const time = performance.now() * 0.0006;
      targetPos.set(
        selectedChip.trayX + Math.sin(time) * 4.5,
        selectedChip.trayY + 3.2,
        selectedChip.trayZ + Math.cos(time) * 4.5
      );
      targetLookAt.set(selectedChip.trayX, selectedChip.trayY + 0.4, selectedChip.trayZ);
    } else {
      // Default Chamber Overview
      targetPos.set(0, 15, 18);
      targetLookAt.set(0, 0, 0);
    }

    if (!isInitialized.current) {
      currentLookAt.copy(targetLookAt);
      isInitialized.current = true;
    }

    // Smooth cinematic lerp (damping rate 3.5 per second)
    const factor = Math.min(1.0, delta * 3.5);
    camera.position.lerp(targetPos, factor);
    currentLookAt.lerp(targetLookAt, factor);
    camera.lookAt(currentLookAt);
  });

  return null;
};
