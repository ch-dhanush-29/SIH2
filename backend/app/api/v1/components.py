from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.component import Component
from backend.app.models.measurement import Measurement
from backend.app.models.screening import ScreeningResult, QADecision
from backend.app.schemas.component import ComponentResponse, ComponentListResponse, MeasurementValue
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/components", tags=["Component Registry"])

@router.get("/", response_model=ComponentListResponse)
def list_components(
    lot_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    defect_type: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Component)
    if lot_id:
        query = query.filter(Component.lot_id == lot_id)
    if status_filter:
        query = query.filter(Component.status == status_filter)
    if defect_type:
        query = query.filter(Component.defect_type == defect_type)
    if search:
        query = query.filter(Component.part_id.ilike(f"%{search}%"))

    total = query.count()
    items = query.offset((page - 1) * limit).limit(limit).all()

    # Populate measurements
    result_items = []
    comp_ids = [c.id for c in items]
    meas_records = db.query(Measurement).filter(Measurement.component_id.in_(comp_ids)).all()
    meas_map = {}
    for m in meas_records:
        if m.component_id not in meas_map:
            meas_map[m.component_id] = {}
        meas_map[m.component_id][m.parameter] = MeasurementValue(
            v_0h=m.v_0h,
            v_24h=m.v_24h,
            v_96h=m.v_96h,
            v_168h=m.v_168h,
            temperature_c=m.temperature_c,
            voltage_v=m.voltage_v
        )

    for c in items:
        resp = ComponentResponse.model_validate(c)
        resp.measurements = meas_map.get(c.id, {})
        result_items.append(resp)

    return ComponentListResponse(
        total=total,
        page=page,
        limit=limit,
        items=result_items
    )

@router.get("/{part_id}")
def get_component_detail(
    part_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    comp = db.query(Component).filter(Component.part_id == part_id).first()
    if not comp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Component '{part_id}' not found.")

    measurements = db.query(Measurement).filter(Measurement.component_id == comp.id).all()
    meas_dict = {
        m.parameter: {
            "v_0h": m.v_0h,
            "v_24h": m.v_24h,
            "v_96h": m.v_96h,
            "v_168h": m.v_168h,
            "temperature_c": m.temperature_c,
            "voltage_v": m.voltage_v
        }
        for m in measurements
    }

    qa_decisions = db.query(QADecision).filter(QADecision.component_id == comp.id).order_by(QADecision.decision_timestamp.desc()).all()

    return {
        "id": comp.id,
        "part_id": comp.part_id,
        "lot_id": comp.lot_id,
        "family": comp.family,
        "wafer_id": comp.wafer_id,
        "row": comp.row,
        "col": comp.col,
        "status": comp.status,
        "risk_score": comp.risk_score,
        "is_ground_truth_defect": comp.is_ground_truth_defect,
        "defect_type": comp.defect_type,
        "measurements": meas_dict,
        "qa_history": [
            {
                "id": q.id,
                "inspector": q.inspector_username,
                "original_verdict": q.original_verdict,
                "final_verdict": q.final_verdict,
                "reason": q.override_reason,
                "timestamp": q.decision_timestamp
            }
            for q in qa_decisions
        ]
    }
