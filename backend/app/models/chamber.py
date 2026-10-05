from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class Chamber(Base):
    __tablename__ = "chambers"

    id = Column(Integer, primary_key=True, index=True)
    chamber_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g., CH-01
    name = Column(String(100), default="ISRO ESS Thermal Chamber 01-A")
    target_temperature_c = Column(Float, default=125.0)
    current_temperature_c = Column(Float, default=125.0)
    humidity_percent = Column(Float, default=8.0)
    nitrogen_flow_lpm = Column(Float, default=15.0)
    status = Column(String(30), default="OPERATIONAL", index=True)  # OPERATIONAL, MAINTENANCE, OFFLINE
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    sensors = relationship("Sensor", back_populates="chamber", cascade="all, delete-orphan")
    telemetry_events = relationship("TelemetryEvent", back_populates="chamber", cascade="all, delete-orphan")
