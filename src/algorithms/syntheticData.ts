import {
  ChipData,
  GroundTruthClass,
  ParameterType,
  PARAMETER_CONFIGS,
  ScreeningVerdict,
} from '../types/burnIn';

// Fast seeded PRNG (Mulberry32) for reproducible data generation
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller standard normal generator using the PRNG
function gaussianRandom(prng: () => number, mean = 0, std = 1): number {
  const u1 = Math.max(1e-7, prng());
  const u2 = prng();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * std;
}

export interface LotConfig {
  lotId: string;
  name: string;
  chipCount: number;
  seed: number;
  latentDefectRatio: number;
  hardFailRatio: number;
  noiseLevel: number;
  description: string;
}

export const PRESET_LOTS: LotConfig[] = [
  {
    lotId: 'LOT-2026-04',
    name: 'Lot Flight 04 (ISRO Star Demo)',
    chipCount: 1000,
    seed: 42,
    latentDefectRatio: 0.04,
    hardFailRatio: 0.02,
    noiseLevel: 0.07,
    description: 'ISRO Screening Benchmark Lot containing Star Demo Component CHIP-LOT04-042 (passes static 50µA, caught at 24h by drift safety slope).',
  },
  {
    lotId: 'LOT-AERO-ALPHA',
    name: 'Lot Alpha (Space-Grade Avionics)',
    chipCount: 1000,
    seed: 42,
    latentDefectRatio: 0.035, // 35 latent defects
    hardFailRatio: 0.015,     // 15 hard fails
    noiseLevel: 0.08,
    description: 'Aero-defense flight lot: Tight cluster with sneaky latent defects that pass static 50µA datasheet limits but drift abnormally.',
  },
  {
    lotId: 'LOT-AUTO-BETA',
    name: 'Lot Beta (Automotive AEC-Q100)',
    chipCount: 2000,
    seed: 1337,
    latentDefectRatio: 0.045,
    hardFailRatio: 0.02,
    noiseLevel: 0.12,
    description: 'High-volume automotive powertrain lot: Higher thermal noise with early electromigration signatures.',
  },
  {
    lotId: 'LOT-RADHARD-GAMMA',
    name: 'Lot Gamma (Deep-Space Rad-Hard)',
    chipCount: 500,
    seed: 9999,
    latentDefectRatio: 0.03,
    hardFailRatio: 0.01,
    noiseLevel: 0.05,
    description: 'Ultra-reliability satellite lot: 500 chips, precision tolerances, and subtle non-linear oxide pinhole drift.',
  },
];

export function generateSyntheticLot(config: LotConfig): ChipData[] {
  const prng = mulberry32(config.seed);
  const chips: ChipData[] = [];

  const cols = Math.min(50, Math.ceil(Math.sqrt(config.chipCount * 2.5)));
  const rows = Math.ceil(config.chipCount / cols);

  const numLatent = Math.round(config.chipCount * config.latentDefectRatio);
  const numHardFail = Math.round(config.chipCount * config.hardFailRatio);

  // Assign classes deterministically
  const classAssignments: GroundTruthClass[] = [];
  for (let i = 0; i < numHardFail; i++) classAssignments.push('HARD_FAIL');
  for (let i = 0; i < numLatent; i++) classAssignments.push('LATENT_DEFECT');
  while (classAssignments.length < config.chipCount) classAssignments.push('NORMAL');

  // Shuffle classes deterministically
  for (let i = classAssignments.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [classAssignments[i], classAssignments[j]] = [classAssignments[j], classAssignments[i]];
  }

  // Tray dimensions: centered around origin in 3D
  const spacingX = 0.55;
  const spacingZ = 0.55;
  const startX = -((cols - 1) * spacingX) / 2;
  const startZ = -((rows - 1) * spacingZ) / 2;

  for (let idx = 0; idx < config.chipCount; idx++) {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const groundTruth = (config.lotId === 'LOT-2026-04' && idx === 41) ? 'LATENT_DEFECT' : classAssignments[idx];
    const isGroundTruthDefect = groundTruth !== 'NORMAL';
    let part_id = `IC-${config.lotId.slice(-1)}${String(idx + 1).padStart(4, '0')}`;
    if (config.lotId === 'LOT-2026-04' && idx === 41) {
      part_id = 'CHIP-LOT04-042';
    }

    const trayX = startX + col * spacingX;
    const trayY = 0; // sits on oven tray
    const trayZ = startZ + row * spacingZ;

    // Generate measurements for all three parameters
    const measurements: Record<ParameterType, { v_0h: number; v_24h: number; v_96h: number; v_168h: number }> = {
      iddq: (config.lotId === 'LOT-2026-04' && idx === 41)
        ? { v_0h: 10.20, v_24h: 11.10, v_96h: 14.80, v_168h: 28.50 }
        : generateParamMeasurements('iddq', groundTruth, prng, config.noiseLevel),
      leakage: generateParamMeasurements('leakage', groundTruth, prng, config.noiseLevel),
      propDelay: generateParamMeasurements('propDelay', groundTruth, prng, config.noiseLevel),
    };

    const initialParam: ParameterType = 'iddq';
    const v0 = measurements[initialParam].v_0h;
    const v24 = measurements[initialParam].v_24h;
    const v96 = measurements[initialParam].v_96h;
    const v168 = measurements[initialParam].v_168h;

    // Preliminary slope from 0 to 24h
    const predictedSlope = (v24 - v0) / 24.0;
    const actualSlope = (v168 - v0) / 168.0;
    const predicted168h = v0 + predictedSlope * 168.0;

    chips.push({
      part_id,
      lot_id: config.lotId,
      row,
      col,
      trayX,
      trayY,
      trayZ,
      groundTruth,
      isGroundTruthDefect,
      measurements,
      currentValue: v0,
      robustZScore: 0,
      iqrDistance: 0,
      isoForestScore: 0.3,
      ensembleScore: 10,
      predictedSlope,
      actualSlope,
      predicted168h,
      predictionInterval: [predicted168h * 0.92, predicted168h * 1.08],
      earlyReject: false,
      timeSavedHours: 0,
      passesStaticLimit: true,
      passesDynamicThreshold: true,
      verdict: 'PASS',
      justification: 'Baseline reading within normal distribution limits.',
      shapAttributions: [],
    });
  }

  return chips;
}

