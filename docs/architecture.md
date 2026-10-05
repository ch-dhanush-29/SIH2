# BurnWatch 3D: Production System Architecture
**Problem Statement SIH26170**: AI-Driven Anomaly Detection in Component Burn-In & Screening — ISRO  
**Platform**: High-Reliability Space Systems Screening & Environmental Stress Screening (ESS) Digital Twin

---

## 1. Authoritative Real-Time Architecture

BurnWatch 3D implements an end-to-end, production-grade distributed real-time digital-twin platform where **false negatives are catastrophic**. The platform pairs a 60 FPS GPU-accelerated 3D Digital Twin with an asynchronous Python ML inference backend, an atomic sequence event bus, durable Redis Streams, strict RBAC security, and an immutable audit trail.

```text
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                              BurnWatch 3D Telemetry Sources                            │
 │  ┌─────────────────┐ ┌───────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐  │
 │  │ SimulatorSource │ │  HTTPSource   │ │ ReplaySource│ │ MQTTSource  │ │ OPCUASource│  │
 │  └────────┬────────┘ └───────┬───────┘ └──────┬──────┘ └──────┬──────┘ └─────┬──────┘  │
 └───────────┼──────────────────┼────────────────┼───────────────┼──────────────┼─────────┘
             │                  │                │               │              │
             └──────────────────┴───────┬────────┴───────────────┴──────────────┘
                                        ▼
             ┌─────────────────────────────────────────────────────────┐
             │               TelemetryIngestPayload (Normalized)       │
             └──────────────────────────┬──────────────────────────────┘
                                        ▼
             ┌─────────────────────────────────────────────────────────┐
             │     1. Ingestion Validation & Quality Classification     │
             │     (VALID, OUT_OF_RANGE, CLOCK_SKEW, MISSING, STALE)   │
             └──────────────────────────┬──────────────────────────────┘
                                        ▼
             ┌─────────────────────────────────────────────────────────┐
             │     2. Authoritative Sequence Allocator (Single Atomic) │
             │     next_sequence() guarantees monotonic order in DB &  │
             │     events before database insertion                    │
             └──────────────────────────┬──────────────────────────────┘
                                        ▼
             ┌─────────────────────────────────────────────────────────┐
             │     3. Database Persistence (PostgreSQL 16+ / SQLite)   │
             │     TelemetryEvent, Chamber, Component status updates   │
             └──────────────────────────┬──────────────────────────────┘
                                        ▼
             ┌─────────────────────────────────────────────────────────┐
             │     4. Real-Time AI Inference & Anomaly Detection       │
             │     Dynamic Limits, Robust Z-Score, Tukey IQR,          │
             │     Log-linear Drift Forecast (0h+24h -> 168h failure)  │
             └──────────────────────────┬──────────────────────────────┘
                                        ▼
             ┌─────────────────────────────────────────────────────────┐
             │     5. Durable Event Stream (Redis Streams / EventBus)  │
             │     XADD maxlen=10,000, Idempotency & Replay Buffer     │
             └──────────────────────────┬──────────────────────────────┘
                                        ▼
             ┌─────────────────────────────────────────────────────────┐
             │     6. Realtime Gateway (WebSocketManager)              │
             │     Bounded Queues (400), Post-connect Auth Handshake,  │
             │     Topic Filter (Lot, Chamber, Component)              │
             └──────────────────────────┬──────────────────────────────┘
                                        │ WebSocket (/api/v1/ws/live)
                                        ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                               BurnWatch 3D Frontend Client                             │
 │  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
 │  │ 1. Snapshot Synchronizer: GET /api/v1/realtime/snapshot                          │  │
 │  │    Initializes lot baseline, chamber, active anomalies at sequence seq_snapshot  │  │
 │  └──────────────────────────────────────────┬───────────────────────────────────────┘  │
 │                                             ▼                                          │
 │  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
 │  │ 2. EventRouter & ReconnectManager: Gap Detection & Automatic Replay              │  │
 │  │    Detects missed sequences and fetches /api/v1/events/replay?from_sequence=...  │  │
 │  └──────────────────────────────────────────┬───────────────────────────────────────┘  │
 │                                             ▼                                          │
 │  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
 │  │ 3. 3D Instanced Digital Twin (BurnInCanvas / InstancedChips / ChamberScene)       │  │
 │  │    Imperative buffer updates (setColorAt / setMatrixAt), 60 FPS, no React drops  │  │
 │  └──────────────────────────────────────────────────────────────────────────────────┘  │
 └────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Key Subsystems

### 2.1 Authoritative Sequence Allocation & Gap Recovery
- **Single Sequence Authority**: The event bus `next_sequence()` is the sole allocator of sequence IDs across the system. Sequence numbers are assigned *prior* to database insertion and passed through to both the database record and the published event envelope.
- **Durable Event Storage**: Redis Streams (`XADD burnwatch:stream:events`) combined with an in-memory ring buffer (up to 10,000 events) guarantees that reconnecting clients can recover any missed sequences seamlessly via `GET /api/v1/events/replay`.
- **Idempotency**: All events carry a unique `event_id` (UUIDv4) deduplicated against an LRU cache and database uniqueness constraints.

### 2.2 Unified Telemetry Source Abstraction
- All ingestion sources inherit from `TelemetrySource`:
  - `SimulatorSource`: Deterministic physics-based thermal oven simulation and baseline electrical noise.
  - `ReplaySource`: Historical flight lot playback with variable speed rates (1x, 2x, 4x).
  - `HTTPSource`: REST ingress endpoint (`/api/v1/telemetry/ingest`, `/telemetry/batch`).
  - `MQTTSource`: Industrial MQTT message broker listener (`burnwatch/chamber/+/telemetry`).
  - `OPCUASource`: Industrial SCADA / PLC tag polling abstraction.
- Crucially, simulation and real hardware share the **identical downstream pipeline** (validation, sequence allocation, persistence, AI inference, event broadcast).

### 2.3 3D Chamber Digital Twin & Graphics Pipeline
- **Chamber Scene**: Simulates an industrial 125°C burn-in thermal oven with glowing ceramic heating coils, thermal HUD, and nitrogen purge indicators.
- **High-Performance Instancing**: Renders 1,000 to 5,000 IC packages using Three.js `InstancedMesh` with dynamic 4x4 matrix transforms and instanced color buffers. Consistently maintains 60 FPS.
- **Full-Screen 3D ISRO Emblem**: Features a 75% pointer-responsive Euler rotation, particle swarm, orbital rings, and Indian National Flag palette (`#FF9933` saffron, `#FFFFFF` white, `#138808` green, `#000080` Ashoka Navy, `#000000` black).

