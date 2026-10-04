from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class ScreeningRequest(BaseModel):
    lot_id: str
    parameter: str = "iddq"  # iddq, leakage, propDelay
    checkpoint: int = 24     # 0, 24, 96, 168
    sensitivity: float = Field(default=0.85, ge=0.0, le=1.0)
    method: str = "ensemble" # robust_z, iqr, isolation_forest, ensemble

class ShapAttribution(BaseModel):
    feature: str
    impact: float
    direction: str  # positive, negative

class ScreeningResultDetail(BaseModel):
    component_id: int
    part_id: str
    lot_id: str
    parameter: str
    checkpoint: int
    
    static_verdict: str
    dynamic_verdict: str
    drift_verdict: str
    final_verdict: str  # PASS, REVIEW, REJECT
    
    risk_score: float
    robust_z_score: float
    iqr_score: float
    iforest_score: float
    ensemble_score: float
    
    measured_value: float
    predicted_168h: Optional[float] = None
    drift_slope: Optional[float] = None
    safety_slope: Optional[float] = None
    early_reject_flag: bool
    time_saved_hours: float
    
    plain_english_justification: str
    shap_values: List[ShapAttribution] = []
    
    # Ground truth comparison (if available)
    is_ground_truth_defect: bool = False
    defect_type: str = "NORMAL"

class ScreeningRunResponse(BaseModel):
    lot_id: str
    parameter: str
    checkpoint: int
    sensitivity: float
    method: str
    
    total_screened: int
    pass_count: int
    review_count: int
    reject_count: int
    early_reject_count: int
    total_time_saved_hours: float
    
    # Evaluation metrics
    tp: int
    fp: int
    tn: int
    fn: int
    recall: float
    precision: float
    f2_score: float
    mae_168h: float
    cost_score: float
    escaped_defects: int
    
    static_limit: float
    dynamic_limit: float
    lot_median: float
    lot_mad: float
    lot_safety_slope: float
    
    results: List[ScreeningResultDetail]

class DecisionOverrideRequest(BaseModel):
    component_id: int
    final_verdict: str  # PASS, REVIEW, REJECT
    override_reason: str
