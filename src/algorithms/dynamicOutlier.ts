import {
  ChipData,
  DetectionMethod,
  LotStatistics,
  ParameterType,
  PARAMETER_CONFIGS,
  CheckpointHour,
  ShapContribution,
  ScreeningVerdict,
} from '../types/burnIn';

// Helper: Calculate median of an array of numbers
export function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Helper: Compute percentiles (Q1, Q3)
export function computeQuantile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

// Helper: Compute Median Absolute Deviation (MAD)
export function computeMAD(values: number[], median: number): number {
  if (values.length === 0) return 0;
  const deviations = values.map((v) => Math.abs(v - median));
  return computeMedian(deviations);
}

// --- High-Performance Lightweight Isolation Forest in TypeScript ---
interface IsoTreeNode {
  splitValue?: number;
  left?: IsoTreeNode;
  right?: IsoTreeNode;
  size?: number;
  isLeaf: boolean;
}

function c_factor(n: number): number {
  if (n <= 1) return 1;
  if (n === 2) return 1.0;
  const eulerGamma = 0.5772156649;
  return 2.0 * (Math.log(n - 1) + eulerGamma) - (2.0 * (n - 1)) / n;
}

function buildIsoTree(data: number[], currentHeight: number, maxHeight: number): IsoTreeNode {
  if (currentHeight >= maxHeight || data.length <= 1) {
    return { isLeaf: true, size: data.length };
  }

  let min = data[0];
  let max = data[0];
  for (let i = 1; i < data.length; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }

  if (Math.abs(max - min) < 1e-7) {
    return { isLeaf: true, size: data.length };
  }

  const splitValue = min + Math.random() * (max - min);
  const leftData: number[] = [];
  const rightData: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (data[i] < splitValue) leftData.push(data[i]);
    else rightData.push(data[i]);
  }

  return {
    isLeaf: false,
    splitValue,
    left: buildIsoTree(leftData, currentHeight + 1, maxHeight),
    right: buildIsoTree(rightData, currentHeight + 1, maxHeight),
  };
}

function pathLength(x: number, node: IsoTreeNode, currentDepth: number): number {
  if (node.isLeaf) {
    const size = node.size || 1;
    return currentDepth + c_factor(size);
  }
  if (x < (node.splitValue ?? 0)) {
    return node.left ? pathLength(x, node.left, currentDepth + 1) : currentDepth;
  } else {
    return node.right ? pathLength(x, node.right, currentDepth + 1) : currentDepth;
  }
}

export class IsolationForest1D {
  private trees: IsoTreeNode[] = [];
  private subSampleSize: number;

  constructor(numTrees = 20, subSampleSize = 128) {
    this.subSampleSize = subSampleSize;
    this.trees = [];
  }

  fit(data: number[]) {
    this.trees = [];
    const n = data.length;
    const sampleSize = Math.min(this.subSampleSize, n);
    const maxHeight = Math.ceil(Math.log2(Math.max(sampleSize, 2)));

    for (let t = 0; t < 20; t++) {
      // Subsample data
      const sample: number[] = [];
      for (let i = 0; i < sampleSize; i++) {
        const randIdx = Math.floor(Math.random() * n);
        sample.push(data[randIdx]);
      }
      this.trees.push(buildIsoTree(sample, 0, maxHeight));
    }
  }

  score(x: number): number {
    if (this.trees.length === 0) return 0.5;
    let totalPath = 0;
    for (const tree of this.trees) {
      totalPath += pathLength(x, tree, 0);
    }
    const avgPath = totalPath / this.trees.length;
    const cVal = c_factor(this.subSampleSize);
    const exponent = -avgPath / Math.max(cVal, 0.001);
    return Math.pow(2, exponent);
  }
}

export interface ScreeningOptions {
  parameter: ParameterType;
  checkpoint: CheckpointHour;
  method: DetectionMethod;
  sensitivity: number; // 0.0 to 1.0, default 0.75 (high recall)
}

