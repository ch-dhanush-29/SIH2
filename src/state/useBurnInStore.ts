import { create } from 'zustand';
import {
  CheckpointHour,
  ChipData,
  ChamberTelemetry,
  DetectionMethod,
  EvaluationMetrics,
  LotStatistics,
  ParameterType,
  ScreeningVerdict,
  View3DMode,
  CameraViewMode,
} from '../types/burnIn';
import { PRESET_LOTS, LotConfig } from '../algorithms/syntheticData';
import { workerClient } from '../workers/workerClient';

export interface ToastMessage {
  id: string;
  type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  title: string;
  message: string;
  timestamp: string;
}

const getInitialTheme = (): 'dark' | 'light' => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('burnwatch-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }
  return 'dark';
};

interface BurnInState {
  // Lot & Chips Data
  presetLots: LotConfig[];
  selectedLotConfig: LotConfig;
  chips: ChipData[];
  stats: LotStatistics | null;
  metrics: EvaluationMetrics | null;
  isComputing: boolean;

  // Selection & Inspector
  selectedChipId: string | null;
  hoveredChipId: string | null;

  // Screening & Algorithm Controls
  parameter: ParameterType;
  checkpoint: CheckpointHour;
  method: DetectionMethod;
  sensitivity: number; // 0.0 - 1.0 (default 0.75, biased toward recall)

  // 3D Viewport & Camera
  view3DMode: View3DMode;
  cameraViewMode: CameraViewMode;
  cameraResetCount: number;
  isColorblindMode: boolean;
  is2DFallback: boolean;

  // Time Scrubber & Animation
  isPlaying: boolean;
  playSpeed: number; // 1, 2, 4

  // Telemetry & Live Streaming
  telemetry: ChamberTelemetry;
  toasts: ToastMessage[];

  // Mission Control HUD Modals & Layers
  isGoldenDemoPlaying: boolean;
  goldenDemoStep: number;
  isInspectionOpen: boolean;
  isAiCopilotOpen: boolean;
  isAuditOpen: boolean;
  bootCompleted: boolean;
  visionFeedMode: 'OPTICAL' | 'THERMAL' | 'AI_BOUNDING';

  // Active UI Panel Tab
  activePanelTab: 'EXPLAIN' | 'EVALUATION' | 'COMPARISON' | 'UPLOAD';
  theme: 'dark' | 'light';

  // Actions
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  initialize: () => Promise<void>;
  selectLot: (lotId: string) => Promise<void>;
  setParameter: (param: ParameterType) => Promise<void>;
  setCheckpoint: (checkpoint: CheckpointHour) => Promise<void>;
  setMethod: (method: DetectionMethod) => Promise<void>;
  setSensitivity: (val: number) => Promise<void>;
  setView3DMode: (mode: View3DMode) => void;
  setCameraViewMode: (mode: CameraViewMode) => void;
  selectChip: (chipId: string | null) => void;
  setHoveredChip: (chipId: string | null) => void;
  resetCamera: () => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaySpeed: (speed: number) => void;
  toggleStreaming: () => void;
  toggleColorblindMode: () => void;
  toggle2DFallback: () => void;
  setIsInspectionOpen: (open: boolean) => void;
  setIsAiCopilotOpen: (open: boolean) => void;
  setIsAuditOpen: (open: boolean) => void;
  setBootCompleted: (completed: boolean) => void;
  setVisionFeedMode: (mode: 'OPTICAL' | 'THERMAL' | 'AI_BOUNDING') => void;
  startGoldenDemo: () => void;
  stopGoldenDemo: () => void;
  setActivePanelTab: (tab: 'EXPLAIN' | 'EVALUATION' | 'COMPARISON' | 'UPLOAD') => void;
  addToast: (toast: Omit<ToastMessage, 'id' | 'timestamp'>) => void;
  dismissToast: (id: string) => void;
  loadCustomLot: (chips: ChipData[], lotName: string) => Promise<void>;
  overrideChipVerdict: (chipId: string, verdict: ScreeningVerdict, reason: string) => void;
  tickStreamSimulation: () => void;
}

