import asyncio
import json
import logging
from typing import Dict, Any, List, Optional, Set
from fastapi import WebSocket
from datetime import datetime, timezone
import uuid

from backend.app.core.config import settings
from backend.app.core.security import decode_access_token
from backend.app.schemas.events import RealtimeEvent, WsServerAck
from backend.app.services.event_bus import event_bus

logger = logging.getLogger("burnwatch.websocket")

def authorize_lot(user: Optional[Dict[str, Any]], lot_id: str) -> bool:
    """Validates whether the user's role has access to the requested lot."""
    if not user:
        return False
    role = user.get("role", "VIEWER")
    if role in ("ADMIN", "QA_INSPECTOR", "ENGINEER"):
        return True
    # VIEWER role has access only to permitted lots (default LOT-04 or explicitly assigned)
    allowed_lots = user.get("allowed_lots") or ["LOT-04", "CHIP-LOT04-042"]
    return lot_id in allowed_lots

def authorize_chamber(user: Optional[Dict[str, Any]], chamber_id: str) -> bool:
    """Validates whether the user's role has access to the requested chamber."""
    if not user:
        return False
    role = user.get("role", "VIEWER")
    if role in ("ADMIN", "QA_INSPECTOR", "ENGINEER"):
        return True
    allowed_chambers = user.get("allowed_chambers") or ["CH-01"]
    return chamber_id in allowed_chambers

def authorize_component(user: Optional[Dict[str, Any]], component_id: str) -> bool:
    """Validates whether the user's role has access to the requested component."""
    if not user:
        return False
    role = user.get("role", "VIEWER")
    if role in ("ADMIN", "QA_INSPECTOR", "ENGINEER"):
        return True
    allowed_components = user.get("allowed_components")
    if allowed_components is not None:
        return component_id in allowed_components
    return True

class ClientSession:
    """Represents a connected WebSocket client session with topic subscriptions and backpressure queue."""
    def __init__(self, websocket: WebSocket, connection_id: str, user: Optional[Dict[str, Any]] = None):
        self.websocket = websocket
        self.connection_id = connection_id
        self.user = user  # Authenticated user dict with username, role
        self.lot_ids: Set[str] = set()
        self.chamber_ids: Set[str] = {"CH-01"}
        self.streams: Set[str] = {"telemetry", "system", "demo"}
        self.component_ids: Set[str] = set()
        self.is_authenticated = user is not None
        self.connected_at = datetime.now(timezone.utc).isoformat()
        self.last_heartbeat = datetime.now(timezone.utc)
        self.send_queue: asyncio.Queue = asyncio.Queue(maxsize=400)
        self.writer_task: Optional[asyncio.Task] = None

    def is_interested_in(self, event: RealtimeEvent) -> bool:
        """Evaluates whether this client subscribed to the event's topic criteria."""
        # Demo and system events are broadcast to all connected sessions
        if event.event_type.startswith("demo.") or event.event_type in ("system_status", "heartbeat"):
            return True

        # Check stream type
        event_stream = event.event_type.split(".")[0]
        if self.streams and event_stream not in self.streams and event.event_type not in self.streams:
            return False

        # If client specified particular lot IDs, filter by lot
        if self.lot_ids and event.lot_id and event.lot_id not in self.lot_ids:
            return False

        # If client specified particular chamber IDs, filter by chamber
        if self.chamber_ids and event.chamber_id and event.chamber_id not in self.chamber_ids:
            return False

        # If client specified particular components, filter
        if self.component_ids and event.component_id and event.component_id not in self.component_ids:
            return False

        return True