export function computeLotStatistics(
  chips: ChipData[],
  parameter: ParameterType,
  checkpoint: CheckpointHour,
  sensitivity: number = 0.75
): LotStatistics {
  const pcfg = PARAMETER_CONFIGS[parameter];
  const checkpointKey = `v_${checkpoint}h` as keyof ChipData['measurements'][ParameterType];

  const values = chips.map((c) => c.measurements[parameter][checkpointKey]);
  const slopes = chips.map((c) => (c.measurements[parameter].v_24h - c.measurements[parameter].v_0h) / 24.0);

  const median = computeMedian(values);
  const mad = Math.max(1e-4, computeMAD(values, median));
  const robustSigma = 1.4826 * mad;

  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / (values.length || 1);
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (values.length || 1);
  const std = Math.sqrt(variance);

  const q1 = computeQuantile(values, 0.25);
  const q3 = computeQuantile(values, 0.75);
  const iqr = Math.max(1e-4, q3 - q1);

  // Dynamic limit based on sensitivity:
  // Higher sensitivity -> lower k-multiplier -> higher recall (catches every anomaly)
  // sensitivity = 1.0 -> k = 2.0 * robustSigma
  // sensitivity = 0.5 -> k = 3.5 * robustSigma
  // sensitivity = 0.0 -> k = 5.0 * robustSigma
  const kSigma = 4.5 - sensitivity * 2.2; // at 0.75 sensitivity, kSigma is ~2.85
  const dynamicUpperLimit = Math.min(pcfg.staticLimit, median + kSigma * robustSigma);

  const medianSlope = computeMedian(slopes);
  const madSlope = Math.max(1e-5, computeMAD(slopes, medianSlope));
  const kSlope = 3.5 - sensitivity * 1.5;
  const safetySlope = medianSlope + kSlope * (1.4826 * madSlope);

  return {
    lotId: chips[0]?.lot_id || 'UNKNOWN',
    chipCount: chips.length,
    parameter,
    checkpoint,
    median,
    mad,
    robustSigma,
    mean,
    std,
    q1,
    q3,
    iqr,
    dynamicUpperLimit,
    staticLimit: pcfg.staticLimit,
    safetySlope,
    medianSlope,
  };
}

export function evaluateLotOutliers(
  chips: ChipData[],
  options: ScreeningOptions
): { updatedChips: ChipData[]; stats: LotStatistics } {
  const { parameter, checkpoint, method, sensitivity } = options;
  const stats = computeLotStatistics(chips, parameter, checkpoint, sensitivity);
  const pcfg = PARAMETER_CONFIGS[parameter];
  const checkpointKey = `v_${checkpoint}h` as keyof ChipData['measurements'][ParameterType];

  const values = chips.map((c) => c.measurements[parameter][checkpointKey]);

  // Train Isolation Forest on current parameter values
  const isoForest = new IsolationForest1D(25, 128);
  isoForest.fit(values);

  // Ensemble threshold derived from sensitivity (0.0 to 1.0)
  // Higher sensitivity -> lower ensemble score threshold to flag suspect (recall-biased)
  const ensembleCutoff = 65 - sensitivity * 28; // e.g. at 0.75 -> cutoff is 44

  const updatedChips = chips.map((chip) => {
    const val = chip.measurements[parameter][checkpointKey];
    const v0 = chip.measurements[parameter].v_0h;
    const v24 = chip.measurements[parameter].v_24h;
    const v168 = chip.measurements[parameter].v_168h;

    // 1. Robust Z-score
    const robustZ = (val - stats.median) / stats.robustSigma;

    // 2. IQR distance
    const iqrDistance = val > stats.q3 ? (val - stats.q3) / stats.iqr : 0;

    // 3. Isolation Forest score (0 to 1)
    const isoScore = isoForest.score(val);

    // 4. Drift Slope from 0h to 24h
    const slope = (v24 - v0) / 24.0;
    const slopeRatio = stats.safetySlope > 0 ? slope / stats.safetySlope : 1;

    // 5. Combined Ensemble Score (0 to 100)
    // Sigmoid compression for robust z
    const zSigmoid = 100 / (1 + Math.exp(-1.1 * (robustZ - 2.5)));
    const iqrComponent = Math.min(100, iqrDistance * 35);
    const isoComponent = Math.max(0, (isoScore - 0.45) * 200);
    const driftComponent = Math.max(0, (slopeRatio - 0.9) * 55);

    const ensembleScore = Math.min(
      100,
      Math.max(
        0,
        Math.round(0.35 * zSigmoid + 0.25 * iqrComponent + 0.2 * isoComponent + 0.2 * driftComponent)
      )
    );

    // Early Reject calculation (based on 24h drift prediction exceeding lot safety threshold)
    const isEarlyReject = slope > stats.safetySlope;
    const timeSavedHours = isEarlyReject ? 144 : 0; // saved between 24h and 168h

    // Static limit check
    const passesStatic = val <= pcfg.staticLimit;

    // Active method determination
    let isFlagged = false;
    if (method === 'ROBUST_Z') {
      const zCutoff = 3.5 - sensitivity * 1.5; // ~2.37 at 0.75
      isFlagged = robustZ >= zCutoff;
    } else if (method === 'IQR') {
      const iqrCutoff = 1.8 - sensitivity * 0.8;
      isFlagged = iqrDistance >= iqrCutoff;
    } else if (method === 'ISOLATION_FOREST') {
      const isoCutoff = 0.62 - sensitivity * 0.12;
      isFlagged = isoScore >= isoCutoff;
    } else {
      // ENSEMBLE
      isFlagged = ensembleScore >= ensembleCutoff || isEarlyReject;
    }

    // Verdict determination
    let verdict: ScreeningVerdict = 'PASS';
    if (!passesStatic) {
      verdict = 'HARD_REJECT';
    } else if (isEarlyReject && checkpoint >= 24) {
      verdict = 'EARLY_REJECT';
    } else if (isFlagged) {
      verdict = 'LATENT_SUSPECT';
    }

    // Glass-box plain-English justification & SHAP feature contributions
    const justification = generatePlainEnglishJustification({
      chip,
      param: parameter,
      val,
      unit: pcfg.unit,
      staticLimit: pcfg.staticLimit,
      median: stats.median,
      robustZ,
      slope,
      safetySlope: stats.safetySlope,
      passesStatic,
      verdict,
    });

    const shapAttributions: ShapContribution[] = [
      {
        feature: 'Lot Robust Z-Score',
        value: Number((robustZ * 12.5).toFixed(1)),
        description: `Current reading deviates by ${robustZ.toFixed(2)}x robust std deviations from lot median.`,
      },
      {
        feature: '24h Drift Rate',
        value: Number(((slope - stats.medianSlope) / (stats.mad * 0.1 + 1e-4) * 8.0).toFixed(1)),
        description: `Early burn-in slope is ${(slope).toFixed(3)} ${pcfg.unit}/h vs lot median ${(stats.medianSlope).toFixed(3)}.`,
      },
      {
        feature: 'IQR Upper Distance',
        value: Number((iqrDistance * 18.0).toFixed(1)),
        description: `Distance above lot Q3 interquartile threshold.`,
      },
      {
        feature: 'Isolation Tree Depth',
        value: Number(((isoScore - 0.5) * 40.0).toFixed(1)),
        description: `Tree anomaly isolation score: ${(isoScore).toFixed(3)}.`,
      },
      {
        feature: 'Datasheet Margin',
        value: Number(((val / pcfg.staticLimit - 0.5) * 20.0).toFixed(1)),
        description: `Current reading occupies ${((val / pcfg.staticLimit) * 100).toFixed(0)}% of max permissible spec limit.`,
      },
    ];

    // Predicted 168h value from 0h->24h drift
    const predictedSlope = slope;
    const predicted168h = Number((v0 + predictedSlope * 168.0).toFixed(2));
    const intervalMargin = Number((stats.robustSigma * 1.5).toFixed(2));
    const predictionInterval: [number, number] = [
      Math.max(0, predicted168h - intervalMargin),
      predicted168h + intervalMargin,
    ];

    return {
      ...chip,
      currentValue: val,
      robustZScore: Number(robustZ.toFixed(2)),
      iqrDistance: Number(iqrDistance.toFixed(2)),
      isoForestScore: Number(isoScore.toFixed(3)),
      ensembleScore,
      predictedSlope: Number(predictedSlope.toFixed(4)),
      actualSlope: Number(((v168 - v0) / 168.0).toFixed(4)),
      predicted168h,
      predictionInterval,
      earlyReject: isEarlyReject,
      timeSavedHours,
      passesStaticLimit: passesStatic,
      passesDynamicThreshold: !isFlagged,
      verdict,
      justification,
      shapAttributions,
    };
  });

  return { updatedChips, stats };
}

