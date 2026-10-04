import numpy as np
import pytest
from backend.app.services.feature_engineering import FeatureEngineer

def test_robust_statistics():
    vals = np.array([10.0, 10.1, 10.2, 9.9, 10.0, 10.1, 45.0]) # 45.0 is an outlier
    stats = FeatureEngineer.compute_lot_robust_stats(vals)
    
    # Median should be impervious to 45.0 outlier
    assert 9.9 <= stats["median"] <= 10.2
    assert stats["mad"] < 1.0
    assert stats["robust_sigma"] < 1.5

def test_feature_extraction_without_leakage():
    lot_stats_0h = {"median": 10.0, "mad": 0.2, "robust_sigma": 0.296, "q1": 9.8, "q3": 10.2, "iqr": 0.4}
    lot_stats_24h = {"median": 10.2, "mad": 0.25, "robust_sigma": 0.370, "q1": 10.0, "q3": 10.4, "iqr": 0.4}
    lot_slope_stats = {"median": 0.0083, "mad": 0.003, "robust_sigma": 0.0044}

    feats = FeatureEngineer.extract_checkpoint_features(
        v_0h=10.1,
        v_24h=11.2,
        lot_stats_0h=lot_stats_0h,
        lot_stats_24h=lot_stats_24h,
        lot_slope_stats=lot_slope_stats
    )

    assert "v_0h" in feats
    assert "v_24h" in feats
    assert "drift_slope" in feats
    assert "slope_robust_z" in feats
    # Ensure no future checkpoint keys exist in features
    assert "v_96h" not in feats
    assert "v_168h" not in feats
