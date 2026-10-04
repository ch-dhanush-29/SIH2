import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { InstancedChips } from './InstancedChips';
import { useBurnInStore } from '../../state/useBurnInStore';

export const ChamberScene: React.FC = () => {
  const telemetry = useBurnInStore((state) => state.telemetry);
  const heaterGlowRef = useRef<THREE.PointLight>(null);

  // Subtle thermal fluctuation in the heater glow
  useFrame(({ clock }) => {
    if (heaterGlowRef.current) {
      const t = clock.getElapsedTime();
      heaterGlowRef.current.intensity = 2.8 + 0.4 * Math.sin(t * 3.2);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* IC Chips Array */}
      <InstancedChips />

      {/* Burn-In Chamber Tray Grate (Base) */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <boxGeometry args={[32, 0.2, 16]} />
        <meshStandardMaterial
          color="#151922"
          metalness={0.85}
          roughness={0.3}
        />
      </mesh>

      {/* Tray Carrier Rails (High-temp gold-plated ceramic rails) */}
      <mesh position={[0, -0.04, -8.1]}>
        <boxGeometry args={[32.4, 0.15, 0.3]} />
        <meshStandardMaterial color="#c59b27" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.04, 8.1]}>
        <boxGeometry args={[32.4, 0.15, 0.3]} />
        <meshStandardMaterial color="#c59b27" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Chamber Enclosure Back Wall */}
      <mesh position={[0, 5, -10]}>
        <boxGeometry args={[36, 12, 0.5]} />
        <meshStandardMaterial
          color="#0c0e14"
          metalness={0.9}
          roughness={0.4}
        />
      </mesh>

      {/* Radiant Heating Coils (Amber glow) */}
      {[-7, -3.5, 0, 3.5, 7].map((xOffset, idx) => (
        <group key={idx} position={[xOffset * 2, 2.5, -9.6]}>
          <mesh>
            <cylinderGeometry args={[0.08, 0.08, 6.5, 16]} />
            <meshBasicMaterial color="#ff5500" />
          </mesh>
          <mesh position={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 6.5, 16]} />
            <meshBasicMaterial color="#ff7700" />
          </mesh>
        </group>
      ))}

      {/* Chamber Digital Thermal Display on Back Wall */}
      <group position={[0, 7.5, -9.6]}>
        <mesh>
          <planeGeometry args={[14, 2.2]} />
          <meshBasicMaterial color="#05070a" />
        </mesh>
        <Text
          position={[0, 0.35, 0.05]}
          fontSize={0.85}
          color="#ffaa00"
          anchorX="center"
          anchorY="middle"
        >
          {`OVEN ZONE 01: ${telemetry.chamberTempC.toFixed(1)}°C (N2 PURGE)`}
        </Text>
        <Text
          position={[0, -0.45, 0.05]}
          fontSize={0.5}
          color="#00f0ff"
          anchorX="center"
          anchorY="middle"
        >
          {`HEATER: ${telemetry.heaterDutyCyclePct.toFixed(0)}% DUTY | P: ${telemetry.chamberPressureKPa} kPa`}
        </Text>
      </group>

      {/* Dynamic Thermal Heat Lighting */}
      <pointLight
        ref={heaterGlowRef}
        position={[0, 4, -6]}
        color="#ff7722"
        intensity={3}
        distance={25}
      />
      <pointLight position={[-12, 3, 0]} color="#ff4400" intensity={1.5} distance={18} />
      <pointLight position={[12, 3, 0]} color="#ff4400" intensity={1.5} distance={18} />

      {/* Top Cool Work Light for IC Packages */}
      <directionalLight
        position={[0, 15, 10]}
        intensity={1.4}
        color="#d0e8ff"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
    </group>
  );
};
