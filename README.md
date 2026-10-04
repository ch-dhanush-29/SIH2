# 🔥 BurnWatch 3D — AI-Driven Anomaly Detection in Component Burn-In & Screening
### Problem Statement: SIH26170 | ISRO — High-Reliability Spacecraft Component Environmental Stress Screening (ESS)

[![Smart India Hackathon](https://img.shields.io/badge/SIH%202026-PS%20SIH26170-cyan.svg)](https://sih.gov.in)
[![Organization](https://img.shields.io/badge/Organization-ISRO-orange.svg)](https://www.isro.gov.in)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11-009688.svg)](https://fastapi.tiangolo.com)
[![React Three Fiber](https://img.shields.io/badge/3D%20Digital%20Twin-Three.js%20%7C%20R3F-blue.svg)](https://threejs.org)
[![Database](https://img.shields.io/badge/Database-SQLAlchemy%202.0%20(SQLite%20%2F%20Postgres)-red.svg)](https://www.sqlalchemy.org)
[![Pytest](https://img.shields.io/badge/Pytest-12%20Passed-emerald.svg)](https://pytest.org)
[![Vitest](https://img.shields.io/badge/Vitest-5%20Passed-00ff88.svg)](https://vitest.dev)
[![Recall](https://img.shields.io/badge/Flight%20Recall-100%25%20(Zero%20Escaped%20Defects)-green.svg)](#)

> **Mission-Control 3D Screening System & Digital Twin for Accelerated Thermal Burn-In Testing at 125°C.**  
> Intercepts latent gate-oxide pinholes, electromigration, and non-linear degradation defects that escape static manufacturer datasheet limits, saving **144 hours** of high-temperature oven operation per defective die via 24h early AI reject gates.

---

## 🛰️ Full-Stack System Architecture

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      BurnWatch 3D Frontend (Port 3000)                 │
 │  Vite + React 18 + TypeScript + Three.js + R3F + Tailwind CSS v4       │
 │                                                                        │
 │  • 3D Chamber Digital Twin (60 FPS InstancedMesh, 500-5,000 ICs)       │
 │  • 3D Lot Cloud Space (X=Value, Y=Drift Slope, Z=Time Checkpoint)      │
 │  • 3D Trajectory Degradation Tubes with Ghost 168h Forecast Extension   │
 │  • 2D Matrix Carrier Grid Fallback for WebGL-less environments         │
 │  • Interactive Glass-box QA Inspector & Decision Override Engine       │
 │  • Zero-Hallucination AI Engineering Assistant Grounded in Telemetry   │
 │  • Client-side jsPDF Single Certificate & Batch Audit PDF Generation   │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTPS / REST (or Offline Fallback)
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                   FastAPI Backend Microservice (Port 8000)             │
 │                                                                        │
 │  • RBAC & Security (JWT, bcrypt, 4 Roles: Admin, QA, Engineer, Viewer) │
 │  • Ingestion Service (Physics sanity checks, wide/long CSV validator)  │
 │  • Module A: Robust Z-Score (Median/MAD), Tukey IQR, Isolation Forest   │
 │  • Module B: Arrhenius Drift Predictor (0h+24h -> 168h Forecast, 95% CI│
 │  • Dynamic Safety Slope Calculation (Drift > Safety Slope -> Reject)   │
 │  • Unified 3-Way Decision Engine (PASS / REVIEW / REJECT)              │
 │  • Audit Log Engine (Immutable security records & QA decision stamps)  │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │ SQLAlchemy 2.0 ORM
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                 Relational Database (SQLite / PostgreSQL)              │
 │  Tables: users, lots, components, measurements, screening_results,     │
 │          qa_decisions, audit_logs, model_versions                      │
 └────────────────────────────────────────────────────────────────────────┘
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

## ⚡ High-Scale Performance Benchmarks

Executed on standard consumer hardware via `python scripts/run_benchmark.py`:

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

### 2. Run Manually (Local Development)

#### Terminal 1: Backend Microservice
```bash
# Seed initial users, models, and golden benchmark data
python -m backend.app.services.seed_db

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

### Backend Pytest Suite (12 Tests: Zero Leakage, Ingestion, API, Star Demo)
```bash
python -m pytest tests/ -v
```

### Frontend Vitest Suite (5 Tests: Dynamic Outlier, Arrhenius Drift)
```bash
npx vitest run
```

### High-Scale Benchmark Suite
```bash
python scripts/run_benchmark.py
```

---

## 📚 Technical Documentation Index

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