export const useBurnInStore = create<BurnInState>((set, get) => ({
  presetLots: PRESET_LOTS,
  selectedLotConfig: PRESET_LOTS[0],
  chips: [],
  stats: null,
  metrics: null,
  isComputing: false,

  selectedChipId: null,
  hoveredChipId: null,

  parameter: 'iddq',
  checkpoint: 24, // default to 24h early screening checkpoint
  method: 'ENSEMBLE',
  sensitivity: 0.75, // default recall-biased setting

  view3DMode: 'CHAMBER',
  cameraViewMode: 'OVERVIEW',
  cameraResetCount: 0,
  isColorblindMode: false,
  is2DFallback: false,

  isPlaying: false,
  playSpeed: 1,

  isGoldenDemoPlaying: false,
  goldenDemoStep: 0,
  isInspectionOpen: false,
  isAiCopilotOpen: false,
  isAuditOpen: false,
  bootCompleted: false,
  visionFeedMode: 'OPTICAL',

  telemetry: {
    chamberTempC: 125.1,
    targetTempC: 125.0,
    heaterDutyCyclePct: 67.4,
    chamberPressureKPa: 101.3,
    nitrogenFlowLpm: 14.8,
    burnInHoursElapsed: 24.0,
    isStreaming: false,
  },
  toasts: [],

  activePanelTab: 'EXPLAIN',
  theme: getInitialTheme(),

  setTheme: (theme: 'dark' | 'light') => {
    set({ theme });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('burnwatch-theme', theme);
      } catch (e) {}
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  initialize: async () => {
    const { selectedLotConfig, parameter, checkpoint, method, sensitivity } = get();
    set({ isComputing: true });
    try {
      const res = await workerClient.generateLot(selectedLotConfig, {
        parameter,
        checkpoint,
        method,
        sensitivity,
      });

      // Find first latent defect chip to highlight by default for an immediate demo!
      const firstLatent = res.chips.find((c) => c.groundTruth === 'LATENT_DEFECT');

      set({
        chips: res.chips,
        stats: res.stats,
        metrics: res.metrics,
        selectedChipId: firstLatent ? firstLatent.part_id : res.chips[0]?.part_id || null,
        isComputing: false,
      });
    } catch (err) {
      console.error('Failed to initialize BurnWatch store:', err);
      set({ isComputing: false });
    }
  },

  selectLot: async (lotId: string) => {
    const cfg = get().presetLots.find((l) => l.lotId === lotId) || get().presetLots[0];
    const { parameter, checkpoint, method, sensitivity } = get();
    set({ selectedLotConfig: cfg, isComputing: true });

    const res = await workerClient.generateLot(cfg, {
      parameter,
      checkpoint,
      method,
      sensitivity,
    });

    const firstLatent = res.chips.find((c) => c.groundTruth === 'LATENT_DEFECT');

    set({
      chips: res.chips,
      stats: res.stats,
      metrics: res.metrics,
      selectedChipId: firstLatent ? firstLatent.part_id : res.chips[0]?.part_id || null,
      isComputing: false,
    });

    get().addToast({
      type: 'INFO',
      title: 'Lot Loaded',
      message: `${cfg.name} (${cfg.chipCount} parts) loaded into screening chamber.`,
    });
  },

  setParameter: async (param: ParameterType) => {
    set({ parameter: param, isComputing: true });
    const { chips, checkpoint, method, sensitivity } = get();
    const res = await workerClient.reevaluate(chips, {
      parameter: param,
      checkpoint,
      method,
      sensitivity,
    });
    set({
      chips: res.chips,
      stats: res.stats,
      metrics: res.metrics,
      isComputing: false,
    });
  },

  setCheckpoint: async (chk: CheckpointHour) => {
    set((state) => ({
      checkpoint: chk,
      telemetry: { ...state.telemetry, burnInHoursElapsed: chk },
      isComputing: true,
    }));
    const { chips, parameter, method, sensitivity } = get();
    const res = await workerClient.reevaluate(chips, {
      parameter,
      checkpoint: chk,
      method,
      sensitivity,
    });
    set({
      chips: res.chips,
      stats: res.stats,
      metrics: res.metrics,
      isComputing: false,
    });
  },

  setMethod: async (m: DetectionMethod) => {
    set({ method: m, isComputing: true });
    const { chips, parameter, checkpoint, sensitivity } = get();
    const res = await workerClient.reevaluate(chips, {
      parameter,
      checkpoint,
      method: m,
      sensitivity,
    });
    set({
      chips: res.chips,
      stats: res.stats,
      metrics: res.metrics,
      isComputing: false,
    });
  },

  setSensitivity: async (s: number) => {
    set({ sensitivity: s, isComputing: true });
    const { chips, parameter, checkpoint, method } = get();
    const res = await workerClient.reevaluate(chips, {
      parameter,
      checkpoint,
      method,
      sensitivity: s,
    });

    // Check if any known defect would escape!
    const escapedCount = res.metrics.escapedDefects;
    if (escapedCount > 0) {
      get().addToast({
        type: 'ALERT',
        title: 'CRITICAL ESCAPE WARNING',
        message: `${escapedCount} defective component(s) would escape screening into flight hardware with this threshold!`,
      });
    }

    set({
      chips: res.chips,
      stats: res.stats,
      metrics: res.metrics,
      isComputing: false,
    });
  },

  setView3DMode: (mode: View3DMode) => {
    set({ view3DMode: mode });
  },

  setCameraViewMode: (mode: CameraViewMode) => {
    set({ cameraViewMode: mode });
  },

  selectChip: (chipId: string | null) => {
    if (chipId) {
      set({ selectedChipId: chipId, isInspectionOpen: true, cameraViewMode: 'CLOSEUP' });
    } else {
      set({ selectedChipId: null, isInspectionOpen: false });
    }
  },

  setIsInspectionOpen: (open: boolean) => set({ isInspectionOpen: open }),
  setIsAiCopilotOpen: (open: boolean) => set({ isAiCopilotOpen: open }),
  setIsAuditOpen: (open: boolean) => set({ isAuditOpen: open }),
  setBootCompleted: (completed: boolean) => set({ bootCompleted: completed }),
  setVisionFeedMode: (mode: 'OPTICAL' | 'THERMAL' | 'AI_BOUNDING') => set({ visionFeedMode: mode }),

  startGoldenDemo: () => {
    // Select Lot 4, set checkpoint to 24h, select star chip, switch to CHAMBER view
    const starChip = get().chips.find((c) => c.part_id === 'CHIP-LOT04-042') || get().chips[41];
    set({
      view3DMode: 'CHAMBER',
      checkpoint: 24,
      isGoldenDemoPlaying: true,
      goldenDemoStep: 1,
      selectedChipId: starChip ? starChip.part_id : null,
      isInspectionOpen: true,
      cameraViewMode: 'ANOMALY_FOLLOW',
    });
  },

  stopGoldenDemo: () => {
    set({ isGoldenDemoPlaying: false, goldenDemoStep: 0 });
  },

  setHoveredChip: (chipId: string | null) => {
    set({ hoveredChipId: chipId });
  },

  resetCamera: () => {
    set((state) => ({ cameraResetCount: state.cameraResetCount + 1, cameraViewMode: 'OVERVIEW' }));
  },

  setIsPlaying: (playing: boolean) => {
    set({ isPlaying: playing });
  },

  setPlaySpeed: (speed: number) => {
    set({ playSpeed: speed });
  },

  toggleStreaming: () => {
    const isNowStreaming = !get().telemetry.isStreaming;
    set((state) => ({
      telemetry: { ...state.telemetry, isStreaming: isNowStreaming },
    }));

    if (isNowStreaming) {
      get().addToast({
        type: 'SUCCESS',
        title: 'Chamber Stream Online',
        message: 'Receiving live 125°C chamber thermal telemetry & stream measurements.',
      });
    } else {
      get().addToast({
        type: 'INFO',
        title: 'Stream Paused',
        message: 'Chamber telemetry live stream paused.',
      });
    }
  },

  toggleColorblindMode: () => {
    set((state) => ({ isColorblindMode: !state.isColorblindMode }));
  },

  toggle2DFallback: () => {
    set((state) => ({ is2DFallback: !state.is2DFallback }));
  },

  setActivePanelTab: (tab) => {
    set({ activePanelTab: tab });
  },

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastMessage = {
      ...toast,
      id,
      timestamp: new Date().toLocaleTimeString(),
    };
    set((state) => ({
      toasts: [newToast, ...state.toasts.slice(0, 4)],
    }));

    // Auto-dismiss toast after 5s
    setTimeout(() => {
      get().dismissToast(id);
    }, 5000);
  },

  dismissToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  loadCustomLot: async (chips: ChipData[], lotName: string) => {
    const customConfig: LotConfig = {
      lotId: `LOT-CUSTOM-${Date.now()}`,
      name: lotName,
      chipCount: chips.length,
      seed: 0,
      latentDefectRatio: 0,
      hardFailRatio: 0,
      noiseLevel: 0,
      description: 'Custom uploaded CSV lot dataset.',
    };

    set({
      selectedLotConfig: customConfig,
      presetLots: [customConfig, ...get().presetLots],
      isComputing: true,
    });

    const { parameter, checkpoint, method, sensitivity } = get();
    const res = await workerClient.reevaluate(chips, {
      parameter,
      checkpoint,
      method,
      sensitivity,
    });

    set({
      chips: res.chips,
      stats: res.stats,
      metrics: res.metrics,
      selectedChipId: res.chips[0]?.part_id || null,
      isComputing: false,
    });

    get().addToast({
      type: 'SUCCESS',
      title: 'Custom Lot Ingested',
      message: `Successfully processed ${chips.length} components from CSV.`,
    });
  },

  overrideChipVerdict: (chipId: string, verdict: ScreeningVerdict, reason: string) => {
    const updated = get().chips.map((c) => {
      if (c.part_id === chipId) {
        return {
          ...c,
          verdict,
          status: (verdict === 'PASS' ? 'NORMAL' : verdict === 'LATENT_SUSPECT' ? 'SUSPECT' : 'DEFECT') as any,
          justification: `[QA OVERRIDE by Lead Inspector]: ${reason} (Original: ${c.justification})`,
        };
      }
      return c;
    });
    set({ chips: updated });
    get().addToast({
      type: 'SUCCESS',
      title: 'QA Decision Overridden',
      message: `${chipId} verdict updated to ${verdict}. Audit trail recorded.`,
    });
  },

  tickStreamSimulation: () => {
    // Fluctuations in 125°C chamber thermal physics
    const currentTemp = get().telemetry.chamberTempC;
    const tempDelta = (Math.random() - 0.49) * 0.18;
    const newTemp = Number((125.0 + (currentTemp - 125.0) * 0.9 + tempDelta).toFixed(2));
    const newDuty = Number((65 + (newTemp < 125 ? 5 : -4) + Math.random() * 3).toFixed(1));

    set((state) => ({
      telemetry: {
        ...state.telemetry,
        chamberTempC: newTemp,
        heaterDutyCyclePct: newDuty,
        chamberPressureKPa: Number((101.3 + (Math.random() - 0.5) * 0.4).toFixed(1)),
        nitrogenFlowLpm: Number((14.8 + (Math.random() - 0.5) * 0.3).toFixed(1)),
      },
    }));
  },
}));
