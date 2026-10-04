import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface IntroLogo3DProps {
  theme: 'dark' | 'light';
  pointerX: number;
  pointerY: number;
  isStarting: boolean;
  scale?: number;
}

export const IntroLogo3D: React.FC<IntroLogo3DProps> = ({
  theme,
  pointerX,
  pointerY,
  isStarting,
  scale = 0.75,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const emblemRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const isDark = theme === 'dark';

  // Load the clean square 1:1 transparent ISRO logo texture with zero Suspense stall
  const isroTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load('/assets/isro-logo-clean.png', (loaded) => {
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.minFilter = THREE.LinearFilter;
      loaded.magFilter = THREE.LinearFilter;
      loaded.generateMipmaps = true;
      loaded.needsUpdate = true;
    });
    return tex;
  }, []);

  // Generate 3D Orbiting Telemetry Particles around the emblem
  const particleCount = 220;
  const { particlePositions, particleColors } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);

    // Indian flag palette particles: saffron, India Green, Ashoka Navy, white
    const saffron = new THREE.Color('#FF9933');
    const green   = new THREE.Color('#138808');
    const navy    = new THREE.Color('#000080');
    const white   = new THREE.Color('#ffffff');

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 3.2 + Math.random() * 2.6;
      const height = (Math.random() - 0.5) * 2.4;

      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = height;
      pos[i * 3 + 2] = Math.sin(angle) * radius;

      const r = Math.random();
      const pickColor = r > 0.65 ? saffron : r > 0.35 ? green : r > 0.15 ? navy : white;
      col[i * 3] = pickColor.r;
      col[i * 3 + 1] = pickColor.g;
      col[i * 3 + 2] = pickColor.b;
    }

    return { particlePositions: pos, particleColors: col };
  }, [isDark]);

  // Entrance scale animation (smoothly reaches 75% render scale)
  const currentScaleRef = useRef(0.15);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    // 1. RENDER AT 75% SCALE IN 3D
    const targetScale = isStarting ? 3.0 : scale;
    currentScaleRef.current = THREE.MathUtils.lerp(
      currentScaleRef.current,
      targetScale,
      delta * (isStarting ? 4.0 : 3.8)
    );

    // 2. 3D POSITION PARALLAX: Translate based on mouse movement at 75% amplitude
    if (groupRef.current) {
      groupRef.current.scale.setScalar(currentScaleRef.current);

      if (isStarting) {
        // High-velocity forward camera warp into chamber on Start
        groupRef.current.position.z += delta * 20.0;
      } else {
        // 75% mouse parallax translation in 3D space with gentle vertical breathing
        const targetPosX = pointerX * 0.75;
        const targetPosY = 0.28 + (-pointerY * (0.75 * 0.6)) + Math.sin(t * 1.5) * 0.08;
        const targetPosZ = (1 - (Math.abs(pointerX) + Math.abs(pointerY)) * 0.5) * 0.75 * 0.5;

        groupRef.current.position.x = THREE.MathUtils.lerp(
          groupRef.current.position.x,
          targetPosX,
          delta * 6.5
        );
        groupRef.current.position.y = THREE.MathUtils.lerp(
          groupRef.current.position.y,
          targetPosY,
          delta * 6.5
        );
        groupRef.current.position.z = THREE.MathUtils.lerp(
          groupRef.current.position.z,
          targetPosZ,
          delta * 6.5
        );
      }
    }

    // 3. 3D ROTATION BASED ON MOUSE MOVEMENT AT 75%
    if (emblemRef.current) {
      if (isStarting) {
        // Rapid acceleration spin on start
        emblemRef.current.rotation.y += delta * 14.0;
      } else {
        // 3A. Y-Axis 3D Rotation based on horizontal mouse movement:
        // Sweeps 75% of a full 360° circle (-135° to +135° = 270° = 0.75 * 360°)
        const idleSwayY = Math.sin(t * 0.8) * 0.07;
        const targetRotY = pointerX * (0.75 * Math.PI) + idleSwayY;

        // 3B. X-Axis 3D Pitch based on vertical mouse movement at 75% perspective:
        // Tilts up/down smoothly with cursor
        const idleSwayX = Math.cos(t * 1.0) * 0.04;
        const targetRotX = -pointerY * (0.75 * (Math.PI / 3.4)) + idleSwayX;

        // 3C. Z-Axis 3D Roll based on mouse movement at 75% banking angle:
        const targetRotZ = -pointerX * (0.75 * (Math.PI / 7.5));

        // Fast, tactile spring interpolation (factor 8.0) for instant reactivity
        emblemRef.current.rotation.y = THREE.MathUtils.lerp(
          emblemRef.current.rotation.y,
          targetRotY,
          delta * 8.0
        );
        emblemRef.current.rotation.x = THREE.MathUtils.lerp(
          emblemRef.current.rotation.x,
          targetRotX,
          delta * 8.0
        );
        emblemRef.current.rotation.z = THREE.MathUtils.lerp(
          emblemRef.current.rotation.z,
          targetRotZ,
          delta * 8.0
        );
      }
    }

    // 4. 3D SCIENTIFIC RINGS: Rotate & tilt based on mouse movement at 75%
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += delta * (isStarting ? 5.0 : 0.45);
      ring1Ref.current.rotation.x = (Math.PI / 5) - pointerY * (0.75 * 0.65);
      ring1Ref.current.rotation.y = pointerX * (0.75 * 0.55);
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z -= delta * (isStarting ? 4.0 : 0.35);
      ring2Ref.current.rotation.x = (-Math.PI / 3.5) + pointerY * (0.75 * 0.45);
      ring2Ref.current.rotation.y = -pointerX * (0.75 * 0.5);
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.z += delta * (isStarting ? 3.0 : 0.2);
      ring3Ref.current.rotation.x = pointerY * (0.75 * 0.3);
      ring3Ref.current.rotation.y = pointerX * (0.75 * 0.35);
    }

    // 5. 3D TELEMETRY SWARM: Skews and orbits with mouse movement at 75%
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * (isStarting ? 7.0 : 0.35) + pointerX * 0.05;
      particlesRef.current.rotation.x = -pointerY * (0.75 * 0.32);
    }
  });

  const cylinderRadius = 2.15;
  const cylinderThickness = 0.28;

  return (
    <group ref={groupRef} position={[0, 0.28, 0]}>
      {/* ========================================================================= */}
      {/* 1. CENTRAL ROTATING 3D EMBLEM MEDALLION (75% MOUSE RESPONSIVE)           */}
      {/* ========================================================================= */}
      <group ref={emblemRef}>
        {/* 1A. Medallion 3D Cylindrical Body (Cylinder axis along Z) */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[cylinderRadius, cylinderRadius, cylinderThickness, 64]} />
          <meshStandardMaterial
            color={isDark ? '#120800' : '#f0e0c0'}
            metalness={0.92}
            roughness={0.2}
          />
        </mesh>

        {/* 1B. Outer Chamfered Torus Rims (Front & Back) */}
        {/* Front Chamfer Rim — Saffron */}
        <mesh position={[0, 0, cylinderThickness / 2]}>
          <torusGeometry args={[cylinderRadius, 0.065, 16, 64]} />
          <meshStandardMaterial
            color='#FF9933'
            metalness={0.95}
            roughness={0.12}
            emissive='#FF9933'
            emissiveIntensity={isDark ? 0.55 : 0.28}
          />
        </mesh>
        {/* Back Chamfer Rim — India Green */}
        <mesh position={[0, 0, -cylinderThickness / 2]}>
          <torusGeometry args={[cylinderRadius, 0.065, 16, 64]} />
          <meshStandardMaterial
            color='#138808'
            metalness={0.95}
            roughness={0.12}
            emissive='#138808'
            emissiveIntensity={isDark ? 0.5 : 0.25}
          />
        </mesh>

        {/* 1C. FRONT FACE: Official ISRO Emblem on Titanium Faceplate */}
        {/* Front White Titanium Disc Backing (Authentic ISRO Presentation Surface) */}
        <mesh position={[0, 0, cylinderThickness / 2 + 0.005]}>
          <circleGeometry args={[cylinderRadius * 0.94, 64]} />
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.25}
            metalness={0.08}
          />
        </mesh>
        {/* Front Official ISRO Logo Texture Plane (100% Proportions Preserved, Centered) */}
        <mesh position={[0, 0, cylinderThickness / 2 + 0.008]}>
          <planeGeometry args={[3.2, 3.2]} />
          <meshStandardMaterial
            map={isroTexture}
            transparent={true}
            alphaTest={0.02}
            roughness={0.18}
            metalness={0.05}
          />
        </mesh>

        {/* 1D. BACK FACE: Official ISRO Flight Qualification Seal (Right-Side Up) */}
        {/* Back White Titanium Disc Backing */}
        <mesh position={[0, 0, -(cylinderThickness / 2 + 0.005)]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[cylinderRadius * 0.94, 64]} />
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.25}
            metalness={0.08}
          />
        </mesh>
        {/* Back Official ISRO Logo Texture Plane */}
        <mesh position={[0, 0, -(cylinderThickness / 2 + 0.008)]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[3.2, 3.2]} />
          <meshStandardMaterial
            map={isroTexture}
            transparent={true}
            alphaTest={0.02}
            roughness={0.18}
            metalness={0.05}
          />
        </mesh>

        {/* 1E. 4 Cardinal 3D Sensor Pins — Saffron (N/S) & India Green (E/W) */}
        {[0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((angle, i) => (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * (cylinderRadius + 0.08),
              Math.sin(angle) * (cylinderRadius + 0.08),
              0,
            ]}
            rotation={[0, 0, angle]}
          >
            <boxGeometry args={[0.16, 0.1, cylinderThickness * 0.85]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? '#FF9933' : '#138808'}
              emissive={i % 2 === 0 ? '#FF9933' : '#138808'}
              emissiveIntensity={0.90}
              metalness={0.9}
              roughness={0.2}
            />
          </mesh>
        ))}
      </group>

      {/* ========================================================================= */}
      {/* 2. CONCENTRIC 3D SCIENTIFIC CALIBRATION RINGS                           */}
      {/* ========================================================================= */}
      {/* Ring 1: Inner Saffron Torus — Indian flag saffron */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 5, 0, 0]}>
        <torusGeometry args={[2.85, 0.024, 16, 96]} />
        <meshBasicMaterial color='#FF9933' transparent opacity={0.75} />
      </mesh>

      {/* Ring 2: Middle India Green Orbital Track */}
      <mesh ref={ring2Ref} rotation={[-Math.PI / 3.5, 0, 0]}>
        <torusGeometry args={[3.55, 0.02, 16, 96]} />
        <meshBasicMaterial color='#138808' transparent opacity={0.55} />
      </mesh>

      {/* Ring 3: Outer Ashoka Navy Horizon Ring */}
      <mesh ref={ring3Ref} rotation={[0, 0, 0]}>
        <torusGeometry args={[4.25, 0.016, 16, 96]} />
        <meshBasicMaterial color='#000080' transparent opacity={0.45} />
      </mesh>

      {/* ========================================================================= */}
      {/* 3. 3D ORBITING TELEMETRY SWARM PARTICLES                                 */}
      {/* ========================================================================= */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlePositions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[particleColors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.09}
          vertexColors
          transparent
          opacity={0.85}
          sizeAttenuation
        />
      </points>
    </group>
  );
};

export default IntroLogo3D;
