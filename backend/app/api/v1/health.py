from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.services.event_bus import event_bus
from backend.app.services.websocket_manager import ws_manager

router = APIRouter(prefix="", tags=["System Health & Metrics"])

@router.get("/health")
@router.get("/health/")
def health_check(db: Session = Depends(get_db)):
    db_status = "HEALTHY"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"UNHEALTHY: {str(e)}"

    return {
        "status": "UP",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "redis_event_bus": "CONNECTED" if event_bus.is_redis_connected else "FALLBACK_IN_MEMORY",
        "websocket_active_clients": ws_manager.active_connections_count,
        "current_sequence": event_bus.current_sequence,
        "chamber_setpoint_c": settings.CHAMBER_TARGET_TEMP_C,
        "active_models": ["BW-ENSEMBLE-2.1", "v1.4.2-isro-ensemble"]
    }

@router.get("/health/ready")
def readiness_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "READY", "database": "CONNECTED"}
    except Exception as e:
        return Response(content='{"status": "NOT_READY"}', status_code=503, media_type="application/json")

@router.get("/health/live")
def liveness_check():
    return {"status": "ALIVE"}

@router.get("/metrics")
def prometheus_metrics():
    """
    Exposes standard Prometheus-compatible telemetry, WebSocket, and AI screening metrics.
    """
    lines = [
        "# HELP burnwatch_telemetry_sequence_total Monotonic sequence counter of all ingested telemetry events",
        "# TYPE burnwatch_telemetry_sequence_total counter",
        f"burnwatch_telemetry_sequence_total {event_bus.current_sequence}",
        "",
        "# HELP burnwatch_websocket_connections Current number of active WebSocket connections",
        "# TYPE burnwatch_websocket_connections gauge",
        f"burnwatch_websocket_connections {ws_manager.active_connections_count}",
        "",
        "# HELP burnwatch_websocket_messages_total Total messages dispatched over WebSocket",
        "# TYPE burnwatch_websocket_messages_total counter",
        f"burnwatch_websocket_messages_total {ws_manager.messages_sent_total}",
        "",
        "# HELP burnwatch_websocket_events_dropped_total Total non-critical events dropped due to client backpressure",
        "# TYPE burnwatch_websocket_events_dropped_total counter",
        f"burnwatch_websocket_events_dropped_total {ws_manager.events_dropped_total}",
        "",
        "# HELP burnwatch_redis_connected Status of Redis pubsub event bus (1=connected, 0=in-memory fallback)",
        "# TYPE burnwatch_redis_connected gauge",
        f"burnwatch_redis_connected {1 if event_bus.is_redis_connected else 0}",
    ]
    return Response(content="\n".join(lines) + "\n", media_type="text/plain; version=0.0.4; charset=utf-8")
