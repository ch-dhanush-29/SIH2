import asyncio
import json
import logging
import uuid
from typing import List, Dict, Any, Optional
from fastapi import WebSocket
from datetime import datetime
from backend.websocket.events import RealtimeEvent, EventType

logger = logging.getLogger("websocket_manager")

class RealtimeEventManager:
    def __init__(self, history_limit: int = 100):
        self.active_connections: List[WebSocket] = []
        self.subscriptions: Dict[WebSocket, List[str]] = {}
        self.history_limit = history_limit
        self.event_history: List[Dict[str, Any]] = []

    async def connect(self, websocket: WebSocket, initial_channels: Optional[List[str]] = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.subscriptions[websocket] = initial_channels or ["all"]
        
        # Send initial snapshot of recent events
        try:
            await websocket.send_json({
                "event_id": f"EVT-INIT-{uuid.uuid4().hex[:6].upper()}",
                "event": "CONNECTED",
                "category": "system",
                "timestamp": datetime.utcnow().isoformat(),
                "data": {
                    "active_connections": len(self.active_connections),
                    "recent_history": self.event_history[-20:]
                },
                "summary": "Connected to E-Waste Saathi Real-Time Event Bus (/ws/live)",
                "severity": "info"
            })
        except Exception as e:
            logger.warning(f"Failed to send welcome payload: {e}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.subscriptions:
            del self.subscriptions[websocket]

    def subscribe(self, websocket: WebSocket, channels: List[str]):
        if websocket in self.subscriptions:
            self.subscriptions[websocket] = list(set(self.subscriptions[websocket] + channels))

    async def broadcast(self, event_data: Any, channel: str = "all"):
        if hasattr(event_data, "model_dump"):
            event_data = event_data.model_dump()
        elif hasattr(event_data, "dict"):
            event_data = event_data.dict()
        elif not isinstance(event_data, dict):
            event_data = dict(event_data)

        # Ensure event_id is present
        if "event_id" not in event_data or not event_data["event_id"]:
            event_data["event_id"] = f"EVT-{uuid.uuid4().hex[:8].upper()}"
            
        # Ensure timestamp is present
        if "timestamp" not in event_data:
            event_data["timestamp"] = datetime.utcnow().isoformat()
            
        # Ensure severity is valid
        if event_data.get("severity") not in ["info", "success", "warning", "alert"]:
            event_data["severity"] = "info"
        
        # Save to ring buffer
        self.event_history.append(event_data)
        if len(self.event_history) > self.history_limit:
            self.event_history.pop(0)

        # Broadcast to matching subscribers
        disconnected = []
        for connection in list(self.active_connections):
            subs = self.subscriptions.get(connection, ["all"])
            if "all" in subs or channel in subs or event_data.get("category") in subs or event_data.get("event") in subs:
                try:
                    await connection.send_json(event_data)
                except Exception:
                    disconnected.append(connection)

        for dead_conn in disconnected:
            self.disconnect(dead_conn)

    def publish_event_sync(self, event_data: Any, channel: str = "all"):
        """Helper to fire events synchronously from database hooks or sync endpoints."""
        if hasattr(event_data, "model_dump"):
            event_data = event_data.model_dump()
        elif hasattr(event_data, "dict"):
            event_data = event_data.dict()
            
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(self.broadcast(event_data, channel))
            else:
                loop.run_until_complete(self.broadcast(event_data, channel))
        except RuntimeError:
            new_loop = asyncio.new_event_loop()
            new_loop.run_until_complete(self.broadcast(event_data, channel))
            new_loop.close()

    def broadcast_sync(self, event_data: Any, channel: str = "all"):
        """Alias for publish_event_sync."""
        self.publish_event_sync(event_data, channel)

# Global singleton instance
event_manager = RealtimeEventManager()
