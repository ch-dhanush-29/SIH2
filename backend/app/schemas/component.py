from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime

class MeasurementValue(BaseModel):
    v_0h: float
    v_24h: float
    v_96h: Optional[float] = None
    v_168h: Optional[float] = None
    temperature_c: Optional[float] = 125.0
    voltage_v: Optional[float] = 1.8

class ComponentBase(BaseModel):
    part_id: str
    lot_id: str
    family: Optional[str] = "RH-FPGA-500K"
    wafer_id: Optional[str] = None
    row: Optional[int] = 0
    col: Optional[int] = 0
    tray_x: Optional[float] = 0.0
    tray_y: Optional[float] = 0.0
    tray_z: Optional[float] = 0.0

class ComponentCreate(ComponentBase):
    measurements: Dict[str, MeasurementValue]
    is_ground_truth_defect: Optional[bool] = False
    defect_type: Optional[str] = "NORMAL"

class ComponentResponse(ComponentBase):
    id: int
    status: str
    is_ground_truth_defect: bool
    defect_type: str
    risk_score: float
    created_at: datetime
    measurements: Optional[Dict[str, MeasurementValue]] = None

    model_config = {"from_attributes": True}

class ComponentListResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: List[ComponentResponse]
