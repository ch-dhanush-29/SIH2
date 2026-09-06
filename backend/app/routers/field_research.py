from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.app.database import get_db
from backend.app.models.intelligence import FieldResearchRecord
from backend.app.schemas.intelligence import FieldResearchCreate, FieldResearchOut

router = APIRouter(prefix="/field-research", tags=["Field Research & Operational Surveys"])

@router.get("", response_model=List[FieldResearchOut])
def list_field_research_records(db: Session = Depends(get_db)):
    """
    Retrieves genuine field research data logs recorded with informal scrap collectors.
    """
    return db.query(FieldResearchRecord).order_by(FieldResearchRecord.recorded_at.desc()).all()

@router.post("", response_model=FieldResearchOut)
def record_field_observation(req: FieldResearchCreate, db: Session = Depends(get_db)):
    rec = FieldResearchRecord(
        researcher_name=req.researcher_name,
        informal_collector_pseudonym=req.informal_collector_pseudonym,
        location_hub=req.location_hub,
        observed_material=req.observed_material,
        observed_daily_volume_kg=req.observed_daily_volume_kg,
        current_informal_rate_inr=req.current_informal_rate_inr,
        reported_middleman_cut_pct=req.reported_middleman_cut_pct,
        reported_health_hazards=req.reported_health_hazards,
        barriers_to_formal_recycling=req.barriers_to_formal_recycling
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec
