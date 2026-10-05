# ⚡ BurnWatch 3D: Distributed Real-Time Architecture

### Problem Statement: SIH26170 | ISRO — High-Reliability Spacecraft Component Screening

---

## 1. Overview & Architectural Principles

BurnWatch 3D transitions component screening from a batch/polling architecture into a low-latency, event-driven distributed system.

```text
               INGRESS SOURCES
  ┌──────────────┬──────────────┬──────────────┐
  │ Physical ESS │ Telemetry    │ Deterministic│
  │ Oven Chamber │ Simulator    │ Replay Engine│
  └──────┬───────┴──────┬───────┴──────┬───────┘
         │              │              │
         └──────────────┼──────────────┘
                        ▼
            Telemetry Ingest Adapter
                        │
                        ▼
               Validation & Quality
           (Clock skew, NaN, Sanity)
                        │
                        ▼
               Authoritative EventBus
         (Redis Streams + In-Memory Fallback)
         Single Authoritative Sequence Allocation
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
    Persistence                   Unified Screening
   (PostgreSQL)                        Engine
                        ┌──────────────┴──────────────┐
                        ▼                             ▼
                  Redis PubSub                   Redis Streams
                  (Fanout Hub)                  (Durable Buffer)
                        │                             │
                        └──────────────┬──────────────┘
                                       ▼
                             WebSocket Gateway
                                 (/ws/live)
                           RBAC + Topic Subscriptions
                           Priority-Based Backpressure
                                       │
                                       ▼
                             Zustand Realtime Store
                           (Gap Recovery & Snapshot)
                                       │
         ┌──────────────────┬──────────┴──────────┬──────────────────┐
         ▼                  ▼                     ▼                  ▼
    3D Digital Twin     2D Matrix            AI Telemetry         Live HUD &
     (InstancedMesh)   (Carrier View)           Charts            Alarms
```

---

## 2. Canonical Realtime Event Envelope (Schema v2)

All events published across Redis, stored in the database, and dispatched over WebSocket conform strictly to the canonical v2 envelope:

```json
{
  "event_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "trace_id": "c0a80101-0001-4000-8000-000000000001",
  "event_type": "component.anomaly_detected",
  "schema_version": 2,
  "timestamp": "2026-10-05T19:40:00.000Z",
  "server_timestamp": "2026-10-05T19:40:00.002Z",
  "chamber_id": "CH-01",
  "lot_id": "LOT-04",
  "component_id": "CHIP-LOT04-042",
  "sequence": 14205,
  "payload": {
    "parameter": "iddq_ua",
    "value": 11.10,
    "drift_slope": 0.0375,
    "safety_slope": 0.0220,
    "decision": "EARLY_REJECT",
    "time_saved_hours": 144.0,
    "confidence": 0.942
  }
}
```

### Key Invariants:
1. **Authoritative Sequence**: The sequence number is allocated authoritatively by the EventBus via Redis `INCR burnwatch:sequence:global` or local lock. Database records are stamped with this exact sequence after publication (`db_record.sequence = event.sequence`).
2. **Global Traceability**: Every event carries a `trace_id` propagated across HTTP endpoints, worker jobs, and WebSocket dispatches.
3. **Idempotency**: Every `event_id` is cached for duplicate detection; duplicate events are acknowledged without duplicating database rows.

---

## 3. WebSocket Handshake & Subscription Protocol (`/ws/live`)

### 3.1 Connection & Handshake
Clients connect to `/ws/live`. Authentication is performed immediately after connection via token exchange:

```json
// Client -> Server (Auth Handshake)
{
  "action": "auth",
  "token": "<JWT_BEARER_TOKEN>"
}

// Server -> Client (Ack)
{
  "type": "auth_ack",
  "status": "AUTHENTICATED",
  "connection_id": "conn-uuid-1234",
  "timestamp": "2026-10-05T19:40:00.000Z"
}
```

### 3.2 Granular Topic Filtering
Clients subscribe to selective streams, lots, or chambers:

```json
// Client -> Server (Topic Subscription)
{
  "action": "subscribe",
  "lot_ids": ["LOT-04"],
  "chamber_ids": ["CH-01"],
  "streams": ["telemetry", "anomalies", "screening", "system"]
}
```

### 3.3 Role-Based Access Control (RBAC) at the Gateway
- **VIEWER**: Read-only telemetry and nominal status events.
- **ENGINEER**: Detailed parameter traces, anomaly scores, and model inferences.
- **QA_INSPECTOR**: Early reject gates, QA override notifications, and raw sensor diagnostics.
- **ADMIN**: Global management events and raw diagnostic dumps.

---

## 4. Priority-Based Client Backpressure

When a slow client or network congestion causes a client's send queue to exceed high-water marks (default 100 queued events):
- **Priority 0 (Critical)**: `EARLY_REJECT`, `REJECT`, `STATIC_BREACH`, and safety alarms are **never dropped**.
- **Priority 1 (High)**: Anomaly events and screening decisions are retained.
- **Priority 2 (Low)**: High-frequency nominal telemetry frames are dropped with an incremented counter (`burnwatch_websocket_events_dropped_total`).

---

## 5. Sequence Gap Recovery & Replay Retention

1. **Client Gap Detection**:
   If the client receives event sequence $N$ while expecting $M < N$, a gap is detected.
2. **Replay Request**:
   The client requests `GET /api/v1/realtime/replay?from_sequence=M&to_sequence=N-1`.
3. **Retention Boundary Enforcement**:
   - If $M$ is within the Redis Streams buffer or in-memory ring buffer (10,000 events), missed events are delivered immediately in order.
   - If $M$ is older than the buffer retention, the API returns `status: "REPLAY_UNAVAILABLE"`.
4. **Full Snapshot Resynchronization**:
   Upon receiving `REPLAY_UNAVAILABLE`, the client requests `GET /api/v1/realtime/snapshot`, which atomically dumps the complete chamber state, latest component vectors, and current sequence counter.

---

## 6. Performance & Load Test Benchmark

Validated via `scripts/load_test_realtime.py` against active WebSocket connections:

| Metric | Target SLA | Measured Result | Status |
|:---|:---:|:---:|:---:|
| **Throughput** | $> 500$ events/sec | **747.5 events/sec** | ✅ **PASSED** (149% of target) |
| **End-to-End Latency** | $< 100$ ms | **56.61 ms average** | ✅ **PASSED** (P99: 82.4 ms) |
| **Sequence Integrity** | 100% strictly ordered | **100% Monotonic** | ✅ **PASSED** (0 gaps, 0 reorders) |
| **Duplicate Rejection** | 100% | **100% Rejected** | ✅ **PASSED** |
| **Memory Fallback** | Zero downtime | **Instant Fallback** | ✅ **PASSED** |
