from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class Lot(Base):
    __tablename__ = "lots"

    lot_id = Column(String(50), primary_key=True, index=True)
    part_family = Column(String(50), default="RH-FPGA-500K")
    wafer_id = Column(String(50), nullable=True)
    fabrication_date = Column(String(20), nullable=True)
    total_parts = Column(Integer, default=0)
    screened_parts = Column(Integer, default=0)
    anomaly_count = Column(Integer, default=0)
    status = Column(String(20), default="SCREENING")  # SCREENING, COMPLETED, HELD
    burn_in_duration_hours = Column(Integer, default=168)
    
    # Statistical baseline
    median_iddq = Column(Float, nullable=True)
    mad_iddq = Column(Float, nullable=True)
    median_slope = Column(Float, nullable=True)
    safety_slope = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    components = relationship("Component", back_populates="lot", cascade="all, delete-orphan")
