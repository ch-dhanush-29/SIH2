export interface ReconnectConfig {
  initialDelayMs: number;
  maxDelayMs: number;
  factor: number;
  jitter: boolean;
}

export class ReconnectManager {
  private attempts = 0;
  private timer: number | null = null;
  private readonly config: ReconnectConfig;

  constructor(config?: Partial<ReconnectConfig>) {
    this.config = {
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      factor: 2.0,
      jitter: true,
      ...config,
    };
  }

  get attemptCount(): number {
    return this.attempts;
  }

  calculateDelay(): number {
    const rawDelay = Math.min(
      this.config.initialDelayMs * Math.pow(this.config.factor, this.attempts),
      this.config.maxDelayMs
    );

    if (!this.config.jitter) {
      return rawDelay;
    }

    // Add 25% random jitter to prevent thundering herd problem
    const jitterFactor = 0.75 + Math.random() * 0.5;
    return Math.round(rawDelay * jitterFactor);
  }

  scheduleReconnect(onReconnect: () => void): number {
    this.cancel();
    const delay = this.calculateDelay();
    this.attempts += 1;

    this.timer = setTimeout(() => {
      this.timer = null;
      onReconnect();
    }, delay) as unknown as number;

    return delay;
  }

  reset(): void {
    this.attempts = 0;
    this.cancel();
  }

  cancel(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
