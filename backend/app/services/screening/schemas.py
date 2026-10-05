from typing import Dict, Any, List, Optional, Literal
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import uuid

class BaselineStats(BaseModel):
    parameter: str
    median: float
    mad: float
    mean: float
    std: float
    q1: float
    q3: float
    iqr: float
    robust_sigma: float
    dynamic_upper_limit: float
    static_limit: float
    safety_slope: float
    sample_count: int
    is_sufficient: bool = True

class AnomalyScoreResult(BaseModel):
    static_breach: bool
    robust_z: float
    iqr_score: float
    iforest_score: float
    ensemble_score: float  # 0.0 - 100.0
    risk_level: Literal["NORMAL", "SUSPECT", "HIGH_RISK"]
    signals: List[str]

class ForecastResult(BaseModel):
    model_type: str = "BASELINE_FORECAST"
    target_hour: int = 168
    v_0h: float
    v_24h: float
    predicted_value: float
    lower_bound: float
    upper_bound: float
    predicted_slope: float
    safety_slope: float
    slope_ratio: float
    breaches_168h: bool
    time_saved_hours: float
    decision: str

class ConfidenceResult(BaseModel):
    confidence: float  # 0.0 - 1.0
    is_reliable: bool
    uncertainty_factors: List[str]

class ScreeningEvaluationResult(BaseModel):
    inference_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    component_id: str
    lot_id: str
    parameter: str
    measured_value: float
    quality_status: str
    anomaly_score: float
    risk_level: str
    decision: Literal["PASS", "REVIEW", "EARLY_REJECT", "REJECT", "INSUFFICIENT_DATA"]
    confidence: float
    reasons: List[str]
    forecast: Optional[ForecastResult] = None
    baseline: BaselineStats
    model_version: str = "burnwatch-anomaly-v3.2.1"
    feature_version: str = "features-v1.5"
    threshold_version: str = "thresholds-v2026.10"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @property
    def final_verdict(self) -> str:
        return self.decision

    @property
    def plain_english_justification(self) -> str:
        return "; ".join(self.reasons) if self.reasons else "Component parameters nominal."
