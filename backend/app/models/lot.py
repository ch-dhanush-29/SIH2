from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from backend.app.database import Base

class LotStatus(str, enum.Enum):
    CREATED = "CREATED"
    QUOTED = "QUOTED"
    PICKUP_SCHEDULED = "PICKUP_SCHEDULED"
    HANDOVER_PENDING = "HANDOVER_PENDING"
    VERIFIED = "VERIFIED"
    COMPLETED = "COMPLETED"
    DISPUTED = "DISPUTED"
    CANCELLED = "CANCELLED"

class Lot(Base):
    __tablename__ = "lots"

    id = Column(Integer, primary_key=True, index=True)
    lot_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. EW-2026-MH-000184
    collector_id = Column(Integer, ForeignKey("collectors.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    
    # Weight specs
    collector_weight_kg = Column(Float, nullable=False) # Approximate physical weight entered by collector
    ai_estimated_weight_kg = Column(Float, nullable=True) # Experimental AI assisted estimate
    verified_weight_kg = Column(Float, nullable=True) # Recycler physical scale measurement
    
    # Condition & Quality
    condition_grade = Column(String(30), default="MIXED_GOOD") # INTACT, DISMANTLED, DAMAGED, HIGH_GRADE, CONTAMINATED
    contamination_notes = Column(Text, nullable=True)
    
    # AI Computer Vision classification logs
    ai_predicted_category = Column(String(50), nullable=True)
    ai_confidence = Column(Float, nullable=True)
    is_collector_confirmed = Column(Boolean, default=True)
    
    # Pricing
    estimated_fair_price_min = Column(Float, nullable=True)
    estimated_fair_price_max = Column(Float, nullable=True)
    expected_market_price = Column(Float, nullable=True)
    fairness_score = Column(Float, nullable=True) # 0 to 100
    final_agreed_price = Column(Float, nullable=True)
    
    # Geolocation & Device
    collection_city = Column(String(100), default="Mumbai")
    collection_latitude = Column(Float, nullable=True)
    collection_longitude = Column(Float, nullable=True)
    created_device_id = Column(String(100), nullable=True)
    idempotency_key = Column(String(100), unique=True, index=True, nullable=True)
    
    # Status
    status = Column(String(30), default=LotStatus.CREATED.value, index=True)
    
    # Perceptual hash for duplicate detection
    image_perceptual_hash = Column(String(64), nullable=True)
    is_duplicate_suspect = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    collector = relationship("Collector", back_populates="lots")
    material = relationship("Material", back_populates="lots")
    images = relationship("LotImage", back_populates="lot")
    events = relationship("LotEvent", back_populates="lot")
    quotes = relationship("Quote", back_populates="lot")
    passport = relationship("LotPassport", back_populates="lot", uselist=False)
    handover = relationship("HandoverRecord", back_populates="lot", uselist=False)
    transaction = relationship("Transaction", back_populates="lot", uselist=False)
    batch_link = relationship("BatchLot", back_populates="lot", uselist=False)

class LotImage(Base):
    __tablename__ = "lot_images"

    id = Column(Integer, primary_key=True, index=True)
    lot_id = Column(Integer, ForeignKey("lots.id"), nullable=False)
    image_url = Column(String(255), nullable=False)
    thumbnail_url = Column(String(255), nullable=True)
    perceptual_hash = Column(String(64), nullable=True)
    file_size_bytes = Column(Integer, default=0)
    is_primary = Column(Boolean, default=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    lot = relationship("Lot", back_populates="images")

class LotEvent(Base):
    __tablename__ = "lot_events"

    id = Column(Integer, primary_key=True, index=True)
    lot_id = Column(Integer, ForeignKey("lots.id"), nullable=False)
    event_type = Column(String(50), nullable=False) # CREATED, QUOTED, PICKUP_ASSIGNED, QR_SCANNED, WEIGHED, PAID, COMPLETED
    description = Column(Text, nullable=False)
    actor_type = Column(String(30), default="COLLECTOR") # COLLECTOR, RECYCLER, ADMIN, SYSTEM
    actor_id = Column(Integer, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    lot = relationship("Lot", back_populates="events")

class LotPassport(Base):
    __tablename__ = "lot_passports"

    id = Column(Integer, primary_key=True, index=True)
    lot_id = Column(Integer, ForeignKey("lots.id"), unique=True, nullable=False)
    passport_uid = Column(String(100), unique=True, index=True, nullable=False)
    qr_code_svg_or_base64 = Column(Text, nullable=False)
    qr_payload_url = Column(String(255), nullable=False)
    cryptographic_hash = Column(String(64), nullable=False) # SHA-256 hash of lot origin metadata
    created_at = Column(DateTime, default=datetime.utcnow)

    lot = relationship("Lot", back_populates="passport")
