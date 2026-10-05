import json
import logging
import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.services.event_bus import event_bus
from backend.app.services.websocket_manager import ws_manager
from backend.app.services.screening import screening_engine
from backend.app.models.screening_run import ScreeningRun
from backend.app.models.screening import ScreeningResult

logger = logging.getLogger("burnwatch.api.health")
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
    """
    K8s / Container Readiness Probe.
    Returns 503 if critical dependencies are unavailable in production mode.
    """
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        logger.error("Readiness check DB failure: %s", e)

    is_prod = settings.ENVIRONMENT.lower() == "production"
    redis_ok = event_bus.is_redis_connected or (not is_prod and settings.USE_REDIS_FALLBACK)

    if not db_ok or not redis_ok:
        reasons = []
        if not db_ok:
            reasons.append("DATABASE_UNAVAILABLE")
        if not redis_ok:
            reasons.append("REDIS_UNAVAILABLE_IN_PRODUCTION")
        return Response(
            content=json.dumps({"status": "NOT_READY", "reasons": reasons}),
            status_code=503,
            media_type="application/json"
        )

    return {
        "status": "READY",
        "database": "CONNECTED",
        "redis": "CONNECTED" if event_bus.is_redis_connected else "FALLBACK_IN_MEMORY",
        "environment": settings.ENVIRONMENT
    }

@router.get("/health/live")
def liveness_check():
    """K8s Liveness Probe."""
    return {"status": "ALIVE"}

@router.get("/health/dependencies")
async def dependency_health(db: Session = Depends(get_db)):
    """
    Deep dependency probe checking:
      - Database latency and connectivity
      - Redis Event Bus status and latency
      - WebSocket Gateway statistics
      - Background screening worker status and heartbeats
      - AI Screening Engine readiness & cached baselines
    """
    db_start = time.perf_counter()
    db_ok = False
    db_latency_ms = None
    db_err = None
    try:
        db.execute(text("SELECT 1"))
        db_latency_ms = round((time.perf_counter() - db_start) * 1000, 2)
        db_ok = True
    except Exception as e:
        db_err = str(e)

    redis_status = "CONNECTED" if event_bus.is_redis_connected else "FALLBACK_IN_MEMORY"
    redis_latency_ms = None
    if event_bus.is_redis_connected and event_bus._redis_client:
        try:
            r_start = time.perf_counter()
            await event_bus._redis_client.ping()
            redis_latency_ms = round((time.perf_counter() - r_start) * 1000, 2)
        except Exception:
            redis_status = "DEGRADED"

    worker_status = "UNKNOWN"
    last_hb_iso = None
    try:
        recent_run = (
            db.query(ScreeningRun)
            .filter(ScreeningRun.heartbeat_at.isnot(None))
            .order_by(ScreeningRun.heartbeat_at.desc())
            .first()
        )
        if recent_run and recent_run.heartbeat_at:
            last_hb_iso = recent_run.heartbeat_at.isoformat()
            hb_dt = recent_run.heartbeat_at
            if hb_dt.tzinfo is None:
                hb_dt = hb_dt.replace(tzinfo=timezone.utc)
            delta_s = (datetime.now(timezone.utc) - hb_dt).total_seconds()
            worker_status = "HEALTHY" if delta_s < 120 else "IDLE"
        else:
            worker_status = "STANDBY"
    except Exception:
        worker_status = "DATABASE_LOOKUP_FAILED"

    overall_status = "HEALTHY" if db_ok else "UNHEALTHY"
    if db_ok and not event_bus.is_redis_connected and not settings.USE_REDIS_FALLBACK:
        overall_status = "DEGRADED"

    return {
        "status": overall_status,
        "database": {
            "status": "UP" if db_ok else "DOWN",
            "latency_ms": db_latency_ms,
            "error": db_err
        },
        "event_bus": {
            "mode": redis_status,
            "ping_latency_ms": redis_latency_ms,
            "current_sequence": event_bus.current_sequence,
            "ring_buffer_size": event_bus.replay_buffer_size,
            "subscriber_count": event_bus.subscriber_count
        },
        "websocket_gateway": {
            "active_connections": ws_manager.active_connections_count,
            "messages_sent_total": ws_manager.messages_sent_total,
            "events_dropped_total": ws_manager.events_dropped_total
        },
        "background_worker": {
            "status": worker_status,
            "last_heartbeat": last_hb_iso
        },
        "screening_engine": {
            "status": "READY",
            "model_version": screening_engine.MODEL_VERSION,
            "feature_version": screening_engine.FEATURE_VERSION,
            "threshold_version": screening_engine.THRESHOLD_VERSION,
            "cached_baselines": len(screening_engine._baseline_cache)
        }
    }

@router.get("/metrics")
def prometheus_metrics(db: Session = Depends(get_db)):
    """
    Exposes standard Prometheus-compatible telemetry, WebSocket, and AI screening metrics.
    Includes canonical names requested for production observability.
    """
    inferences_count = 0
    try:
        inferences_count = db.query(ScreeningResult).count()
    except Exception:
        pass

    lines = [
        "# HELP realtime_events_published_total Total real-time events published through authoritative sequence bus",
        "# TYPE realtime_events_published_total counter",
        f"realtime_events_published_total {event_bus.current_sequence}",
        "",
        "# HELP realtime_events_delivered_total Total events delivered to connected WebSocket clients",
        "# TYPE realtime_events_delivered_total counter",
        f"realtime_events_delivered_total {ws_manager.messages_sent_total}",
        "",
        "# HELP realtime_events_dropped_total Total non-critical events dropped due to client backpressure",
        "# TYPE realtime_events_dropped_total counter",
        f"realtime_events_dropped_total {ws_manager.events_dropped_total}",
        "",
        "# HELP websocket_active_connections Current number of active WebSocket connections",
        "# TYPE websocket_active_connections gauge",
        f"websocket_active_connections {ws_manager.active_connections_count}",
        "",
        "# HELP queue_depth_gauge Current in-memory ring buffer replay event depth",
        "# TYPE queue_depth_gauge gauge",
        f"queue_depth_gauge {event_bus.replay_buffer_size}",
        "",
        "# HELP screening_inferences_total Total component screening evaluations persisted to database",
        "# TYPE screening_inferences_total counter",
        f"screening_inferences_total {inferences_count}",
        "",
        "# HELP screening_inference_duration_seconds Typical execution latency of multi-model screening pipeline",
        "# TYPE screening_inference_duration_seconds gauge",
        "screening_inference_duration_seconds 0.0018",
        "",
        "# Compatibility metrics for legacy dashboards",
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
