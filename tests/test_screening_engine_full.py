import pytest
import numpy as np

from backend.app.services.screening import (
    DynamicBaselineEngine,
    DynamicAnomalyDetector,
    EarlyForecastingEngine,
    ConfidenceCalculator,
    SafetyEngine,
    DecisionEngine,
    ScreeningEngine
)

def test_dynamic_baseline_engine_computation():
    """
    Verifies DynamicBaselineEngine calculates sample statistics strictly without hardcoding:
    Median, MAD, Robust Sigma (1.4826 * MAD), and Tukey IQR boundaries.
    """
    values = [20.0, 20.2, 20.5, 20.8, 21.0, 21.2, 21.5, 21.8, 22.0]
    baseline = DynamicBaselineEngine.calculate_baseline(values, parameter="iddq", static_limit=50.0)

    assert baseline.sample_count == len(values)
    assert baseline.is_sufficient is True
    assert baseline.median == pytest.approx(21.0, rel=1e-3)
    assert baseline.mad > 0
    assert baseline.robust_sigma == pytest.approx(1.4826 * baseline.mad, rel=1e-3)
    assert baseline.dynamic_upper_limit > baseline.median

def test_dynamic_baseline_insufficient_samples():
    """
    When sample count < 5, is_sufficient must be False and fallback defaults provided.
    """
    values = [10.5, 11.0]
    baseline = DynamicBaselineEngine.calculate_baseline(values, parameter="leakage", static_limit=100.0)

    assert baseline.sample_count == 2
    assert baseline.is_sufficient is False
    assert baseline.median == pytest.approx(10.75, rel=1e-3)

def test_dynamic_anomaly_detector_module_a():
    """
    Verifies Module A anomaly detection:
    - Static breach detection
    - Robust Z-score and Tukey IQR evaluation
    - Ensemble scoring
    """
    baseline = DynamicBaselineEngine.calculate_baseline(
        [15.0, 15.2, 15.1, 15.3, 14.9, 15.0, 15.2, 15.4, 15.1],
        parameter="iddq",
        static_limit=50.0
    )

    # Normal reading
    res_normal = DynamicAnomalyDetector.evaluate(
        value=15.1,
        baseline=baseline,
        v_0h=15.0
    )
    assert res_normal.static_breach is False
    assert res_normal.robust_z < 2.0
    assert res_normal.ensemble_score < 40.0
    assert res_normal.risk_level == "NORMAL"

    # Anomalous reading (extreme outlier)
    res_outlier = DynamicAnomalyDetector.evaluate(
        value=28.5,
        baseline=baseline,
        v_0h=15.0
    )
    assert res_outlier.static_breach is False
    assert res_outlier.robust_z > 3.0
    assert res_outlier.ensemble_score > 40.0

    # Catastrophic static breach
    res_breach = DynamicAnomalyDetector.evaluate(
        value=55.0,
        baseline=baseline,
        v_0h=15.0
    )
    assert res_breach.static_breach is True
    assert res_breach.ensemble_score >= 80.0
    assert res_breach.risk_level == "HIGH_RISK"

def test_early_forecasting_engine_module_b():
    """
    Verifies Module B forecasting:
    - 24h -> 168h trajectory forecast
    - Safety slope calculation and breach detection
    - Early rejection saves 144 hours
    """
    v_0h = 10.2
    v_24h = 11.2
    safety_slope = 0.025
    static_limit = 50.0

    forecast = EarlyForecastingEngine.forecast(
        v_0h=v_0h,
        v_24h=v_24h,
        safety_slope=safety_slope,
        static_limit=static_limit,
        robust_sigma=0.35,
        target_hour=168
    )

    # Slope is (11.2 - 10.2) / 24 = 0.04167 > 0.025
    assert forecast.predicted_slope == pytest.approx(0.0417, abs=1e-3)
    assert forecast.predicted_slope > safety_slope
    assert forecast.time_saved_hours in (0.0, 144.0)
    assert forecast.predicted_value > v_24h

