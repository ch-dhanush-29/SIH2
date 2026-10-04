import React, { useEffect, useState } from 'react';
import { useBurnInStore } from './state/useBurnInStore';
import { CHECKPOINTS, CheckpointHour } from './types/burnIn';
import { BurnInCanvas } from './components/viewport3d/BurnInCanvas';
import { TopNavHeader } from './components/ui/TopNavHeader';
import { LeftMissionDock } from './components/ui/LeftMissionDock';
import { VisionMonitor } from './components/ui/VisionMonitor';
import { CinematicTimeline } from './components/ui/CinematicTimeline';
import { InspectionHUD } from './components/ui/InspectionHUD';
import { BootSequence } from './components/ui/BootSequence';
import { ToastContainer } from './components/common/ToastContainer';
import { GoldenDemoModal } from './components/panels/GoldenDemoModal';
import { AuditLogModal } from './components/panels/AuditLogModal';
import { AiAssistantModal } from './components/panels/AiAssistantModal';
import { EngineeringModal } from './components/panels/EngineeringModal';
import { HeroExplanationDock } from './components/ui/HeroExplanationDock';
import { LotOutlierDock } from './components/ui/LotOutlierDock';
import { IntroExperience } from './components/intro/IntroExperience';
import { DemoStoryPhase } from './types/burnIn';

