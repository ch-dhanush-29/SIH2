from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class PriceObservationCreate(BaseModel):
    material_id: int
    location_city: str = "Mumbai"
    location_state: str = "Maharashtra"
    buying_price_per_unit: float
    selling_price_per_unit: Optional[float] = None
    unit: str = "kg"
    source_type: str = "RECYCLER_QUOTE"
    recycler_id: Optional[int] = None
    notes: Optional[str] = None

class PriceObservationOut(BaseModel):
    id: int
    material_id: int
    location_city: str
    location_state: str
    buying_price_per_unit: float
    selling_price_per_unit: Optional[float] = None
    unit: str
    source_type: str
    confidence_score: float
    observation_date: datetime
    is_demo_data: bool

    class Config:
        from_attributes = True

class FairPriceRequest(BaseModel):
    material_id: int
    weight_kg: float
    condition_grade: Optional[str] = "MIXED_GOOD" # INTACT, DISMANTLED, DAMAGED, HIGH_GRADE, CONTAMINATED
    city: Optional[str] = "Mumbai"
    recycler_offer_inr: Optional[float] = None

class FairPriceResult(BaseModel):
    material_id: int
    material_name: str
    weight_kg: float
    condition_multiplier: float
    estimated_fair_min_inr: float
    estimated_fair_max_inr: float
    expected_market_price_inr: float
    base_rate_per_kg: float
    local_range_per_kg: str
    data_source_badge: str
    
    # Recycler Offer comparison
    recycler_offer_inr: Optional[float] = None
    fairness_score: Optional[float] = None # 0 to 100
    potential_undervaluation_inr: Optional[float] = None
    deviation_percentage: Optional[float] = None
    negotiation_script_en: Optional[str] = None
    negotiation_script_hi: Optional[str] = None
    negotiation_script_mr: Optional[str] = None
    explanation: str

class PriceTrendPoint(BaseModel):
    date: str
    avg_price: float
    min_price: float
    max_price: float

class MaterialPriceBoardItem(BaseModel):
    material_id: int
    material_code: str
    material_name: str
    category_name: str
    icon_emoji: str
    today_avg_price: float
    unit: str
    change_7d_pct: float
    change_30d_pct: float
    local_range_min: float
    local_range_max: float
    data_source_badge: str
    historical_trend: List[PriceTrendPoint] = []
