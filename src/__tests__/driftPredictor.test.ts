import { describe, it, expect } from 'vitest';
import { predictDriftTrajectory, calculateEvaluationMetrics } from '../algorithms/driftPredictor';
import { generateSyntheticLot, PRESET_LOTS } from '../algorithms/syntheticData';
import { evaluateLotOutliers } from '../algorithms/dynamicOutlier';

describe('Time-Series Drift Predictor', () => {
  it('correctly predicts 168h drift value from 0h and 24h inputs', () => {
    const v0 = 10.0;
    const v24 = 14.8; // slope = (14.8 - 10)/24 = 0.2 µA/h
    const safetySlope = 0.15; // lower than 0.2 -> should flag early reject

    const forecast = predictDriftTrajectory(v0, v24, safetySlope);

    expect(forecast.slope).toBeCloseTo(0.2, 3);
    expect(forecast.isEarlyReject).toBe(true);
    expect(forecast.forecast168h).toBeGreaterThan(40.0);
    expect(forecast.predictionInterval[0]).toBeLessThan(forecast.forecast168h);
    expect(forecast.predictionInterval[1]).toBeGreaterThan(forecast.forecast168h);
  });

  it('calculates F2 score prioritizing recall over precision', () => {
    const chips = generateSyntheticLot(PRESET_LOTS[0]);
    const { updatedChips } = evaluateLotOutliers(chips, {
      parameter: 'iddq',
      checkpoint: 24,
      method: 'ENSEMBLE',
      sensitivity: 0.75,
    });

    const metrics = calculateEvaluationMetrics(updatedChips, 'iddq');

    expect(metrics.f2Score).toBeGreaterThan(90);
    expect(metrics.recall).toBe(100);
    expect(metrics.mae168h).toBeGreaterThan(0);
    expect(metrics.costPenalty).toBeLessThan(1000); // 0 FN means no $1000 catastrophic penalties
  });
});
