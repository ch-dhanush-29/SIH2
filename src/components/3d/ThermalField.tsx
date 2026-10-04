import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useBurnInStore } from '../../state/useBurnInStore';

export const ThermalField: React.FC = () => {
  const view3DMode = useBurnInStore((state) => state.view3DMode);
  const pointsRef = useRef<THREE.Points>(null);

  const particleCount = 600;

  // Generate convection thermal particles
  const [positions, initialPositions] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const initPos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 32;
      const y = Math.random() * 8.0;
      const z = (Math.random() - 0.5) * 16;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      initPos[i * 3] = x;
      initPos[i * 3 + 1] = y;
      initPos[i * 3 + 2] = z;
    }
    return [pos, initPos];
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current || (view3DMode !== 'THERMAL' && view3DMode !== 'CHAMBER')) return;

    const t = clock.getElapsedTime();
    const posAttr = pointsRef.current.geometry.attributes.position;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      // Convection current: upward drift with slight turbulence
      array[i * 3 + 1] += 0.02 + (i % 5) * 0.005;
      array[i * 3] += Math.sin(t + i) * 0.008;

      // Wrap around when reaching top
      if (array[i * 3 + 1] > 9.0) {
        array[i * 3 + 1] = 0.1;
      }
    }

    posAttr.needsUpdate = true;
  });

  if (view3DMode !== 'THERMAL' && view3DMode !== 'CHAMBER') return null;

  return (
    <group position={[0, 0, 0]}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={view3DMode === 'THERMAL' ? 0.35 : 0.15}
          color={view3DMode === 'THERMAL' ? '#ff6600' : '#ffaa00'}
          transparent
          opacity={view3DMode === 'THERMAL' ? 0.75 : 0.25}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Volumetric Thermal Boundary Plane (Visible in THERMAL Mode) */}
      {view3DMode === 'THERMAL' && (
        <mesh position={[0, 4.0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[32, 16]} />
          <meshBasicMaterial
            color="#ff3300"
            transparent
            opacity={0.12}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
};
