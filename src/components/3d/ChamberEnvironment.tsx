import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useBurnInStore } from '../../state/useBurnInStore';
import { getThemeConfig } from '../../theme/themeTokens';

export const ChamberEnvironment: React.FC = () => {
  const telemetry = useBurnInStore((state) => state.telemetry);
  const view3DMode = useBurnInStore((state) => state.view3DMode);
  const theme = useBurnInStore((state) => state.theme);
  const cfg = getThemeConfig(theme);

  const heaterLightRef = useRef<THREE.PointLight>(null);
  const scanBeamRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (heaterLightRef.current) {
      heaterLightRef.current.intensity =
        cfg.three.heaterIntensity + (theme === 'dark' ? 0.6 : 0.3) * Math.sin(t * 2.8);
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
          color={cfg.three.trayGrateColor}
          metalness={cfg.three.trayGrateMetalness}
          roughness={cfg.three.trayGrateRoughness}
        />
      </mesh>

      {/* PCB Trace Floor Accent (Perforated circuit board texture simulation) */}
      <gridHelper
        args={[34, 34, cfg.three.gridColorCenter, cfg.three.gridColorGrid]}
        position={[0, -0.04, 0]}
      />

      {/* Gold-Plated High-Temp Bus Rails */}
      <mesh position={[0, -0.03, -8.6]}>
        <boxGeometry args={[34.2, 0.16, 0.4]} />
        <meshStandardMaterial
          color={cfg.three.busRailColor}
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0, -0.03, 8.6]}>
        <boxGeometry args={[34.2, 0.16, 0.4]} />
        <meshStandardMaterial
          color={cfg.three.busRailColor}
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {/* 2. Industrial Oven Enclosure Back Wall with Thermal Reflective Baffles */}
      <mesh position={[0, 5.5, -11]}>
        <boxGeometry args={[38, 13, 0.6]} />
        <meshStandardMaterial
          color={cfg.three.wallColor}
          metalness={theme === 'dark' ? 0.88 : 0.4}
          roughness={theme === 'dark' ? 0.35 : 0.6}
        />
      </mesh>

      {/* Chamber Structural Steel Corner Struts */}
      {[-18, 18].map((x, i) => (
        <mesh key={i} position={[x, 5.5, 0]}>
          <boxGeometry args={[0.8, 13, 19]} />
          <meshStandardMaterial
            color={cfg.three.cornerStrutColor}
            metalness={0.7}
            roughness={0.4}
          />
        </mesh>
      ))}

      {/* 3. Radiant Ceramic Heating Coils (125°C Infrared Emitters) */}
      {[-7, -3.5, 0, 3.5, 7].map((xOffset, idx) => (
        <group key={idx} position={[xOffset * 2.1, 3.0, -10.6]}>
          <mesh>
            <cylinderGeometry args={[0.09, 0.09, 7.5, 16]} />
            <meshBasicMaterial color={cfg.three.coilColor} />
          </mesh>
          <mesh position={[0.45, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 7.5, 16]} />
            <meshBasicMaterial color={cfg.three.coilColor} />
          </mesh>
        </group>
      ))}

      {/* Point Light from Radiant Heating Zone */}
      <pointLight
        ref={heaterLightRef}
        position={[0, 4, -8]}
        color={cfg.three.heaterPointColor}
        intensity={cfg.three.heaterIntensity}
        distance={24}
        decay={1.8}
      />

      {/* 4. Chamber Digital HUD on Back Wall */}
      <group position={[0, 8.2, -10.6]}>
        <mesh>
          <planeGeometry args={[16, 2.4]} />
          <meshBasicMaterial color={cfg.three.hudPlateColor} />
        </mesh>
        <Text
          position={[0, 0.4, 0.05]}
          fontSize={0.9}
          color={cfg.three.hudTextColor}
          anchorX="center"
          anchorY="middle"
        >
          {`ISRO OVEN 01: ${telemetry.chamberTempC.toFixed(1)}°C (N2 PURGE)`}
        </Text>
        <Text
          position={[0, -0.45, 0.05]}
          fontSize={0.52}
          color={cfg.three.hudSubtextColor}
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
            color={cfg.three.laserScanColor}
            transparent
            opacity={theme === 'dark' ? 0.35 : 0.22}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
};
