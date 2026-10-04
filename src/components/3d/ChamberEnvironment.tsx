import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useBurnInStore } from '../../state/useBurnInStore';

export const ChamberEnvironment: React.FC = () => {
  const telemetry = useBurnInStore((state) => state.telemetry);
  const view3DMode = useBurnInStore((state) => state.view3DMode);

  const heaterLightRef = useRef<THREE.PointLight>(null);
  const scanBeamRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (heaterLightRef.current) {
      heaterLightRef.current.intensity = 3.2 + 0.6 * Math.sin(t * 2.8);
    }
    if (scanBeamRef.current) {
      // Sweeping AI laser beam across the carrier tray
      scanBeamRef.current.position.z = Math.sin(t * 0.8) * 8.0;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Main Thermal Oven Grate / Carrier Tray Base */}
      <mesh position={[0, -0.16, 0]} receiveShadow>
        <boxGeometry args={[34, 0.22, 18]} />
        <meshStandardMaterial
          color="#0c0f17"
          metalness={0.92}
          roughness={0.25}
        />
      </mesh>

      {/* PCB Trace Floor Accent (Perforated circuit board texture simulation) */}
      <gridHelper
        args={[34, 34, '#00f0ff', '#1e293b']}
        position={[0, -0.04, 0]}
      />

      {/* Gold-Plated High-Temp Bus Rails */}
      <mesh position={[0, -0.03, -8.6]}>
        <boxGeometry args={[34.2, 0.16, 0.4]} />
        <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.15} />
      </mesh>
      <mesh position={[0, -0.03, 8.6]}>
        <boxGeometry args={[34.2, 0.16, 0.4]} />
        <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.15} />
      </mesh>

      {/* 2. Industrial Oven Enclosure Back Wall with Thermal Reflective Baffles */}
      <mesh position={[0, 5.5, -11]}>
        <boxGeometry args={[38, 13, 0.6]} />
        <meshStandardMaterial
          color="#07090e"
          metalness={0.88}
          roughness={0.35}
        />
      </mesh>

      {/* Chamber Structural Steel Corner Struts */}
      {[-18, 18].map((x, i) => (
        <mesh key={i} position={[x, 5.5, 0]}>
          <boxGeometry args={[0.8, 13, 19]} />
          <meshStandardMaterial color="#0a0d14" metalness={0.9} roughness={0.4} />
        </mesh>
      ))}

      {/* 3. Radiant Ceramic Heating Coils (125°C Infrared Emitters) */}
      {[-7, -3.5, 0, 3.5, 7].map((xOffset, idx) => (
        <group key={idx} position={[xOffset * 2.1, 3.0, -10.6]}>
          <mesh>
            <cylinderGeometry args={[0.09, 0.09, 7.5, 16]} />
            <meshBasicMaterial color="#ff4400" />
          </mesh>
          <mesh position={[0.45, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 7.5, 16]} />
            <meshBasicMaterial color="#ff6600" />
          </mesh>
        </group>
      ))}

      {/* Point Light from Radiant Heating Zone */}
      <pointLight
        ref={heaterLightRef}
        position={[0, 4, -8]}
        color="#ff7700"
        intensity={3.2}
        distance={24}
        decay={1.8}
      />

      {/* 4. Chamber Digital HUD on Back Wall */}
      <group position={[0, 8.2, -10.6]}>
        <mesh>
          <planeGeometry args={[16, 2.4]} />
          <meshBasicMaterial color="#020305" />
        </mesh>
        <Text
          position={[0, 0.4, 0.05]}
          fontSize={0.9}
          color="#ffaa00"
          anchorX="center"
          anchorY="middle"
        >
          {`ISRO OVEN 01: ${telemetry.chamberTempC.toFixed(1)}°C (N2 PURGE)`}
        </Text>
        <Text
          position={[0, -0.45, 0.05]}
          fontSize={0.52}
          color="#00f0ff"
          anchorX="center"
          anchorY="middle"
        >
          {`PRESSURE: ${telemetry.chamberPressureKPa.toFixed(1)} kPa • FLOW: ${telemetry.nitrogenFlowLpm} L/min`}
        </Text>
      </group>

      {/* 5. Sweeping AI Screening Laser Beam (Horizontal plane sweeping through tray) */}
      {view3DMode === 'CHAMBER' && (
        <mesh ref={scanBeamRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[33, 0.4]} />
          <meshBasicMaterial
            color="#00f0ff"
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
};
