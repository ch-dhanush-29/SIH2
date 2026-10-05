from fastapi import APIRouter, Depends, HTTPException, Query, Body
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
import json

from backend.app.core.database import get_db
from backend.app.schemas.events import TelemetryIngestPayload, TelemetryBatchIngestPayload
from backend.app.services.telemetry_service import TelemetryService
from backend.app.models.telemetry import TelemetryEvent, AnomalyEvent
from backend.app.models.chamber import Chamber

router = APIRouter(prefix="", tags=["Telemetry & Anomalies"])

@router.post("/telemetry/ingest")
async def ingest_telemetry(
    payload: TelemetryIngestPayload,
    db: Session = Depends(get_db)
):
    """
    Ingests a single real-time telemetry frame from chamber instrumentation.
    Validates physical parameters, saves to durable storage, evaluates real-time AI anomalies,
    and publishes immediately to the Redis/WebSocket event bus.
    """
    result = await TelemetryService.process_single_telemetry(payload, db)
    return result


@router.post("/telemetry/batch")
async def ingest_batch_telemetry(
    payload: TelemetryBatchIngestPayload,
    db: Session = Depends(get_db)
):
    """
    Ingests a batch of telemetry measurements with bulk database writes and aggregated event fanout.
    Enforces maximum batch size to prevent server denial of service.
    """
    if len(payload.items) > 1000:
        raise HTTPException(status_code=400, detail="Batch exceeds maximum limit of 1000 measurements.")

    result = await TelemetryService.process_batch_telemetry(
        chamber_id=payload.chamber_id,
        lot_id=payload.lot_id,
        items=payload.items,
        db=db
    )
    return result


@router.get("/telemetry/latest")
def get_latest_telemetry(
    chamber_id: str = Query("CH-01"),
    lot_id: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    """
    Retrieves the most recent telemetry readings for chamber digital twin initialization.
    """
    query = db.query(TelemetryEvent).filter(TelemetryEvent.chamber_id == chamber_id)
    if lot_id:
        query = query.filter(TelemetryEvent.lot_id == lot_id)
    records = query.order_by(TelemetryEvent.sequence.desc()).limit(limit).all()

    # Chamber current state
    ch = db.query(Chamber).filter(Chamber.chamber_id == chamber_id).first()

    return {
        "chamber": {
            "chamber_id": ch.chamber_id if ch else chamber_id,
            "temperature_c": ch.current_temperature_c if ch else 125.0,
            "humidity_percent": ch.humidity_percent if ch else 8.0,
            "nitrogen_flow_lpm": ch.nitrogen_flow_lpm if ch else 15.0,
            "status": ch.status if ch else "OPERATIONAL"
        },
        "latest_events": [
            {
                "event_id": r.event_id,
                "sequence": r.sequence,
                "component_id": r.component_id,
                "parameters": json.loads(r.parameters_json),
                "environment": json.loads(r.environment_json) if r.environment_json else {},
                "timestamp": r.timestamp.isoformat()
            }
            for r in reversed(records)
        ]
    }


@router.get("/telemetry/history")
def get_telemetry_history(
    component_id: Optional[str] = Query(None),
    lot_id: Optional[str] = Query(None),
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db)
):
    """
    Returns time-series telemetry history for drift analysis.
    """
    query = db.query(TelemetryEvent)
    if component_id:
        query = query.filter(TelemetryEvent.component_id == component_id)
    if lot_id:
        query = query.filter(TelemetryEvent.lot_id == lot_id)
    records = query.order_by(TelemetryEvent.timestamp.desc()).limit(limit).all()

    return [
        {
            "sequence": r.sequence,
            "component_id": r.component_id,
            "lot_id": r.lot_id,
            "parameters": json.loads(r.parameters_json),
            "timestamp": r.timestamp.isoformat()
        }
        for r in records
    ]


@router.get("/anomalies/active")
def get_active_anomalies(
    lot_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Retrieves unresolved anomalies across the active screening lot.
    """
    query = db.query(AnomalyEvent).filter(AnomalyEvent.is_resolved == False)
    if lot_id:
        query = query.filter(AnomalyEvent.lot_id == lot_id)
    anomalies = query.order_by(AnomalyEvent.anomaly_score.desc()).limit(100).all()

    return [
        {
            "event_id": a.event_id,
            "component_id": a.component_id,
            "lot_id": a.lot_id,
            "parameter": a.parameter,
            "anomaly_score": a.anomaly_score,
            "confidence": a.confidence,
            "decision": a.decision,
            "reason_codes": json.loads(a.reason_codes_json) if a.reason_codes_json else [],
            "timestamp": a.timestamp.isoformat()
        }
        for a in anomalies
    ]


@router.get("/anomalies/history")
def get_anomalies_history(
    lot_id: Optional[str] = Query(None),
    limit: int = Query(50, le=500),
    db: Session = Depends(get_db)
):
    """
    Retrieves chronological anomaly detection log for quality assurance audits.
    """
    query = db.query(AnomalyEvent)
    if lot_id:
        query = query.filter(AnomalyEvent.lot_id == lot_id)
    records = query.order_by(AnomalyEvent.timestamp.desc()).limit(limit).all()

    return [
        {
            "event_id": r.event_id,
            "sequence": r.sequence,
            "component_id": r.component_id,
            "lot_id": r.lot_id,
            "parameter": r.parameter,
            "anomaly_score": r.anomaly_score,
            "decision": r.decision,
            "is_resolved": r.is_resolved,
            "timestamp": r.timestamp.isoformat()
        }
        for r in records
    ]
