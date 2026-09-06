from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base

class PriceObservation(Base):
    __tablename__ = "price_observations"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    location_city = Column(String(100), default="Mumbai", index=True)
    location_state = Column(String(100), default="Maharashtra")
    buying_price_per_unit = Column(Float, nullable=False)
    selling_price_per_unit = Column(Float, nullable=True)
    unit = Column(String(20), default="kg")
    source_type = Column(String(50), default="RECYCLER_QUOTE") # RECYCLER_QUOTE, TRANSACTED_DEAL, APMC_SCRAP_FEED, DEMO_BENCHMARK
    recycler_id = Column(Integer, ForeignKey("recyclers.id"), nullable=True)
    is_verified = Column(Boolean, default=True)
    confidence_score = Column(Float, default=0.9)
    observation_date = Column(DateTime, default=datetime.utcnow, index=True)
    notes = Column(Text, nullable=True)
    is_demo_data = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    material = relationship("Material", back_populates="price_observations")
