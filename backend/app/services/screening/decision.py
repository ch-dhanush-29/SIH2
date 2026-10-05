from typing import Optional, Literal
from backend.app.services.screening.schemas import AnomalyScoreResult, ForecastResult, ConfidenceResult, BaselineStats

class DecisionEngine:
    """
    Authoritative Multi-Criteria Decision Engine for Space Semiconductor Screening.
    Produces unambiguous actions: PASS, REVIEW, EARLY_REJECT, REJECT, INSUFFICIENT_DATA.
    """

    @staticmethod
    def evaluate(
        quality_status: str,
        anomaly_res: AnomalyScoreResult,
        confidence_res: ConfidenceResult,
        baseline: BaselineStats,
        forecast_res: Optional[ForecastResult] = None
    ) -> str:
        # Rule 1: Insufficient peer data or invalid data must not trigger confident rejects
        if not baseline.is_sufficient or quality_status in ("MISSING", "INCOMPLETE_SEQUENCE"):
            return "INSUFFICIENT_DATA"

        if quality_status in ("OUT_OF_RANGE", "CLOCK_SKEW", "STALE", "SENSOR_OFFLINE") or not confidence_res.is_reliable:
            return "REVIEW"

        # Rule 2: Hard static datasheet breach
        if anomaly_res.static_breach:
            return "REJECT"

        # Rule 3: Early Reject at 24h based on log-linear drift trajectory projection
        if forecast_res and forecast_res.decision == "EARLY_REJECT" and confidence_res.confidence >= 0.70:
            return "EARLY_REJECT"

        # Rule 4: High-Risk Anomaly
        if anomaly_res.ensemble_score >= 75.0 or anomaly_res.robust_z >= 4.2:
            return "REJECT"

        # Rule 5: Suspect Anomaly
        if anomaly_res.ensemble_score >= 45.0 or anomaly_res.robust_z >= 3.0:
            return "REVIEW"

        return "PASS"
