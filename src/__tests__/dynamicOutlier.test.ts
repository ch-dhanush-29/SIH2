import { describe, it, expect } from 'vitest';
import { generateSyntheticLot, PRESET_LOTS } from '../algorithms/syntheticData';
import { evaluateLotOutliers } from '../algorithms/dynamicOutlier';
import { calculateEvaluationMetrics } from '../algorithms/driftPredictor';

describe('Dynamic Outlier Detection & Recall Guarantee', () => {
  it('should generate reproducible synthetic lots with seeded PRNG', () => {
    const lotA1 = generateSyntheticLot(PRESET_LOTS[0]);
    const lotA2 = generateSyntheticLot(PRESET_LOTS[0]);

    expect(lotA1.length).toBe(1000);
    expect(lotA1[0].part_id).toBe(lotA2[0].part_id);
    expect(lotA1[0].measurements.iddq.v_0h).toBe(lotA2[0].measurements.iddq.v_0h);
    expect(lotA1[42].groundTruth).toBe(lotA2[42].groundTruth);
  });

  it('guarantees ZERO false negatives (100% recall) on default aero lot with default sensitivity', () => {
    const chips = generateSyntheticLot(PRESET_LOTS[0]);
    const { updatedChips } = evaluateLotOutliers(chips, {
      parameter: 'iddq',
      checkpoint: 24,
      method: 'ENSEMBLE',
      sensitivity: 0.75, // Default recall-biased setting
    });

    const metrics = calculateEvaluationMetrics(updatedChips, 'iddq');

    // CRITICAL ACCEPTANCE CRITERIA:
    // Escaped defects (False Negatives) MUST BE 0 on default demo lot!
    expect(metrics.escapedDefects).toBe(0);
    expect(metrics.fn).toBe(0);
    expect(metrics.recall).toBe(100);
  });

  it('correctly catches latent defects that pass the static datasheet limit', () => {
    const chips = generateSyntheticLot(PRESET_LOTS[0]);
    const { updatedChips } = evaluateLotOutliers(chips, {
      parameter: 'iddq',
      checkpoint: 24,
      method: 'ENSEMBLE',
      sensitivity: 0.75,
    });

    // Find latent defect chips
    const latentDefects = updatedChips.filter((c) => c.groundTruth === 'LATENT_DEFECT');
    expect(latentDefects.length).toBeGreaterThan(0);

    // Verify each latent defect passes the static 50µA limit at 24h BUT is flagged by dynamic screening
    const caughtLatents = latentDefects.filter(
      (c) => c.passesStaticLimit && c.verdict !== 'PASS'
    );
    expect(caughtLatents.length).toBe(latentDefects.length);
  });
});
