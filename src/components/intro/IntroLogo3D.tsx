import React, { useRef, useMemo, useEffect } from 'react';
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
  scale = 1.0,
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

    const cyan = new THREE.Color(isDark ? '#20d6e8' : '#0284c7');
    const amber = new THREE.Color('#f37023'); // ISRO signature orange
    const white = new THREE.Color(isDark ? '#ffffff' : '#94a3b8');

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 3.2 + Math.random() * 2.6;
      const height = (Math.random() - 0.5) * 2.4;

      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = height;
      pos[i * 3 + 2] = Math.sin(angle) * radius;

      const pickColor = Math.random() > 0.6 ? amber : Math.random() > 0.3 ? cyan : white;
      col[i * 3] = pickColor.r;
      col[i * 3 + 1] = pickColor.g;
      col[i * 3 + 2] = pickColor.b;
    }

    return { particlePositions: pos, particleColors: col };
  }, [isDark]);

  // Entrance scale animation
  const currentScaleRef = useRef(0.2);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    // Smooth entrance scale-up
    currentScaleRef.current = THREE.MathUtils.lerp(
      currentScaleRef.current,
      isStarting ? 3.2 : scale,
      delta * (isStarting ? 4.0 : 3.5)
    );

    if (groupRef.current) {
      groupRef.current.scale.setScalar(currentScaleRef.current);

      if (isStarting) {
        // High-velocity forward camera warp into chamber on Start
        groupRef.current.position.z += delta * 20.0;
      } else {
        // Subtle floating 3D bobbing
        groupRef.current.position.y = 0.28 + Math.sin(t * 1.5) * 0.09;
      }
    }

    // 3D Continuous Orbit Rotation & Pointer-Responsive 3D Tilt
    if (emblemRef.current) {
      if (isStarting) {
        // Rapid acceleration spin on start
        emblemRef.current.rotation.y += delta * 12.0;
      } else {
        // Continuous smooth rotation around Y axis (360-degree true 3D revolution)
        emblemRef.current.rotation.y += delta * 0.65;

        // Pointer-following 3D pitch/roll tilt with smooth spring damping
        const targetTiltX = -pointerY * 0.32;
        const targetTiltZ = -pointerX * 0.26;
        emblemRef.current.rotation.x = THREE.MathUtils.lerp(
          emblemRef.current.rotation.x,
          targetTiltX,
          delta * 4.5
        );
        emblemRef.current.rotation.z = THREE.MathUtils.lerp(
          emblemRef.current.rotation.z,
          targetTiltZ,
          delta * 4.5
        );
      }
    }

    // 3D Orbital Scientific Rings rotation at differential velocities
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += delta * (isStarting ? 4.0 : 0.45);
      ring1Ref.current.rotation.x = Math.sin(t * 0.8) * 0.2;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z -= delta * (isStarting ? 3.0 : 0.32);
      ring2Ref.current.rotation.y = Math.cos(t * 0.6) * 0.25;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.z += delta * (isStarting ? 2.5 : 0.18);
    }

    // 3D Orbiting Swarm Particles
    if (particlesRef.current) {
      particlesRef.current.rotation.y -= delta * (isStarting ? 6.0 : 0.3);
    }
  });

  const cylinderRadius = 2.15;
  const cylinderThickness = 0.28;

  return (
    <group ref={groupRef} position={[0, 0.28, 0]}>
      {/* ========================================================================= */}
      {/* 1. CENTRAL ROTATING 3D EMBLEM MEDALLION                                  */}
      {/* ========================================================================= */}
      <group ref={emblemRef}>
        {/* 1A. Medallion 3D Cylindrical Body (Oriented with cylinder axis along Z) */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[cylinderRadius, cylinderRadius, cylinderThickness, 64]} />
          <meshStandardMaterial
            color={isDark ? '#1a2634' : '#e2e8f0'}
            metalness={0.92}
            roughness={0.2}
          />
        </mesh>

        {/* 1B. Outer Chamfered Torus Rims (Front & Back) */}
        {/* Front Chamfer Rim */}
        <mesh position={[0, 0, cylinderThickness / 2]}>
          <torusGeometry args={[cylinderRadius, 0.065, 16, 64]} />
          <meshStandardMaterial
            color={isDark ? '#20d6e8' : '#087ea4'}
            metalness={0.95}
            roughness={0.12}
            emissive={isDark ? '#20d6e8' : '#087ea4'}
            emissiveIntensity={isDark ? 0.5 : 0.25}
          />
        </mesh>
        {/* Back Chamfer Rim */}
        <mesh position={[0, 0, -cylinderThickness / 2]}>
          <torusGeometry args={[cylinderRadius, 0.065, 16, 64]} />
          <meshStandardMaterial
            color={isDark ? '#20d6e8' : '#087ea4'}
            metalness={0.95}
            roughness={0.12}
            emissive={isDark ? '#20d6e8' : '#087ea4'}
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

        {/* 1E. 4 Cardinal 3D Sensor Pins / Gold Contact Lugs */}
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
              color="#ffb020"
              emissive="#ffb020"
              emissiveIntensity={0.85}
              metalness={0.9}
              roughness={0.2}
            />
          </mesh>
        ))}
      </group>

      {/* ========================================================================= */}
      {/* 2. CONCENTRIC 3D SCIENTIFIC CALIBRATION RINGS                           */}
      {/* ========================================================================= */}
      {/* Ring 1: Inner Cyan Torus Orbit */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 5, 0, 0]}>
        <torusGeometry args={[2.85, 0.024, 16, 96]} />
        <meshBasicMaterial
          color={isDark ? '#20d6e8' : '#087ea4'}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Ring 2: Intermediate Orbital Track */}
      <mesh ref={ring2Ref} rotation={[-Math.PI / 3.5, 0, 0]}>
        <torusGeometry args={[3.55, 0.02, 16, 96]} />
        <meshBasicMaterial
          color={isDark ? '#38bdf8' : '#0284c7'}
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* Ring 3: Outer Horizon Ring */}
      <mesh ref={ring3Ref} rotation={[0, 0, 0]}>
        <torusGeometry args={[4.25, 0.016, 16, 96]} />
        <meshBasicMaterial
          color={isDark ? '#64748b' : '#94a3b8'}
          transparent
          opacity={0.35}
        />
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
