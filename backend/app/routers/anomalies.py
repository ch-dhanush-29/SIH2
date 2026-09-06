from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models.intelligence import AnomalyEvent, Dispute
from backend.app.schemas.intelligence import AnomalyEventOut, DisputeCreate, DisputeOut

router = APIRouter(prefix="/anomalies", tags=["Marketplace Anomaly Detection & Disputes"])

@router.get("", response_model=List[AnomalyEventOut])
def list_anomalies(is_resolved: Optional[bool] = None, limit: int = 50, db: Session = Depends(get_db)):
    q = db.query(AnomalyEvent)
    if is_resolved is not None:
        q = q.filter(AnomalyEvent.is_resolved == is_resolved)
    return q.order_by(AnomalyEvent.detected_at.desc()).limit(limit).all()

@router.post("/{anomaly_id}/resolve")
def resolve_anomaly(anomaly_id: int, notes: str = "Reviewed and cleared by administrator", db: Session = Depends(get_db)):
    anom = db.query(AnomalyEvent).filter(AnomalyEvent.id == anomaly_id).first()
    if not anom:
        raise HTTPException(status_code=404, detail="Anomaly not found")
    anom.is_resolved = True
    anom.resolution_notes = notes
    db.commit()
    return {"status": "success", "message": f"Anomaly {anom.anomaly_code} resolved."}

@router.get("/disputes", response_model=List[DisputeOut])
def list_disputes(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Dispute)
    if status:
        q = q.filter(Dispute.status == status)
    return q.order_by(Dispute.created_at.desc()).all()

@router.post("/disputes", response_model=DisputeOut)
def open_dispute(req: DisputeCreate, opened_by_user_id: int = 2, db: Session = Depends(get_db)):
    d_count = db.query(Dispute).count() + 1
    disp = Dispute(
        dispute_code=f"DISPUTE-2026-{d_count:04d}",
        lot_id=req.lot_id,
        opened_by_user_id=opened_by_user_id,
        dispute_type=req.dispute_type,
        collector_claim=req.collector_claim,
        evidence_image_urls=req.evidence_image_urls,
        status="OPEN"
    )
    db.add(disp)
    db.commit()
    db.refresh(disp)
    return disp
