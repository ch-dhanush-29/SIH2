from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class ScreeningRun(Base):
    __tablename__ = "screening_runs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    run_id = Column(String(80), unique=True, index=True, nullable=False)  # e.g., RUN-2026-LOT04-00031
    lot_id = Column(String(50), ForeignKey("lots.lot_id"), index=True, nullable=False)
    model_version = Column(String(50), default="BW-ENSEMBLE-2.1", index=True)
    threshold_version = Column(String(50), default="ISRO-CLASS-S-2026", index=True)
    status = Column(String(30), default="PROCESSING", index=True)  # QUEUED, PROCESSING, COMPLETED, FAILED
    total_components = Column(Integer, default=1000)
    processed_components = Column(Integer, default=0)
    anomaly_count = Column(Integer, default=0)
    review_count = Column(Integer, default=0)
    reject_count = Column(Integer, default=0)
    false_negative_count = Column(Integer, default=0)
    time_saved_hours = Column(Float, default=0.0)
    decision_summary_json = Column(Text, nullable=True)
    start_time = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    end_time = Column(DateTime, nullable=True)
    
    # Worker lease & reliability fields (Item 12)
    worker_id = Column(String(50), nullable=True, index=True)
    attempt_count = Column(Integer, default=0)
    heartbeat_at = Column(DateTime, nullable=True)
    lease_until = Column(DateTime, nullable=True, index=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    lot = relationship("Lot")
    inferences = relationship("AIInference", back_populates="screening_run", cascade="all, delete-orphan")


class AIInference(Base):
    __tablename__ = "ai_inferences"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    inference_id = Column(String(80), unique=True, index=True, nullable=False)
    screening_run_id = Column(String(80), ForeignKey("screening_runs.run_id"), index=True, nullable=True)
    component_id = Column(String(60), index=True, nullable=False)
    lot_id = Column(String(50), index=True, nullable=False)
    model_version = Column(String(50), default="BW-ENSEMBLE-2.1")
    algorithm_version = Column(String(50), default="v2.1.0")
    threshold_version = Column(String(50), default="ISRO-CLASS-S-2026")
    features_json = Column(Text, nullable=False)
    anomaly_score = Column(Float, nullable=False)
    confidence = Column(Float, default=0.95)
    decision = Column(String(30), default="PASS", index=True)
    reason_codes_json = Column(Text, nullable=True)
    latency_ms = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    screening_run = relationship("ScreeningRun", back_populates="inferences")

    __table_args__ = (
        Index("idx_inf_comp_lot", "component_id", "lot_id"),
        Index("idx_inf_decision", "decision"),
    )
