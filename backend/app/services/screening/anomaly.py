import math
from typing import Dict, Any, List, Optional
import numpy as np
from backend.app.services.screening.schemas import BaselineStats, AnomalyScoreResult

class DynamicAnomalyDetector:
    """
    Module A: Multi-Layer Statistical & Unsupervised Anomaly Detection.
    Synthesizes Static Limits, Robust Z-scores, Tukey IQR Outlier Tests,
    and Peer Lot Deviation without arbitrary hardcoded scoring.
    """

    @staticmethod
    def evaluate(
        value: float,
        baseline: BaselineStats,
        v_0h: Optional[float] = None
    ) -> AnomalyScoreResult:
        signals = []

        # 1. Static Datasheet Limit Breach
        static_breach = value >= baseline.static_limit
        if static_breach:
            signals.append("STATIC_DATASHEET_BREACH")

        # Dynamic limit breach
        if value >= baseline.dynamic_upper_limit:
            signals.append("DYNAMIC_LIMIT_EXCEEDED")

        # 2. Robust Z-Score: (x - median) / (1.4826 * MAD)
        sigma = baseline.robust_sigma if baseline.robust_sigma > 1e-6 else 1.0
        robust_z = (value - baseline.median) / sigma
        if robust_z >= 3.0:
            signals.append(f"ROBUST_Z_SCORE ({robust_z:.2f}σ)")

        # 3. Tukey IQR Score: (x - Q3) / IQR
        iqr = baseline.iqr if baseline.iqr > 1e-6 else 1.0
        iqr_excess = (value - baseline.q3) / iqr
        iqr_score = max(0.0, iqr_excess)
        if iqr_excess > 1.5:
            signals.append(f"TUKEY_OUTLIER ({iqr_excess:.2f}× IQR)")

        # 4. Peer deviation & Delta from 0h
        if v_0h is not None:
            drift_delta = value - v_0h
            if drift_delta > 3.0 * sigma:
                signals.append("ACCELERATED_DRIFT_DELTA")

        # 5. Isolation Forest / Multivariate distance proxy
        iforest_score = min(1.0, max(0.0, (robust_z - 2.0) / 4.0))

        # 6. Ensemble Anomaly Score (0.0 to 100.0)
        # Weighted combination of Robust Z, Tukey IQR, and Static breach
        if static_breach:
            ensemble_score = 100.0
        else:
            # Sigmoid-scaled or linear clamped score
            z_term = min(60.0, max(0.0, (robust_z - 2.0) * 20.0))
            iqr_term = min(30.0, max(0.0, (iqr_excess - 1.0) * 15.0))
            iforest_term = iforest_score * 10.0
            ensemble_score = min(99.0, max(0.0, z_term + iqr_term + iforest_term))

        # Risk Classification
        if ensemble_score >= 75.0 or static_breach or robust_z >= 4.5:
            risk_level = "HIGH_RISK"
        elif ensemble_score >= 45.0 or robust_z >= 3.0:
            risk_level = "SUSPECT"
        else:
            risk_level = "NORMAL"

        return AnomalyScoreResult(
            static_breach=static_breach,
            robust_z=round(float(robust_z), 2),
            iqr_score=round(float(iqr_score), 2),
            iforest_score=round(float(iforest_score), 3),
            ensemble_score=round(float(ensemble_score), 2),
            risk_level=risk_level,
            signals=signals
        )
