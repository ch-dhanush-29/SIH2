from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class Sensor(Base):
    __tablename__ = "sensors"

    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g., SENS-TEMP-01
    chamber_id = Column(String(50), ForeignKey("chambers.chamber_id"), index=True, nullable=False)
    sensor_type = Column(String(40), index=True, nullable=False)  # TEMPERATURE, HUMIDITY, NITROGEN_FLOW, CURRENT_MONITOR
    unit = Column(String(20), default="°C")
    status = Column(String(20), default="ONLINE", index=True)  # ONLINE, STALE, OFFLINE, CALIBRATION_REQUIRED
    last_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    calibration_date = Column(DateTime, nullable=True)
    calibration_offset = Column(Float, default=0.0)
    firmware_version = Column(String(30), default="v2.4.1")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    chamber = relationship("Chamber", back_populates="sensors")
