import React, { useState, useEffect, useCallback } from 'react';
import { useBurnInStore } from '../../state/useBurnInStore';
import { useIntroPointer } from './IntroPointerField';
import { IntroGrid } from './IntroGrid';
import { IntroParticles } from './IntroParticles';
import { IntroTechnicalRings } from './IntroTechnicalRings';
import { IntroLogo } from './IntroLogo';
import { IntroSystemStatus } from './IntroSystemStatus';
import { IntroStartButton } from './IntroStartButton';

interface IntroExperienceProps {
  onComplete: () => void;
}

export const IntroExperience: React.FC<IntroExperienceProps> = ({ onComplete }) => {
  const theme = useBurnInStore((state) => state.theme);
  const pointer = useIntroPointer();

  // Animation timeline progression states
  const [timelineStep, setTimelineStep] = useState(0);
  const [isLogoRevealed, setIsLogoRevealed] = useState(false);
  const [isTitleRevealed, setIsTitleRevealed] = useState(false);
  const [statusStep, setStatusStep] = useState(0);
  const [isButtonActive, setIsButtonActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Controlled timeline sequencing
  useEffect(() => {
    // 0.2s: technical particles and rings initialize
    const t1 = setTimeout(() => setTimelineStep(1), 200);

    // 0.8s: official ISRO logo reveals
    const t2 = setTimeout(() => setIsLogoRevealed(true), 800);

    // 1.3s: title and AI intelligence subtitle reveal
    const t3 = setTimeout(() => setIsTitleRevealed(true), 1300);

    // 1.7s to 2.4s: system initialization steps 1 to 5
    const t4 = setTimeout(() => setStatusStep(1), 1700);
    const t5 = setTimeout(() => setStatusStep(2), 1900);
    const t6 = setTimeout(() => setStatusStep(3), 2100);
    const t7 = setTimeout(() => setStatusStep(4), 2300);
    const t8 = setTimeout(() => setStatusStep(5), 2500);

    // 2.6s: start button becomes fully active
    const t9 = setTimeout(() => setIsButtonActive(true), 2600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
      clearTimeout(t7);
      clearTimeout(t8);
      clearTimeout(t9);
    };
  }, []);

  // Handle Start Click (User can click immediately at any time!)
  const handleStart = useCallback(() => {
    if (isStarting) return;
    setIsStarting(true);

    // Cinematic transition timeline:
    // 1. Central visual brightens and particles warp inward (0 - 450ms)
    // 2. Entire overlay depth-zooms and fades out into live digital twin (450 - 750ms)
    setTimeout(() => {
      setIsFadingOut(true);
    }, 400);

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
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden font-sans select-none transition-all ${
        isFadingOut
          ? 'opacity-0 scale-105 pointer-events-none duration-400 ease-out'
          : 'opacity-100 scale-100 duration-300'
      }`}
      style={{
        backgroundColor: isDark ? '#05080d' : '#f5f8fb',
        color: isDark ? '#e8f0f7' : '#102033',
      }}
    >
      {/* LAYER 1: Deep Aerospace Background with Pointer Soft Lighting */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          background: isDark
            ? `radial-gradient(circle 650px at ${pointer.lightX}px ${pointer.lightY}px, rgba(32, 214, 232, 0.12) 0%, rgba(8, 17, 26, 0.7) 50%, #05080d 100%)`
            : `radial-gradient(circle 650px at ${pointer.lightX}px ${pointer.lightY}px, rgba(8, 126, 164, 0.10) 0%, rgba(232, 238, 244, 0.7) 50%, #f5f8fb 100%)`,
        }}
      />

      {/* LAYER 2: Precision Engineering Grid with Subtle Pointer Perspective */}
      <IntroGrid theme={theme} smoothX={pointer.smoothX} smoothY={pointer.smoothY} />

      {/* LAYER 3: Scientific Telemetry Particles with Inward Signal Drift */}
      <IntroParticles
        theme={theme}
        smoothX={pointer.smoothX}
        smoothY={pointer.smoothY}
        isAccelerating={isStarting}
      />

      {/* LAYER 4: Concentric Scientific Technical Rings */}
      <IntroTechnicalRings
        theme={theme}
        smoothX={pointer.smoothX}
        smoothY={pointer.smoothY}
        isStarting={isStarting}
      />

      {/* LAYER 5: Central Mission Hero Composition */}
      <div className="relative z-30 flex flex-col items-center text-center px-4 max-w-2xl mx-auto my-auto">
        {/* Top Mission Identifier */}
        <div
          className="font-mono text-[11px] tracking-widest uppercase text-[var(--accent)] font-semibold mb-2 transition-all duration-700"
          style={{
            opacity: timelineStep >= 1 ? 0.9 : 0,
            transform: `translateY(${timelineStep >= 1 ? 0 : -8}px)`,
          }}
        >
          ISRO • PROBLEM STATEMENT SIH26170
        </div>

        {/* Official ISRO Mark Presentation */}
        <IntroLogo
          theme={theme}
          smoothX={pointer.smoothX}
          smoothY={pointer.smoothY}
          isRevealed={isLogoRevealed}
          isStarting={isStarting}
        />

        {/* Main Product Title */}
        <div
          className="mt-4 transition-all duration-700"
          style={{
            opacity: isTitleRevealed ? 1 : 0,
            transform: `translateY(${isTitleRevealed ? 0 : 12}px)`,
          }}
        >
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-[var(--text-primary)]">
            BURNWATCH <span className="text-[var(--accent)] font-mono">3D</span>
          </h1>

          <div className="mt-1 font-display font-semibold text-xs sm:text-sm tracking-wider uppercase text-[var(--text-secondary)]">
            AI-Driven Anomaly Detection in Component Burn-In & Screening
          </div>

          <p className="mt-1 font-sans text-xs text-[var(--text-muted)] max-w-lg mx-auto leading-relaxed hidden sm:block">
            Semiconductor reliability digital twin delivering early latent defect screening at 24h with zero false negatives.
          </p>
        </div>

        {/* Technical Divider Bar */}
        <div
          className="w-48 h-[1px] my-3 mx-auto transition-all duration-700"
          style={{
            opacity: isTitleRevealed ? 0.4 : 0,
            background: isDark
              ? 'linear-gradient(90deg, transparent, rgba(32, 214, 232, 0.8), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(8, 126, 164, 0.8), transparent)',
          }}
        />

        {/* System Initialization Status Section */}
        <div
          className="w-full transition-all duration-700"
          style={{
            opacity: isTitleRevealed ? 1 : 0,
            transform: `translateY(${isTitleRevealed ? 0 : 8}px)`,
          }}
        >
          <IntroSystemStatus theme={theme} startStep={statusStep} />
        </div>

        {/* Primary CTA Start Button with Magnetic Pointer Pull */}
        <IntroStartButton
          theme={theme}
          isActive={isButtonActive}
          onClick={handleStart}
          isStarting={isStarting}
        />
      </div>

      {/* Subtle Bottom Mission Clearance Metadata */}
      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-between px-6 font-mono text-[9px] text-[var(--text-muted)] opacity-50 pointer-events-none select-none">
        <span>SECURITY LEVEL: ISRO-FLIGHT-QUAL-A</span>
        <span>BENCHMARK DATASET: N=1,000 ICS (LOT-04)</span>
        <span>ZERO FALSE NEGATIVE GUARANTEE</span>
      </div>
    </div>
  );
};
export default IntroExperience;
