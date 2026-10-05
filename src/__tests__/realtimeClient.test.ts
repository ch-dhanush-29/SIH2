import { describe, it, expect, vi } from 'vitest';
import { EventRouter, RealtimeEvent } from '../services/realtime/eventRouter';
import { ReconnectManager } from '../services/realtime/reconnectManager';

describe('EventRouter', () => {
  it('dispatches specific events to matching listeners', () => {
    const router = new EventRouter();
    const mockHandler = vi.fn();

    router.on('telemetry', mockHandler);

    const event: RealtimeEvent = {
      event_id: 'evt-1',
      event_type: 'telemetry',
      schema_version: 1,
      timestamp: '2026-10-05T12:00:00Z',
      server_timestamp: '2026-10-05T12:00:00Z',
      sequence: 1,
      payload: { iddq_ua: 21.4 },
    };

    router.dispatch(event);
    expect(mockHandler).toHaveBeenCalledWith(event);
  });

  it('detects sequence gaps and triggers recovery callback', () => {
    const onGap = vi.fn();
    const router = new EventRouter(onGap);

    const event1: RealtimeEvent = {
      event_id: 'evt-1',
      event_type: 'telemetry',
      schema_version: 1,
      timestamp: '2026-10-05T12:00:00Z',
      server_timestamp: '2026-10-05T12:00:00Z',
      sequence: 10,
      payload: {},
    };

    const event2: RealtimeEvent = {
      event_id: 'evt-2',
      event_type: 'telemetry',
      schema_version: 1,
      timestamp: '2026-10-05T12:00:01Z',
      server_timestamp: '2026-10-05T12:00:01Z',
      sequence: 15, // Gap from 11 to 14
      payload: {},
    };

    router.dispatch(event1);
    expect(onGap).not.toHaveBeenCalled();

    router.dispatch(event2);
    expect(onGap).toHaveBeenCalledWith(11, 14);
  });
});

describe('ReconnectManager', () => {
  it('applies exponential backoff with configured ceiling', () => {
    const manager = new ReconnectManager({
      initialDelayMs: 1000,
      maxDelayMs: 8000,
      factor: 2.0,
      jitter: false,
    });

    expect(manager.calculateDelay()).toBe(1000);
    manager.scheduleReconnect(vi.fn());
    expect(manager.calculateDelay()).toBe(2000);
    manager.scheduleReconnect(vi.fn());
    expect(manager.calculateDelay()).toBe(4000);
    manager.scheduleReconnect(vi.fn());
    expect(manager.calculateDelay()).toBe(8000);
    manager.scheduleReconnect(vi.fn());
    expect(manager.calculateDelay()).toBe(8000); // capped at maxDelayMs
  });
});
