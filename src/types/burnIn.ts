export type ParameterType = 'iddq' | 'leakage' | 'propDelay';

export interface ParameterConfig {
  id: ParameterType;
  label: string;
  unit: string;
  staticLimit: number; // e.g. 50 µA
  typicalMean: number; // e.g. 10 µA
  typicalStd: number;  // e.g. 2 µA
  description: string;
}

export const PARAMETER_CONFIGS: Record<ParameterType, ParameterConfig> = {
  iddq: {
    id: 'iddq',
    label: 'Iddq (Quiescent Current)',
    unit: 'µA',
    staticLimit: 50.0,
    typicalMean: 10.5,
    typicalStd: 1.8,
    description: 'CMOS quiescent supply current at 125°C. Uncovers gate oxide pinholes and sub-threshold leakage.',
  },
  leakage: {
    id: 'leakage',
    label: 'Input Leakage (I_leak)',
    unit: 'nA',
    staticLimit: 100.0,
    typicalMean: 22.0,
    typicalStd: 4.5,
    description: 'Reverse-biased ESD diode and pad buffer leakage under accelerated thermal stress.',
  },
  propDelay: {
    id: 'propDelay',
    label: 'Propagation Delay (t_pd)',
    unit: 'ns',
    staticLimit: 12.0,
    typicalMean: 5.2,
    typicalStd: 0.6,
    description: 'Critical path gate switching speed. Slowdown indicates electromigration or hot carrier degradation.',
  },
};

export type CheckpointHour = 0 | 24 | 96 | 168;
export const CHECKPOINTS: CheckpointHour[] = [0, 24, 96, 168];

export type GroundTruthClass = 'NORMAL' | 'HARD_FAIL' | 'LATENT_DEFECT';

export type ScreeningVerdict = 'PASS' | 'LATENT_SUSPECT' | 'HARD_REJECT' | 'EARLY_REJECT';

export type DetectionMethod = 'ROBUST_Z' | 'IQR' | 'ISOLATION_FOREST' | 'ENSEMBLE';

export type View3DMode = 
  | 'CHAMBER' 
  | 'LOT_CLOUD' 
  | 'THERMAL' 
  | 'ANOMALY_MAP' 
  | 'TRAJECTORY' 
  | '2D_GRID' 
  | 'LIVE_VISION';

export type CameraViewMode = 'ORBIT' | 'OVERVIEW' | 'CLOSEUP' | 'ANOMALY_FOLLOW' | 'TRAJECTORY';

export interface ChipMeasurements {
  v_0h: number;
  v_24h: number;
  v_96h: number;
  v_168h: number;
}

export interface ShapContribution {
  feature: string;
  value: number; // positive = pushes toward anomaly, negative = pushes toward normal
  description: string;
}

export interface ChipData {
  part_id: string;
  lot_id: string;
  row: number;
  col: number;
  // Spatial coordinates for tray layout
  trayX: number;
  trayY: number;
  trayZ: number;

  groundTruth: GroundTruthClass;
  isGroundTruthDefect: boolean;

  // Measurements per parameter
  measurements: Record<ParameterType, ChipMeasurements>;

  // Current evaluated metrics for the active parameter and checkpoint
  currentValue: number;
  robustZScore: number;
  iqrDistance: number;
  isoForestScore: number;
  ensembleScore: number; // 0 - 100

  // Drift forecast computed from 0h -> 24h
  predictedSlope: number;      // rate of drift per hour
  actualSlope: number;
  predicted168h: number;
  predictionInterval: [number, number]; // [lower, upper] 95% band
  earlyReject: boolean;
  timeSavedHours: number;

  // Screening status
  passesStaticLimit: boolean;
  passesDynamicThreshold: boolean;
  verdict: ScreeningVerdict;
  justification: string;
  shapAttributions: ShapContribution[];
}

export interface LotStatistics {
  lotId: string;
  chipCount: number;
  parameter: ParameterType;
  checkpoint: CheckpointHour;
  median: number;
  mad: number;              // Median Absolute Deviation
  robustSigma: number;      // 1.4826 * MAD
  mean: number;
  std: number;
  q1: number;
  q3: number;
  iqr: number;
  dynamicUpperLimit: number;
  staticLimit: number;
  safetySlope: number;      // median slope + k * MAD_slope
  medianSlope: number;
}

export interface EvaluationMetrics {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
  recall: number;
  precision: number;
  f2Score: number;
  escapedDefects: number;   // CRITICAL: FN count
  mae168h: number;          // Mean Absolute Error between predicted and actual 168h
  costPenalty: number;      // 1000 * FN + 10 * FP
}

export interface ChamberTelemetry {
  chamberTempC: number;
  targetTempC: number;
  heaterDutyCyclePct: number;
  chamberPressureKPa: number;
  nitrogenFlowLpm: number;
  burnInHoursElapsed: number;
  isStreaming: boolean;
}
