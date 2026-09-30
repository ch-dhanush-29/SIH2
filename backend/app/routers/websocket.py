import asyncio
from backend.websocket.manager import event_manager
from backend.websocket.events import RealtimeEvent, EventType
from fastapi import APIRouter

router = APIRouter(tags=["Realtime WebSocket Gateway"])

async def notify_live_event(event_dict: dict):
    """External helper to broadcast real events to all connected WebSocket clients via event_manager."""
    await event_manager.broadcast(event_dict)