function generateParamMeasurements(
  param: ParameterType,
  groundTruth: GroundTruthClass,
  prng: () => number,
  noiseLevel: number
) {
  const pcfg = PARAMETER_CONFIGS[param];
  const mean = pcfg.typicalMean;
  const std = pcfg.typicalStd;
  const staticLimit = pcfg.staticLimit;

  let v0 = 0;
  let v24 = 0;
  let v96 = 0;
  let v168 = 0;

  if (groundTruth === 'NORMAL') {
    // Normal distribution, mild aging drift (+2% to +8% over 168h)
    v0 = Math.max(mean * 0.5, gaussianRandom(prng, mean, std));
    const driftFactor = 1.0 + Math.abs(gaussianRandom(prng, 0.03, 0.015));
    const noise = () => (prng() - 0.5) * noiseLevel * mean;

    v24 = v0 * (1 + (driftFactor - 1) * (24 / 168)) + noise();
    v96 = v0 * (1 + (driftFactor - 1) * (96 / 168)) + noise();
    v168 = v0 * driftFactor + noise();
  } else if (groundTruth === 'HARD_FAIL') {
    // Hard failure: exceeds static limit or fails gross test early
    v0 = staticLimit * (0.95 + prng() * 0.35); // 47µA to 65µA
    v24 = v0 + (staticLimit * 0.25 * prng());
    v96 = v24 + (staticLimit * 0.35 * prng());
    v168 = v96 + (staticLimit * 0.45 * prng());
  } else {
    // LATENT DEFECT (The Star Demo Scenario!):
    // Starts below static limit (e.g. 15µA to 32µA for Iddq where limit is 50µA)
    // Passes the static limit at 0h and 24h!
    // But exhibits 3x to 6x the typical drift slope due to gate oxide breakdown or hot-carrier trapping.
    v0 = mean * (1.3 + prng() * 0.9); // ~13.6µA - 23.1µA (safe below 50µA)
    const acceleratedDriftRate = 0.15 + prng() * 0.22; // rapid hourly drift
    const nonLinearity = 1.0 + prng() * 0.3;

    v24 = v0 + acceleratedDriftRate * 24;
    v96 = v0 + acceleratedDriftRate * 96 * nonLinearity;
    // By 168h it reaches 42µA - 48µA (sometimes right under 50µA or just crossing it!)
    v168 = v0 + acceleratedDriftRate * 168 * (nonLinearity * 1.05);

    // Ensure it strictly stayed below 50µA at 0h and 24h so static test NEVER catches it
    v0 = Math.min(v0, staticLimit * 0.65);
    v24 = Math.min(v24, staticLimit * 0.82);
    // At 168h, a classic latent defect might still be at 44.5µA (under 50µA static limit)
    // but with 4.5x lot median!
    if (v168 >= staticLimit * 0.98 && prng() > 0.4) {
      v168 = staticLimit * (0.86 + prng() * 0.1); // remains under 50µA to prove dynamic screening necessity!
    }
  }

  return {
    v_0h: Math.round(v0 * 100) / 100,
    v_24h: Math.round(v24 * 100) / 100,
    v_96h: Math.round(v96 * 100) / 100,
    v_168h: Math.round(v168 * 100) / 100,
  };
}
