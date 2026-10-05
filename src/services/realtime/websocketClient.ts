import { ReconnectManager } from './reconnectManager';
import { EventRouter, RealtimeEvent } from './eventRouter';
import { getWsBaseUrl, getApiBaseUrl } from '../apiClient';

export type ConnectionState = 'CONNECTING' | 'CONNECTED' | 'DEGRADED' | 'RECONNECTING' | 'RESYNCING' | 'OFFLINE';

export interface WebSocketClientOptions {
  url?: string;
  token?: string;
  autoConnect?: boolean;
  onStateChange?: (state: ConnectionState) => void;
  onLatencyChange?: (latencyMs: number) => void;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string | null = null;
  private state: ConnectionState = 'OFFLINE';
  private reconnectManager: ReconnectManager;
  public router: EventRouter;

  private pingTimer: number | null = null;
  private pingSentTimestamp: number = 0;
  private latencyMs: number = 0;
  private isExplicitlyClosed = false;

  private subscriptions: {
    lot_ids: string[];
    chamber_ids: string[];
    streams: string[];
  } = {
    lot_ids: ['LOT-04'],
    chamber_ids: ['CH-01'],
    streams: ['telemetry', 'anomalies', 'screening', 'system', 'camera', 'demo'],
  };

  private onStateChangeCallback?: (state: ConnectionState) => void;
  private onLatencyChangeCallback?: (latencyMs: number) => void;

  constructor(options?: WebSocketClientOptions) {
    this.url = options?.url || getWsBaseUrl();
    this.token = options?.token || null;
    this.onStateChangeCallback = options?.onStateChange;
    this.onLatencyChangeCallback = options?.onLatencyChange;

    this.reconnectManager = new ReconnectManager({
      initialDelayMs: 1000,
      maxDelayMs: 25000,
    });

    this.router = new EventRouter(this.handleSequenceGap.bind(this));

    if (options?.autoConnect) {
      this.connect();
    }
  }

  getState(): ConnectionState {
    return this.state;
  }

  getLatency(): number {
    return this.latencyMs;
  }

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;
    this.setState(this.reconnectManager.attemptCount > 0 ? 'RECONNECTING' : 'CONNECTING');

    try {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (err) {
      console.error('[WebSocketClient] Connection instantiation failed:', err);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    this.reconnectManager.cancel();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState('OFFLINE');
  }

  subscribe(lots?: string[], chambers?: string[], streams?: string[]): void {
    if (lots) this.subscriptions.lot_ids = lots;
    if (chambers) this.subscriptions.chamber_ids = chambers;
    if (streams) this.subscriptions.streams = streams;

    if (this.state === 'CONNECTED' && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const msg = {
        action: 'subscribe',
        lot_ids: this.subscriptions.lot_ids,
        chamber_ids: this.subscriptions.chamber_ids,
        streams: this.subscriptions.streams,
      };
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleOpen(): void {
    console.info('[WebSocketClient] Connected to BurnWatch 3D live gateway.');
    this.setState('CONNECTED');
    this.reconnectManager.reset();
    this.startHeartbeat();

    // Authenticate securely post-handshake if token is provided
    if (this.token && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'auth', token: this.token }));
    }

    // Send active subscriptions
    this.subscribe();
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);

      // Handle pong heartbeat
      if (data.type === 'pong') {
        if (this.pingSentTimestamp > 0) {
          this.latencyMs = Math.round(performance.now() - this.pingSentTimestamp);
          if (this.onLatencyChangeCallback) {
            this.onLatencyChangeCallback(this.latencyMs);
          }
        }
        return;
      }

      // Handle server control acks
      if (data.type === 'subscription_ack' || data.type === 'connection_ack' || data.type === 'auth_ack') {
        if (data.sequence !== undefined) {
          this.router.setLastSequence(data.sequence);
        }
        return;
      }

      // Handle canonical RealtimeEvent
      if (data.event_id && data.event_type) {
        this.router.dispatch(data as RealtimeEvent);
      }
    } catch (err) {
      console.error('[WebSocketClient] Error parsing incoming message:', err);
    }
  }

  private handleError(event: Event): void {
    console.warn('[WebSocketClient] Socket error encountered:', event);
  }

  private handleClose(event: CloseEvent): void {
    this.stopHeartbeat();
    this.ws = null;

    if (!this.isExplicitlyClosed) {
      console.warn(`[WebSocketClient] Socket closed (code: ${event.code}). Initiating reconnect...`);
      this.scheduleReconnect();
    } else {
      this.setState('OFFLINE');
    }
  }

  private scheduleReconnect(): void {
    this.setState('RECONNECTING');
    this.reconnectManager.scheduleReconnect(() => {
      this.connect();
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingTimer = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.pingSentTimestamp = performance.now();
        this.ws.send(JSON.stringify({ action: 'ping' }));
      }
    }, 15000);
  }

  private stopHeartbeat(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private async handleSequenceGap(fromSeq: number, toSeq: number): Promise<void> {
    try {
      this.setState('RESYNCING');
      const res = await fetch(
        `${getApiBaseUrl()}/api/v1/realtime/replay?from_sequence=${fromSeq}&to_sequence=${toSeq}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.status === 'REPLAY_UNAVAILABLE') {
          console.warn('[WebSocketClient] Replay outside retention window. Performing full snapshot resync.');
          if (typeof window !== 'undefined' && (window as any).__BURNWATCH_RESYNC_SNAPSHOT__) {
            await (window as any).__BURNWATCH_RESYNC_SNAPSHOT__();
          }
          this.setState('CONNECTED');
          return;
        }

        const events: RealtimeEvent[] = Array.isArray(data) ? data : (data.events || []);
        for (const evt of events) {
          this.router.dispatch(evt);
        }
        console.info(`[WebSocketClient] Successfully recovered ${events.length} missed sequence events.`);
        this.setState('CONNECTED');
      } else {
        this.setState('DEGRADED');
      }
    } catch (e) {
      console.error('[WebSocketClient] Failed to recover missed events:', e);
      this.setState('DEGRADED');
    }
  }

  private setState(newState: ConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(newState);
      }
    }
  }
}
