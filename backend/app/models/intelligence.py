from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base

class AnomalyEvent(Base):
    __tablename__ = "anomaly_events"

    id = Column(Integer, primary_key=True, index=True)
    anomaly_code = Column(String(50), unique=True, index=True, nullable=False)
    anomaly_type = Column(String(50), nullable=False) # UNDERVALUATION_SUSPECT, PRICE_SPIKE, DUPLICATE_IMAGE, RAPID_GEO_JUMP, WEIGHT_MISMATCH
    severity = Column(String(20), default="MEDIUM") # LOW, MEDIUM, HIGH, CRITICAL
    lot_id = Column(Integer, ForeignKey("lots.id"), nullable=True)
    recycler_id = Column(Integer, ForeignKey("recyclers.id"), nullable=True)
    collector_id = Column(Integer, ForeignKey("collectors.id"), nullable=True)
    
    expected_benchmark_value = Column(Float, nullable=True)
    observed_value = Column(Float, nullable=True)
    deviation_percentage = Column(Float, nullable=True)
    
    explanation = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False)
    resolved_by_admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    detected_at = Column(DateTime, default=datetime.utcnow, index=True)

class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(Integer, primary_key=True, index=True)
    dispute_code = Column(String(50), unique=True, index=True, nullable=False)
    lot_id = Column(Integer, ForeignKey("lots.id"), nullable=False)
    opened_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dispute_type = Column(String(50), nullable=False) # WEIGHT_DISCREPANCY, PAYMENT_PENDING, RATE_REDUCTION, CLASSIFICATION_REJECTED
    collector_claim = Column(Text, nullable=False)
    recycler_response = Column(Text, nullable=True)
    evidence_image_urls = Column(Text, nullable=True) # JSON list or comma separated
    status = Column(String(30), default="OPEN") # OPEN, IN_REVIEW, RESOLVED, REJECTED
    admin_decision = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class FieldResearchRecord(Base):
    __tablename__ = "field_research_records"

    id = Column(Integer, primary_key=True, index=True)
    researcher_name = Column(String(100), nullable=False)
    informal_collector_pseudonym = Column(String(100), nullable=False)
    location_hub = Column(String(100), nullable=False) # e.g. Dharavi Mumbai, Seelampur Delhi, Shivajinagar Pune
    observed_material = Column(String(100), nullable=False)
    observed_daily_volume_kg = Column(Float, nullable=False)
    current_informal_rate_inr = Column(Float, nullable=False)
    reported_middleman_cut_pct = Column(Float, default=30.0)
    reported_health_hazards = Column(Text, nullable=True)
    barriers_to_formal_recycling = Column(Text, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)
