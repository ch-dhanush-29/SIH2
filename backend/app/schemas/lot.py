from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class LotCreate(BaseModel):
    material_id: int
    collector_weight_kg: float
    condition_grade: Optional[str] = "MIXED_GOOD"
    collection_city: Optional[str] = "Mumbai"
    collection_latitude: Optional[float] = None
    collection_longitude: Optional[float] = None
    ai_predicted_category: Optional[str] = None
    ai_confidence: Optional[float] = None
    ai_estimated_weight_kg: Optional[float] = None
    image_base64: Optional[str] = None
    created_device_id: Optional[str] = "DEVICE_LOCAL_001"
    idempotency_key: Optional[str] = None

class LotPassportOut(BaseModel):
    passport_uid: str
    lot_code: str
    material_name: str
    collector_weight_kg: float
    verified_weight_kg: Optional[float] = None
    collection_city: str
    collection_timestamp: datetime
    qr_code_svg_or_base64: str
    qr_payload_url: str
    cryptographic_hash: str
    status: str
    recycler_name: Optional[str] = None
    final_price_inr: Optional[float] = None
    traceability_badge: str

class LotEventOut(BaseModel):
    event_type: str
    description: str
    actor_type: str
    timestamp: datetime

    class Config:
        from_attributes = True

class LotOut(BaseModel):
    id: int
    lot_code: str
    collector_id: int
    material_id: int
    material_name: Optional[str] = None
    category_name: Optional[str] = None
    collector_weight_kg: float
    ai_estimated_weight_kg: Optional[float] = None
    verified_weight_kg: Optional[float] = None
    condition_grade: str
    status: str
    collection_city: str
    estimated_fair_price_min: Optional[float] = None
    estimated_fair_price_max: Optional[float] = None
    expected_market_price: Optional[float] = None
    fairness_score: Optional[float] = None
    final_agreed_price: Optional[float] = None
    image_url: Optional[str] = None
    is_duplicate_suspect: bool = False
    created_at: datetime
    events: List[LotEventOut] = []

    class Config:
        from_attributes = True

class HandoverInitRequest(BaseModel):
    lot_id: int
    recycler_id: int

class HandoverConfirmRequest(BaseModel):
    lot_id: int
    verified_weight_kg: float
    agreed_rate_per_kg: float
    payment_mode: str = "CASH" # CASH, UPI, BANK_TRANSFER
    payment_reference: Optional[str] = None
    signature_notes: Optional[str] = "Verified on digital scale"
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class HandoverReceiptOut(BaseModel):
    handover_code: str
    lot_code: str
    collector_name: str
    recycler_company_name: str
    material_name: str
    collector_initial_weight_kg: float
    verified_final_weight_kg: float
    weight_variance_kg: float
    agreed_rate_per_kg: float
    total_payout_inr: float
    payment_mode: str
    payment_status: str
    handover_timestamp: datetime
    digital_receipt_sha256: str
    formalization_status: str = "COMPLIANT_EPR_2022"
