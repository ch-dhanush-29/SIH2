# 🧠 BurnWatch 3D: Unified Screening Engine Specification

### Problem Statement: SIH26170 | ISRO — AI-Driven Anomaly Detection in Component Burn-In & Screening

---

## 1. Architectural Philosophy

Conventional screening in semiconductor burn-in testing relies solely on **static datasheet limits** (e.g. $I_{\text{DDQ}} \le 50.0\,\mu\text{A}$). Latent gate-oxide pinholes, micro-voids, and electromigration channels routinely operate within static limits during early hours, but exhibit anomalous drift rates or atypical peer distributions that lead to catastrophic in-orbit spacecraft failures.

The **Unified Screening Engine** (`backend/app/services/screening/`) establishes a single, authoritative point of truth for all anomaly evaluation across BurnWatch 3D. Every telemetry ingestion path—whether real hardware, batch CSV, live simulator, deterministic replay, or the Golden Demo—routes through this identical engine.

```text
                                  TELEMETRY INGRESS
                                          │
                                          ▼
                             DynamicBaselineEngine
                             ├── Sample Sufficiency (N >= 5)
                             ├── Median & MAD Calculation
                             ├── Robust Sigma = 1.4826 * MAD
                             └── Tukey Quartiles & IQR Fences
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
       DynamicAnomalyDetector                        EarlyForecastingEngine
             (Module A)                                    (Module B)
       ├── Static Breach (V >= Limit)                ├── Degradation Slope m = ΔV / 24h
       ├── Robust Z = (V - Med) / σ                  ├── Project V(168h) = V(24h) + m*144h
       ├── Tukey Outlier Excess                      ├── Dynamic Safety Slope Comparison
       └── Unsupervised Isolation Forest             └── Early Reject Gate (Save 144h)
                  │                                               │
                  └───────────────────────┬───────────────────────┘
                                          ▼
                                ConfidenceCalculator
                                ├── Data Quality Factor (q)
                                ├── Sample Sufficiency Factor (s)
                                ├── Forecast Horizon Uncertainty (f)
                                └── Multi-Signal Consistency (c)
                                          │
                                          ▼
                                    DecisionEngine
                                ├── PASS
                                ├── REVIEW
                                ├── EARLY_REJECT
                                ├── REJECT
                                └── INSUFFICIENT_DATA
                                          │
                                          ▼
                                 ExplainabilityEngine
                                (Glass-Box Audit Stamp)
```

---

## 2. Mathematical Formulations

### 2.1 Dynamic Baseline Engine (`DynamicBaselineEngine`)
Given a lot sample vector $X = [x_1, x_2, \dots, x_N]$ of clean measurements:

1. **Sample Sufficiency**:
   $$\text{is\_sufficient} = (N \ge 5)$$
   If $N < 5$, the engine flags `INSUFFICIENT_DATA` rather than hallucinating lot statistics.

2. **Median & Median Absolute Deviation (MAD)**:
   $$\tilde{x} = \text{median}(X)$$
   $$\text{MAD} = \text{median}\left(\left| X - \tilde{x} \right|\right)$$

3. **Robust Standard Deviation ($\hat{\sigma}_{\text{robust}}$)**:
   $$\hat{\sigma}_{\text{robust}} = 1.4826 \times \text{MAD}$$
   *(The factor $1.4826$ ensures asymptotic consistency with standard deviation for normally distributed populations).*

4. **Tukey Interquartile Range (IQR)**:
   $$Q_1 = P_{25}(X), \quad Q_3 = P_{75}(X), \quad \text{IQR} = Q_3 - Q_1$$

5. **Dynamic Upper Screening Limit**:
   $$L_{\text{dynamic}} = \min\left(L_{\text{static}},\, \tilde{x} + k \cdot \hat{\sigma}_{\text{robust}}\right), \quad k = 3.5 \times (1.5 - \text{sensitivity})$$

---

### 2.2 Module A: Multi-Layer Anomaly Detector (`DynamicAnomalyDetector`)
Synthesizes deterministic bounds, robust statistical distance, and unsupervised ensemble signals:

1. **Static Datasheet Breach**:
   $$\text{static\_breach} = (v \ge L_{\text{static}})$$

2. **Robust Z-Score**:
   $$Z_{\text{robust}} = \frac{v - \tilde{x}}{\hat{\sigma}_{\text{robust}}}$$
   - $Z_{\text{robust}} \ge 3.0\sigma$: Anomaly candidate.
   - $Z_{\text{robust}} \ge 4.5\sigma$: Severe outlier.

