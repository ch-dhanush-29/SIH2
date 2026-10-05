import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException, Depends
from typing import Optional, List, Dict, Any
import logging
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid

from backend.app.core.database import get_db
from backend.app.schemas.events import RealtimeEvent
from backend.app.services.event_bus import event_bus
from backend.app.services.websocket_manager import ws_manager
from backend.app.models.chamber import Chamber
from backend.app.models.lot import Lot
from backend.app.models.component import Component
from backend.app.models.telemetry import TelemetryEvent, AnomalyEvent

logger = logging.getLogger("burnwatch.api.realtime")
router = APIRouter(prefix="", tags=["Real-Time & WebSockets"])

@router.websocket("/ws/live")
async def websocket_live_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None, description="DEPRECATED: Prefer sending {'action': 'auth', 'token': '...'} post-handshake")
):
    """
    Primary High-Frequency Real-Time WebSocket Gateway for BurnWatch 3D.
    Delivers live telemetry, anomalies, AI inferences, chamber environmental updates, and Golden Demo events.
    Supports post-connect JWT authentication handshake, topic subscriptions, sequence tracking, and heartbeats.
    """
    if token:
        logger.warning("Client connected using query-parameter token. Recommend migrating to post-connect auth handshake.")

    await ws_manager.initialize()
    session = await ws_manager.connect(websocket, token=token)

    try:
        while True:
            data = await websocket.receive_text()
            await ws_manager.handle_message(session, data)
    except WebSocketDisconnect:
        await ws_manager.disconnect(session.connection_id)
    except Exception as e:
        logger.debug("WebSocket connection error on %s: %s", session.connection_id, e)
        await ws_manager.disconnect(session.connection_id)


