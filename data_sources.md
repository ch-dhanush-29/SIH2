# Data Sources & Provenance Documentation

## Transparency & Synthetic Benchmark Notice

> [!IMPORTANT]
> In compliance with SIH Hackathon ethical AI guidelines and Government of India regulatory standards, all baseline market data, recycler profiles, and seed transactions in the demonstration database are clearly identified as **DEMO / SYNTHETIC DATA**.
> No synthetic records are falsely claimed as official government registries.

---

## 1. Metallurgical & Environmental Recovery Benchmarks

| Metric / Material | Yield / Conversion Ratio | Reference Standard / Source | Notes & Limitations |
|---|---|---|---|
| **High-Grade PCB Copper** | 18% – 25% by weight | CPCB Technical Guidelines for E-Waste (2022) | Applies to telecom & server boards. Lower grade brown single-sided PCBs average 8-12%. |
| **Motherboard Gold Content** | 120 – 250 ppm (mg/kg) | UNEP / StEP Initiative Recycling Manual | Recovery rate in formal hydrometallurgy: 98%. Informal acid leaching recovery: < 35%. |
| **High-Grade RAM Gold Finger** | 400 – 850 ppm | USGS Critical Mineral Resources Reports | Gold plating on contact pins. |
| **Cable Copper Yield** | 50% – 72% pure Cu wire | Indian Metal Scrap Merchants Association (APMC) | Varies based on insulation sheath gauge. Open burning emits toxic dioxins/furans. |
| **Avoided CO2 Metric** | 1.62 kg CO2e saved / kg e-waste | UNEP Global E-Waste Monitor & CPCB LCA | Derived from avoided bauxite/copper virgin mining and thermal primary smelting. |

---

## 2. Market Pricing Feeds & Benchmark Engine

- **Base Rates**: Calibrated against observed wholesale electronic scrap trading corridors across Mumbai (Kurla/Dharavi), Delhi NCR (Seelampur/Mandoli), and Pune (Bhosari).
- **Connector Architecture**: Designed with an extensible `PriceProvider` interface so that official feeds from state APMCs or CPCB National EPR Portal can be integrated in future phases without altering the application core.

---

## 3. Recycler Authorization Status

- Recycler records are assigned statuses:
  - `VERIFIED`: Confirmed against mock CPCB/MPCB compliance certificates.
  - `PENDING_VERIFICATION`: Under review by administrative authority.
  - `EXPIRED` / `SUSPENDED`: Flagged for non-compliance or audit failure.
