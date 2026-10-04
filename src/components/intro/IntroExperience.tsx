import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useBurnInStore } from '../../state/useBurnInStore';
import { useIntroPointer } from './IntroPointerField';
import { IntroGrid } from './IntroGrid';
import { IntroLogo3D } from './IntroLogo3D';
import { IntroSystemStatus } from './IntroSystemStatus';
import { IntroStartButton } from './IntroStartButton';

interface IntroExperienceProps {
  onComplete: () => void;
}

// Interactive 3D Lighting Rig following pointer with real-time specular glints
const PointerLighting3D: React.FC<{
  theme: 'dark' | 'light';
  pointerX: number;
  pointerY: number;
}> = ({ theme, pointerX, pointerY }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  const isDark = theme === 'dark';

  useFrame((_, delta) => {
    if (lightRef.current) {
      // Dynamic specular light follows cursor across the 3D emblem
      const targetX = pointerX * 7.5;
      const targetY = -pointerY * 5.0;
      lightRef.current.position.x = THREE.MathUtils.lerp(
        lightRef.current.position.x,
        targetX,
        delta * 6.0
      );
      lightRef.current.position.y = THREE.MathUtils.lerp(
        lightRef.current.position.y,
        targetY,
        delta * 6.0
      );
    }
  });

  return (
    <>
      <ambientLight intensity={isDark ? 0.8 : 1.15} />
      <directionalLight
        position={[7, 9, 8]}
        intensity={isDark ? 1.8 : 1.4}
        color={isDark ? '#e0f2fe' : '#ffffff'}
        castShadow
      />
      {/* Interactive Cursor-Tracking 3D Specular Light */}
      <pointLight
        ref={lightRef}
        position={[0, 0, 5.5]}
        intensity={isDark ? 3.6 : 2.6}
        color={isDark ? '#38bdf8' : '#0284c7'}
        distance={16}
        decay={2}
      />
      {/* Signature ISRO Plume Orange Rim Light */}
      <directionalLight
        position={[-6, -4, -6]}
        intensity={isDark ? 1.6 : 1.0}
        color="#f37023"
      />
    </>
  );
};

