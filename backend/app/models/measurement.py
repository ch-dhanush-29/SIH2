from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
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
    
    # Test conditions
    temperature_c = Column(Float, default=125.0)
    voltage_v = Column(Float, default=1.8)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    component = relationship("Component", back_populates="measurements")