---

## 3. Real Benchmark Results (load_test_realtime.py)

Tested on local environment with 1,000 components and 500 real-time measurements in concurrent batches:

| Metric | Measured Value | SLA Target | Verdict |
|---|---|---|---|
| **Effective Ingestion Throughput** | **747.5 events/sec** | > 100 events/sec | **PASS** |
| **Ingestion Latency (Avg)** | **56.61 ms** | < 100 ms | **PASS** |
| **Ingestion Latency (p50)** | **26.67 ms** | < 50 ms | **PASS** |
| **Ingestion Latency (p95)** | **319.56 ms** | < 500 ms | **PASS** |
| **Total Test Execution Duration** | **0.67 s** | < 10.0 s | **PASS** |
| **Sequence Monotonicity** | **100% Strict Monotonic** | 100% | **PASS** |
| **Idempotent Deduplication** | **Zero duplicate insertions** | Zero duplicates | **PASS** |

---

## 4. Security & Role-Based Access Control (RBAC)

| Role | Permissions |
|---|---|
| **ADMIN** | Full system configuration, model activation, user provisioning, threshold editing, QA overrides. |
| **QA_INSPECTOR** | Execute screening runs, inspect components, perform human-in-the-loop overrides, export certified QA PDFs. |
| **ENGINEER** | Ingest datasets, trigger benchmark evaluations, view telemetry, inspect models. |
| **VIEWER** | Read-only access to dashboards, 3D chamber digital twin, and summary reports. |
