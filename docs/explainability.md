# BurnWatch 3D: Glass-Box Explainability Framework
**Transparent Rationale, SHAP Feature Attributions, and Human-in-the-Loop QA Oversight**

---

## 1. The Glass-Box Philosophy

In aerospace and mission-critical electronics, "black-box" deep learning models are unacceptable for flight qualification. If an algorithm rejects a flight wafer or clears a latent defect without auditability, QA leads cannot sign off on launch readiness.

BurnWatch 3D implements a 100% glass-box screening engine:
1. **Rule-Based Precedence**: Physics and static datasheet bounds always supersede ML heuristics.
2. **Deterministic Explanations**: Plain-English sentences generated with exact numerical values and unit labels.
3. **Additive Feature Attribution**: SHAP-style breakdown quantifying the percentage contribution of each telemetry feature.
4. **Immutable Human Override**: Any decision overridden by a QA inspector requires a documented rationale, preserved permanently in the database audit log.

---

## 2. Plain-English QA Inspector Justification

The `ExplainabilityEngine` generates transparent, natural language reports:

### Nominal Component Example:
> *"CHIP-LOT04-012 shows nominal behavior at 24h. Measured iddq (10.15 µA) is close to lot median (10.12 µA, robust z = +0.1). Drift slope (0.0062 µA/h) is well below the lot safety slope (0.0220 µA/h). Predicted 168h value (11.02 µA) safely clears dynamic (11.50 µA) and static (50.00 µA) limits."*

### Latent-Defect Component Example (Star Demo CHIP-LOT04-042):
> *"CHIP-LOT04-042 flagged as REJECT: Passes static limit (11.10 <= 50.00 µA); measured iddq at 24h is 1.1× the lot median (10.12 µA, robust z = +2.6); drift slope (0.0375 µA/h) is 1.7× the lot safety slope (0.0220 µA/h); predicted 168h value (16.20 µA) breaches the dynamic lot ceiling (11.50 µA); Triggered EARLY REJECT at 24h, saving 144 hours of chamber burn-in time."*

---

## 3. SHAP Feature Attribution Vector

Every component evaluation decomposes risk score into 4 primary dimensions:

1. **Drift Slope vs Safety Threshold (35% Base Weight)**:  
   $$\text{Impact}_{\text{slope}} = \max\left(0, \frac{\text{drift\_slope}}{\text{safety\_slope}} - 1.0\right) \times 35.0$$
2. **Robust Z-Score (MAD from Median) (25% Base Weight)**:  
   $$\text{Impact}_Z = \max(0, Z_{\text{robust}} - 1.5) \times 8.0$$
3. **Multivariate Isolation Forest (20% Base Weight)**:  
   $$\text{Impact}_{\text{iforest}} = \frac{S_{\text{iforest}}}{100.0} \times 20.0$$
4. **Dynamic Limit Headroom Depletion (20% Base Weight)**:  
   $$\text{Impact}_{\text{headroom}} = \max\left(0, 1.0 - \frac{\text{Limit}_{\text{dynamic}} - x_{24h}}{\text{Limit}_{\text{dynamic}}}\right) \times 25.0$$

These values are visualized as a horizontal SHAP attribution bar chart directly in the QA Inspector panel.

---

## 4. PDF Inspection Certificate Generation

BurnWatch 3D provides client-side, zero-dependency PDF generation via `jsPDF`:
- **Single Component QA Certificate**: Includes physical tray coordinates, 4-checkpoint degradation graph, SHAP contributions, and official ISRO certification disclaimer.
- **Batch Lot Audit Certificate**: Contains lot baseline statistics (Median, MAD, Safety Slope), confusion matrix metrics, false negative audit, and yield breakdown.
