import { ChipData, EvaluationMetrics, LotStatistics } from '../types/burnIn';
import { LotConfig, generateSyntheticLot } from '../algorithms/syntheticData';
import { evaluateLotOutliers, ScreeningOptions } from '../algorithms/dynamicOutlier';
import { calculateEvaluationMetrics } from '../algorithms/driftPredictor';
import { WorkerRequest, WorkerResponse } from './compute.worker';

class ComputeWorkerClient {
  private worker: Worker | null = null;
  private pendingRequests = new Map<
    string,
    {
      resolve: (data: { chips: ChipData[]; stats: LotStatistics; metrics: EvaluationMetrics }) => void;
      reject: (err: Error) => void;
    }
  >();

  constructor() {
    if (typeof window !== 'undefined' && window.Worker) {
      try {
        this.worker = new Worker(new URL('./compute.worker.ts', import.meta.url), {
          type: 'module',
        });
        this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          const res = event.data;
          const pending = this.pendingRequests.get(res.id);
          if (pending) {
            this.pendingRequests.delete(res.id);
            if (res.type === 'SUCCESS') {
              pending.resolve({ chips: res.chips, stats: res.stats, metrics: res.metrics });
            } else {
              pending.reject(new Error(res.error));
            }
          }
        };
        this.worker.onerror = (err) => {
          console.warn('Compute worker encountered an error, falling back to main thread:', err);
        };
      } catch (e) {
        console.warn('Failed to initialize Web Worker, using main thread fallback:', e);
        this.worker = null;
      }
    }
  }

  async generateLot(
    config: LotConfig,
    options: ScreeningOptions
  ): Promise<{ chips: ChipData[]; stats: LotStatistics; metrics: EvaluationMetrics }> {
    const id = `req-${Date.now()}-${Math.random()}`;

    if (this.worker) {
      return new Promise((resolve, reject) => {
        this.pendingRequests.set(id, { resolve, reject });
        const req: WorkerRequest = { id, type: 'GENERATE_LOT', config, options };
        this.worker!.postMessage(req);
      });
    }

    // Direct synchronous fallback
    const rawChips = generateSyntheticLot(config);
    const { updatedChips, stats } = evaluateLotOutliers(rawChips, options);
    const metrics = calculateEvaluationMetrics(updatedChips, options.parameter);
    return { chips: updatedChips, stats, metrics };
  }

  async reevaluate(
    chips: ChipData[],
    options: ScreeningOptions
  ): Promise<{ chips: ChipData[]; stats: LotStatistics; metrics: EvaluationMetrics }> {
    const id = `req-${Date.now()}-${Math.random()}`;

    if (this.worker) {
      return new Promise((resolve, reject) => {
        this.pendingRequests.set(id, { resolve, reject });
        const req: WorkerRequest = { id, type: 'REEVALUATE', chips, options };
        this.worker!.postMessage(req);
      });
    }

    // Direct synchronous fallback
    const { updatedChips, stats } = evaluateLotOutliers(chips, options);
    const metrics = calculateEvaluationMetrics(updatedChips, options.parameter);
    return { chips: updatedChips, stats, metrics };
  }
}

export const workerClient = new ComputeWorkerClient();
