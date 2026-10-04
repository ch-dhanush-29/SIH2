from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class Component(Base):
    __tablename__ = "components"

    id = Column(Integer, primary_key=True, index=True)
    part_id = Column(String(60), unique=True, index=True, nullable=False)
    lot_id = Column(String(50), ForeignKey("lots.lot_id"), index=True, nullable=False)
    family = Column(String(50), default="RH-FPGA-500K")
    wafer_id = Column(String(50), nullable=True)
    
    # 3D Physical layout
    row = Column(Integer, default=0)
    col = Column(Integer, default=0)
    tray_x = Column(Float, default=0.0)
    tray_y = Column(Float, default=0.0)
    tray_z = Column(Float, default=0.0)
    
    # Screening and Ground Truth
    status = Column(String(20), default="PASS")  # PASS, REVIEW, REJECT
    is_ground_truth_defect = Column(Boolean, default=False)
    defect_type = Column(String(50), default="NORMAL")  # NORMAL, HARD_FAIL, LATENT_DRIFT, ELEVATED_LEAKAGE
    risk_score = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    lot = relationship("Lot", back_populates="components")
    measurements = relationship("Measurement", back_populates="component", cascade="all, delete-orphan")
    screening_results = relationship("ScreeningResult", back_populates="component", cascade="all, delete-orphan")
