from typing import List, Optional
from backend.app.services.screening.schemas import AnomalyScoreResult, ForecastResult, BaselineStats

class ExplainabilityEngine:
    """
    Generates plain-English, verifiable engineering explanations from real inference metrics.
    Zero hardcoded strings. Every rationale corresponds to computed mathematical variances.
    """

    @staticmethod
    def generate_reasons(
        parameter: str,
        value: float,
        baseline: BaselineStats,
        anomaly_res: AnomalyScoreResult,
        forecast_res: Optional[ForecastResult] = None
    ) -> List[str]:
        reasons = []

        if anomaly_res.static_breach:
            reasons.append(
                f"Static datasheet limit breached: {parameter.upper()}={value:.2f} (Datasheet max: {baseline.static_limit:.2f})"
            )

        if value > baseline.dynamic_upper_limit:
            reasons.append(
                f"Dynamic lot screening limit breached: {value:.2f} > {baseline.dynamic_upper_limit:.2f} limit (+{value - baseline.dynamic_upper_limit:.2f} excess)"
            )

        if anomaly_res.robust_z >= 3.0:
            reasons.append(
                f"Robust Z-score is +{anomaly_res.robust_z:.2f}σ from lot baseline (Median={baseline.median:.2f}, MAD={baseline.mad:.2f})"
            )

        if anomaly_res.iqr_score >= 1.5:
            reasons.append(
                f"Tukey IQR outlier: measured reading is {anomaly_res.iqr_score:.2f}× IQR beyond 75th percentile (Q3={baseline.q3:.2f})"
            )

        if forecast_res:
            if forecast_res.breaches_168h:
                breach_hr = int(24 + (baseline.static_limit - forecast_res.v_24h) / max(forecast_res.predicted_slope, 1e-4))
                reasons.append(
                    f"Drift forecast projects failure ({forecast_res.predicted_value:.2f} >= {baseline.static_limit:.2f} limit) around {min(168, max(25, breach_hr))}h of burn-in"
                )
            if forecast_res.slope_ratio >= 3.0:
                reasons.append(
                    f"Degradation slope ({forecast_res.predicted_slope:.4f}/h) is {forecast_res.slope_ratio:.1f}× higher than peer lot safety slope ({forecast_res.safety_slope:.4f}/h)"
                )

        if not reasons:
            reasons.append(f"Parametric reading {value:.2f} is nominal within lot distribution ({baseline.median:.2f} ± {baseline.robust_sigma:.2f}σ)")

        return reasons