export const App: React.FC = () => {
  const initialize = useBurnInStore((state) => state.initialize);
  const isStreaming = useBurnInStore((state) => state.telemetry.isStreaming);
  const tickStreamSimulation = useBurnInStore((state) => state.tickStreamSimulation);
  const setView3DMode = useBurnInStore((state) => state.setView3DMode);
  const resetCamera = useBurnInStore((state) => state.resetCamera);
  const selectChip = useBurnInStore((state) => state.selectChip);
  const isPlaying = useBurnInStore((state) => state.isPlaying);
  const setIsPlaying = useBurnInStore((state) => state.setIsPlaying);
  const playSpeed = useBurnInStore((state) => state.playSpeed);
  const setCheckpoint = useBurnInStore((state) => state.setCheckpoint);
  const theme = useBurnInStore((state) => state.theme);
  const isGoldenDemoPlaying = useBurnInStore((state) => state.isGoldenDemoPlaying);
  const stopGoldenDemo = useBurnInStore((state) => state.stopGoldenDemo);
  const isAiCopilotOpen = useBurnInStore((state) => state.isAiCopilotOpen);
  const setIsAiCopilotOpen = useBurnInStore((state) => state.setIsAiCopilotOpen);
  const isAuditOpen = useBurnInStore((state) => state.isAuditOpen);
  const setIsAuditOpen = useBurnInStore((state) => state.setIsAuditOpen);
  const activePanelTab = useBurnInStore((state) => state.activePanelTab);
  const setActivePanelTab = useBurnInStore((state) => state.setActivePanelTab);
  const startGoldenDemo = useBurnInStore((state) => state.startGoldenDemo);
  const isHeroNarrativeActive = useBurnInStore((state) => state.isHeroNarrativeActive);
  const narrativePhase = useBurnInStore((state) => state.narrativePhase);
  const narrativeAutoPlay = useBurnInStore((state) => state.narrativeAutoPlay);
  const startHeroNarrative = useBurnInStore((state) => state.startHeroNarrative);
  const stopHeroNarrative = useBurnInStore((state) => state.stopHeroNarrative);
  const nextNarrativePhase = useBurnInStore((state) => state.nextNarrativePhase);

  const [isManualGoldenDemoOpen, setIsManualGoldenDemoOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('skipIntro') === 'true') return false;
    return sessionStorage.getItem('burnwatch_entered') !== 'true';
  });

  // Support reopening intro on demand
  useEffect(() => {
    const handleReopenIntro = () => setShowIntro(true);
    window.addEventListener('burnwatch-reopen-intro', handleReopenIntro);
    return () => window.removeEventListener('burnwatch-reopen-intro', handleReopenIntro);
  }, []);

  // Synchronize document root class with theme
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    }
  }, [theme]);

  // Initialize store and generate default flight lot on startup
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Real-time thermal streaming loop
  useEffect(() => {
    if (!isStreaming) return;
    const interval = window.setInterval(() => {
      tickStreamSimulation();
    }, 2400);

    return () => clearInterval(interval);
  }, [isStreaming, tickStreamSimulation]);

  // Playback timer to cycle through checkpoints (0h -> 24h -> 96h -> 168h)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      const { checkpoint } = useBurnInStore.getState();
      const currentIdx = CHECKPOINTS.indexOf(checkpoint);
      const nextIdx = (currentIdx + 1) % CHECKPOINTS.length;
      setCheckpoint(CHECKPOINTS[nextIdx]);
    }, 2200 / playSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playSpeed, setCheckpoint]);

  // Hero Story Narrative Auto-Advance Loop
  useEffect(() => {
    if (!isHeroNarrativeActive || !narrativeAutoPlay) return;

    const delayMap: Record<DemoStoryPhase, number> = {
      NORMAL_CHAMBER: 3200,
      LIVE_TELEMETRY: 3000,
      DRIFT_DETECTED: 2800,
      CHIP_PULSING: 2800,
      CAMERA_APPROACH: 3000,
      SPATIAL_VIZ: 3800,
      TRAJECTORY_RENDER: 4500,
      AI_EXPLANATION: 4500,
      RECOMMENDED_ACTION: 6500,
    };

    const timer = window.setTimeout(() => {
      nextNarrativePhase();
    }, delayMap[narrativePhase] || 3500);

    return () => clearTimeout(timer);
  }, [isHeroNarrativeActive, narrativeAutoPlay, narrativePhase, nextNarrativePhase]);

  // Keyboard navigation & accessibility shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isHeroNarrativeActive) {
          nextNarrativePhase();
        } else {
          setIsPlaying(!isPlaying);
        }
      } else if (e.key === '1') {
        setView3DMode('CHAMBER');
      } else if (e.key === '2') {
        setView3DMode('LOT_CLOUD');
      } else if (e.key === '3') {
        setView3DMode('THERMAL');
      } else if (e.key === '4') {
        setView3DMode('ANOMALY_MAP');
      } else if (e.key === '5') {
        setView3DMode('TRAJECTORY');
      } else if (e.key === '6') {
        setView3DMode('2D_GRID');
      } else if (e.key === '7') {
        setView3DMode('LIVE_VISION');
      } else if (e.key === 'r' || e.key === 'R') {
        resetCamera();
      } else if (e.key === 'g' || e.key === 'G') {
        startHeroNarrative(true);
      } else if (e.key === 'Escape') {
        selectChip(null);
        stopHeroNarrative();
        stopGoldenDemo();
        setIsManualGoldenDemoOpen(false);
        setIsAuditOpen(false);
        setIsAiCopilotOpen(false);
        setActivePanelTab('EXPLAIN');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPlaying,
    setIsPlaying,
    isHeroNarrativeActive,
    nextNarrativePhase,
    startHeroNarrative,
    stopHeroNarrative,
    setView3DMode,
    resetCamera,
    selectChip,
    startGoldenDemo,
    stopGoldenDemo,
    setIsAuditOpen,
    setIsAiCopilotOpen,
    setActivePanelTab,
  ]);

  const isEngineeringModalOpen =
    activePanelTab === 'UPLOAD' ||
    activePanelTab === 'EVALUATION' ||
    activePanelTab === 'COMPARISON';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans select-none transition-colors duration-300">
      {/* 0. Fullscreen Cinematic Intro & Mission Initialization Experience */}
      {showIntro && (
        <IntroExperience
          onComplete={() => {
            sessionStorage.setItem('burnwatch_entered', 'true');
            setShowIntro(false);
          }}
        />
      )}

      {/* 1. Full-Screen Hero 3D Digital Twin Canvas */}
      <div className="absolute inset-0 w-full h-full z-0">
        <BurnInCanvas />
      </div>

      {/* 2. Unified 3-Line Top Navigation Header (Line 1: Mission Bar, Line 2: View Modes, Line 3: 5-Stage Pipeline / Hero Story) */}
      <TopNavHeader />

      {/* 3. Consolidated Unified Left Dock (Chamber ESS, Parameter Limits, Radar, Zero-FN Guarantee) */}
      <LeftMissionDock />

      {/* 4. Floating Live Chamber Vision Feed (Top-Right Dock Zone) */}
      <VisionMonitor />

      {/* 5. Floating Cinematic Timeline & Screening Gate (Bottom-Center) */}
      <CinematicTimeline />

      {/* 6. Floating LOT Outlier & Latent Defect Detection Window */}
      <LotOutlierDock />

      {/* 7. Dedicated Glass-Box Explanation & Early Reject Action Dock */}
      <HeroExplanationDock />

      {/* 8. Slide-In Component Glass-Box Inspector HUD (for manual inspection) */}
      {!isHeroNarrativeActive && <InspectionHUD />}

      {/* 8. Mission Boot Sequence on Initial Load */}
      <BootSequence />

      {/* 9. Real-Time Alert & Escape Warning Toasts */}
      <ToastContainer />

      {/* 10. Interactive Dialog Modals */}
      <GoldenDemoModal
        isOpen={isManualGoldenDemoOpen || isGoldenDemoPlaying}
        onClose={() => {
          setIsManualGoldenDemoOpen(false);
          stopGoldenDemo();
        }}
      />

      <AuditLogModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
      />

      <AiAssistantModal
        isOpen={isAiCopilotOpen}
        onClose={() => setIsAiCopilotOpen(false)}
      />

      <EngineeringModal
        isOpen={isEngineeringModalOpen}
        activeTab={
          activePanelTab === 'UPLOAD' || activePanelTab === 'EVALUATION' || activePanelTab === 'COMPARISON'
            ? activePanelTab
            : 'UPLOAD'
        }
        onTabChange={(tab) => setActivePanelTab(tab)}
        onClose={() => setActivePanelTab('EXPLAIN')}
      />
    </div>
  );
};

export default App;
