import React, { useEffect, useState } from 'react';
import { useBurnInStore } from './state/useBurnInStore';
import { CHECKPOINTS, CheckpointHour } from './types/burnIn';
import { BurnInCanvas } from './components/viewport3d/BurnInCanvas';
import { MissionBar } from './components/ui/MissionBar';
import { TelemetryHUD } from './components/ui/TelemetryHUD';
import { VisionMonitor } from './components/ui/VisionMonitor';
import { AnomalyRadar } from './components/ui/AnomalyRadar';
import { CinematicTimeline } from './components/ui/CinematicTimeline';
import { InspectionHUD } from './components/ui/InspectionHUD';
import { BootSequence } from './components/ui/BootSequence';
import { ToastContainer } from './components/common/ToastContainer';
import { GoldenDemoModal } from './components/panels/GoldenDemoModal';
import { AuditLogModal } from './components/panels/AuditLogModal';
import { AiAssistantModal } from './components/panels/AiAssistantModal';
import { EngineeringModal } from './components/panels/EngineeringModal';

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

  const [isManualGoldenDemoOpen, setIsManualGoldenDemoOpen] = useState(false);

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

  // Keyboard navigation & accessibility shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(!isPlaying);
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
        startGoldenDemo();
      } else if (e.key === 'Escape') {
        selectChip(null);
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
      {/* 1. Full-Screen Hero 3D Digital Twin Canvas */}
      <div className="absolute inset-0 w-full h-full z-0">
        <BurnInCanvas />
      </div>

      {/* 2. Top Aerospace Mission HUD Bar */}
      <MissionBar />

      {/* 3. Floating Telemetry & Dynamic Threshold HUD (Top-Left) */}
      <TelemetryHUD />

      {/* 4. Floating Live Chamber Vision Feed (Top-Right) */}
      <VisionMonitor />

      {/* 5. Floating Lot Health Radar & Zero-FN Counter (Bottom-Left) */}
      <AnomalyRadar />

      {/* 6. Floating Cinematic Timeline & Screening Gate (Bottom-Center) */}
      <CinematicTimeline />

      {/* 7. Slide-In Component Glass-Box Inspector HUD (Right Drawer) */}
      <InspectionHUD />

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
