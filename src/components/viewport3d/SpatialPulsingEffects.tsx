import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useBurnInStore } from '../../state/useBurnInStore';
import { getThemeConfig } from '../../theme/themeTokens';

interface SpatialPulsingEffectsProps {
  chipId: string;
}

export const SpatialPulsingEffects: React.FC<SpatialPulsingEffectsProps> = ({ chipId }) => {
  const chips = useBurnInStore((state) => state.chips);
  const theme = useBurnInStore((state) => state.theme);
  const cfg = getThemeConfig(theme);

  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const hotspotRef = useRef<THREE.Mesh>(null);

  const chip = chips.find((c) => c.part_id === chipId);
  if (!chip) return null;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Expanding acoustic/thermal shockwave rings
    if (ring1Ref.current) {
      const progress1 = (t * 1.5) % 1.0;
      const s1 = 0.5 + progress1 * 2.2;
      ring1Ref.current.scale.set(s1, s1, s1);
      (ring1Ref.current.material as THREE.MeshBasicMaterial).opacity = (1.0 - progress1) * 0.8;
    }

    if (ring2Ref.current) {
      const progress2 = ((t * 1.5) + 0.5) % 1.0;
      const s2 = 0.5 + progress2 * 2.2;
      ring2Ref.current.scale.set(s2, s2, s2);
      (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity = (1.0 - progress2) * 0.8;
    }

    // Vertical scanning laser beam
    if (beamRef.current) {
      beamRef.current.position.y = 3.5 + 0.2 * Math.sin(t * 4.0);
      (beamRef.current.material as THREE.MeshBasicMaterial).opacity = 0.45 + 0.25 * Math.sin(t * 8.0);
    }

    // Localized thermal hotspot pulse over the chip package
    if (hotspotRef.current) {
      const pulse = 1.0 + 0.2 * Math.sin(t * 7.0);
      hotspotRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group position={[chip.trayX, chip.trayY, chip.trayZ]}>
      {/* 1. Concentric Acoustic Shockwave Ring 1 */}
      <mesh ref={ring1Ref} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.36, 32]} />
        <meshBasicMaterial
          color="#f59e0b"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Concentric Acoustic Shockwave Ring 2 */}
      <mesh ref={ring2Ref} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.36, 32]} />
        <meshBasicMaterial
          color="#ef4444"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3. Localized Thermal Hotspot Dome over the Die */}
      <mesh ref={hotspotRef} position={[0, 0.16, 0]}>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshBasicMaterial
          color="#ff3344"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 4. Vertical Telemetry & AI Locking Beam */}
      <mesh ref={beamRef} position={[0, 3.5, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 7.0, 16]} />
        <meshBasicMaterial
          color="#f59e0b"
          transparent
          opacity={0.7}
          blending={theme === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending}
        />
      </mesh>
    </group>
  );
};
