from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(Integer, primary_key=True, index=True)
    component_id = Column(Integer, ForeignKey("components.id"), index=True, nullable=False)
    parameter = Column(String(30), index=True, nullable=False)  # iddq, leakage, propDelay
    
    # Checkpoint values in engineering units (µA, nA, ns)
    v_0h = Column(Float, nullable=False)
    v_24h = Column(Float, nullable=False)
    v_96h = Column(Float, nullable=True)
    v_168h = Column(Float, nullable=True)
    
    # Real-time streaming measurement value (if sampled continuously)
    value = Column(Float, nullable=True)
    quality_status = Column(String(30), default="VALID", index=True)  # VALID, OUT_OF_RANGE, CLOCK_SKEW, DUPLICATE

    # Test conditions
    temperature_c = Column(Float, default=125.0)
    voltage_v = Column(Float, default=1.8)
    
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    component = relationship("Component", back_populates="measurements")

    __table_args__ = (
        Index("idx_meas_comp_ts", "component_id", "timestamp"),
        Index("idx_meas_param_ts", "parameter", "timestamp"),
    )
