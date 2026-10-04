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

// Interactive 3D Lighting Rig — Indian flag palette
const PointerLighting3D: React.FC<{
  theme: 'dark' | 'light';
  pointerX: number;
  pointerY: number;
}> = ({ theme, pointerX, pointerY }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  const isDark = theme === 'dark';

  useFrame((_, delta) => {
    if (lightRef.current) {
      const targetX = pointerX * 7.5;
      const targetY = -pointerY * 5.0;
      lightRef.current.position.x = THREE.MathUtils.lerp(lightRef.current.position.x, targetX, delta * 6.0);
      lightRef.current.position.y = THREE.MathUtils.lerp(lightRef.current.position.y, targetY, delta * 6.0);
    }
  });

  return (
    <>
      <ambientLight intensity={isDark ? 0.55 : 1.0} color={isDark ? '#ff9933' : '#ffffff'} />
      {/* Key light — warm saffron */}
      <directionalLight position={[7, 9, 8]} intensity={isDark ? 1.6 : 1.4} color={isDark ? '#ffe0a0' : '#ffffff'} castShadow />
      {/* Interactive cursor saffron specular */}
      <pointLight ref={lightRef} position={[0, 0, 5.5]} intensity={isDark ? 4.0 : 2.8} color='#ff9933' distance={16} decay={2} />
      {/* India Green fill from below-left */}
      <directionalLight position={[-5, -4, -4]} intensity={isDark ? 0.9 : 0.6} color='#138808' />
      {/* Ashoka Navy rim from right */}
      <directionalLight position={[6, 2, -5]} intensity={isDark ? 0.6 : 0.4} color='#000080' />
    </>
  );
};

