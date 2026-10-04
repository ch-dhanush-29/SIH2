from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class LotBase(BaseModel):
    lot_id: str
    part_family: Optional[str] = "RH-FPGA-500K"
    wafer_id: Optional[str] = None
    fabrication_date: Optional[str] = None
    burn_in_duration_hours: Optional[int] = 168

class LotCreate(LotBase):
    pass

class LotAnalytics(BaseModel):
    lot_id: str
    total_parts: int
    screened_parts: int
    pass_count: int
    review_count: int
    reject_count: int
    yield_rate: float
    early_reject_savings_hours: float
    median_iddq: Optional[float] = None
    mad_iddq: Optional[float] = None
    median_slope: Optional[float] = None
    safety_slope: Optional[float] = None
    escaped_defects: int

class LotResponse(LotBase):
    total_parts: int
    screened_parts: int
    anomaly_count: int
    status: str
    median_iddq: Optional[float] = None
    mad_iddq: Optional[float] = None
    median_slope: Optional[float] = None
    safety_slope: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}