@router.get("/realtime/snapshot")
def get_realtime_snapshot(
    lot_id: str = Query("LOT-04", description="Lot identifier for initial snapshot state"),
    chamber_id: str = Query("CH-01", description="Chamber identifier for initial thermal state"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Authoritative Initial Snapshot Endpoint (Phase 14).
    Returns complete lot state, chamber status, 3D component coordinates, and active anomalies
    at the exact sequence number `seq_snapshot`.
    Clients fetch this snapshot first, then apply incoming delta events from `seq_snapshot + 1`.
    """
    ch = db.query(Chamber).filter(Chamber.chamber_id == chamber_id).first()
    lot = db.query(Lot).filter(Lot.lot_id == lot_id).first()
    components = db.query(Component).filter(Component.lot_id == lot_id).all()
    active_anomalies = (
        db.query(AnomalyEvent)
        .filter(AnomalyEvent.lot_id == lot_id, AnomalyEvent.is_resolved == False)
        .order_by(AnomalyEvent.sequence.desc())
        .limit(100)
        .all()
    )

    return {
        "status": "SNAPSHOT_LOADED",
        "server_sequence": event_bus.current_sequence,
        "sequence": event_bus.current_sequence,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "chamber": {
            "chamber_id": ch.chamber_id if ch else chamber_id,
            "name": ch.name if ch else "ISRO ESS Thermal Chamber 01-A",
            "current_temperature_c": ch.current_temperature_c if ch else 125.0,
            "target_temperature_c": ch.target_temperature_c if ch else 125.0,
            "humidity_percent": ch.humidity_percent if ch else 8.0,
            "nitrogen_flow_lpm": ch.nitrogen_flow_lpm if ch else 15.0,
            "status": ch.status if ch else "OPERATIONAL"
        },
        "lot": {
            "lot_id": lot.lot_id if lot else lot_id,
            "part_family": lot.part_family if lot else "RH-FPGA-500K",
            "total_parts": lot.total_parts if lot else len(components),
            "anomaly_count": lot.anomaly_count if lot else len(active_anomalies),
            "status": lot.status if lot else "SCREENING",
            "median_iddq": lot.median_iddq if lot else 21.2,
            "mad_iddq": lot.mad_iddq if lot else 1.1
        },
        "components": [
            {
                "part_id": c.part_id,
                "status": c.status,
                "risk_score": c.risk_score,
                "row": c.row,
                "col": c.col,
                "tray_x": c.tray_x,
                "tray_y": c.tray_y,
                "tray_z": c.tray_z,
                "defect_type": c.defect_type,
                "is_ground_truth_defect": c.is_ground_truth_defect
            }
            for c in components
        ],
        "active_anomalies": [
            {
                "event_id": a.event_id,
                "trace_id": a.trace_id,
                "sequence": a.sequence,
                "component_id": a.component_id,
                "parameter": a.parameter,
                "anomaly_score": a.anomaly_score,
                "confidence": a.confidence,
                "decision": a.decision,
                "reasons": json.loads(a.reason_codes_json) if a.reason_codes_json else []
            }
            for a in active_anomalies
        ],
        "system_health": {
            "status": "HEALTHY",
            "is_redis_connected": event_bus.is_redis_connected,
            "active_connections": ws_manager.active_connections_count
        }
    }


@router.get("/realtime/replay")
@router.get("/events/replay")
def replay_events(
    from_sequence: int = Query(..., description="Starting sequence number for missed-event gap recovery"),
    to_sequence: Optional[int] = Query(None, description="Ending sequence number"),
    lot_id: Optional[str] = Query(None, description="Filter recovered events by lot ID"),
    limit: int = Query(1000, le=2000),
    db: Session = Depends(get_db)
):
    """
    Durable Replay Endpoint (Phase 3).
    Reads from Redis Streams ring buffer or PostgreSQL database.
    If requested sequence is older than retention: returns REPLAY_UNAVAILABLE and prompts FULL_SNAPSHOT_REQUIRED.
    """
    status, recovered = event_bus.get_replay_events(
        from_sequence=from_sequence,
        to_sequence=to_sequence,
        lot_id=lot_id,
        max_limit=limit
    )

    if status == "REPLAY_UNAVAILABLE":
        # Check database fallback
        db_records = (
            db.query(TelemetryEvent)
            .filter(TelemetryEvent.sequence >= from_sequence)
        )
        if to_sequence:
            db_records = db_records.filter(TelemetryEvent.sequence <= to_sequence)
        if lot_id:
            db_records = db_records.filter(TelemetryEvent.lot_id == lot_id)

        db_events = db_records.order_by(TelemetryEvent.sequence.asc()).limit(limit).all()

        if not db_events:
            return {
                "status": "REPLAY_UNAVAILABLE",
                "message": "FULL_SNAPSHOT_REQUIRED",
                "from_sequence": from_sequence,
                "current_sequence": event_bus.current_sequence,
                "events": []
            }

        recovered = [
            RealtimeEvent(
                event_id=r.event_id,
                trace_id=r.trace_id or str(uuid.uuid4()),
                event_type=r.event_type,
                schema_version=2,
                timestamp=r.timestamp.isoformat(),
                server_timestamp=r.server_timestamp.isoformat() if r.server_timestamp else r.timestamp.isoformat(),
                chamber_id=r.chamber_id,
                lot_id=r.lot_id,
                component_id=r.component_id,
                sequence=r.sequence,
                payload={
                    "parameters": json.loads(r.parameters_json),
                    "environment": json.loads(r.environment_json) if r.environment_json else {},
                    "quality_status": r.quality_status
                }
            )
            for r in db_events
        ]

    # Return list directly for compatibility with List[RealtimeEvent] clients, or JSON envelope
    return [e.model_dump() for e in recovered]


@router.get("/events/status")
def get_realtime_status():
    """
    System diagnostics on real-time event bus, WebSocket gateway, sequence numbers, and drop metrics.
    """
    return {
        "status": "HEALTHY",
        "current_sequence": event_bus.current_sequence,
        "is_redis_connected": event_bus.is_redis_connected,
        "active_websocket_connections": ws_manager.active_connections_count,
        "messages_sent_total": ws_manager.messages_sent_total,
        "events_dropped_total": ws_manager.events_dropped_total,
        "replay_buffer_size": len(event_bus._replay_buffer)
    }