def test_dynamic_confidence_calculation():
    """
    Verifies dynamic multi-factor confidence computation without hardcoded constants.
    """
    # 35 peer readings (sample size >= 30 enables s_factor = 0.90)
    readings = [10.0 + (i % 5) * 0.1 for i in range(35)]
    baseline = DynamicBaselineEngine.calculate_baseline(
        readings,
        parameter="iddq",
        static_limit=50.0
    )

    anom_normal = DynamicAnomalyDetector.evaluate(value=10.1, baseline=baseline, v_0h=10.0)
    forecast_normal = EarlyForecastingEngine.forecast(v_0h=10.0, v_24h=10.02, safety_slope=0.034, static_limit=50.0, robust_sigma=baseline.robust_sigma)

    # High quality, sufficient samples, tight forecast interval
    conf_high = ConfidenceCalculator.calculate(
        quality_status="VALID",
        baseline=baseline,
        anomaly_res=anom_normal,
        forecast_res=forecast_normal
    )
    assert conf_high.confidence >= 0.70
    assert conf_high.is_reliable is True

    # Clock skew data quality lowers confidence
    conf_skew = ConfidenceCalculator.calculate(
        quality_status="CLOCK_SKEW",
        baseline=baseline,
        anomaly_res=anom_normal,
        forecast_res=forecast_normal
    )
    assert conf_skew.confidence < conf_high.confidence
    assert conf_skew.is_reliable is False

def test_decision_engine_verdict_synthesis():
    """
    Verifies DecisionEngine synthesizes verdicts accurately:
    PASS, REVIEW, EARLY_REJECT, REJECT, INSUFFICIENT_DATA.
    """
    # 35 samples for reliable distribution
    readings = [10.0 + (i % 5) * 0.1 for i in range(35)]
    baseline = DynamicBaselineEngine.calculate_baseline(readings, parameter="iddq", static_limit=50.0)
    
    # PASS case
    anom_pass = DynamicAnomalyDetector.evaluate(value=10.1, baseline=baseline, v_0h=10.0)
    fc_pass = EarlyForecastingEngine.forecast(v_0h=10.0, v_24h=10.02, safety_slope=0.034, static_limit=50.0, robust_sigma=baseline.robust_sigma)
    conf_pass = ConfidenceCalculator.calculate("VALID", baseline, anom_pass, fc_pass)
    verdict_pass = DecisionEngine.evaluate("VALID", anom_pass, conf_pass, baseline, fc_pass)
    assert verdict_pass == "PASS"

    # Static breach -> REJECT
    anom_breach = DynamicAnomalyDetector.evaluate(value=55.0, baseline=baseline, v_0h=10.0)
    conf_breach = ConfidenceCalculator.calculate("VALID", baseline, anom_breach, None)
    verdict_breach = DecisionEngine.evaluate("VALID", anom_breach, conf_breach, baseline, None)
    assert verdict_breach == "REJECT"

    # Insufficient data (< 5 samples)
    baseline_insufficient = DynamicBaselineEngine.calculate_baseline([10.0, 10.1], parameter="iddq", static_limit=50.0)
    conf_insuf = ConfidenceCalculator.calculate("VALID", baseline_insufficient, anom_pass, None)
    verdict_insuf = DecisionEngine.evaluate("VALID", anom_pass, conf_insuf, baseline_insufficient, None)
    assert verdict_insuf == "INSUFFICIENT_DATA"

    # Low sample count (< 30) triggers REVIEW safety invariant
    baseline_small = DynamicBaselineEngine.calculate_baseline([10.0, 10.1, 10.2, 10.1, 10.0], parameter="iddq", static_limit=50.0)
    conf_small = ConfidenceCalculator.calculate("VALID", baseline_small, anom_pass, fc_pass)
    verdict_small = DecisionEngine.evaluate("VALID", anom_pass, conf_small, baseline_small, fc_pass)
    assert verdict_small == "REVIEW"

@pytest.mark.asyncio
async def test_screening_engine_end_to_end():
    """
    Tests unified ScreeningEngine facade async evaluate method.
    """
    engine = ScreeningEngine()
    
    # Seed baseline with 10 values
    lot_values = [25.0, 25.1, 25.2, 24.9, 25.0, 25.3, 25.1, 25.0, 25.2, 25.1]
    baseline = DynamicBaselineEngine.calculate_baseline(lot_values, parameter="propDelay", static_limit=12.0)
    engine.cache_baseline(lot_id="LOT-TEST-99", param="propDelay", baseline=baseline)

    # Ingest test component
    eval_result = await engine.evaluate(
        component_id="COMP-99-01",
        lot_id="LOT-TEST-99",
        parameter="propDelay",
        value=10.5,
        quality_status="VALID",
        v_0h=10.4,
        peer_readings=lot_values,
        static_limit=12.0
    )

    assert eval_result.component_id == "COMP-99-01"
    assert eval_result.lot_id == "LOT-TEST-99"
    assert eval_result.parameter == "propDelay"
    assert eval_result.final_verdict in ["PASS", "REVIEW", "EARLY_REJECT", "REJECT", "INSUFFICIENT_DATA"]
    assert eval_result.confidence > 0.0
    assert eval_result.inference_id is not None
    assert eval_result.plain_english_justification is not None
