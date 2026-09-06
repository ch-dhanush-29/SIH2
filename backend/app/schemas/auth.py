from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    phone: str
    name: str
    role: str
    preferred_language: str

class UserLogin(BaseModel):
    phone: str
    role: Optional[str] = "collector"
    preferred_language: Optional[str] = "hi"
    name: Optional[str] = "Informal Collector"

class UserOut(BaseModel):
    id: int
    phone: str
    name: str
    role: str
    preferred_language: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class CollectorProfileOut(BaseModel):
    id: int
    collector_code: str
    city: str
    state: str
    formalization_score: float
    safety_training_completed: bool
    total_lots_created: int
    total_lots_handed_over: int
    total_earnings: float

    class Config:
        from_attributes = True

class RecyclerProfileOut(BaseModel):
    id: int
    company_name: str
    contact_person: str
    city: str
    state: str
    service_radius_km: float
    pickup_available: bool
    trust_score: float
    authorization_status: str
    authorization_number: Optional[str] = None
    transaction_completion_rate: float
    is_demo_account: bool

    class Config:
        from_attributes = True
