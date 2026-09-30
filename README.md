# E-Waste Saathi (ई-वेस्ट साथी)
## Real-World E-Waste Formalization Platform — SIH26229 (Ministry of Mines)

> **"Collect Better. Earn Fairly. Recycle Safely."**

---

## 📌 Executive Summary

**E-Waste Saathi** is an AI-powered formalization and market intelligence infrastructure designed to bridge India’s informal e-waste collectors (waste pickers, local aggregators, scrap dealers) with authorized formal recyclers under the **E-Waste (Management) Rules, 2022** Extended Producer Responsibility (EPR) framework.

### Why This Is Not A Generic Scrap Marketplace:
1. **Fair Price Score Intelligence**: Transparently predicts local market benchmarks and alerts collectors to lowball undervaluation quotes.
2. **Computer Vision Material Classifier**: Instant edge-optimized identification across 12+ electronic waste categories (PCBs, cables, batteries, LCDs, motors).
3. **Verifiable Digital Lot Passports**: Generates immutable QR passports with SHA-256 cryptographic handover receipts—no fake blockchain buzzwords.
4. **"Bolkar Chalao" Voice-First UX**: High-contrast, pictorial, voice navigation in **Hindi, Marathi, and English** engineered for low-literacy entry-level Android devices.
5. **100% Offline-First Architecture**: Creates lots, compresses camera photos, and maintains ledgers with zero network, syncing idempotently via IndexedDB when 2G/3G connectivity returns.
6. **Marketplace Anomaly & Fraud Detection**: Detects quote anomalies, duplicate image submissions via perceptual difference hashing (`dHash`), and weighing variances.
7. **Value Recovery & Critical Minerals Lens**: Transparently quantifies strategic domestic mineral recovery (Copper, Gold, Silver, Lithium, Neodymium) with documented metallurgical citations.

---

## 🏛️ System Portals & Interfaces

| Interface | URL | Purpose | Key Features |
|---|---|---|---|
| **Cinematic 3D Journey** | `/` | National Landing & Mission | Three.js 3D camera timeline, Tiranga national palette, 18-asset visual bento gallery, Judge Demo trigger. |
| **Real-Time Ops Dashboard** | `/dashboard/live` | Command Operations Center | Live WebSocket telemetry bus (`/ws/live`), 8 real-time KPI tickers, event stream with 6 category filters, live lot pipeline. |
| **Live City Simulation** | `/demo/live` | Multi-City Automated Flow | 10-step automatic transaction generator (0.5x–5x speed), live JSON payload inspector, on-demand anomaly injectors. |
| **Anomaly Defense Center** | `/anomalies` | Anti-Fraud & Risk Isolation | Real-time incident inspector, tare scale drift alerts, review/dismiss/escalate workflow with audit trail verification. |
| **CPCB / Ministry of Mines** | `/government` | Regulatory Oversight | National EPR quota fulfillment registry, strategic mineral reserves tracker (Au, Cu, Li, Co), inter-state transit volume. |
| **Circular Impact & LCA** | `/impact` | Environmental Life-Cycle | Transparent CPCB 2022 calculation formulas (CO₂ avoided, water saved, virgin ore displaced), primitive vs formal comparison. |
| **Passport Verifier** | `/passport/verify` | Cryptographic Audit Chain | SHA-256 Merkle-style block verification confirming immutable chain of custody across 5 handover stages. |
| **Informal Collector PWA** | `/collector` | Grassroots Mobile Client | Voice-assisted vernacular flow (Hindi/Marathi/English), edge AI camera classifier, dynamic fair pricing, offline sync. |
| **Authorized Recycler** | `/recycler` | Gate Reception & Logistics | QR scanner, calibrated scale tare verification, dual cryptographic signature, instant micro-escrow payout trigger. |
| **Admin & Market Intel** | `/admin` | Enterprise Analytics | Unit economics simulator, market price indices, dispute arbitration, collector trust scoring. |

---

## 🚀 Quick Start (One-Click Launch)

### 1. Prerequisites
- Python 3.10+ installed
- Pip packages: `pip install -r backend/requirements.txt`

### 2. Launch Platform
```bash
python run.py
```

