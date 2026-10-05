from sqlalchemy import Column, Integer, BigInteger, String, Float, Text, DateTime, ForeignKey, Index
from datetime import datetime, timezone
from backend.app.core.database import Base

class InspectionFrame(Base):
    __tablename__ = "inspection_frames"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    frame_id = Column(String(80), unique=True, index=True, nullable=False)
    camera_id = Column(String(50), default="CAM-01", index=True)
    chamber_id = Column(String(50), default="CH-01", index=True)
    lot_id = Column(String(50), index=True, nullable=True)
    component_id = Column(String(60), index=True, nullable=True)
    frame_type = Column(String(30), default="OPTICAL", index=True)  # OPTICAL, THERMAL, SYNTHETIC_OVERLAY
    storage_url = Column(String(255), nullable=True)  # S3/MinIO Object Storage key or local URL
    hash_sha256 = Column(String(64), nullable=True)
    width = Column(Integer, default=1920)
    height = Column(Integer, default=1080)
    detections_json = Column(Text, nullable=True)  # Bounding boxes, confidence, defect labels
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_insp_cam_ts", "camera_id", "timestamp"),
        Index("idx_insp_comp_ts", "component_id", "timestamp"),
    )
