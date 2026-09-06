from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action_type = Column(String(100), nullable=False) # LOGIN, LOT_CREATE, QUOTE_SUBMIT, HANDOVER_VERIFY, ANOMALY_FLAG, SYNC_BATCH
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(50), nullable=True)
    ip_address = Column(String(50), nullable=True)
    details_json = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")

class SyncQueueRecord(Base):
    __tablename__ = "sync_queue_records"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), nullable=False, index=True)
    idempotency_key = Column(String(100), unique=True, index=True, nullable=False)
    entity_type = Column(String(50), nullable=False) # LOT, HANDOVER, PRICE_OBSERVATION
    local_id = Column(String(100), nullable=False)
    server_id = Column(String(100), nullable=True)
    payload_json = Column(Text, nullable=False)
    sync_status = Column(String(30), default="SYNCED") # LOCAL, QUEUED, SYNCED, CONFLICT, FAILED
    retry_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    synced_at = Column(DateTime, default=datetime.utcnow)

class AIModelRegistry(Base):
    __tablename__ = "ai_model_registry"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), nullable=False) # e.g. EWaste-MobileNetV3-Classifier
    version = Column(String(30), nullable=False)
    task_type = Column(String(50), nullable=False) # COMPUTER_VISION, FAIR_PRICE_PREDICTOR, ANOMALY_ISOLATION
    training_samples_count = Column(Integer, default=500)
    evaluation_f1_score = Column(Float, nullable=True)
    evaluation_precision = Column(Float, nullable=True)
    evaluation_recall = Column(Float, nullable=True)
    confidence_threshold = Column(Float, default=0.65)
    deployment_status = Column(String(30), default="ACTIVE") # ACTIVE, ARCHIVED, EXPERIMENTAL
    notes = Column(Text, nullable=True)
    registered_at = Column(DateTime, default=datetime.utcnow)
