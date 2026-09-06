# System Architecture — E-Waste Saathi

## 1. High-Level Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                          E-Waste Saathi Core                           │
├────────────────────────────┬───────────────────────────┬───────────────┤
│    Collector Mobile App    │      Recycler Portal      │ Admin Portal  │
│  (Offline-First PWA/Voice) │  (Quote/Handover/Scanner) │  (Gov/Audit)  │
└─────────────┬──────────────┴─────────────┬─────────────┴───────┬───────┘
              │                            │                     │
              ▼                            ▼                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       FastAPI Modular REST API                         │
│  - /auth (JWT/Phone)            - /lots (Passport, Handover, QR)       │
│  - /ai (CV Classification)      - /prices (Fair Price Engine)          │
│  - /recyclers (Matching & Trust)- /anomalies (Isolation/Z-Score Rules) │
│  - /sync (Offline Idempotent)   - /analytics (Impact & Unit Economics) │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Data & Intelligence Layer                       │
│  - SQLAlchemy ORM (30+ normalized entities)                            │
│  - CV Model / ResNet / MobileNet Feature Inference Pipeline            │
│  - Fair Price Score & Undervaluation Calculator                        │
│  - Explainable Recycler Ranking & Recycler Trust Score Engine          │
│  - Perceptual Image Hashing & Duplicate Lot Detector                   │
│  - Value Recovery Lens (Critical Minerals: Cu, Au, Ag, Pd, Li, Co, Nd) │
└────────────────────────────────────────────────────────────────────────┘
```

## 2. Key Subsystems

### 2.1 Fair Price Intelligence Engine
Calculates dynamic valuation using:
$$\text{Effective Rate} = \text{Base Benchmark} \times \text{Condition Multiplier} \times \text{Bulk Incentive}$$
Produces a **Fairness Score (0–100)** and calculates **Potential Undervaluation**:
$$\text{Fairness Score} = \min\left(100, 90 + (\text{Offer Ratio} - 1.0) \times 50\right) \quad \text{for } \text{Offer Ratio} \ge 1.0$$

### 2.2 Explainable Recycler Ranking
Evaluates recyclers using weighted multi-criteria decision analysis (MCDA):
- Recycler Trust Score: 30%
- Offered Rate relative to benchmark: 30%
- Proximity (inverse distance): 20%
- Pickup Availability for weight: 10%
- Official Authorization validity: 10%

### 2.3 Offline-First Sync Protocol
Client-side IndexedDB stores offline items with unique `idempotency_key` stamps. When connectivity is restored, items are submitted in a single batch to `/api/v1/sync`. Backend records every key in `sync_queue_records` to prevent duplicate lot creation.
