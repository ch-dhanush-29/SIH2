from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base

class PickupRequest(Base):
    __tablename__ = "pickup_requests"

    id = Column(Integer, primary_key=True, index=True)
    lot_id = Column(Integer, ForeignKey("lots.id"), nullable=False)
    recycler_id = Column(Integer, ForeignKey("recyclers.id"), nullable=False)
    collector_id = Column(Integer, ForeignKey("collectors.id"), nullable=False)
    scheduled_date = Column(DateTime, nullable=False)
    pickup_address = Column(Text, nullable=False)
    pickup_latitude = Column(Float, nullable=False)
    pickup_longitude = Column(Float, nullable=False)
    status = Column(String(30), default="SCHEDULED") # SCHEDULED, EN_ROUTE, COMPLETED, CANCELLED
    route_cluster_id = Column(String(50), nullable=True)
    estimated_distance_km = Column(Float, default=5.0)
    created_at = Column(DateTime, default=datetime.utcnow)

class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. BATCH-2026-B0091
    recycler_id = Column(Integer, ForeignKey("recyclers.id"), nullable=False)
    total_weight_kg = Column(Float, default=0.0)
    total_lots_count = Column(Integer, default=0)
    material_category_code = Column(String(50), nullable=False)
    destination_smelter_facility = Column(String(150), nullable=True)
    status = Column(String(30), default="AGGREGATED") # AGGREGATED, IN_TRANSIT, PROCESSED
    created_at = Column(DateTime, default=datetime.utcnow)

    recycler = relationship("Recycler", back_populates="batches")
    lots = relationship("BatchLot", back_populates="batch")

class BatchLot(Base):
    __tablename__ = "batch_lots"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    lot_id = Column(Integer, ForeignKey("lots.id"), unique=True, nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("Batch", back_populates="lots")
    lot = relationship("Lot", back_populates="batch_link")
