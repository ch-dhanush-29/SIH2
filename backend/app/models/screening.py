from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class ScreeningResult(Base):
    __tablename__ = "screening_results"

    id = Column(Integer, primary_key=True, index=True)
    screening_run_id = Column(String(80), nullable=True, index=True)
    component_id = Column(Integer, ForeignKey("components.id"), index=True, nullable=False)
    lot_id = Column(String(50), index=True, nullable=False)
    parameter = Column(String(30), nullable=False, index=True)
    checkpoint = Column(Integer, default=24, index=True)
    
    # Verdicts
    static_verdict = Column(String(20), default="PASS")
    dynamic_verdict = Column(String(20), default="PASS")
    drift_verdict = Column(String(20), default="PASS")
    final_verdict = Column(String(20), default="PASS", index=True)  # PASS, REVIEW, REJECT
    
    # Statistical & ML metrics
    risk_score = Column(Float, default=0.0)  # 0 to 100
    robust_z_score = Column(Float, default=0.0)
    iqr_score = Column(Float, default=0.0)
    iforest_score = Column(Float, default=0.0)
    ensemble_score = Column(Float, default=0.0)
    
    # Module B Forecast metrics
    predicted_168h = Column(Float, nullable=True)
    drift_slope = Column(Float, nullable=True)
    safety_slope = Column(Float, nullable=True)
    early_reject_flag = Column(Boolean, default=False)
    time_saved_hours = Column(Float, default=0.0)
    
    # Explainability (Glass-box)
    plain_english_justification = Column(Text, nullable=True)
    shap_values_json = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    component = relationship("Component", back_populates="screening_results")

    __table_args__ = (
        Index("idx_scr_lot_chkpt", "lot_id", "checkpoint"),
        Index("idx_scr_comp_verdict", "component_id", "final_verdict"),
    )


class QADecision(Base):
    __tablename__ = "qa_decisions"

    id = Column(Integer, primary_key=True, index=True)
    component_id = Column(Integer, ForeignKey("components.id"), index=True, nullable=False)
    lot_id = Column(String(50), index=True, nullable=False)
    inspector_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    inspector_username = Column(String(50), nullable=False)
    
    original_verdict = Column(String(20), nullable=False)
    final_verdict = Column(String(20), nullable=False, index=True)  # PASS, REVIEW, REJECT
    override_reason = Column(Text, nullable=True)
    is_override = Column(Boolean, default=False)
    
    decision_timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    __table_args__ = (
        Index("idx_qa_lot_comp", "lot_id", "component_id"),
    )
