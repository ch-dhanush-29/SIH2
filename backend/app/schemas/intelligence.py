from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class AnomalyEventOut(BaseModel):
    id: int
    anomaly_code: str
    anomaly_type: str
    severity: str
    lot_id: Optional[int]
    expected_benchmark_value: Optional[float]
    observed_value: Optional[float]
    deviation_percentage: Optional[float]
    explanation: str
    is_resolved: bool
    detected_at: datetime

    class Config:
        from_attributes = True

class DisputeCreate(BaseModel):
    lot_id: int
    dispute_type: str # WEIGHT_DISCREPANCY, PAYMENT_PENDING, RATE_REDUCTION, CLASSIFICATION_REJECTED
    collector_claim: str
    evidence_image_urls: Optional[str] = None

class DisputeOut(BaseModel):
    id: int
    dispute_code: str
    lot_id: int
    opened_by_user_id: int
    dispute_type: str
    collector_claim: str
    recycler_response: Optional[str] = None
    status: str
    admin_decision: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class FieldResearchCreate(BaseModel):
    researcher_name: str
    informal_collector_pseudonym: str
    location_hub: str # Dharavi Mumbai, Seelampur Delhi, Mustafabad, etc.
    observed_material: str
    observed_daily_volume_kg: float
    current_informal_rate_inr: float
    reported_middleman_cut_pct: float = 30.0
    reported_health_hazards: Optional[str] = None
    barriers_to_formal_recycling: Optional[str] = None

class FieldResearchOut(BaseModel):
    id: int
    researcher_name: str
    informal_collector_pseudonym: str
    location_hub: str
    observed_material: str
    observed_daily_volume_kg: float
    current_informal_rate_inr: float
    reported_middleman_cut_pct: float
    reported_health_hazards: Optional[str]
    barriers_to_formal_recycling: Optional[str]
    recorded_at: datetime

    class Config:
        from_attributes = True

class UnitEconomicsInput(BaseModel):
    daily_collection_kg: float = 25.0
    informal_middleman_rate_per_kg: float = 85.0
    formal_recycler_rate_per_kg: float = 120.0
    collector_transport_cost_informal: float = 150.0
    collector_transport_cost_formal: float = 0.0 # Free pickup by recycler
    informal_loss_sorting_pct: float = 12.0
    formal_loss_pct: float = 0.0

class UnitEconomicsResult(BaseModel):
    daily_informal_gross_inr: float
    daily_informal_net_earnings_inr: float
    daily_formal_gross_inr: float
    daily_formal_net_earnings_inr: float
    net_daily_gain_inr: float
    net_monthly_gain_inr: float
    percentage_income_increase: float
    status_label: str
    breakdown_notes: List[str] = []

class EnvironmentalImpactDashboardOut(BaseModel):
    total_ewaste_diverted_kg: float
    toxic_lead_avoided_kg: float
    mercury_avoided_grams: float
    estimated_co2_avoided_kg: float
    copper_recovered_kg: float
    gold_recovered_grams: float
    silver_recovered_grams: float
    neodymium_recovered_grams: float
    formalization_rate_pct: float
    calculation_assumptions: List[str] = []
