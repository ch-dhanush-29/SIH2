# BurnWatch 3D: Production System Architecture
**Problem Statement SIH26170**: AI-Driven Anomaly Detection in Component Burn-In & Screening — ISRO  
**Platform**: High-Reliability Space Systems Screening & Environmental Stress Screening (ESS) Digital Twin

---

## 1. High-Level Architecture Overview

BurnWatch 3D is designed for aerospace-grade component screening where **false negatives are catastrophic**. The platform pairs a real-time 3D GPU-accelerated Digital Twin with an asynchronous Python ML inference backend, strict RBAC security, and an immutable audit trail.

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                           BurnWatch 3D Frontend                         │
 │  Vite + React 18 + TypeScript + Three.js + R3F + Tailwind CSS v4       │
 │                                                                        │
 │  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
 │  │ 3D Chamber Digital Twin │  │ QA Explainability & Inspector HUD   │  │
 │  │ • InstancedMesh (60 FPS)│  │ • Plain-English Decision Engine     │  │
 │  │ • Lot Distribution Cloud│  │ • SHAP Feature Attributions         │  │
 │  │ • Trajectory Degradation│  │ • Time-Series Drift Confidence Band │  │
 │  │ • Fallback 2D Grid      │  │ • Interactive QA Decision Overrides │  │
 │  └────────────┬────────────┘  └──────────────────┬──────────────────┘  │
 │               │                                  │                     │
 │               └─────────────────┬────────────────┘                     │
 │                                 │                                      │
 │                       Web Worker / REST Client                         │
 └─────────────────────────────────┼──────────────────────────────────────┘
                                   │ HTTPS / JSON API
                                   ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                    FastAPI Backend Microservice (Port 8000)            │
 │                                                                        │
 │  ┌───────────────────────┐  ┌───────────────────────────────────────┐  │
 │  │ Authentication & RBAC │  │ Ingestion & Data Quality Service      │  │
 │  │ • JWT / OAuth2 Bearer │  │ • Strict physics & electronic bounds  │  │
 │  │ • 4 Roles: Admin, QA, │  │ • Wide & Long format CSV/Excel parser │  │
 │  │   Engineer, Viewer    │  │ • Detailed validation error reports   │  │
 │  └───────────────────────┘  └───────────────────────────────────────┘  │
 │                                                                        │
 │  ┌──────────────────────────────────────────────────────────────────┐  │
 │  │                   Multi-Layer Screening Core                     │  │
 │  │  • Layer 1: Datasheet Static Upper/Lower Limits                  │  │
 │  │  • Layer 2: Dynamic Robust Z-Score (Median / MAD) & Tukey IQR    │  │
 │  │  • Layer 3: Peer & Lot Population Distribution Analysis          │  │
 │  │  • Layer 4: Multivariate Isolation Forest Outlier Scoring        │  │
 │  │  • Layer 5: Time-Series Drift Predictor (0h+24h -> 168h Forecast)│  │
 │  │  • Safety Slope Calculation (m > Safety Slope -> Early Reject)   │  │
 │  │  • Unified 3-Way Decision Engine: PASS / REVIEW / REJECT         │  │
 │  └──────────────────────────────────────────────────────────────────┘  │
 └─────────────────────────────────┬──────────────────────────────────────┘
                                   │ SQLAlchemy 2.0 ORM
                                   ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      Relational Database Layer                         │
 │  • SQLite out-of-the-box (zero configuration)                          │
 │  • PostgreSQL production compatible via DATABASE_URL                   │
 │                                                                        │
 │  Tables:                                                               │
 │  - users (RBAC credentials, password hashes)                           │
 │  - lots (Lot baselines, MAD, yield rate, safety slope)                 │
 │  - components (Tray coordinates, ground truth, risk scores)            │
 │  - measurements (0h, 24h, 96h, 168h parametric readings)              │
 │  - screening_results (Multi-layer verdicts, SHAP values, time saved)   │
 │  - qa_decisions (Human-in-the-loop inspector override records)         │
 │  - audit_logs (Immutable audit trail with IP address and timestamps)   │
 │  - model_versions (Model registry, weights, benchmark metrics)         │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Key Subsystems

### 2.1 3D Chamber Digital Twin & Graphics Pipeline
- **Chamber Scene**: Simulates an industrial 125°C burn-in thermal oven with glowing ceramic heating coils, thermal HUD, and nitrogen purge indicators.
- **High-Performance Instancing**: Renders 500–5,000 IC packages using Three.js `InstancedMesh` with dynamic 4x4 matrix transforms and instanced color buffers. Consistently maintains 60 FPS on mid-range laptops and 30+ FPS on mobile devices.
- **Coordinate Spaces**:
  - *Chamber Tray Mode*: Physical chip placement on the burn-in oven carrier tray $(X, Y, Z_{\text{tray}})$.
  - *Lot Distribution Cloud*: Mathematical coordinate space $(X = \text{Parametric Value}, Y = \text{Drift Slope}, Z = \text{Checkpoint Hour})$ with static and dynamic boundary planes.
  - *Trajectory Scene*: 3D parametric degradation tubes tracing component evolution from 0h through 168h, with dashed ghost lines for forecasted trajectory.
  - *2D Carrier Grid Fallback*: Pure CSS/Canvas fallback ensuring 100% functionality on legacy browsers without WebGL.

### 2.2 Backend & Data Ingestion Pipeline
- **Validation Engine**: Automatically validates uploaded CSV and Excel files against domain physics constraints (e.g. $I_{ddq} \ge 0$, realistic leakage bounds $< 10^6$, no duplicate component IDs within lot).
- **Zero Data-Leakage Guarantee**: Temporal checkpoints strictly isolate future measurements. At checkpoint 24h, the feature extractor and drift forecaster are mathematically blocked from referencing 96h or 168h data.
- **Human-in-the-Loop QA Overrides**: Inspectors can override model verdicts with a mandatory engineering justification reason, preserved in `qa_decisions` and stamped in `audit_logs`.

---

## 3. Security & Role-Based Access Control (RBAC)

| Role | Permissions |
|---|---|
| **ADMIN** | Full system configuration, model activation, user provisioning, threshold editing, QA overrides. |
| **QA_INSPECTOR** | Execute screening runs, inspect components, perform human-in-the-loop overrides, export certified QA PDFs. |
| **ENGINEER** | Ingest datasets, trigger benchmark evaluations, view telemetry, inspect models. |
| **VIEWER** | Read-only access to dashboards, 3D chamber digital twin, and summary reports. |
