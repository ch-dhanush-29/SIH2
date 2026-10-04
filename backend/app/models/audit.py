from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from datetime import datetime, timezone
from backend.app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    username = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)  # USER_LOGIN, SCREENING_RUN, DECISION_OVERRIDE, INGESTION_UPLOAD, THRESHOLD_CHANGE
    resource_type = Column(String(50), nullable=False)  # COMPONENT, LOT, MODEL, SETTINGS
    resource_id = Column(String(100), nullable=True)
    details_json = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True)
    version_tag = Column(String(50), unique=True, index=True, nullable=False)  # e.g., v1.4.0-isro-prod
    model_family = Column(String(50), nullable=False)  # DRIFT_GBR, ISOLATION_FOREST, ROBUST_ENSEMBLE
    description = Column(String(255), nullable=True)
    hyperparameters_json = Column(Text, nullable=True)
    metrics_json = Column(Text, nullable=True)  # recall, precision, f2, mae, cost_score
    is_active = Column(Boolean, default=True)
    trained_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
