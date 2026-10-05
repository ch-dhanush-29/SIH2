export interface RealtimeEvent<T = any> {
  event_id: string;
  event_type: string;
  schema_version: number;
  timestamp: string;
  server_timestamp: string;
  lot_id?: string;
  component_id?: string;
  chamber_id?: string;
  sequence: number;
  payload: T;
}

export type EventHandler<T = any> = (event: RealtimeEvent<T>) => void;
export type SequenceGapHandler = (fromSeq: number, toSeq: number) => void;

export class EventRouter {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private wildcardHandlers: Set<EventHandler> = new Set();
  private lastSequence: number = 0;
  private onGapDetected?: SequenceGapHandler;

  constructor(onGapDetected?: SequenceGapHandler) {
    this.onGapDetected = onGapDetected;
  }

  setGapHandler(handler: SequenceGapHandler): void {
    this.onGapDetected = handler;
  }

  setLastSequence(seq: number): void {
    this.lastSequence = seq;
  }

  getLastSequence(): number {
    return this.lastSequence;
  }

  on<T = any>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler);

    return () => {
      this.off(eventType, handler);
    };
  }

  onAny(handler: EventHandler): () => void {
    this.wildcardHandlers.add(handler);
    return () => {
      this.wildcardHandlers.delete(handler);
    };
  }

  off(eventType: string, handler: EventHandler): void {
    const set = this.handlers.get(eventType);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  dispatch(event: RealtimeEvent): void {
    // 1. Sequence gap check
    if (this.lastSequence > 0 && event.sequence > this.lastSequence + 1) {
      const missedFrom = this.lastSequence + 1;
      const missedTo = event.sequence - 1;
      console.warn(`[EventRouter] Sequence gap detected: missed ${missedFrom} -> ${missedTo}`);
      if (this.onGapDetected) {
        this.onGapDetected(missedFrom, missedTo);
      }
    }

    if (event.sequence > this.lastSequence) {
      this.lastSequence = event.sequence;
    }

    // 2. Deliver to wildcard handlers
    for (const h of this.wildcardHandlers) {
      try {
        h(event);
      } catch (err) {
        console.error('[EventRouter] Wildcard handler error:', err);
      }
    }

    // 3. Deliver to exact type handlers
    const specificHandlers = this.handlers.get(event.event_type);
    if (specificHandlers) {
      for (const h of specificHandlers) {
        try {
          h(event);
        } catch (err) {
          console.error(`[EventRouter] Handler error for ${event.event_type}:`, err);
        }
      }
    }
  }

  clear(): void {
    this.handlers.clear();
    this.wildcardHandlers.clear();
  }
}
