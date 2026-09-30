from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from backend.app.database import get_db
from backend.app.models.intelligence import AnomalyEvent, Dispute
from backend.app.schemas.intelligence import AnomalyEventOut, DisputeCreate, DisputeOut
from backend.websocket.manager import event_manager
from backend.websocket.events import EventType
from datetime import datetime

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
    
    event_manager.publish_event_sync({
        "event": EventType.SYSTEM_ALERT.value,
        "category": "anomalies",
        "data": {"anomaly_code": anom.anomaly_code, "action": "RESOLVED", "notes": notes},
        "summary": f"🛡️ Anomaly {anom.anomaly_code} RESOLVED: {notes}",
        "severity": "info"
    })
    return {"status": "success", "message": f"Anomaly {anom.anomaly_code} resolved."}

@router.post("/action")
async def take_anomaly_action(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    """Handle Review, Dismiss, or Escalate actions on anomalies with audit logging."""
    anomaly_id = payload.get("anomaly_id", "ANOM-8841")
    action = payload.get("action", "REVIEW") # REVIEW, DISMISS, ESCALATE, APPROVE
    notes = payload.get("notes", f"Action {action} performed by inspector")
    
    severity_map = {
        "REVIEW": "info",
        "APPROVE": "success",
        "DISMISS": "info",
        "ESCALATE": "alert"
    }
    
    event_data = {
        "event": EventType.ANOMALY_DETECTED.value if action == "ESCALATE" else EventType.SYSTEM_ALERT.value,
        "category": "anomalies",
        "data": {
            "anomaly_id": anomaly_id,
            "action": action,
            "notes": notes,
            "timestamp": datetime.utcnow().isoformat()
        },
        "summary": f"🛡️ Anomaly Action [{action}]: {anomaly_id} — {notes}",
        "severity": severity_map.get(action, "info")
    }
    
    await event_manager.broadcast(event_data)
    return {"status": "success", "anomaly_id": anomaly_id, "action_taken": action, "notes": notes}

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
    
    event_manager.publish_event_sync({
        "event": EventType.SYSTEM_ALERT.value,
        "category": "disputes",
        "data": {"dispute_code": disp.dispute_code, "lot_id": req.lot_id, "type": req.dispute_type},
        "summary": f"⚖️ Dispute Opened: {disp.dispute_code} for Lot #{req.lot_id}",
        "severity": "warning"
    })
    return disp
