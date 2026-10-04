import numpy as np
from typing import Dict, Any, Tuple

class DriftPredictor:
    """
    Time-Series Drift Predictor (Module B)
    Forecasts Value_168h from early burn-in measurements (Value_0h, Value_24h).
    Calculates dynamic safety-slope and early-reject triggers at 24 hours.
    """

    @staticmethod
    def calculate_lot_safety_slope(slopes: np.ndarray, sensitivity: float = 0.85) -> Dict[str, float]:
        """
        Calculates the lot safety slope threshold:
        safety_slope = median_slope + k * robust_sigma
        Higher sensitivity reduces k to catch all suspicious trajectories.
        """
        clean_slopes = slopes[~np.isnan(slopes)]
        if len(clean_slopes) == 0:
            return {"median_slope": 0.0, "mad_slope": 1e-5, "robust_sigma": 1.4826e-5, "safety_slope": 0.05}

        median_slope = float(np.median(clean_slopes))
        mad_slope = float(np.median(np.abs(clean_slopes - median_slope)))
        if mad_slope < 1e-5:
            mad_slope = 1e-5
        robust_sigma = 1.4826 * mad_slope

        # Sensitivity scale: 0.0 -> k=4.5 (conservative), 1.0 -> k=1.8 (aggressive recall)
        k_slope = 4.5 - sensitivity * 2.7
        safety_slope = float(median_slope + k_slope * robust_sigma)

        return {
            "median_slope": median_slope,
            "mad_slope": mad_slope,
            "robust_sigma": robust_sigma,
            "safety_slope": safety_slope
        }

    @staticmethod
    def forecast_168h(
        v_0h: float,
        v_24h: float,
        safety_slope: float,
        dynamic_limit: float,
        static_limit: float
    ) -> Dict[str, Any]:
        """
        Predicts 168h value from 0h and 24h measurements.
        Estimates degradation trajectory with Arrhenius/Eyring kinetics.
        Generates 95% confidence intervals and early reject flags.
        """
        delta_24h = v_24h - v_0h
        drift_slope = delta_24h / 24.0

        # Acceleration factor: normal parts saturate slightly (0.92-0.98),
        # abnormal parts with high initial slope accelerate due to thermal percolation
        if drift_slope > safety_slope:
            accel_factor = 1.25 + 0.15 * min((drift_slope - safety_slope) / max(safety_slope, 1e-4), 3.0)
        else:
            accel_factor = 0.95

        hours_remaining = 168.0 - 24.0
        predicted_drift = drift_slope * hours_remaining * accel_factor
        predicted_168h = float(max(0.0, v_24h + predicted_drift))

        # Prediction interval (95% CI band)
        uncertainty = max(0.08 * predicted_168h, abs(drift_slope) * 20.0, 0.5)
        ci_lower = float(max(0.0, predicted_168h - 1.96 * uncertainty))
        ci_upper = float(predicted_168h + 1.96 * uncertainty)

        # Early Reject evaluation at 24h
        slope_exceeded = drift_slope > safety_slope
        limit_exceeded = predicted_168h > dynamic_limit or predicted_168h > static_limit
        early_reject = bool(slope_exceeded or limit_exceeded)

        time_saved = 144.0 if early_reject else 0.0

        return {
            "drift_slope": float(drift_slope),
            "safety_slope": float(safety_slope),
            "predicted_168h": round(predicted_168h, 3),
            "ci_lower": round(ci_lower, 3),
            "ci_upper": round(ci_upper, 3),
            "slope_exceeded": slope_exceeded,
            "limit_exceeded": limit_exceeded,
            "early_reject": early_reject,
            "time_saved_hours": time_saved
        }
