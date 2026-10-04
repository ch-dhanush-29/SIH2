import inspect
import pytest
from backend.app.services.feature_engineering import FeatureEngineer
from backend.app.services.drift_predictor import DriftPredictor

def test_drift_predictor_signature_has_no_future_parameters():
    """
    Verification: Ensure the 24h drift forecasting function accepts ONLY
    0h and 24h measurements and lot baseline statistics.
    Future measurements (96h, 168h) must NOT be function parameters.
    """
    sig = inspect.signature(DriftPredictor.forecast_168h)
    param_names = list(sig.parameters.keys())
    
    assert "v_0h" in param_names
    assert "v_24h" in param_names
    assert "v_96h" not in param_names
    assert "v_168h" not in param_names
    assert "future" not in "".join(param_names).lower()

def test_feature_engineer_signature_has_no_future_parameters():
    sig = inspect.signature(FeatureEngineer.extract_checkpoint_features)
    param_names = list(sig.parameters.keys())
    
    assert "v_0h" in param_names
    assert "v_24h" in param_names
    assert "v_96h" not in param_names
    assert "v_168h" not in param_names
