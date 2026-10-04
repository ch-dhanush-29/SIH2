from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.lot import Lot
from backend.app.models.component import Component
from backend.app.schemas.lot import LotResponse, LotAnalytics
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/lots", tags=["Lot Management & Analytics"])

@router.get("/", response_model=List[LotResponse])
def list_lots(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    lots = db.query(Lot).order_by(Lot.created_at.desc()).all()
    # Ensure counts are up to date
    for l in lots:
        total = db.query(Component).filter(Component.lot_id == l.lot_id).count()
        l.total_parts = total
    return lots

@router.get("/{lot_id}/analytics", response_model=LotAnalytics)
def get_lot_analytics(lot_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    lot = db.query(Lot).filter(Lot.lot_id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Lot '{lot_id}' not found.")

    comps = db.query(Component).filter(Component.lot_id == lot_id).all()
    total_parts = len(comps)
    pass_cnt = sum(1 for c in comps if c.status == "PASS")
    rev_cnt = sum(1 for c in comps if c.status == "REVIEW")
    rej_cnt = sum(1 for c in comps if c.status == "REJECT")
    
    # Ground truth escaped defects (FN)
    escaped = sum(1 for c in comps if c.status == "PASS" and c.is_ground_truth_defect)
    yield_rate = round((pass_cnt / max(total_parts, 1)) * 100.0, 2)
    savings_hours = rej_cnt * 144.0

    return LotAnalytics(
        lot_id=lot.lot_id,
        total_parts=total_parts,
        screened_parts=total_parts,
        pass_count=pass_cnt,
        review_count=rev_cnt,
        reject_count=rej_cnt,
        yield_rate=yield_rate,
        early_reject_savings_hours=savings_hours,
        median_iddq=lot.median_iddq,
        mad_iddq=lot.mad_iddq,
        median_slope=lot.median_slope,
        safety_slope=lot.safety_slope,
        escaped_defects=escaped
    )