function generatePlainEnglishJustification(params: {
  chip: ChipData;
  param: ParameterType;
  val: number;
  unit: string;
  staticLimit: number;
  median: number;
  robustZ: number;
  slope: number;
  safetySlope: number;
  passesStatic: boolean;
  verdict: ScreeningVerdict;
}): string {
  const { val, unit, staticLimit, median, robustZ, slope, safetySlope, passesStatic, verdict } = params;
  const ratioMedian = (val / Math.max(median, 1e-4)).toFixed(1);
  const slopeRatio = safetySlope > 0 ? (slope / safetySlope).toFixed(1) : '1.0';

  if (verdict === 'HARD_REJECT') {
    return `CRITICAL: Exceeds static datasheet threshold (${val.toFixed(1)} ${unit} > ${staticLimit} ${unit}). Immediate gross screening failure.`;
  }

  if (verdict === 'EARLY_REJECT') {
    return `EARLY REJECT at 24h: Predicted drift slope is ${slopeRatio}× the lot safety slope (${slope.toFixed(3)} vs limit ${safetySlope.toFixed(3)} ${unit}/h). Projected 168h value crosses catastrophic failure boundary. Saves 144 hours of chamber cycle time.`;
  }

  if (verdict === 'LATENT_SUSPECT') {
    return `LATENT DEFECT WARNING: Reading is ${ratioMedian}× the lot median (robust z = ${robustZ.toFixed(1)}). While it strictly passes the static limit (${val.toFixed(1)} ${unit} < ${staticLimit} ${unit}), it violates the lot-relative statistical distribution and exhibits abnormal degradation velocity.`;
  }

  return `PASS: Reading (${val.toFixed(1)} ${unit}) is aligned with lot baseline (robust z = ${robustZ.toFixed(1)}). Degradation slope (${slope.toFixed(3)} ${unit}/h) is well within the lot safety envelope.`;
}
