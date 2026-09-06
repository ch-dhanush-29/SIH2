from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from backend.app.database import Base

class UserRole(str, enum.Enum):
    COLLECTOR = "collector"
    RECYCLER = "recycler"
    ADMIN = "admin"
    RESEARCHER = "researcher"

class AuthorizationStatus(str, enum.Enum):
    VERIFIED = "VERIFIED"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    EXPIRED = "EXPIRED"
    UNVERIFIED = "UNVERIFIED"
    SUSPENDED = "SUSPENDED"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(String(20), default=UserRole.COLLECTOR.value, nullable=False)
    preferred_language = Column(String(10), default="hi") # hi, mr, en
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    collector_profile = relationship("Collector", back_populates="user", uselist=False)
    recycler_profile = relationship("Recycler", back_populates="user", uselist=False)
    audit_logs = relationship("AuditLog", back_populates="user")

class Collector(Base):
    __tablename__ = "collectors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    collector_code = Column(String(50), unique=True, index=True, nullable=False)
    city = Column(String(100), default="Mumbai")
    state = Column(String(100), default="Maharashtra")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    formalization_score = Column(Float, default=10.0) # 0 to 100 positive formalization progress
    safety_training_completed = Column(Boolean, default=False)
    total_lots_created = Column(Integer, default=0)
    total_lots_handed_over = Column(Integer, default=0)
    total_earnings = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="collector_profile")
    lots = relationship("Lot", back_populates="collector")
    earnings = relationship("EarningsLedger", back_populates="collector")

class Recycler(Base):
    __tablename__ = "recyclers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    company_name = Column(String(150), nullable=False)
    contact_person = Column(String(100), nullable=False)
    email = Column(String(120), nullable=True)
    address = Column(Text, nullable=False)
    city = Column(String(100), default="Mumbai")
    state = Column(String(100), default="Maharashtra")
    latitude = Column(Float, nullable=False, default=19.0760)
    longitude = Column(Float, nullable=False, default=72.8777)
    service_radius_km = Column(Float, default=35.0)
    pickup_available = Column(Boolean, default=True)
    min_pickup_weight_kg = Column(Float, default=10.0)
    
    # Trust and Performance Scores
    trust_score = Column(Float, default=85.0) # 0 - 100
    authorization_status = Column(String(30), default=AuthorizationStatus.PENDING_VERIFICATION.value)
    authorization_number = Column(String(100), nullable=True)
    authorization_body = Column(String(100), default="CPCB / MPCB Demo Registry")
    auth_valid_until = Column(DateTime, nullable=True)
    
    transaction_completion_rate = Column(Float, default=95.0)
    quote_accuracy_rate = Column(Float, default=92.0)
    dispute_rate = Column(Float, default=1.5)
    average_response_time_minutes = Column(Float, default=15.0)
    
    is_demo_account = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="recycler_profile")
    authorizations = relationship("RecyclerAuthorization", back_populates="recycler")
    quotes = relationship("Quote", back_populates="recycler")
    transactions = relationship("Transaction", back_populates="recycler")
    batches = relationship("Batch", back_populates="recycler")

class RecyclerAuthorization(Base):
    __tablename__ = "recycler_authorizations"

    id = Column(Integer, primary_key=True, index=True)
    recycler_id = Column(Integer, ForeignKey("recyclers.id"), nullable=False)
    authorization_type = Column(String(100), default="E-Waste Recycler Authorization under EPR 2022")
    license_number = Column(String(100), nullable=False)
    issuing_authority = Column(String(100), default="State Pollution Control Board")
    issue_date = Column(DateTime, default=datetime.utcnow)
    expiry_date = Column(DateTime, nullable=False)
    document_url = Column(String(255), nullable=True)
    status = Column(String(30), default=AuthorizationStatus.PENDING_VERIFICATION.value)
    verified_by_admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verification_notes = Column(Text, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    recycler = relationship("Recycler", back_populates="authorizations")