export const IntroExperience: React.FC<IntroExperienceProps> = ({ onComplete }) => {
  const theme = useBurnInStore((state) => state.theme);
  const pointer = useIntroPointer();

  // Animation timeline progression states
  const [timelineStep, setTimelineStep] = useState(0);
  const [isTitleRevealed, setIsTitleRevealed] = useState(false);
  const [statusStep, setStatusStep] = useState(0);
  const [isButtonActive, setIsButtonActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Controlled timeline sequencing
  useEffect(() => {
    // 0.15s: 3D scene boot
    const t1 = setTimeout(() => setTimelineStep(1), 150);

    // 0.6s: header and subtitle reveal
    const t2 = setTimeout(() => setIsTitleRevealed(true), 600);

    // 1.0s to 2.0s: system initialization steps 1 to 5
    const t3 = setTimeout(() => setStatusStep(1), 1000);
    const t4 = setTimeout(() => setStatusStep(2), 1250);
    const t5 = setTimeout(() => setStatusStep(3), 1500);
    const t6 = setTimeout(() => setStatusStep(4), 1750);
    const t7 = setTimeout(() => setStatusStep(5), 2000);

    // 2.1s: start button becomes fully active
    const t8 = setTimeout(() => setIsButtonActive(true), 2100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
      clearTimeout(t7);
      clearTimeout(t8);
    };
  }, []);

  // Handle Start Click (User can click immediately at any time!)
  const handleStart = useCallback(() => {
    if (isStarting) return;
    setIsStarting(true);

    // 700ms Cinematic 3D Depth Zoom Warp into Chamber:
    // 1. 3D logo spins up into acceleration warp & zooms toward camera (0 - 450ms)
    // 2. Entire overlay dissolves out to reveal the preloaded live digital twin chamber (450 - 750ms)
    setTimeout(() => {
      setIsFadingOut(true);
    }, 450);

    setTimeout(() => {
      onComplete();
    }, 750);
  }, [isStarting, onComplete]);

  // Global Enter / Space key trigger to start immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        handleStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStart]);

  const isDark = theme === 'dark';

  return (
    <div
      className={`fixed inset-0 w-screen h-screen z-50 flex flex-col justify-between overflow-hidden font-sans select-none transition-all ${
        isFadingOut
          ? 'opacity-0 scale-105 pointer-events-none duration-400 ease-out'
          : 'opacity-100 scale-100 duration-300'
      }`}
      style={{
        backgroundColor: isDark ? '#05080d' : '#f5f8fb',
        color: isDark ? '#e8f0f7' : '#102033',
      }}
    >
      {/* ========================================================================= */}
      {/* 1. FULLSCREEN THREE.JS 3D CANVAS: ROTATING & ANIMATING ISRO EMBLEM         */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 w-full h-full z-10 pointer-events-auto">
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: isDark ? 1.3 : 1.1,
          }}
        >
          <color attach="background" args={[isDark ? '#05080d' : '#f5f8fb']} />
          <PerspectiveCamera makeDefault position={[0, 0, 9.6]} fov={42} />

          {/* Interactive 3D Lighting Rig */}
          <PointerLighting3D
            theme={theme}
            pointerX={pointer.smoothX}
            pointerY={pointer.smoothY}
          />

          {/* 3D Rotating & Animating ISRO Emblem (75% Render Scale & Mouse-Driven 3D Rotation) */}
          <IntroLogo3D
            theme={theme}
            pointerX={pointer.smoothX}
            pointerY={pointer.smoothY}
            isStarting={isStarting}
            scale={window.innerWidth < 768 ? 0.65 : 0.75}
          />
        </Canvas>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUBTLE ENGINEERING BACKGROUND GRID (LAYER 2)                           */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <IntroGrid theme={theme} smoothX={pointer.smoothX} smoothY={pointer.smoothY} />
      </div>

      {/* ========================================================================= */}
      {/* 3. FOREGROUND CINEMATIC AEROSPACE HUD OVERLAYS (LAYER 3 - FLOATING)      */}
      {/* ========================================================================= */}
      {/* Top Mission Identifier Header */}
      <header className="relative z-30 pt-5 px-6 sm:px-10 flex items-center justify-between pointer-events-none select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-[6px] bg-cyan-950/80 dark:bg-cyan-950/60 border border-cyan-500/30">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-mono text-xs tracking-widest uppercase text-cyan-300 font-bold">
              ISRO • PROBLEM STATEMENT SIH26170
            </span>
          </div>
          <span className="hidden md:inline font-mono text-[10px] text-[var(--text-muted)] tracking-wider">
            ELECTRONIC COMPONENT QUALIFICATION PROTOCOL
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--text-muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>MIL-STD-883H CLASS-S READY</span>
        </div>
      </header>

      {/* Center Spacer: Keeps the center 100% CLEAR so the 3D rotating ISRO emblem commands the screen */}
      <div className="flex-1 pointer-events-none" />

      {/* Bottom Mission Control Console & Launch Gate */}
      <main className="relative z-30 pb-6 px-4 flex flex-col items-center text-center max-w-xl mx-auto w-full pointer-events-none">
        {/* Main Product Title */}
        <div
          className="transition-all duration-700 pointer-events-auto"
          style={{
            opacity: isTitleRevealed ? 1 : 0,
            transform: `translateY(${isTitleRevealed ? 0 : 10}px)`,
          }}
        >
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl tracking-tight text-[var(--text-primary)] drop-shadow-md">
            BURNWATCH <span className="text-[var(--accent)] font-mono">3D</span>
          </h1>

          <div className="mt-0.5 font-display font-semibold text-xs sm:text-sm tracking-wider uppercase text-[var(--text-secondary)]">
            AI-Driven Anomaly Detection in Component Burn-In & Screening
          </div>
        </div>

        {/* System Initialization Status Section */}
        <div
          className="w-full transition-all duration-700 pointer-events-auto mt-2"
          style={{
            opacity: isTitleRevealed ? 1 : 0,
            transform: `translateY(${isTitleRevealed ? 0 : 8}px)`,
          }}
        >
          <IntroSystemStatus theme={theme} startStep={statusStep} />
        </div>

        {/* Primary CTA Start Button */}
        <div className="pointer-events-auto mt-2">
          <IntroStartButton
            theme={theme}
            isActive={isButtonActive}
            onClick={handleStart}
            isStarting={isStarting}
          />
        </div>

        {/* Keyboard and interaction hint */}
        <div className="mt-2 text-[10px] font-mono text-[var(--text-muted)] opacity-70 tracking-wider">
          PRESS <span className="font-bold text-[var(--accent)]">ENTER</span> /{' '}
          <span className="font-bold text-[var(--accent)]">SPACE</span> TO START • MOVE CURSOR TO TILT 3D FIELD
        </div>
      </main>

      {/* Subtle Bottom Mission Clearance Metadata */}
      <footer className="relative z-30 pb-3 px-6 sm:px-10 flex items-center justify-between font-mono text-[9px] text-[var(--text-muted)] opacity-60 pointer-events-none select-none">
        <span>SECURITY: ISRO-FLIGHT-QUAL-A</span>
        <span className="hidden md:inline">BENCHMARK: 1,000 ICS (LOT-04) • 125°C ESS CHAMBER 01-A</span>
        <span>ZERO FALSE NEGATIVE GUARANTEE</span>
      </footer>
    </div>
  );
};

export default IntroExperience;
