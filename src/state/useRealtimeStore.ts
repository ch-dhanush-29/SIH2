import { create } from 'zustand';
import { WebSocketClient, ConnectionState } from '../services/realtime/websocketClient';
import { RealtimeEvent } from '../services/realtime/eventRouter';
import { useBurnInStore } from './useBurnInStore';
import { getApiBaseUrl } from '../services/apiClient';

interface RealtimeState {
  connectionStatus: ConnectionState;
  latencyMs: number;
  eventsPerSecond: number;
  lastSequence: number;
  lastEventTime: string | null;
  activeSubscriptions: string[];
  isGoldenDemoActive: boolean;
  demoPhase: string;
  demoStep: number;
  timeSavedHours: number;
  isSimulatorActive: boolean;
  client: WebSocketClient | null;

  initRealtime: () => void;
  syncSnapshot: () => Promise<void>;
  startGoldenDemo: () => Promise<void>;
  stopGoldenDemo: () => Promise<void>;
  startSimulator: () => Promise<void>;
  stopSimulator: () => Promise<void>;
  subscribeToLot: (lotId: string) => void;
}

let eventCountInWindow = 0;
let lastRateCheckTime = performance.now();

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  connectionStatus: 'OFFLINE',
  latencyMs: 0,
  eventsPerSecond: 0,
  lastSequence: 0,
  lastEventTime: null,
  activeSubscriptions: ['LOT-04', 'CH-01', 'telemetry', 'anomalies'],
  isGoldenDemoActive: false,
  demoPhase: 'IDLE',
  demoStep: 0,
  timeSavedHours: 0,
  isSimulatorActive: false,
  client: null,

  initRealtime: () => {
    if (get().client) return;

    const client = new WebSocketClient({
      onStateChange: (status) => set({ connectionStatus: status }),
      onLatencyChange: (latency) => set({ latencyMs: latency }),
    });

    // Wire Real-Time Event Handlers into BurnWatch 3D state
    client.router.onAny((event: RealtimeEvent) => {
      eventCountInWindow += 1;
      const now = performance.now();
      if (now - lastRateCheckTime >= 1000) {
        set({
          eventsPerSecond: Math.round((eventCountInWindow * 1000) / (now - lastRateCheckTime)),
          lastSequence: event.sequence,
          lastEventTime: event.timestamp,
        });
        eventCountInWindow = 0;
        lastRateCheckTime = now;
      }
    });

    // 1. Live Telemetry Event Stream
    client.router.on('telemetry', (event: RealtimeEvent) => {
      const payload = event.payload;
      if (payload && payload.environment) {
        const burnStore = useBurnInStore.getState();
        const curTelem = burnStore.telemetry;
        useBurnInStore.setState({
          telemetry: {
            ...curTelem,
            chamberTempC: payload.environment.temperature_c ?? curTelem.chamberTempC,
            nitrogenFlowLpm: payload.environment.nitrogen_flow_lpm ?? curTelem.nitrogenFlowLpm,
            humidityPercent: payload.environment.humidity_percent ?? curTelem.humidityPercent,
            heaterCoilActive: (payload.environment.temperature_c ?? 125.0) >= 120.0,
          },
        });
      }
    });

    // 2. Real-Time Anomaly Detected Event
    client.router.on('anomaly_detected', (event: RealtimeEvent) => {
      const payload = event.payload;
      if (payload && payload.component_id) {
        const burnStore = useBurnInStore.getState();
        const chips = [...burnStore.chips];
        const idx = chips.findIndex((c) => c.part_id === payload.component_id);

        if (idx !== -1) {
          chips[idx] = {
            ...chips[idx],
            verdict: payload.decision === 'REJECT' ? 'HARD_REJECT' : 'LATENT_SUSPECT',
            ensembleScore: payload.anomaly_score,
            justification: payload.reasons ? payload.reasons.join(', ') : 'Threshold breach',
          };

          useBurnInStore.setState({
            chips,
            selectedChipId: payload.component_id,
          });

          burnStore.addToast({
            type: 'ALERT',
            title: `CRITICAL ANOMALY: ${payload.component_id}`,
            message: `${payload.decision} decision triggered @ 24h. Slope: ${payload.drift_slope ?? 'N/A'}. Score: ${payload.anomaly_score}%.`,
          });
        }
      }
    });

    // 3. Golden Real-Time Demo Events (0h -> 24h early reject -> 144h saved)
    client.router.on('demo.started', (event: RealtimeEvent) => {
      set({ isGoldenDemoActive: true, demoStep: 1, demoPhase: 'NORMAL_CHAMBER' });
      useBurnInStore.getState().addToast({
        type: 'INFO',
        title: 'GOLDEN DEMO STARTED',
        message: '1,000 components mounted in Chamber 01-A @ 125°C.',
      });
    });

    client.router.on('demo.step', (event: RealtimeEvent) => {
      set({ demoStep: event.payload.step, demoPhase: event.payload.phase });
    });

    client.router.on('screening.decision', (event: RealtimeEvent) => {
      if (event.payload.time_saved_hours) {
        set({ timeSavedHours: event.payload.time_saved_hours });
      }
      useBurnInStore.getState().addToast({
        type: 'SUCCESS',
        title: 'EARLY REJECT COMMITTED',
        message: `${event.payload.time_saved_hours} burn-in hours saved with zero false negatives!`,
      });
    });

    client.router.on('demo.completed', (event: RealtimeEvent) => {
      set({ isGoldenDemoActive: false, demoPhase: 'COMPLETED' });
      useBurnInStore.getState().addToast({
        type: 'SUCCESS',
        title: 'GOLDEN DEMO COMPLETE',
        message: 'Real-time WebSocket digital-twin screening verified successfully.',
      });
    });

    client.connect();
    set({ client });

    // Fetch initial authoritative digital-twin snapshot
    get().syncSnapshot();
  },

  syncSnapshot: async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/realtime/snapshot?lot_id=LOT-04&chamber_id=CH-01`);
      if (res.ok) {
        const snapshot = await res.json();
        set({
          lastSequence: snapshot.sequence,
          lastEventTime: snapshot.timestamp,
        });

        const client = get().client;
        if (client && snapshot.sequence) {
          client.router.setLastSequence(snapshot.sequence);
        }

        // Synchronize chamber environmental status
        if (snapshot.chamber) {
          const burnStore = useBurnInStore.getState();
          const curTelem = burnStore.telemetry;
          useBurnInStore.setState({
            telemetry: {
              ...curTelem,
              chamberTempC: snapshot.chamber.current_temperature_c ?? curTelem.chamberTempC,
              nitrogenFlowLpm: snapshot.chamber.nitrogen_flow_lpm ?? curTelem.nitrogenFlowLpm,
              humidityPercent: snapshot.chamber.humidity_percent ?? curTelem.humidityPercent,
            },
          });
        }
        console.info(`[RealtimeStore] Authoritative snapshot synchronized at sequence #${snapshot.sequence}`);
      }
    } catch (e) {
      console.warn('[RealtimeStore] Snapshot synchronization failed (backend offline or unreachable):', e);
    }
  },

  startGoldenDemo: async () => {
    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/v1/demo/start`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to trigger backend demo:', e);
    }
  },

  stopGoldenDemo: async () => {
    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/v1/demo/stop`, { method: 'POST' });
      set({ isGoldenDemoActive: false });
    } catch (e) {
      console.error('Failed to stop backend demo:', e);
    }
  },

  startSimulator: async () => {
    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/v1/simulator/start`, { method: 'POST' });
      set({ isSimulatorActive: true });
    } catch (e) {
      console.error('Failed to start simulator:', e);
    }
  },

  stopSimulator: async () => {
    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/v1/simulator/stop`, { method: 'POST' });
      set({ isSimulatorActive: false });
    } catch (e) {
      console.error('Failed to stop simulator:', e);
    }
  },

  subscribeToLot: (lotId: string) => {
    const client = get().client;
    if (client) {
      client.subscribe([lotId]);
      set({ activeSubscriptions: [lotId, 'CH-01', 'telemetry', 'anomalies'] });
    }
  },
}));
