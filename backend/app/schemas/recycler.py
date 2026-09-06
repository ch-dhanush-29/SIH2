from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class RecyclerMatchRequest(BaseModel):
    material_id: int
    weight_kg: float
    collector_city: Optional[str] = "Mumbai"
    collector_latitude: Optional[float] = 19.0760
    collector_longitude: Optional[float] = 72.8777
    requires_pickup: Optional[bool] = True

class RecyclerMatchItem(BaseModel):
    recycler_id: int
    company_name: str
    contact_person: str
    address: str
    city: str
    distance_km: float
    authorization_status: str
    authorization_number: Optional[str]
    trust_score: float # 0 to 100
    offered_rate_per_kg: float
    estimated_total_payout_inr: float
    pickup_available: bool
    response_reliability_pct: float
    ranking_score: float
    is_best_match: bool = False
    
    # Explainable recommendation reasons
    match_reasons: List[str] = []

class RecyclerMatchResponse(BaseModel):
    total_found: int
    best_match: Optional[RecyclerMatchItem] = None
    all_matches: List[RecyclerMatchItem] = []

class QuoteCreate(BaseModel):
    lot_id: int
    offered_price_per_kg: float
    pickup_offered: bool = True
    negotiation_note: Optional[str] = None

class QuoteOut(BaseModel):
    id: int
    lot_id: int
    recycler_id: int
    recycler_company_name: str
    recycler_trust_score: float
    offered_price_per_kg: float
    total_offered_price: float
    pickup_offered: bool
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class BatchClusterOptimizeRequest(BaseModel):
    recycler_id: int
    material_category_code: Optional[str] = "PCB"

class BatchClusterItem(BaseModel):
    lot_id: int
    lot_code: str
    collector_id: int
    material_name: str
    weight_kg: float
    location_city: str
    estimated_payout_inr: float

class BatchClusterOptimizeResponse(BaseModel):
    cluster_id: str
    total_collectors: int
    total_lots: int
    total_weight_kg: float
    recommended_route_km: float
    estimated_transport_saving_inr: float
    lots: List[BatchClusterItem] = []
