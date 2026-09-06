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

## 🏛️ System Actors

| Actor | Interface | Key Functionalities |
|---|---|---|
| **Informal Collector (कबाड़ी साथी)** | Mobile PWA (`/collector`) | Voice navigation, photo AI classification, fair price score, QR passport, cash/UPI ledger, safety audio guides. |
| **Authorized Recycler** | Industrial Portal (`/recycler`) | Incoming lot quotes, camera QR scanner, calibrated scale verification, SHA-256 receipts, batch route clustering. |
| **Regulatory Authority (MoM/CPCB)** | Admin Dashboard (`/admin`) | Authorization verification, market anomaly alerts, dispute resolution, critical minerals audit, unit economics simulator. |

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
- **Unified Portal & Role Switcher**: [http://localhost:8000](http://localhost:8000)
- **Collector Mobile Experience**: [http://localhost:8000/collector](http://localhost:8000/collector)
- **Authorized Recycler Portal**: [http://localhost:8000/recycler](http://localhost:8000/recycler)
- **Ministry & Admin Intelligence Hub**: [http://localhost:8000/admin](http://localhost:8000/admin)
- **Interactive OpenAPI Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 4. Run Automated Test Suite
```bash
python -m pytest -v
```

---

## 🧪 Live Judge Demonstration Scenarios

### Scenario 1: Deterministic End-to-End Formalization Handover
1. Collector opens `/collector` in Hindi (`हिन्दी`).
2. Taps **"ई-कचरा बेचें"** & selects photo of Motherboard PCB.
3. AI classifies material as **"सर्किट बोर्ड (PCB)"** with 94% confidence.
4. Collector enters `18 kg` weight & selects `Standard Mixed Good`.
5. System computes **Fair Value of ₹2,400 – ₹2,850** (expected ₹2,640).
6. Matches with **EcoGreen Authorized Recyclers** (94.5 Trust Score, CPCB verified, pickup available).
7. System generates **Digital Lot Passport** and big **QR Code**.
8. In `/recycler`, recycler scans QR, inputs certified electronic scale weight of `17.6 kg` @ ₹150/kg = ₹2,640.
9. System generates **SHA-256 cryptographic receipt**.
10. Collector's **Earnings Ledger** updates instantly with cash settlement record.

### Scenario 2: The "WOW" Anomaly Detection & Negotiation Assistant
1. A rogue buyer offers a lowball rate of `₹1,100` for an 18kg lot (market benchmark ₹2,050).
2. Anomaly Engine flags **-46.3% Undervaluation Anomaly (`ANOMALY-2026-001`)**.
3. Collector receives a voice notification: *"यह ऑफर बाजार भाव से बहुत कम है।"*
4. Negotiation Assistant provides suggested response: *"स्थानीय बाजार भाव ₹340/kg है, क्या आप ₹1,850 दे सकते हैं?"*
5. High-trust alternative recyclers are presented to empower the informal worker.

---

## 📂 Project Structure

```
d:/SIH-2/
├── backend/
│   ├── app/
│   │   ├── config.py             # System thresholds, secrets & settings
│   │   ├── database.py           # SQLAlchemy session engine (SQLite/Postgres)
│   │   ├── models/               # 30+ normalized relational entities
│   │   ├── schemas/              # Pydantic v2 validation models
│   │   ├── services/             # AI, Price, Matching, Anomaly & QR engines
│   │   ├── routers/              # Modular REST endpoints
│   │   ├── seeds/                # 500+ prices, 20+ recyclers, 200+ seed lots
│   │   └── main.py               # FastAPI server & route mounting
│   └── requirements.txt
├── frontend/
│   ├── templates/
│   │   ├── index.html            # Role switcher & judge overview
│   │   ├── collector.html        # High-contrast mobile PWA
│   │   ├── recycler.html         # Industrial scale & QR scanner portal
│   │   └── admin.html            # Ministry intelligence dashboard
│   └── static/
│       ├── js/                   # i18n, Voice, Offline IndexedDB, Camera compression
│       └── locales/              # Complete translations (en, hi, mr)
├── tests/                        # 12 automated unit & integration test suites
├── docs/                         # Complete architecture & governance docs
├── IMPLEMENTATION_STATUS.md
├── run.py                        # Single-command launcher
└── data_sources.md               # Data provenance & methodology citations
```
