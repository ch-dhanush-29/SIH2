from typing import Dict, Any, List, Optional, Literal
from pydantic import BaseModel, Field
from datetime import datetime, timezone

class RealtimeEvent(BaseModel):
    """
    Canonical Event Envelope for all BurnWatch 3D live distributed events.
    Guarantees strict schema versioning, sequencing, and topic routing.
    """
    event_id: str = Field(description="Unique idempotency identifier (UUIDv4)")
    event_type: str = Field(
        description="Event classification (telemetry, anomaly_detected, screening_update, etc.)"
    )
    schema_version: int = Field(default=1, description="Event contract version")
    timestamp: str = Field(description="UTC timestamp of source generation (ISO8601)")
    server_timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="UTC timestamp of server receipt/routing"
    )
    lot_id: Optional[str] = Field(default=None, description="Target flight lot reference")
    component_id: Optional[str] = Field(default=None, description="Target component part_id")
    chamber_id: Optional[str] = Field(default="CH-01", description="Physical oven chamber identifier")
    sequence: int = Field(description="Monotonically increasing sequence number for gap recovery")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Domain-specific payload")

class WsClientMessage(BaseModel):
    action: Literal["subscribe", "unsubscribe", "ping", "auth", "get_status"]
    token: Optional[str] = None
    lot_ids: Optional[List[str]] = Field(default_factory=list)
    chamber_ids: Optional[List[str]] = Field(default_factory=list)
    streams: Optional[List[str]] = Field(default_factory=list)  # telemetry, anomalies, screening, system, camera
    components: Optional[List[str]] = Field(default_factory=list)

class WsServerAck(BaseModel):
    type: Literal["subscription_ack", "auth_ack", "pong", "error", "connection_ack"]
    status: str
    message: Optional[str] = None
    connection_id: Optional[str] = None
    sequence: Optional[int] = None
    subscriptions: Optional[Dict[str, Any]] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TelemetryIngestPayload(BaseModel):
    chamber_id: str = Field(default="CH-01")
    lot_id: str = Field(default="LOT-04")
    component_id: Optional[str] = Field(default=None)
    timestamp: Optional[str] = Field(default=None)
    event_id: Optional[str] = Field(default=None)
    parameters: Dict[str, float] = Field(
        description="Electrical parameters: iddq_ua, leakage_na, prop_delay_ns"
    )
    environment: Optional[Dict[str, float]] = Field(
        default_factory=lambda: {
            "temperature_c": 125.0,
            "humidity_percent": 8.0,
            "nitrogen_flow_lpm": 15.0
        },
        description="Oven environmental conditions"
    )

class TelemetryBatchIngestPayload(BaseModel):
    chamber_id: str = Field(default="CH-01")
    lot_id: str = Field(default="LOT-04")
    items: List[TelemetryIngestPayload]
