from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class TelemetryEvent(Base):
    __tablename__ = "telemetry_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    event_id = Column(String(64), unique=True, index=True, nullable=False)  # UUID or device_id+seq
    sequence = Column(Integer, index=True, nullable=False)
    chamber_id = Column(String(50), ForeignKey("chambers.chamber_id"), index=True, nullable=False)
    lot_id = Column(String(50), index=True, nullable=True)
    component_id = Column(String(60), index=True, nullable=True)
    event_type = Column(String(40), default="telemetry", index=True)  # telemetry, telemetry.batch, chamber_update
    parameters_json = Column(Text, nullable=False)  # JSON {iddq_ua: float, leakage_na: float, prop_delay_ns: float}
    environment_json = Column(Text, nullable=True)  # JSON {temperature_c: float, humidity_percent: float, ...}
    quality_status = Column(String(30), default="VALID", index=True)  # VALID, OUT_OF_RANGE, CLOCK_SKEW, DUPLICATE
    timestamp = Column(DateTime, index=True, nullable=False)  # Event generation time (UTC)
    server_timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    chamber = relationship("Chamber", back_populates="telemetry_events")

    __table_args__ = (
        Index("idx_telem_lot_ts", "lot_id", "timestamp"),
        Index("idx_telem_comp_ts", "component_id", "timestamp"),
        Index("idx_telem_chamber_ts", "chamber_id", "timestamp"),
    )


class AnomalyEvent(Base):
    __tablename__ = "anomaly_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    event_id = Column(String(64), unique=True, index=True, nullable=False)
    sequence = Column(Integer, index=True, nullable=False)
    lot_id = Column(String(50), index=True, nullable=False)
    component_id = Column(String(60), index=True, nullable=False)
    chamber_id = Column(String(50), default="CH-01", index=True)
    parameter = Column(String(30), index=True, nullable=False)  # iddq, leakage, propDelay
    anomaly_score = Column(Float, nullable=False)  # 0.0 - 1.0 or 0 - 100
    confidence = Column(Float, default=0.95)
    decision = Column(String(30), default="SUSPECT", index=True)  # SUSPECT, EARLY_REJECT, REJECT, PASS
    reason_codes_json = Column(Text, nullable=True)  # e.g., ["MAD_THRESHOLD_EXCEEDED", "ACCELERATED_DRIFT_SLOPE"]
    is_resolved = Column(Boolean, default=False, index=True)
    timestamp = Column(DateTime, index=True, nullable=False)
    server_timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    __table_args__ = (
        Index("idx_anom_lot_comp", "lot_id", "component_id"),
        Index("idx_anom_ts", "timestamp"),
        Index("idx_anom_decision", "decision"),
    )
