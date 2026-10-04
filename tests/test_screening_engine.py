import pytest
import numpy as np
from backend.app.services.drift_predictor import DriftPredictor
from backend.app.services.anomaly_detector import DynamicAnomalyDetector
from backend.app.services.risk_engine import ScreeningRiskEngine

def test_star_demo_component_detection():
    """
    Test Case: Star Demo Component 'CHIP-LOT04-042'
    - Value_0h: 10.2 µA
    - Value_24h: 11.1 µA
    - Static Limit: 50.0 µA
    - Lot Typical 24h: Median 10.2 µA, robust_sigma: 0.35 µA
    - Lot Drift Slopes: Median 0.008 µA/h, Safety Slope: 0.022 µA/h

    Verification:
    1. Passes static limit (11.1 <= 50.0) -> True
    2. Drift slope is (11.1 - 10.2) / 24 = 0.0375 µA/h
    3. Exceeds safety slope (0.0375 > 0.022) -> True
    4. Triggers Early Reject at 24h -> True
    5. Saves 144 hours -> True
    6. Screening verdict is REJECT
    """
    v_0h = 10.2
    v_24h = 11.1
    static_limit = 50.0
    safety_slope = 0.022
    dynamic_limit = 11.5

    # Run drift predictor
    forecast = DriftPredictor.forecast_168h(
        v_0h=v_0h,
        v_24h=v_24h,
        safety_slope=safety_slope,
        dynamic_limit=dynamic_limit,
        static_limit=static_limit
    )

    assert forecast["drift_slope"] > safety_slope
    assert forecast["early_reject"] is True
    assert forecast["time_saved_hours"] == 144.0

    # Run anomaly detector
    lot_stats = {
        "median": 10.2,
        "mad": 0.25,
        "robust_sigma": 0.37,
        "dynamic_limit": dynamic_limit
    }

    anomaly = DynamicAnomalyDetector.score_component(
        value=v_24h,
        v_0h=v_0h,
        static_limit=static_limit,
        lot_stats=lot_stats,
        iforest_score=65.0,
        drift_slope=forecast["drift_slope"],
        safety_slope=safety_slope,
        sensitivity=0.85
    )

    assert anomaly["passes_static"] is True # Passes static test!

    # Evaluate unified risk
    risk = ScreeningRiskEngine.evaluate(
        passes_static=anomaly["passes_static"],
        passes_dynamic=anomaly["passes_dynamic"],
        passes_drift=anomaly["passes_drift"],
        early_reject=forecast["early_reject"],
        ensemble_score=anomaly["ensemble_score"],
        robust_z=anomaly["robust_z_score"],
        predicted_168h=forecast["predicted_168h"],
        dynamic_limit=dynamic_limit,
        static_limit=static_limit
    )

    # Caught by BurnWatch AI!
    assert risk["final_verdict"] == "REJECT"
    assert "safety" in risk["decision_reason"].lower() or "drift" in risk["decision_reason"].lower()
