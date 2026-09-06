from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from backend.app.database import Base

class QuoteStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"

class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    DISPUTED = "DISPUTED"

class PaymentMode(str, enum.Enum):
    CASH = "CASH"
    UPI = "UPI"
    BANK_TRANSFER = "BANK_TRANSFER"

class Quote(Base):
    __tablename__ = "quotes"

    id = Column(Integer, primary_key=True, index=True)
    lot_id = Column(Integer, ForeignKey("lots.id"), nullable=False)
    recycler_id = Column(Integer, ForeignKey("recyclers.id"), nullable=False)
    offered_price_per_kg = Column(Float, nullable=False)
    total_offered_price = Column(Float, nullable=False)
    pickup_offered = Column(Boolean, default=True)
    pickup_estimated_date = Column(DateTime, nullable=True)
    validity_hours = Column(Integer, default=48)
    status = Column(String(30), default=QuoteStatus.PENDING.value)
    negotiation_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    lot = relationship("Lot", back_populates="quotes")
    recycler = relationship("Recycler", back_populates="quotes")

class HandoverRecord(Base):
    __tablename__ = "handover_records"

    id = Column(Integer, primary_key=True, index=True)
    lot_id = Column(Integer, ForeignKey("lots.id"), unique=True, nullable=False)
    recycler_id = Column(Integer, ForeignKey("recyclers.id"), nullable=False)
    handover_code = Column(String(50), unique=True, index=True, nullable=False)
    
    # Handover verification
    verified_weight_kg = Column(Float, nullable=False)
    weight_variance_kg = Column(Float, default=0.0)
    agreed_rate_per_kg = Column(Float, nullable=False)
    final_payout_inr = Column(Float, nullable=False)
    
    # Geolocation & Integrity
    handover_latitude = Column(Float, nullable=True)
    handover_longitude = Column(Float, nullable=True)
    digital_receipt_sha256 = Column(String(64), nullable=False)
    
    # Timestamps & notes
    handover_completed_at = Column(DateTime, default=datetime.utcnow)
    recycler_signature_notes = Column(Text, nullable=True)
    collector_confirmed = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    lot = relationship("Lot", back_populates="handover")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    lot_id = Column(Integer, ForeignKey("lots.id"), unique=True, nullable=False)
    recycler_id = Column(Integer, ForeignKey("recyclers.id"), nullable=False)
    collector_id = Column(Integer, ForeignKey("collectors.id"), nullable=False)
    
    transaction_code = Column(String(50), unique=True, index=True, nullable=False)
    final_amount_inr = Column(Float, nullable=False)
    payment_mode = Column(String(30), default=PaymentMode.CASH.value)
    payment_reference = Column(String(100), nullable=True)
    payment_status = Column(String(30), default=PaymentStatus.COMPLETED.value)
    
    # Environmental & Formalization Metrics
    co2_reduction_kg_est = Column(Float, default=0.0)
    hazardous_waste_diverted_kg = Column(Float, default=0.0)
    critical_metal_recovered_grams_est = Column(Float, default=0.0)
    
    is_anomaly_flagged = Column(Boolean, default=False)
    anomaly_reason = Column(Text, nullable=True)
    
    settled_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    lot = relationship("Lot", back_populates="transaction")
    recycler = relationship("Recycler", back_populates="transactions")
    payments = relationship("Payment", back_populates="transaction")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False)
    amount_inr = Column(Float, nullable=False)
    payment_mode = Column(String(30), default=PaymentMode.CASH.value)
    payment_status = Column(String(30), default=PaymentStatus.COMPLETED.value)
    transaction_ref = Column(String(100), nullable=True)
    paid_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    transaction = relationship("Transaction", back_populates="payments")

class EarningsLedger(Base):
    __tablename__ = "earnings_ledger"

    id = Column(Integer, primary_key=True, index=True)
    collector_id = Column(Integer, ForeignKey("collectors.id"), nullable=False)
    lot_id = Column(Integer, ForeignKey("lots.id"), nullable=False)
    amount_inr = Column(Float, nullable=False)
    payment_mode = Column(String(30), default=PaymentMode.CASH.value)
    entry_date = Column(DateTime, default=datetime.utcnow, index=True)
    notes = Column(String(200), nullable=True)

    collector = relationship("Collector", back_populates="earnings")
