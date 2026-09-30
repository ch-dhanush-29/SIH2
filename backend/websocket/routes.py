import asyncio
import json
from typing import List, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from backend.websocket.manager import event_manager
from backend.websocket.events import RealtimeEvent, EventType
from datetime import datetime

router = APIRouter(tags=["WebSocket Real-Time Gateway"])

@router.websocket("/ws/live")
async def websocket_live_endpoint(
    websocket: WebSocket,
    channels: Optional[str] = Query(None)  # comma-separated channels
):
    """
    Standard WebSocket gateway for real-time live events.
    Supports event subscriptions, heartbeats, and category filtering.
    """
    channel_list = [c.strip() for c in channels.split(",")] if channels else ["all"]
    await event_manager.connect(websocket, initial_channels=channel_list)
    
    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                msg = json.loads(raw_data)
                action = msg.get("action")
                
                if action == "PING":
                    await websocket.send_json({
                        "event": "PONG",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                elif action == "SUBSCRIBE":
                    new_channels = msg.get("channels", [])
                    event_manager.subscribe(websocket, new_channels)
                    await websocket.send_json({
                        "event": "SUBSCRIBED",
                        "channels": event_manager.subscriptions.get(websocket, []),
                        "timestamp": datetime.utcnow().isoformat()
                    })
                elif action == "PUBLISH":
                    # For testing / client-originated event propagation
                    event_payload = msg.get("event_data", {})
                    await event_manager.broadcast(event_payload)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        event_manager.disconnect(websocket)
    except Exception:
        event_manager.disconnect(websocket)

@router.get("/api/v1/events/history")
def get_event_history(limit: int = 50, category: Optional[str] = None):
    """Fetch recent broadcast history for instant initial dashboard load."""
    history = event_manager.event_history
    if category:
        history = [e for e in history if e.get("category") == category]
    return {
        "status": "success",
        "total_buffered": len(history),
        "events": history[-limit:]
    }

@router.post("/api/v1/events/broadcast")
async def broadcast_custom_event(event: RealtimeEvent):
    """REST endpoint to broadcast custom simulation or system events."""
    await event_manager.broadcast(event.dict())
    return {"status": "broadcasted", "event": event.event}
