# Recommended External APIs & Production Integrations
## SIH26229 — Real-World E-Waste Formalization Platform (Ministry of Mines)

To scale **E-Waste Saathi** beyond the initial pilot into full nationwide deployment with the Central Pollution Control Board (CPCB), State Pollution Control Boards (SPCBs), and Extended Producer Responsibility (EPR) stakeholders, the following **7 high-impact external APIs and digital public infrastructure (DPI)** are recommended:

---

## 1. Government EPR & Recycler Verification APIs

### 1.1 CPCB National EPR E-Waste Portal API
- **Agency**: Central Pollution Control Board (CPCB), MoEFCC
- **API Purpose**: Automated verification of recycler EPR registration numbers, authorized processing capacity (MT/annum), and annual compliance return filing.
- **Base URL**: `https://eprewastecpcb.in/api/v1`
- **Endpoints**:
  - `GET /recyclers/verify/{authorization_number}`: Validates license status (`VALID`, `SUSPENDED`, `EXPIRED`).
  - `POST /epr-credits/record-transfer`: Transfers formal digital lot traceability certificates to PRO/Producer EPR credit registries.
- **Authentication**: Government OAuth2 / PKI Mutual TLS Client Certificate.
- **Saathi Integration Adapter**: `backend/app/services/recycler_matcher.py` &rarr; `RecyclerVerificationProvider`.

### 1.2 State Pollution Control Board (SPCB) Consent to Operate (CTO) Registry
- **Agency**: State Pollution Control Boards (e.g. MPCB Maharashtra, DPCC Delhi, KSPCB Karnataka)
- **API Purpose**: Real-time cross-referencing of physical recycling yard location and hazardous waste TSDF authorization.

---

## 2. Multilingual Speech & Vernacular AI (Digital India / Bhashini)

### 2.1 Digital India Bhashini Multilingual Speech AI API
- **Agency**: Ministry of Electronics and Information Technology (MeitY), Government of India
- **API Purpose**: Automatic Speech Recognition (ASR) and Text-to-Speech (TTS) for 22 scheduled Indian languages (Hindi, Marathi, Bengali, Tamil, Telugu, Gujarati, etc.).
- **Base URL**: `https://dhruva-api.bhashini.gov.in/services/inference`
- **Endpoints**:
  - `POST /asr`: Converts informal collector voice audio in local dialects into normalized text.
  - `POST /tts`: Generates natural vernacular audio guidance for low-literacy collectors.
- **Authentication**: Bhashini API Key + User ID Header.
- **Saathi Integration Adapter**: `backend/app/routers/voice_intent.py` &rarr; `BhashiniVoiceAdapter`.

---

## 3. Commodity & Scrap Market Feeds

### 3.1 Agmarknet / APMC Scrap Commodity Price Feeds
- **Agency**: Directorate of Marketing & Inspection (DMI) / APMC Industrial Scrap Markets
- **API Purpose**: Ingests regional metal scrap benchmark prices (Copper, Aluminum, Brass, Lead ingot spot rates).
- **Base URL**: `https://api.data.gov.in/resource/{resource_id}`
- **Authentication**: `api-key` query token.
- **Saathi Integration Adapter**: `backend/app/services/fair_price_engine.py` &rarr; `APMCPriceFeedConnector`.

### 3.2 London Metal Exchange (LME) & MCX India Spot Price API
- **API Purpose**: Global and domestic spot pricing for base metals (Copper, Nickel, Lead, Aluminum) and precious metals (Gold, Silver, Palladium) to calibrate daily fair value bounds.
- **Provider**: Multi Commodity Exchange (MCX) / Metals-API.com
- **Base URL**: `https://metals-api.com/api/latest`
- **Endpoints**: `GET /latest?base=INR&symbols=CU,AL,PB,XAU,XAG`

---

## 4. Geolocation, Mapping & Logistics Optimization

### 4.1 Mappls (MapmyIndia) Routing & Address API
- **Agency**: MapmyIndia (Approved Indian Geospatial Provider under National Geospatial Policy 2022)
- **API Purpose**: Turn-by-turn routing for aggregated recycler pickup clusters and exact doorstep scrap yard geocoding.
- **Base URL**: `https://apis.mappls.com/advancedmaps/v1`
- **Endpoints**:
  - `GET /route_adv/driving/{lon1},{lat1};{lon2},{lat2}`: Matrix distance calculation.
  - `POST /cluster_route`: Groups multiple informal collector lots into a minimum-fuel corridor.
- **Authentication**: Bearer OAuth Access Token.
- **Saathi Integration Adapter**: `backend/app/services/recycler_matcher.py` &rarr; `MapmyIndiaProvider`.

### 4.2 OpenStreetMap (OSM) / OSRM (Zero-Cost Self-Hosted Fallback)
- **API Purpose**: Offline-capable routing matrix engine for local municipal pickup trucks.

---

## 5. Instant Payment & Financial Inclusion (NPCI DPI)

### 5.1 NPCI UPI DeepLinking & Bharat BillPay (BBPS) API
- **Agency**: National Payments Corporation of India (NPCI)
- **API Purpose**: Instant zero-fee direct-to-bank payout from recycler account to collector's UPI VPA upon certified scale verification.
- **URI Format**: `upi://pay?pa={collector_vpa}&pn={collector_name}&am={final_payout_inr}&tn=E-Waste-Saathi-{lot_code}&cu=INR`
- **Authentication**: Bank Payment Gateway Signature / UPI Auto-Intent.
- **Saathi Integration Adapter**: `backend/app/routers/handover.py` &rarr; `UPIPaymentReceiptHandler`.

---

## 6. Open Network for Digital Commerce (ONDC) Logistics Integration

### 6.1 ONDC Logistics Protocol (Beckn Protocol)
- **Agency**: Department for Promotion of Industry and Internal Trade (DPIIT)
- **API Purpose**: Dynamic discovery and dispatch of third-party electric three-wheeler / micro-logistics carriers to collect bulk e-waste batches from local informal aggregators.
- **Specification**: Beckn Protocol v0.9.4 (`/search`, `/select`, `/init`, `/confirm`).

---

## 7. Configuration Architecture in E-Waste Saathi

The system uses an **Adapter / Provider Pattern** defined in `backend/app/config.py`:

```python
# Switch between Demo Provider (Local) and Official Live API
EXTERNAL_PRICE_PROVIDER = "APMC_DATA_GOV"        # Options: DEMO, APMC_DATA_GOV, METALS_API
EXTERNAL_VOICE_PROVIDER = "BHASHINI_DHRUVA"      # Options: WEB_SPEECH_BUILTIN, BHASHINI_DHRUVA
EXTERNAL_MAP_PROVIDER   = "MAPMYINDIA_MAPPLS"    # Options: HAVERSINE_LOCAL, MAPMYINDIA_MAPPLS
EXTERNAL_EPR_PROVIDER   = "CPCB_EPR_PORTAL"      # Options: DEMO_REGISTRY, CPCB_EPR_PORTAL
```

This ensures that the platform can switch from self-contained hackathon evaluation mode to live production with zero codebase refactoring.
