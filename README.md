# 🔥 BurnWatch 3D — AI-Driven Anomaly Detection in Component Burn-In & Screening
### Problem Statement: SIH26170 | ISRO — High-Reliability Spacecraft Component Environmental Stress Screening (ESS)

[![Smart India Hackathon](https://img.shields.io/badge/SIH%202026-PS%20SIH26170-cyan.svg)](https://sih.gov.in)
[![Organization](https://img.shields.io/badge/Organization-ISRO-orange.svg)](https://www.isro.gov.in)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11-009688.svg)](https://fastapi.tiangolo.com)
[![React Three Fiber](https://img.shields.io/badge/3D%20Digital%20Twin-Three.js%20%7C%20R3F-blue.svg)](https://threejs.org)
[![Real-Time](https://img.shields.io/badge/Real--Time-Redis%20Streams%20%7C%20WebSocket-e03a3e.svg)](#)
[![Database](https://img.shields.io/badge/Database-SQLAlchemy%202.0%20(SQLite%20%2F%20Postgres)-red.svg)](https://www.sqlalchemy.org)
[![Pytest](https://img.shields.io/badge/Pytest-33%20Passed-emerald.svg)](https://pytest.org)
[![Vitest](https://img.shields.io/badge/Vitest-8%20Passed-00ff88.svg)](https://vitest.dev)
[![Flight Recall](https://img.shields.io/badge/Flight%20Recall-100%25%20(Zero%20Escaped%20Defects)-green.svg)](#)

> **Mission-Control Real-Time 3D Digital Twin & Distributed Screening Platform for Accelerated Thermal Burn-In Testing at 125°C.**  
> Intercepts latent gate-oxide pinholes, electromigration, and non-linear degradation defects that escape static manufacturer datasheet limits, saving **144 hours** of high-temperature oven operation per defective die via 24h early AI reject gates.

---

## 🛰️ Distributed Real-Time Architecture

```text
 SENSOR / SIMULATOR / REPLAY / INDUSTRIAL INGRESS
                        │
                        ▼
            Telemetry Ingest Adapter
                        │
                        ▼
               Validation & Quality
           (Clock skew, NaN, Sanity)
                        │
                        ▼
         Authoritative Sequence Allocator
          (Redis Streams + In-Memory Fallback)
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
    Persistence                   Unified Screening
(PostgreSQL / SQLite)                  Engine
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

## 🌟 The SIH Golden Star Demo: Part `CHIP-LOT04-042`

In high-reliability space electronics, **static datasheet limits fail to catch latent degradation**:
- **Datasheet Static Limit**: $50.00\,\mu\text{A}$
- **Part Measurements**: $v_{0h} = 10.20\,\mu\text{A}$, $v_{24h} = 11.10\,\mu\text{A}$, $v_{96h} = 14.80\,\mu\text{A}$, $v_{168h} = 28.50\,\mu\text{A}$
- **Conventional Testing Result**: Because $28.50 \le 50.00\,\mu\text{A}$, standard testing passes this component (**False Negative**). The defective die is mounted on a satellite bus, where orbital thermal cycling leads to mission failure.
- **BurnWatch AI Result**: At **24h**, BurnWatch calculates a drift slope of $0.0375\,\mu\text{A/h}$ ($4.68\times$ lot median). The trajectory breaches the dynamic safety slope ($0.0220\,\mu\text{A/h}$) and triggers **EARLY REJECT at 24h**, saving **144 hours** of oven runtime and preventing defect escape!

Click the **Golden Demo** button in the top navigation bar to trigger this live inspection sequence with 3D camera navigation.

---

## ⚡ Real-Time & High-Scale Performance Benchmarks

### 1. Real-Time Distributed Telemetry Benchmark (`scripts/load_test_realtime.py`)

| Metric | Target SLA | Measured Result | Status |
|:---|:---:|:---:|:---:|
| **Throughput** | $> 500$ events/sec | **747.5 events/sec** | ✅ **PASSED** (149% of SLA) |
| **End-to-End Latency** | $< 100$ ms | **56.61 ms average** | ✅ **PASSED** (P99: 82.4 ms) |
| **Sequence Ordering** | 100% strictly ordered | **100% Monotonic** | ✅ **PASSED** (0 gaps, 0 reorders) |
| **Duplicate Rejection** | 100% | **100% Rejected** | ✅ **PASSED** |
| **Memory Fallback** | Zero downtime | **Instant Fallback** | ✅ **PASSED** |

### 2. High-Scale Ingestion & Screening Benchmark (`scripts/run_benchmark.py`)

| Scale (Components) | Latency (ms) | Throughput (components/sec) | Escaped Defects (FN) | Chamber Hours Saved |
|:---:|:---:|:---:|:---:|:---:|
| **1,000** | **0.41 ms** | 2,434,275 c/s | **0** | 61,344 hrs |
| **10,000** | **0.89 ms** | 11,183,180 c/s | **0** | 578,016 hrs |
| **100,000** | **6.71 ms** | 14,894,029 c/s | **0** | 5,774,976 hrs |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ & npm
- Python 3.11+
- (Optional) Docker & Docker Compose

### 1. Run with Docker Compose (Recommended)
```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API Docs (Swagger): `http://localhost:8000/docs`
- Deep Dependency Probe: `http://localhost:8000/api/v1/health/dependencies`
- Prometheus Metrics: `http://localhost:8000/metrics`

### 2. Run Manually (Local Development)

#### Terminal 1: Backend Microservice
```bash
# Seed initial users, models, and golden benchmark data
python -m backend.app.services.seed_db

# Run database migrations
python -m alembic upgrade head

# Start FastAPI server
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Terminal 2: Frontend 3D Web App
```bash
npm install
npm run dev -- --port 3000
```
Visit `http://localhost:3000` in any WebGL-capable browser.

---

## 🧪 Automated Test Execution

### Backend Pytest Suite (33 Tests: Chaos, Zero Leakage, Ingestion, API, Real-Time, Unified Screening)
```bash
python -m pytest tests/ -v
```

### Frontend Vitest Suite (8 Tests: EventRouter, Dynamic Outlier, Arrhenius Drift)
```bash
npx vitest run
```

### High-Scale Benchmark Suite
```bash
python scripts/run_benchmark.py
```

### Real-Time Ingestion Load Test
```bash
python scripts/load_test_realtime.py --events 2000 --concurrency 10
```

---

## 📚 Technical Documentation Index

- [**Distributed Real-Time Architecture** (`docs/realtime.md`)](./docs/realtime.md): WebSocket `/ws/live` protocol, canonical v2 envelope, Redis Streams, sequence gap recovery, and client backpressure.
- [**Unified Screening Engine** (`docs/screening-engine.md`)](./docs/screening-engine.md): DynamicBaselineEngine, Module A (Robust Z/Tukey IQR), Module B (Arrhenius Early Reject), Dynamic Confidence, and glass-box DecisionEngine.
- [**System Architecture** (`docs/architecture.md`)](./docs/architecture.md): Full subsystem designs, database ERD, RBAC permissions, and WebGL pipeline.
- [**ML & Screening Pipeline** (`docs/ml-pipeline.md`)](./docs/ml-pipeline.md): Mathematical formulations for Robust Z-Score, Tukey IQR, Isolation Forest, Arrhenius drift extrapolation, and zero-leakage proof.
- [**Glass-Box Explainability** (`docs/explainability.md`)](./docs/explainability.md): Natural language justification generator, SHAP attribution bar charts, and PDF certification.
- [**Judge Defense Manual** (`docs/judge-qa.md`)](./docs/judge-qa.md): In-depth answers to 10 tough evaluator attack questions.
- [**Benchmark Performance Report** (`docs/benchmark.md`)](./docs/benchmark.md): Detailed throughput, latency, and accuracy statistics up to 100k components.
- [**SIH Compliance Checklist** (`docs/sih-checklist.md`)](./docs/sih-checklist.md): 32/32 requirements fully implemented and audited.

---

## 👥 Default RBAC Accounts

| Username | Password | Role | Description |
|---|---|---|---|
| `admin` | `isro_admin_2026` | `ADMIN` | System director with full configuration and user management rights |
| `qa_inspector` | `isro_qa_2026` | `QA_INSPECTOR` | Authorized to screen lots, override verdicts, and sign QA certificates |
| `engineer` | `isro_eng_2026` | `ENGINEER` | Test engineer capable of uploading datasets and running benchmarks |
| `viewer` | `isro_view_2026` | `VIEWER` | Stakeholder read-only access to 3D chamber and reports |

---

## 📄 License
Designed for **Smart India Hackathon 2026** (Problem Statement SIH26170: ISRO Component Burn-In & Screening).
