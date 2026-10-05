import math
from typing import Dict, Any, Optional
from backend.app.services.screening.schemas import ForecastResult

class EarlyForecastingEngine:
    """
    Module B: 24h Early Screening Degradation Forecaster.
    Uses physics-based Arrhenius log-linear degradation trajectory:
    V(t) = V_24h + slope * (t - 24).
    Clearly labeled as BASELINE_FORECAST with architectural interface
    ready for future deep neural network or Gaussian Process models.
    """

    @staticmethod
    def forecast(
        v_0h: float,
        v_24h: float,
        safety_slope: float = 0.034,
        static_limit: float = 50.0,
        robust_sigma: float = 1.0,
        target_hour: int = 168
    ) -> ForecastResult:
        delta_hours = 24.0
        predicted_slope = max(0.0, (v_24h - v_0h) / delta_hours)
        remaining_hours = float(target_hour - 24)

        # Projected value at 168h
        predicted_value = v_24h + predicted_slope * remaining_hours

        # Uncertainty interval bounds (widening with projection horizon)
        uncertainty_margin = (remaining_hours / delta_hours) * (0.8 * robust_sigma)
        lower_bound = max(0.0, predicted_value - uncertainty_margin)
        upper_bound = predicted_value + uncertainty_margin

        # Slope ratio relative to lot safety slope
        safe_m = safety_slope if safety_slope > 1e-6 else 0.034
        slope_ratio = predicted_slope / safe_m

        # Early Reject Decision evaluation
        breaches_168h = predicted_value >= static_limit
        early_reject = breaches_168h or (slope_ratio >= 3.5 and predicted_slope > 0.10)
        time_saved_hours = 144.0 if early_reject else 0.0
        decision = "EARLY_REJECT" if early_reject else "NOMINAL_DRIFT"

        return ForecastResult(
            model_type="BASELINE_FORECAST",
            target_hour=target_hour,
            v_0h=round(float(v_0h), 3),
            v_24h=round(float(v_24h), 3),
            predicted_value=round(float(predicted_value), 3),
            lower_bound=round(float(lower_bound), 3),
            upper_bound=round(float(upper_bound), 3),
            predicted_slope=round(float(predicted_slope), 4),
            safety_slope=round(float(safe_m), 4),
            slope_ratio=round(float(slope_ratio), 2),
            breaches_168h=breaches_168h,
            time_saved_hours=time_saved_hours,
            decision=decision
        )