export const IntroExperience: React.FC<IntroExperienceProps> = ({ onComplete }) => {
  const theme = useBurnInStore((state) => state.theme);
  const pointer = useIntroPointer();

  const [isTitleRevealed, setIsTitleRevealed] = useState(false);
  const [statusStep, setStatusStep] = useState(0);
  const [isButtonActive, setIsButtonActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setIsTitleRevealed(true), 600);
    const t2 = setTimeout(() => setStatusStep(1), 1000);
    const t3 = setTimeout(() => setStatusStep(2), 1250);
    const t4 = setTimeout(() => setStatusStep(3), 1500);
    const t5 = setTimeout(() => setStatusStep(4), 1750);
    const t6 = setTimeout(() => setStatusStep(5), 2000);
    const t7 = setTimeout(() => setIsButtonActive(true), 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); clearTimeout(t6); clearTimeout(t7); };
  }, []);

  const handleStart = useCallback(() => {
    if (isStarting) return;
    setIsStarting(true);
    setTimeout(() => setIsFadingOut(true), 450);
    setTimeout(() => onComplete(), 750);
  }, [isStarting, onComplete]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.code === 'Space') { e.preventDefault(); handleStart(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStart]);

  const isDark = theme === 'dark';

  return (
    <div
      className={`fixed inset-0 w-screen h-screen z-50 flex flex-col justify-between overflow-hidden font-sans select-none transition-all ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none duration-400 ease-out' : 'opacity-100 scale-100 duration-300'
      }`}
      style={{ backgroundColor: isDark ? '#000000' : '#fff8f0', color: isDark ? '#ffffff' : '#1a0d00' }}
    >
      {/* ── FULLSCREEN THREE.JS 3D CANVAS ─────────────────────────── */}
      <div className="absolute inset-0 w-full h-full z-10 pointer-events-auto">
        <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: isDark ? 1.3 : 1.1 }}>
          <color attach="background" args={[isDark ? '#000000' : '#fff8f0']} />
          <PerspectiveCamera makeDefault position={[0, 0, 9.6]} fov={42} />
          <PointerLighting3D theme={theme} pointerX={pointer.smoothX} pointerY={pointer.smoothY} />
          <IntroLogo3D
            theme={theme}
            pointerX={pointer.smoothX}
            pointerY={pointer.smoothY}
            isStarting={isStarting}
            scale={window.innerWidth < 768 ? 0.65 : 0.75}
          />
        </Canvas>
      </div>

      {/* ── BACKGROUND ENGINEERING GRID ───────────────────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <IntroGrid theme={theme} smoothX={pointer.smoothX} smoothY={pointer.smoothY} />
      </div>

      {/* ── TOP MISSION HEADER ────────────────────────────────────── */}
      <header className="relative z-30 pt-5 px-6 sm:px-10 flex items-center justify-between pointer-events-none select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-[6px] border"
            style={{ backgroundColor: isDark ? 'rgba(255,153,51,0.12)' : 'rgba(255,153,51,0.15)', borderColor: 'rgba(255,153,51,0.45)' }}>
            <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: '#ff9933' }} />
            <span className="font-mono text-xs tracking-widest uppercase font-bold" style={{ color: '#ff9933' }}>
              ISRO • PROBLEM STATEMENT SIH26170
            </span>
          </div>
          <span className="hidden md:inline font-mono text-[10px] tracking-wider" style={{ color: isDark ? '#7a5c3a' : '#a05a20' }}>
            ELECTRONIC COMPONENT QUALIFICATION PROTOCOL
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]" style={{ color: isDark ? '#7a5c3a' : '#a05a20' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#138808' }} />
          <span>MIL-STD-883H CLASS-S READY</span>
        </div>
      </header>

      {/* ── CENTER SPACER — 3D emblem commands the screen ─────────── */}
      <div className="flex-1 pointer-events-none" />

      {/* ── BOTTOM MISSION CONSOLE & LAUNCH GATE ─────────────────── */}
      <main className="relative z-30 pb-6 px-4 flex flex-col items-center text-center max-w-xl mx-auto w-full pointer-events-none">
        {/* Product Title */}
        <div className="transition-all duration-700 pointer-events-auto"
          style={{ opacity: isTitleRevealed ? 1 : 0, transform: `translateY(${isTitleRevealed ? 0 : 10}px)` }}>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl tracking-tight drop-shadow-md"
            style={{ color: isDark ? '#ffffff' : '#1a0d00' }}>
            BURNWATCH{' '}
            <span className="font-mono" style={{ color: '#ff9933' }}>3D</span>
          </h1>
          <div className="mt-0.5 font-display font-semibold text-xs sm:text-sm tracking-wider uppercase"
            style={{ color: isDark ? '#d9a96e' : '#7a3d00' }}>
            AI-Driven Anomaly Detection in Component Burn-In &amp; Screening
          </div>
        </div>

        {/* Indian flag colour bar divider */}
        <div className="flex w-48 h-[3px] my-2 mx-auto rounded-full overflow-hidden"
          style={{ opacity: isTitleRevealed ? 0.8 : 0, transition: 'opacity 0.7s' }}>
          <div className="flex-1" style={{ backgroundColor: '#ff9933' }} />
          <div className="flex-1" style={{ backgroundColor: '#ffffff' }} />
          <div className="flex-1" style={{ backgroundColor: '#138808' }} />
        </div>

        {/* System Status */}
        <div className="w-full transition-all duration-700 pointer-events-auto mt-2"
          style={{ opacity: isTitleRevealed ? 1 : 0, transform: `translateY(${isTitleRevealed ? 0 : 8}px)` }}>
          <IntroSystemStatus theme={theme} startStep={statusStep} />
        </div>

        {/* Start Button */}
        <div className="pointer-events-auto mt-2">
          <IntroStartButton theme={theme} isActive={isButtonActive} onClick={handleStart} isStarting={isStarting} />
        </div>

        {/* Keyboard hint */}
        <div className="mt-2 text-[10px] font-mono tracking-wider" style={{ color: isDark ? '#7a5c3a' : '#a05a20', opacity: 0.8 }}>
          PRESS{' '}<span className="font-bold" style={{ color: '#ff9933' }}>ENTER</span>
          {' '}/ <span className="font-bold" style={{ color: '#ff9933' }}>SPACE</span>
          {' '}TO START • MOVE CURSOR TO ROTATE 3D FIELD
        </div>
      </main>

      {/* ── BOTTOM METADATA ───────────────────────────────────────── */}
      <footer className="relative z-30 pb-3 px-6 sm:px-10 flex items-center justify-between font-mono text-[9px] opacity-50 pointer-events-none select-none"
        style={{ color: isDark ? '#7a5c3a' : '#a05a20' }}>
        <span>SECURITY: ISRO-FLIGHT-QUAL-A</span>
        <span className="hidden md:inline">BENCHMARK: 1,000 ICS (LOT-04) • 125°C ESS CHAMBER 01-A</span>
        <span>ZERO FALSE NEGATIVE GUARANTEE</span>
      </footer>
    </div>
  );
};

export default IntroExperience;
