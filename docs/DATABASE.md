# Database Schema & Relational Models

## 1. Normalized Relational Architecture

The database schema is fully normalized across 30+ relational entities:

### 1.1 User & Authorization Domain
- `users`: Core identity, phone, role (`collector`, `recycler`, `admin`, `researcher`), preferred language (`hi`, `mr`, `en`).
- `collectors`: Informal collector profile, city, coordinates, formalization score progress (0-100), total handovers, aggregate earnings.
- `recyclers`: Authorized recycling partner, location, service radius, trust score, MPCB/CPCB license number, completion rate, dispute rate.
- `recycler_authorizations`: State Pollution Control Board license registry, issue date, expiry date, verification notes, audit documents.

### 1.2 Material & Price Intelligence Domain
- `material_categories`: High-level e-waste classes (PCB, Cable, Battery, CRT, LCD, Phone, Laptop, HDD, SMPS, Motor, Charger, Plastic).
- `materials`: Granular material catalog, benchmark base price, min/max market ranges, critical mineral profiles (Cu %, Au ppm, Ag ppm, rare earths).
- `price_observations`: 500+ historical price observations across cities, buying price, selling price, confidence score, source badge.
- `safety_guides`: Pictorial and audio safe handling instructions with dos/donts in Hindi, Marathi, and English.

### 1.3 Lot, Passport & Handover Domain
- `lots`: Digital lot records, collector weight estimate, scale verified weight, condition grade, AI classification logs, fairness score, status.
- `lot_images`: Uploaded photos, client-compressed thumbnails, 64-bit difference hashes (`dHash`).
- `lot_events`: Immutable audit trail of lot lifecycle (`CREATED`, `QUOTED`, `PICKUP_ASSIGNED`, `QR_SCANNED`, `WEIGHED`, `COMPLETED`).
- `lot_passports`: Cryptographic SHA-256 lot origin fingerprints, QR code SVG/base64 representations.
- `handover_records`: Verifiable scale weighing receipts, agreed rate, total payout, GPS coordinates, SHA-256 digital receipt hash.

### 1.4 Transactions, Logistics & Intelligence
- `transactions`: Settled financial records, payment mode (`CASH`, `UPI`, `BANK_TRANSFER`), avoided CO2 kg, diverted toxic lead, recovered minerals.
- `payments`: Cash & UPI payment audit logs.
- `earnings_ledger`: Collector daily and monthly ledger entries.
- `batches` & `batch_lots`: Grouping multiple collector lots into a single smelter aggregation shipment.
- `pickup_requests`: Route cluster requests with distance and vehicle assignment.
- `anomaly_events`: AI-flagged undervaluation alerts, duplicate image detections, scale weight discrepancies.
- `disputes`: Evidence submission and administrative dispute resolution workbench.
- `field_research_records`: Real-world collector survey observations (Dharavi, Seelampur, etc.).
- `ai_model_registry`: Governance registry tracking active model versions, F1 scores, and deployment status.
- `sync_queue_records`: Offline sync idempotency logs.
