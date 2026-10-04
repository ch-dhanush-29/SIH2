# BurnWatch 3D: Machine Learning & Screening Pipeline
**Mathematical Formulations, Physics Modeling, and Zero-Data-Leakage Architecture**

---

## 1. Problem Context: The Semiconductor Latent Defect Dilemma

Standard environmental stress screening (ESS) relies on absolute static datasheet limits (e.g. $I_{ddq} \le 50.0\,\mu\text{A}$).
However, in high-reliability aerospace components (such as radiation-tolerant FPGAs, ASICs, and power MOSFETs):
1. A nominal lot exhibits a tight Gaussian distribution around a median $\tilde{x} \approx 10.0\,\mu\text{A}$ with $\text{MAD} \approx 0.35\,\mu\text{A}$.
2. A defective component may start at $10.2\,\mu\text{A}$ (0h) and drift to $11.1\,\mu\text{A}$ (24h) and $28.5\,\mu\text{A}$ (168h).
3. **The Static Trap**: Because $28.5\,\mu\text{A} < 50.0\,\mu\text{A}$, conventional testing marks this component as a "PASS". In orbit, thermal cycling and cosmic radiation accelerate dielectric breakdown, resulting in mission-critical failure.
4. **The BurnWatch Solution**: Identifies the component as a statistical and trajectory outlier at the early 24-hour gate, saving 144 hours of burn-in oven runtime.

---

## 2. Module A — Dynamic Outlier Detection Formulations

### 2.1 Robust Z-Score (Median / MAD)
Standard mean and standard deviation $(\mu, \sigma)$ are heavily biased by extreme outliers. We employ the median and Median Absolute Deviation ($\text{MAD}$):

$$\tilde{x} = \text{median}(X)$$
$$\text{MAD} = \text{median}(|X - \tilde{x}|)$$
$$\hat{\sigma}_{\text{robust}} = 1.4826 \times \text{MAD}$$
$$Z_{\text{robust}} = \frac{x_i - \tilde{x}}{\max(\hat{\sigma}_{\text{robust}}, 10^{-5})}$$

The dynamic lot limit is computed dynamically as:

$$\text{Limit}_{\text{dynamic}} = \min\left(\text{Limit}_{\text{static}}, \tilde{x} + k_{\sigma} \cdot \hat{\sigma}_{\text{robust}}\right)$$

where $k_{\sigma} = 5.5 - 3.0 \times \text{sensitivity}$. For our recall-biased default ($\text{sensitivity} = 0.85$), $k_{\sigma} = 2.95\,\sigma$.

### 2.2 Tukey Interquartile Range (IQR) Fence
$$Q_1 = P_{25}(X), \quad Q_3 = P_{75}(X), \quad \text{IQR} = Q_3 - Q_1$$
$$\text{Distance}_{\text{IQR}} = \frac{x_i - Q_3}{\max(\text{IQR}, 10^{-5})}$$

### 2.3 Multivariate Isolation Forest
Trained on 3-dimensional parametric vectors:
$$\mathbf{f}_i = [x_{i, 24h}, \; m_i, \; (x_{i, 24h} - x_{i, 0h})]^T$$
where $m_i$ is the 24-hour drift slope. Anomaly score $S_{\text{iforest}} \in [0, 100]$ captures non-linear multidimensional outliers.

### 2.4 Multi-Layer Ensemble Anomaly Score
$$S_{\text{ensemble}} = w_1 \cdot Z_{\text{norm}} + w_2 \cdot \text{IQR}_{\text{norm}} + w_3 \cdot S_{\text{iforest}} + w_4 \cdot m_{\text{norm}}$$
Default weights: $w_1 = 0.35, w_2 = 0.20, w_3 = 0.25, w_4 = 0.20$.

---

## 3. Module B — Time-Series Drift Predictor & Early Reject Gate

### 3.1 Degradation Physics (Arrhenius Acceleration Kinetics)
Under constant 125°C thermal stress, parametric shift follows power-law kinetics:
$$\Delta v(t) = m \cdot t^\beta$$
For normal components, $\beta \le 1.0$ (saturation). For latent dielectric defects with conductive percolation, $\beta > 1.0$ (thermal runaway acceleration).

### 3.2 168-Hour Forecast & 95% Confidence Interval
$$\text{drift\_slope} = \frac{v_{24h} - v_{0h}}{24.0}$$
$$\hat{v}_{168h} = v_{24h} + \text{drift\_slope} \times (168 - 24) \times \alpha_{\text{accel}}$$
where $\alpha_{\text{accel}} = 1.25$ if $\text{drift\_slope} > \text{safety\_slope}$, and $0.95$ otherwise.

95% Prediction Interval:
$$\text{CI}_{95\%} = \left[\max\left(0, \hat{v}_{168h} - 1.96 \cdot \sigma_{\text{pred}}\right), \; \hat{v}_{168h} + 1.96 \cdot \sigma_{\text{pred}}\right]$$

### 3.3 Dynamic Safety Slope & Early Reject
$$\text{safety\_slope} = \tilde{m}_{\text{lot}} + k_{\text{slope}} \cdot (1.4826 \times \text{MAD}_m)$$
$$k_{\text{slope}} = 4.5 - 2.7 \times \text{sensitivity}$$

**Early Reject Rule**:
$$\text{EARLY\_REJECT} = (\text{drift\_slope} > \text{safety\_slope}) \lor (\hat{v}_{168h} > \text{Limit}_{\text{dynamic}})$$

Triggering early reject at 24 hours saves:
$$\text{Time Saved} = 168\text{h} - 24\text{h} = 144\text{ Chamber Hours per Rejected Die}$$

---

## 4. Zero Data-Leakage Mathematical Proof

At screening checkpoint $t = 24\text{h}$, the information filtration is strictly defined by:
$$\mathcal{F}_{24} = \sigma\left(\{v_{0h}^{(j)}, v_{24h}^{(j)}\}_{j=1}^N\right)$$
Future measurements $\{v_{96h}, v_{168h}\}$ belong to $\mathcal{F}_{96} \setminus \mathcal{F}_{24}$ and $\mathcal{F}_{168} \setminus \mathcal{F}_{24}$.
Our unit test suite (`tests/test_drift_leakage.py`) inspects function signatures and runtime call stacks to guarantee that no future feature is referenced during the 24h evaluation.
