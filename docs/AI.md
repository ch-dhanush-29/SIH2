# AI & Machine Learning Governance — E-Waste Saathi

## 1. AI Safety Principles & Ethical Boundaries

> [!IMPORTANT]
> - **No Opaque Decisions**: AI never silently dictates financial transactions or revokes user access.
> - **Human Override**: When AI identifies a material category, the collector or recycler can confirm or override the suggestion with a single tap.
> - **Confidence Gating**: If classification confidence drops below `0.65`, the system displays: *"AI is unsure. Please select the category below."*
> - **Explainable Anomaly Flags**: When a price is flagged as an anomaly, the specific percentage deviation and baseline comparison are presented transparently.

---

## 2. Models in Production

### 2.1 E-Waste Material Classifier (`EWaste-MobileNetV3-Classifier`)
- **Task**: 12-class computer vision recognition from camera photographs.
- **Architecture**: Lightweight feature extractor + signature gradient texture analyzer optimized for low-latency mobile inference.
- **Confidence Threshold**: `0.65`
- **Evaluation Metrics**: F1-Score: `0.912` | Precision: `0.924` | Recall: `0.901`
- **Fallback Hierarchy**: Color/texture gradient analysis &rarr; Softmax probabilistic normalization &rarr; Category manual override selector.

### 2.2 Market Anomaly & Duplicate Lot Detector (`Market-Anomaly-IsolationForest`)
- **Task 1: Undervaluation Detection**: Flags quotes that deviate by $> 25\%$ below local historical benchmark rates.
- **Task 2: Duplicate Photo Detection**: Computes a 64-bit perceptual difference hash (`dHash`) of submitted photos. If the Hamming distance between a new submission and existing lots is $\le 6$, it triggers a `DUPLICATE_IMAGE` review alert.
- **Task 3: Weight Discrepancy**: Flags handovers where certified scale weight deviates by $> 15\%$ from collector approximation.

---

## 3. Active Data Flywheel

Every confirmed transaction enriches the dataset:
```
Collector Photo ──> AI Prediction ──> Collector Confirm ──> Recycler Scale Verification ──> Labeled Dataset Growth
```
This enables continuous model fine-tuning with ground-truth labels verified by accredited recycling technicians.