3. **Tukey Outlier Score**:
   $$\text{IQR\_excess} = \max\left(0,\, \frac{v - Q_3}{\text{IQR}}\right)$$

4. **Ensemble Score Synthesis (0–100)**:
   $$\text{Score}_{\text{ensemble}} = \begin{cases} 
   100.0 & \text{if } \text{static\_breach} \\
   \min\left(99.0,\, Z_{\text{term}} + \text{IQR}_{\text{term}} + \text{IF}_{\text{term}}\right) & \text{otherwise}
   \end{cases}$$

---

### 2.3 Module B: Degradation Forecaster (`EarlyForecastingEngine`)
Models high-temperature accelerated Arrhenius degradation trajectory from $0\text{h}$ and $24\text{h}$ checkpoints:

1. **Observed Drift Slope**:
   $$m_{\text{drift}} = \max\left(0,\, \frac{v_{24h} - v_{0h}}{24.0}\right) \quad (\mu\text{A/h})$$

2. **Projected 168h Value**:
   $$\hat{v}_{168h} = v_{24h} + m_{\text{drift}} \times (168 - 24) = v_{24h} + 144 \cdot m_{\text{drift}}$$

3. **Uncertainty Interval**:
   $$W_{\text{margin}} = \left(\frac{144}{24}\right) \times \left(0.8 \cdot \hat{\sigma}_{\text{robust}}\right) = 4.8 \cdot \hat{\sigma}_{\text{robust}}$$
   $$\text{Bounds} = \left[\hat{v}_{168h} - W_{\text{margin}},\, \hat{v}_{168h} + W_{\text{margin}}\right]$$

4. **Safety Slope Comparison**:
   The lot safety slope $m_{\text{safe}}$ represents the maximum allowable drift before dielectric breakdown:
   $$\text{Early Reject Gate} \iff \left(\hat{v}_{168h} \ge L_{\text{static}}\right) \lor \left(\frac{m_{\text{drift}}}{m_{\text{safe}}} \ge 3.5 \land m_{\text{drift}} > 0.10\right)$$
   $$\text{Hours Saved} = 144.0\,\text{hours per defective die}$$

---

### 2.4 Dynamic Confidence Calculator (`ConfidenceCalculator`)
Multi-factor confidence calculation without hardcoded constants:

$$\text{Confidence} = q \times s \times f \times c$$

- **$q$ (Data Quality Factor)**:
  - $\text{VALID} = 1.0$
  - $\text{CLOCK\_SKEW} = 0.70$
  - $\text{OUT\_OF\_RANGE} = 0.20$
- **$s$ (Sample Sufficiency Factor)**:
  - $N \ge 100 \implies s = 1.0$
  - $30 \le N < 100 \implies s = 0.90$
  - $10 \le N < 30 \implies s = 0.75$
  - $N < 10 \implies s = 0.40$
- **$f$ (Forecast Horizon Uncertainty Factor)**:
  - Evaluates forecast uncertainty interval width relative to baseline scale.
- **$c$ (Signal Consistency Factor)**:
  - Multi-layer agreement between static, robust Z, and Tukey tests ($c \in [0.85, 0.98]$).

---

### 2.5 Decision Matrix (`DecisionEngine`)

| Ingress Condition | Quality Status | Ensemble Score | Confidence | Verdict | Action |
|:---|:---:|:---:|:---:|:---:|:---|
| Sample count $< 5$ or missing | Any | Any | Any | `INSUFFICIENT_DATA` | Hold for lot population accumulation |
| Corrupt data / Clock skew | Corrupt | Any | $< 0.70$ | `REVIEW` | Hardware probe & calibration check |
| Static datasheet breach | VALID | 100.0 | $\ge 0.70$ | `REJECT` | Immediate scrap / wafer quarantine |
| Module B safety slope breach | VALID | $\ge 60.0$ | $\ge 0.70$ | `EARLY_REJECT` | Abort burn-in at 24h, save 144h oven power |
| Robust Z $\ge 4.2\sigma$ | VALID | $\ge 75.0$ | $\ge 0.70$ | `REJECT` | Outlier scrap |
| Mild deviation ($3.0\sigma \le Z < 4.2\sigma$) | VALID | $45.0 - 74.0$ | Any | `REVIEW` | Engineering review / re-probe |
| Nominal electrical behavior | VALID | $< 45.0$ | $\ge 0.70$ | `PASS` | Clear for flight qualification |
