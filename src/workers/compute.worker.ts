import { generateSyntheticLot, LotConfig } from '../algorithms/syntheticData';
import { evaluateLotOutliers, ScreeningOptions } from '../algorithms/dynamicOutlier';
import { calculateEvaluationMetrics } from '../algorithms/driftPredictor';
import { ChipData, EvaluationMetrics, LotStatistics } from '../types/burnIn';

export type WorkerRequest =
  | {
      id: string;
      type: 'GENERATE_LOT';
      config: LotConfig;
      options: ScreeningOptions;
    }
  | {
      id: string;
      type: 'REEVALUATE';
      chips: ChipData[];
      options: ScreeningOptions;
    };

export type WorkerResponse =
  | {
      id: string;
      type: 'SUCCESS';
      chips: ChipData[];
      stats: LotStatistics;
      metrics: EvaluationMetrics;
    }
  | {
      id: string;
      type: 'ERROR';
      error: string;
    };

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  try {
    let chips: ChipData[];
    if (req.type === 'GENERATE_LOT') {
      chips = generateSyntheticLot(req.config);
    } else {
      chips = req.chips;
    }

    const { updatedChips, stats } = evaluateLotOutliers(chips, req.options);
    const metrics = calculateEvaluationMetrics(updatedChips, req.options.parameter);

    const response: WorkerResponse = {
      id: req.id,
      type: 'SUCCESS',
      chips: updatedChips,
      stats,
      metrics,
    };
    self.postMessage(response);
  } catch (err: any) {
    const response: WorkerResponse = {
      id: req.id,
      type: 'ERROR',
      error: err?.message || String(err),
    };
    self.postMessage(response);
  }
};
