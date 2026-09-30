import asyncio
import json
import logging
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
                "event": "CONNECTED",
                "timestamp": datetime.utcnow().isoformat(),
                "data": {
                    "active_connections": len(self.active_connections),
                    "recent_history": self.event_history[-20:]
                },
                "summary": "Connected to E-Waste Saathi Real-Time Event Bus"
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

    async def broadcast(self, event_data: Dict[str, Any], channel: str = "all"):
        # Stamp timestamp if absent
        if "timestamp" not in event_data:
            event_data["timestamp"] = datetime.utcnow().isoformat()
        
        # Save to ring buffer
        self.event_history.append(event_data)
        if len(self.event_history) > self.history_limit:
            self.event_history.pop(0)

        # Broadcast to matching subscribers
        disconnected = []
        for connection in self.active_connections:
            subs = self.subscriptions.get(connection, ["all"])
            if "all" in subs or channel in subs or event_data.get("category") in subs or event_data.get("event") in subs:
                try:
                    await connection.send_json(event_data)
                except Exception:
                    disconnected.append(connection)

        for dead_conn in disconnected:
            self.disconnect(dead_conn)

    def publish_event_sync(self, event_data: Dict[str, Any], channel: str = "all"):
        """Helper to fire events synchronously from database hooks or sync endpoints."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(self.broadcast(event_data, channel))
            else:
                loop.run_until_complete(self.broadcast(event_data, channel))
        except RuntimeError:
            # Fallback if no loop in current thread
            new_loop = asyncio.new_event_loop()
            new_loop.run_until_complete(self.broadcast(event_data, channel))
            new_loop.close()

# Global singleton instance
event_manager = RealtimeEventManager()