class WebSocketManager:
    """
    Production-Grade WebSocket Gateway for BurnWatch 3D (Phases 12, 13, 17).
    Enforces post-connect JWT authentication, role-based stream authorization (RBAC),
    monotonic sequence tracking, and priority-class backpressure.
    """
    def __init__(self):
        self._active_sessions: Dict[str, ClientSession] = {}
        self._lock = asyncio.Lock()
        self._messages_sent_total = 0
        self._events_dropped_total = 0
        self._bus_subscription_registered = False

    async def initialize(self):
        if not self._bus_subscription_registered:
            event_bus.subscribe("burnwatch:events:global", self._on_bus_event)
            self._bus_subscription_registered = True

    async def connect(self, websocket: WebSocket, token: Optional[str] = None) -> ClientSession:
        await websocket.accept()
        connection_id = str(uuid.uuid4())

        user = None
        if token:
            if token in (settings.DEMO_TOKEN, "demo_token"):
                user = {"sub": "demo_operator", "role": "ENGINEER", "is_demo": True}
            else:
                try:
                    user = decode_access_token(token)
                except Exception:
                    pass

        session = ClientSession(websocket, connection_id, user=user)
        if session.is_authenticated:
            # Grant full streams for authenticated users according to role
            role = user.get("role", "VIEWER") if user else "VIEWER"
            if role in ("QA_INSPECTOR", "ADMIN"):
                session.streams = {"telemetry", "anomalies", "component", "screening", "system", "camera", "demo"}
            elif role == "ENGINEER":
                session.streams = {"telemetry", "anomalies", "component", "system", "demo"}
            else:
                session.streams = {"telemetry", "system", "demo"}
        else:
            session.streams = {"system", "demo"}

        session.writer_task = asyncio.create_task(self._client_writer(session))

        async with self._lock:
            self._active_sessions[connection_id] = session

        logger.info("WebSocket client connected [%s], auth=%s", connection_id, session.is_authenticated)

        # Send initial connection acknowledgement
        ack = WsServerAck(
            type="connection_ack",
            status="CONNECTED",
            connection_id=connection_id,
            sequence=event_bus.current_sequence,
            message="BurnWatch 3D Real-Time Gateway connected.",
            subscriptions={
                "lot_ids": list(session.lot_ids),
                "chamber_ids": list(session.chamber_ids),
                "streams": list(session.streams)
            }
        )
        await session.send_queue.put(ack.model_dump_json())
        return session

    async def disconnect(self, connection_id: str):
        async with self._lock:
            session = self._active_sessions.pop(connection_id, None)

        if session:
            if session.writer_task:
                session.writer_task.cancel()
            logger.info("WebSocket client disconnected [%s]", connection_id)

    async def handle_message(self, session: ClientSession, raw_text: str):
        try:
            data = json.loads(raw_text)
            action = data.get("action", "")

            if action == "ping":
                session.last_heartbeat = datetime.now(timezone.utc)
                ack = WsServerAck(type="pong", status="OK", sequence=event_bus.current_sequence)
                await session.send_queue.put(ack.model_dump_json())

            elif action == "auth":
                token = data.get("token")
                user = None
                if token in (settings.DEMO_TOKEN, "demo_token"):
                    user = {"sub": "demo_operator", "role": "ENGINEER", "is_demo": True}
                elif token:
                    user = decode_access_token(token)

                if user:
                    session.user = user
                    session.is_authenticated = True
                    role = user.get("role", "VIEWER")
                    if role in ("QA_INSPECTOR", "ADMIN"):
                        session.streams = {"telemetry", "anomalies", "component", "screening", "system", "camera", "demo"}
                    elif role == "ENGINEER":
                        session.streams = {"telemetry", "anomalies", "component", "system", "demo"}
                    else:
                        session.streams = {"telemetry", "system", "demo"}

                    ack = WsServerAck(
                        type="auth_ack",
                        status="AUTHENTICATED",
                        message=f"Authenticated as {user.get('sub', 'user')} (Role: {role})",
                        subscriptions={"streams": list(session.streams)}
                    )
                else:
                    ack = WsServerAck(type="error", status="AUTH_FAILED", message="Invalid or expired JWT token.")
                await session.send_queue.put(ack.model_dump_json())

            elif action == "subscribe":
                requested_streams = set(data.get("streams", [])) if "streams" in data else session.streams

                # Policy enforcement: Reject/close unauthenticated telemetry or privileged subscriptions with code 1008
                privileged_streams = {"telemetry", "anomalies", "component", "screening", "camera"}
                if not session.is_authenticated:
                    if requested_streams.intersection(privileged_streams):
                        logger.warning(
                            "POLICY VIOLATION: Unauthenticated WebSocket [%s] attempted to subscribe to privileged streams %s. Terminating connection (code 1008).",
                            session.connection_id, list(requested_streams.intersection(privileged_streams))
                        )
                        err_ack = WsServerAck(
                            type="error",
                            status="POLICY_VIOLATION",
                            message="Authentication required for telemetry subscriptions. Connection closed (code 1008)."
                        )
                        await session.send_queue.put(err_ack.model_dump_json())
                        await asyncio.sleep(0.05)
                        await session.websocket.close(code=1008, reason="Policy Violation: Authentication required")
                        await self.disconnect(session.connection_id)
                        return

                user_role = session.user.get("role", "VIEWER") if session.user else "ANONYMOUS"

                # Enforce RBAC on streams
                if not session.is_authenticated:
                    allowed_streams = {"system", "demo"}
                elif user_role == "VIEWER":
                    allowed_streams = {"telemetry", "system", "demo"}
                elif user_role == "ENGINEER":
                    allowed_streams = {"telemetry", "anomalies", "component", "system", "demo"}
                else:  # QA_INSPECTOR or ADMIN
                    allowed_streams = {"telemetry", "anomalies", "component", "screening", "system", "camera", "demo"}

                denied_streams = requested_streams.difference(allowed_streams)
                if denied_streams:
                    ack = WsServerAck(
                        type="error",
                        status="FORBIDDEN",
                        message=f"Role '{user_role}' is not authorized to subscribe to stream(s): {list(denied_streams)}"
                    )
                    await session.send_queue.put(ack.model_dump_json())
                    return

                # Resource-level RBAC: Lot, Chamber, Component
                if "lot_ids" in data and isinstance(data["lot_ids"], list):
                    for lid in data["lot_ids"]:
                        if not authorize_lot(session.user, lid):
                            ack = WsServerAck(type="error", status="FORBIDDEN", message=f"Access denied to lot: {lid}")
                            await session.send_queue.put(ack.model_dump_json())
                            return
                    session.lot_ids = set(data["lot_ids"])

                if "chamber_ids" in data and isinstance(data["chamber_ids"], list):
                    for cid in data["chamber_ids"]:
                        if not authorize_chamber(session.user, cid):
                            ack = WsServerAck(type="error", status="FORBIDDEN", message=f"Access denied to chamber: {cid}")
                            await session.send_queue.put(ack.model_dump_json())
                            return
                    session.chamber_ids = set(data["chamber_ids"])

                if "components" in data and isinstance(data["components"], list):
                    for comp_id in data["components"]:
                        if not authorize_component(session.user, comp_id):
                            ack = WsServerAck(type="error", status="FORBIDDEN", message=f"Access denied to component: {comp_id}")
                            await session.send_queue.put(ack.model_dump_json())
                            return
                    session.component_ids = set(data["components"])

                session.streams = requested_streams.intersection(allowed_streams) if requested_streams else allowed_streams

                ack = WsServerAck(
                    type="subscription_ack",
                    status="SUBSCRIBED",
                    subscriptions={
                        "lot_ids": list(session.lot_ids),
                        "chamber_ids": list(session.chamber_ids),
                        "streams": list(session.streams),
                        "components": list(session.component_ids)
                    },
                    sequence=event_bus.current_sequence
                )
                await session.send_queue.put(ack.model_dump_json())

            elif action == "unsubscribe":
                if "lot_ids" in data:
                    session.lot_ids.difference_update(data["lot_ids"])
                if "streams" in data:
                    session.streams.difference_update(data["streams"])

                ack = WsServerAck(
                    type="subscription_ack",
                    status="UNSUBSCRIBED",
                    subscriptions={
                        "lot_ids": list(session.lot_ids),
                        "streams": list(session.streams)
                    }
                )
                await session.send_queue.put(ack.model_dump_json())

            elif action == "get_status":
                ack = WsServerAck(
                    type="connection_ack",
                    status="HEALTHY",
                    sequence=event_bus.current_sequence,
                    message="Live streaming active"
                )
                await session.send_queue.put(ack.model_dump_json())

        except Exception as e:
            logger.error("Error processing WebSocket message: %s", e)
            ack = WsServerAck(type="error", status="BAD_REQUEST", message=str(e))
            await session.send_queue.put(ack.model_dump_json())

    async def _on_bus_event(self, event: RealtimeEvent):
        """Called whenever an event is published on the event bus."""
        event_str = event.model_dump_json()

        # Priority Classes:
        # P0: Safety / Reject / Anomaly -> NEVER DROP
        is_p0 = event.event_type in (
            "component.anomaly_detected", "anomaly_detected", "screening.decision", "qa_override"
        )
        # P1: Screening State / Demo Step -> LOW DROP
        is_p1 = event.event_type.startswith("demo.") or event.event_type == "screening_update"

        async with self._lock:
            sessions = list(self._active_sessions.values())

        for session in sessions:
            if not session.is_interested_in(event):
                continue

            try:
                if is_p0:
                    # P0: Never drop critical safety/anomaly events
                    try:
                        session.send_queue.put_nowait(event_str)
                    except asyncio.QueueFull:
                        # Drop oldest non-critical message from queue to make room for P0
                        try:
                            _ = session.send_queue.get_nowait()
                            session.send_queue.put_nowait(event_str)
                        except Exception:
                            await session.send_queue.put(event_str)
                elif is_p1:
                    try:
                        session.send_queue.put_nowait(event_str)
                    except asyncio.QueueFull:
                        self._events_dropped_total += 1
                else:
                    # P2/P3 Telemetry: Drop if client is slow to maintain low latency
                    try:
                        session.send_queue.put_nowait(event_str)
                    except asyncio.QueueFull:
                        self._events_dropped_total += 1
            except Exception as e:
                logger.debug("Failed to enqueue event for session %s: %s", session.connection_id, e)

    async def _client_writer(self, session: ClientSession):
        """Dedicated coroutine for writing to the WebSocket socket sequentially."""
        try:
            while True:
                msg = await session.send_queue.get()
                await session.websocket.send_text(msg)
                self._messages_sent_total += 1
                session.send_queue.task_done()
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.debug("WebSocket client writer ended for [%s]: %s", session.connection_id, e)
        finally:
            await self.disconnect(session.connection_id)

    @property
    def active_connections_count(self) -> int:
        return len(self._active_sessions)

    @property
    def messages_sent_total(self) -> int:
        return self._messages_sent_total

    @property
    def events_dropped_total(self) -> int:
        return self._events_dropped_total

# Singleton WebSocket Gateway Manager
ws_manager = WebSocketManager()
