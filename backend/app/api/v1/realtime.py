from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException, Depends
from typing import Optional, List
import logging

from backend.app.schemas.events import RealtimeEvent
from backend.app.services.event_bus import event_bus
from backend.app.services.websocket_manager import ws_manager

logger = logging.getLogger("burnwatch.api.realtime")
router = APIRouter(prefix="", tags=["Real-Time & WebSockets"])

@router.websocket("/ws/live")
async def websocket_live_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """
    Primary High-Frequency Real-Time WebSocket Gateway.
    Delivers live telemetry, anomalies, AI inferences, chamber environmental updates, and Golden Demo events.
    Supports JWT authentication, topic subscription filtering, sequence numbers, and ping/pong heartbeats.
    """
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


@router.get("/events/replay", response_model=List[RealtimeEvent])
def replay_events(
    from_sequence: int = Query(..., description="Starting sequence number for missed-event gap recovery"),
    to_sequence: Optional[int] = Query(None, description="Ending sequence number"),
    lot_id: Optional[str] = Query(None, description="Filter recovered events by lot ID")
):
    """
    Recovers missed events when a sequence gap is detected by a client.
    Guarantees no data loss across WebSocket drops or network interruptions.
    """
    recovered = event_bus.get_replay_events(
        from_sequence=from_sequence,
        to_sequence=to_sequence,
        lot_id=lot_id
    )
    return recovered


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
