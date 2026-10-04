import numpy as np
from typing import Dict, List, Any
from sklearn.ensemble import IsolationForest

class DynamicAnomalyDetector:
    """
    Multi-Layer Dynamic Outlier Detection Engine (Module A)
    Evaluates components against:
      Layer 1: Static Datasheet Limits
      Layer 2: Dynamic Robust Z-Score (Median/MAD) & Tukey IQR
      Layer 3: Lot Peer Distribution
      Layer 4: Multivariate Isolation Forest
      Layer 5: Temporal Rate of Change
    """

    @staticmethod
    def compute_dynamic_limits(values: np.ndarray, static_limit: float, sensitivity: float = 0.85) -> Dict[str, float]:
        """
        Calculates dynamic screening limits based on lot distribution.
        dynamic_limit = min(static_limit, median + k * 1.4826 * MAD)
        """
        clean_vals = values[~np.isnan(values)]
        if len(clean_vals) == 0:
            return {
                "static_limit": static_limit,
                "dynamic_limit": static_limit,
                "median": 0.0,
                "mad": 1e-4,
                "robust_sigma": 1.4826e-4
            }

        median_val = float(np.median(clean_vals))
        mad = float(np.median(np.abs(clean_vals - median_val)))
        if mad < 1e-5:
            mad = 1e-5
        robust_sigma = 1.4826 * mad

        # Sensitivity 0.0 -> k=5.5 (wide), Sensitivity 1.0 -> k=2.5 (tight, ultra-high recall)
        k_sigma = 5.5 - sensitivity * 3.0
        dynamic_limit = float(min(static_limit, median_val + k_sigma * robust_sigma))

        return {
            "static_limit": static_limit,
            "dynamic_limit": round(dynamic_limit, 3),
            "median": round(median_val, 3),
            "mad": round(mad, 4),
            "robust_sigma": round(robust_sigma, 4),
            "k_sigma": round(k_sigma, 2)
        }

    @staticmethod
    def run_isolation_forest(features_matrix: np.ndarray) -> np.ndarray:
        """
        Runs scikit-learn IsolationForest on feature matrix.
        Returns normalized anomaly scores [0, 100].
        """
        n_samples = features_matrix.shape[0]
        if n_samples < 5:
            return np.zeros(n_samples)

        try:
            # High contamination assumption for recall safety
            iso = IsolationForest(
                n_estimators=100,
                contamination=0.08,
                random_state=42,
                n_jobs=-1
            )
            iso.fit(features_matrix)
            raw_scores = -iso.score_samples(features_matrix) # higher means more anomalous
            
            # Min-max scale to 0-100
            s_min, s_max = raw_scores.min(), raw_scores.max()
            if s_max - s_min > 1e-6:
                norm_scores = 100.0 * (raw_scores - s_min) / (s_max - s_min)
            else:
                norm_scores = np.full(n_samples, 20.0)
            return norm_scores
        except Exception:
            return np.zeros(n_samples)

    @staticmethod
    def score_component(
        value: float,
        v_0h: float,
        static_limit: float,
        lot_stats: Dict[str, float],
        iforest_score: float,
        drift_slope: float,
        safety_slope: float,
        sensitivity: float = 0.85
    ) -> Dict[str, Any]:
        """
        Computes multi-method anomaly scores and individual verdicts.
        """
        median = lot_stats["median"]
        robust_sigma = lot_stats["robust_sigma"]
        dynamic_limit = lot_stats["dynamic_limit"]

        # Layer 1: Static limit check
        passes_static = value <= static_limit

        # Layer 2: Robust Z-Score
        robust_z = (value - median) / max(robust_sigma, 1e-5)
        z_threshold = 4.5 - sensitivity * 2.0
        passes_robust_z = robust_z <= z_threshold

        # Layer 2b: IQR score
        iqr_val = max(lot_stats.get("iqr", robust_sigma * 1.349), 1e-5)
        q3 = median + 0.6745 * robust_sigma
        iqr_dist = (value - q3) / iqr_val
        passes_iqr = iqr_dist <= (1.5 - sensitivity * 0.5)

        # Layer 4: Isolation Forest
        passes_iforest = iforest_score < (70.0 - sensitivity * 25.0)

        # Ensemble Score (0-100)
        z_norm = min(100.0, max(0.0, (robust_z / 6.0) * 100.0))
        iqr_norm = min(100.0, max(0.0, (iqr_dist / 3.0) * 100.0))
        drift_norm = min(100.0, max(0.0, (drift_slope / max(safety_slope, 1e-5)) * 50.0))

        ensemble_score = float(
            0.35 * z_norm +
            0.20 * iqr_norm +
            0.25 * iforest_score +
            0.20 * drift_norm
        )
        ensemble_score = round(min(100.0, max(0.0, ensemble_score)), 2)

        # Layer verdicts
        static_verdict = "PASS" if passes_static else "REJECT"
        dynamic_verdict = "PASS" if (value <= dynamic_limit and robust_z <= z_threshold) else "SUSPECT"
        drift_verdict = "PASS" if drift_slope <= safety_slope else "DRIFT_ALERT"

        return {
            "robust_z_score": round(float(robust_z), 2),
            "iqr_score": round(float(iqr_dist), 2),
            "iforest_score": round(float(iforest_score), 2),
            "ensemble_score": ensemble_score,
            "static_verdict": static_verdict,
            "dynamic_verdict": dynamic_verdict,
            "drift_verdict": drift_verdict,
            "passes_static": passes_static,
            "passes_dynamic": (dynamic_verdict == "PASS"),
            "passes_drift": (drift_verdict == "PASS")
        }
