import uuid
from enum import Enum
from typing import Any, Dict, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class EventType(str, Enum):
    # Core E-Waste Lifecycle Events
    LOT_CREATED = "LOT_CREATED"
    AI_CLASSIFIED = "AI_CLASSIFIED"
    WEIGHT_CAPTURED = "WEIGHT_CAPTURED"
    PRICE_CALCULATED = "PRICE_CALCULATED"
    RECYCLER_MATCHED = "RECYCLER_MATCHED"
    PICKUP_REQUESTED = "PICKUP_REQUESTED"
    QR_GENERATED = "QR_GENERATED"
    QR_SCANNED = "QR_SCANNED"
    HANDOVER_STARTED = "HANDOVER_STARTED"
    HANDOVER_VERIFIED = "HANDOVER_VERIFIED"
    PAYMENT_COMPLETED = "PAYMENT_COMPLETED"
    ANOMALY_DETECTED = "ANOMALY_DETECTED"
    LOT_UPDATED = "LOT_UPDATED"
    SYNC_STARTED = "SYNC_STARTED"
    SYNC_COMPLETED = "SYNC_COMPLETED"
    SYNC_FAILED = "SYNC_FAILED"
    SYSTEM_ALERT = "SYSTEM_ALERT"
    PRICE_TICK = "PRICE_TICK"
    SIMULATION_TICK = "SIMULATION_TICK"

class RealtimeEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: f"EVT-{uuid.uuid4().hex[:8].upper()}")
    event: str
    category: str = "general"
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    data: Dict[str, Any] = Field(default_factory=dict)
    summary: Optional[str] = None
    severity: str = "info"  # info, success, warning, alert
