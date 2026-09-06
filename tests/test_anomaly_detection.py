import pytest
from backend.app.services.anomaly_detector import anomaly_detector

def test_price_anomaly_undervaluation():
    res = anomaly_detector.check_price_anomaly(
        offered_price=1000.0,
        expected_benchmark_price=2000.0,
        threshold_pct=25.0
    )
    assert res is not None
    assert res["anomaly_type"] == "UNDERVALUATION_SUSPECT"
    assert res["severity"] == "HIGH"
    assert res["deviation_percentage"] == -50.0

def test_price_anomaly_normal_range():
    res = anomaly_detector.check_price_anomaly(
        offered_price=1900.0,
        expected_benchmark_price=2000.0,
        threshold_pct=25.0
    )
    assert res is None

def test_weight_discrepancy_anomaly():
    res = anomaly_detector.check_weight_handover_discrepancy(
        collector_weight_kg=20.0,
        verified_weight_kg=14.0, # 30% drop
        tolerance_pct=15.0
    )
    assert res is not None
    assert res["anomaly_type"] == "WEIGHT_MISMATCH"
    assert res["deviation_percentage"] == -30.0

def test_duplicate_image_hamming_distance():
    h1 = "ffff0000ffff0000"
    h2 = "ffff0000ffff0001" # 1 bit difference
    hashes = [{"hash": h1, "lot_code": "EW-2026-MH-000001", "lot_id": 1}]
    
    dup = anomaly_detector.check_duplicate_image(h2, hashes, max_hamming_distance=6)
    assert dup is not None
    assert dup["anomaly_type"] == "DUPLICATE_IMAGE"
    assert dup["hamming_distance"] == 1