### 3. Open in Browser
- **Cinematic Homepage**: [http://localhost:8000](http://localhost:8000)
- **Live Operations Dashboard**: [http://localhost:8000/dashboard/live](http://localhost:8000/dashboard/live)
- **Live City Simulation Engine**: [http://localhost:8000/demo/live](http://localhost:8000/demo/live)
- **Interactive OpenAPI Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 4. Run Automated Test Suite (23/23 Passing)
```bash
pytest
```

---

## 🎯 5–7 Minute Live Judge Walkthrough Script

Click the **`🎯 JUDGE DEMO`** button in the header from any page to open the interactive 10-step guided evaluation walkthrough:

1. **Step 1: Informal Sector Onboarding (`/collector`)** — Explain that 95% of e-waste is processed informally. Demonstrate offline-first capture with vernacular Hindi audio guidance.
2. **Step 2: Edge AI Computer Vision** — Show EfficientNet-B0 analyzing motherboard PCB surface morphology (96.8% confidence) and isolating Class 2 flame retardant hazard.
3. **Step 3: Certified Bluetooth Tare Scale** — Certified IoT hardware zero-tare weight capture (24.50 kg) eliminating middleman skimming.
4. **Step 4: Dynamic Fair Price Intelligence** — Show Mandi scrap index rate calculation (+38.8% higher collector earnings vs local predatory middlemen).
5. **Step 5: Recycler Matching with MCDA Radar** — Multi-Criteria Decision Analysis matches nearest authorized recycler based on distance, rate, trust score, and certified capacity.
6. **Step 6: QR Digital Passport & SHA-256 Chain** — Minting tamper-evident digital passport with blockchain-grade SHA-256 hash sealing.
7. **Step 7: Dual-Signature Physical Handover** — Recycler gate scan and dual confirmation with 0.0 kg weight delta.
8. **Step 8: Instant Micro-Escrow Settlement** — Direct UPI settlement (₹16,660.00) disbursed within 1.2 seconds.
9. **Step 9: Anomaly & Anti-Fraud Defense (`/anomalies`)** — Proactive isolation of weight discrepancies and counterfeit receipts.
10. **Step 10: National EPR & Circular Mineral Impact (`/government` & `/impact`)** — Ministry of Mines circular recovery record (8.57g Gold, 5.51kg Copper, 76.4kg CO₂ avoided).

---

## 📂 Project Structure

```text
d:/SIH-2/
├── backend/
│   ├── app/
│   │   ├── config.py             # System thresholds, secrets & settings
│   │   ├── database.py           # SQLAlchemy session engine (SQLite/Postgres)
│   │   ├── models/               # Relational database models
│   │   ├── schemas/              # Pydantic validation schemas
│   │   ├── services/             # AI CV, Fair Price, MCDA, Simulation & Anomaly engines
│   │   ├── routers/              # Modular REST API endpoints
│   │   ├── seeds/                # Realistic baseline seed datasets
│   │   └── main.py               # FastAPI application & template routes
│   ├── websocket/
│   │   ├── manager.py            # Centralized WebSocket broadcast & pub/sub bus
│   │   ├── events.py             # Real-time event schemas & types
│   │   └── routes.py             # /ws/live endpoint and REST event gateway
│   └── requirements.txt
├── frontend/
│   ├── templates/
│   │   ├── index.html            # Cinematic 3D landing & bento gallery
│   │   ├── dashboard_live.html   # Real-time operations command dashboard
│   │   ├── demo_live.html        # Live multi-city flow simulation engine
│   │   ├── anomalies.html        # Anomaly Operations Center
│   │   ├── government.html       # Ministry of Mines & CPCB oversight hub
│   │   ├── impact.html           # Circular impact & LCA methodology
│   │   ├── passport_verify.html  # Cryptographic SHA-256 audit verifier
│   │   ├── collector.html        # High-contrast mobile PWA
│   │   ├── recycler.html         # Recycler scale & QR scanner portal
│   │   └── admin.html            # Administrative analytics dashboard
│   └── static/
│       ├── js/                   # judge_demo.js, three_visualizer.js, realtime.js
│       ├── locales/              # Complete translations (en, hi, mr)
│       └── images/               # 18 curated story & bento assets
├── tests/                        # 19 automated unit & integration test suites
├── docs/                         # Complete architecture & governance docs
├── run.py                        # Single-command launcher
└── data_sources.md               # Data provenance & methodology citations
```
