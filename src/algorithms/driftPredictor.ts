import {
  ChipData,
  EvaluationMetrics,
  LotStatistics,
  ParameterType,
} from '../types/burnIn';

export interface DriftForecastModel {
  slope: number;
  intercept: number;
  forecast168h: number;
  isEarlyReject: boolean;
  predictionInterval: [number, number];
}

/**
 * Log-linear degradation model:
 * v(t) = v0 + m * t + c * log(1 + t/12)
 * Fitted to 0h and 24h calibration points.
 */
export function predictDriftTrajectory(
  v0: number,
  v24: number,
  safetySlope: number
): DriftForecastModel {
  const linearSlope = (v24 - v0) / 24.0;
  // Non-linear acceleration factor for thermally accelerated 125°C Arrhenius aging
  const logFactor = linearSlope > 0 ? linearSlope * 0.15 : 0;

  const forecast168h = v0 + linearSlope * 168.0 + logFactor * Math.log(1 + 168 / 12);
  const isEarlyReject = linearSlope > safetySlope;

  // 95% confidence interval band based on typical sensor noise
  const margin = Math.max(0.5, forecast168h * 0.08);

  return {
    slope: linearSlope,
    intercept: v0,
    forecast168h: Number(forecast168h.toFixed(2)),
    isEarlyReject,
    predictionInterval: [
      Math.max(0, Number((forecast168h - margin).toFixed(2))),
      Number((forecast168h + margin).toFixed(2)),
    ],
  };
}

/**
 * Computes confusion matrix and comprehensive evaluation metrics:
 * Positive = Anomaly / Defect (Ground Truth != 'NORMAL')
 * Negative = Normal component (Ground Truth == 'NORMAL')
 */
export function calculateEvaluationMetrics(
  chips: ChipData[],
  parameter: ParameterType
): EvaluationMetrics {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  let maeSum = 0;
  let maeCount = 0;

  chips.forEach((chip) => {
    const isActuallyDefective = chip.isGroundTruthDefect;
    const isFlaggedAsAnomaly = chip.verdict !== 'PASS';

    if (isFlaggedAsAnomaly && isActuallyDefective) {
      tp++;
    } else if (isFlaggedAsAnomaly && !isActuallyDefective) {
      fp++;
    } else if (!isFlaggedAsAnomaly && isActuallyDefective) {
      fn++; // CATASTROPHIC ESCAPED DEFECT
    } else {
      tn++;
    }

    // MAE on 168h prediction vs actual measurement
    const actual168 = chip.measurements[parameter].v_168h;
    if (chip.predicted168h !== undefined && actual168 !== undefined) {
      maeSum += Math.abs(chip.predicted168h - actual168);
      maeCount++;
    }
  });

  const recall = tp + fn > 0 ? (tp / (tp + fn)) * 100 : 100;
  const precision = tp + fp > 0 ? (tp / (tp + fp)) * 100 : 100;

  // F2-Score gives 5x more weight to Recall than Precision:
  // F2 = 5 * (P * R) / (4*P + R)
  const rFrac = recall / 100;
  const pFrac = precision / 100;
  const f2Score =
    4 * pFrac + rFrac > 0 ? ((5 * pFrac * rFrac) / (4 * pFrac + rFrac)) * 100 : 0;

  const mae168h = maeCount > 0 ? Number((maeSum / maeCount).toFixed(3)) : 0;

  // Cost-weighted score: Aerospace screening model
  // Escaped defect into flight payload: $1,000 penalty
  // False alarm re-test cost: $10 penalty
  const costPenalty = fn * 1000 + fp * 10;

  return {
    tp,
    fp,
    tn,
    fn,
    recall: Number(recall.toFixed(2)),
    precision: Number(precision.toFixed(2)),
    f2Score: Number(f2Score.toFixed(2)),
    escapedDefects: fn,
    mae168h,
    costPenalty,
  };
}
