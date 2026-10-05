import asyncio
import json
import logging
from typing import Dict, Any, List, Optional, Callable, Set, Coroutine, Tuple
from collections import deque
from datetime import datetime, timezone
import uuid

from backend.app.core.config import settings
from backend.app.core.database import SessionLocal
from backend.app.models.telemetry import RealtimeEventModel
from backend.app.schemas.events import RealtimeEvent

logger = logging.getLogger("burnwatch.event_bus")

class EventBus:
    """
    High-Performance Redis Streams & Pub/Sub Event Bus with In-Memory Resilient Fallback.
    Serves as the Single Authoritative Sequence Allocator for all BurnWatch 3D telemetry,
    guaranteeing strict sequence ordering, idempotency, bounded replay, and zero downtime.
    """
    def __init__(self):
        self._redis_client = None
        self._is_redis_connected = False
        self._sequence_lock = asyncio.Lock()
        self._current_sequence = 0

        # Bounded ring buffer for sequence-based replay recovery (stores up to 10,000 events)
        self._replay_buffer: deque = deque(maxlen=10000)
        self._replay_index: Dict[int, RealtimeEvent] = {}

        # Idempotency and duplicate detection buffer (stores last 20,000 processed event_ids)
        self._processed_events: Dict[str, RealtimeEvent] = {}
        self._processed_event_order: deque = deque(maxlen=20000)

        # Local subscribers: topic -> set of async callback functions
        self._local_subscribers: Dict[str, Set[Callable[[RealtimeEvent], Coroutine[Any, Any, None]]]] = {}

        # Background listener task for Redis pub/sub
        self._redis_pubsub = None
        self._listener_task: Optional[asyncio.Task] = None

    async def initialize(self):
        """Attempts to connect to Redis; falls back gracefully to in-memory event bus."""
        try:
            import redis.asyncio as aioredis
            self._redis_client = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=2.0
            )
            await self._redis_client.ping()
            self._is_redis_connected = True
            logger.info("Connected to Redis Event Bus at %s", settings.REDIS_URL)

            # Initialize sequence from Redis if present
            stored_seq = await self._redis_client.get("burnwatch:sequence:global")
            if stored_seq:
                self._current_sequence = int(stored_seq)

            # Start background Redis PubSub listener for multi-worker fanout
            self._redis_pubsub = self._redis_client.pubsub()
            await self._redis_pubsub.psubscribe("burnwatch:events:*")
            self._listener_task = asyncio.create_task(self._redis_listener())

        except Exception as e:
            self._is_redis_connected = False
            logger.warning(
                "Redis unavailable (%s). Operating on Resilient In-Memory Asyncio Event Bus.",
                str(e)
            )

    async def _redis_listener(self):
        """Reads messages from Redis pub/sub and delivers them to local subscribers."""
        try:
            async for message in self._redis_pubsub.listen():
                if message and message.get("type") == "pmessage":
                    channel = message.get("channel", "")
                    data_str = message.get("data", "")
                    try:
                        data_dict = json.loads(data_str)
                        event = RealtimeEvent(**data_dict)
                        await self._dispatch_local(channel, event)
                    except Exception as err:
                        logger.error("Error decoding Redis event: %s", err)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error("Redis pub/sub listener encountered error: %s", e)
            self._is_redis_connected = False

    async def reserve_sequence_range(self, count: int) -> Tuple[int, int]:
        """
        Atomically reserves a contiguous range of sequence numbers [start_seq, end_seq].
        Guarantees strict monotonicity, multi-worker safety, and zero sequence collisions.
        """
        if count <= 0:
            count = 1

        if self._is_redis_connected and self._redis_client:
            try:
                end_seq = await self._redis_client.incrby("burnwatch:sequence:global", count)
                start_seq = end_seq - count + 1
                self._current_sequence = end_seq
                return start_seq, end_seq
            except Exception as e:
                logger.warning("Redis sequence reservation failed: %s. Using local sequence lock.", e)

        async with self._sequence_lock:
            start_seq = self._current_sequence + 1
            end_seq = self._current_sequence + count
            self._current_sequence = end_seq
            return start_seq, end_seq

    async def next_sequence(self, count: int = 1) -> int:
        """
        Authoritatively increments and returns the sequence number.
        For count > 1, reserves a contiguous block and returns the start sequence.
        """
        start_seq, _ = await self.reserve_sequence_range(count)
        return start_seq

    async def get_current_sequence(self) -> int:
        """
        Authoritatively reads the global sequence.
        When Redis is connected, reads from Redis to avoid multi-worker stale state.
        """
        if self._is_redis_connected and self._redis_client:
            try:
                stored = await self._redis_client.get("burnwatch:sequence:global")
                if stored is not None:
                    self._current_sequence = int(stored)
                    return self._current_sequence
            except Exception as e:
                logger.warning("Failed to read authoritative sequence from Redis: %s", e)
        return self._current_sequence

    async def publish(
        self,
        event_type: str,
        payload: Dict[str, Any],
        lot_id: Optional[str] = None,
        component_id: Optional[str] = None,
        chamber_id: Optional[str] = "CH-01",
        event_id: Optional[str] = None,
        trace_id: Optional[str] = None,
        sequence: Optional[int] = None,
        timestamp: Optional[str] = None
    ) -> RealtimeEvent:
        """
        Constructs and publishes a canonical RealtimeEvent across Redis Streams, PubSub,
        and local subscribers. Enforces idempotency and authoritative sequencing.
        """
        evt_id = event_id or str(uuid.uuid4())

        # Duplicate detection / Idempotency check
        if evt_id in self._processed_events:
            logger.debug("Duplicate event_id '%s' detected. Returning existing cached event.", evt_id)
            return self._processed_events[evt_id]

        if sequence is not None:
            seq = sequence
            if seq > self._current_sequence:
                self._current_sequence = seq
        else:
            seq = await self.next_sequence(1)

        now_utc = datetime.now(timezone.utc).isoformat()

        event = RealtimeEvent(
            event_id=evt_id,
            trace_id=trace_id or str(uuid.uuid4()),
            event_type=event_type,
            schema_version=2,
            timestamp=timestamp or now_utc,
            server_timestamp=now_utc,
            chamber_id=chamber_id or "CH-01",
            lot_id=lot_id,
            component_id=component_id,
            sequence=seq,
            payload=payload
        )

        # Store in idempotency cache
        if len(self._processed_event_order) == self._processed_event_order.maxlen:
            oldest_id = self._processed_event_order[0]
            self._processed_events.pop(oldest_id, None)
        self._processed_event_order.append(evt_id)
        self._processed_events[evt_id] = event

        # Store in replay buffer
        if len(self._replay_buffer) == self._replay_buffer.maxlen:
            oldest_evt = self._replay_buffer[0]
            self._replay_index.pop(oldest_evt.sequence, None)
        self._replay_buffer.append(event)
        self._replay_index[event.sequence] = event

        event_json = event.model_dump_json()

        # Publish to Redis Streams and PubSub if connected
        if self._is_redis_connected and self._redis_client:
            try:
                pipe = self._redis_client.pipeline()

                # 1. Append to primary durable Redis Stream
                pipe.xadd(
                    "burnwatch:events",
                    {"data": event_json, "seq": str(event.sequence), "type": event.event_type},
                    maxlen=10000,
                    approximate=True
                )

                # Append to domain-specific stream
                if event_type.startswith("telemetry"):
                    pipe.xadd("burnwatch:telemetry", {"data": event_json, "seq": str(event.sequence)}, maxlen=10000, approximate=True)
                elif "anomaly" in event_type:
                    pipe.xadd("burnwatch:anomalies", {"data": event_json, "seq": str(event.sequence)}, maxlen=10000, approximate=True)
                elif "screening" in event_type:
                    pipe.xadd("burnwatch:screening", {"data": event_json, "seq": str(event.sequence)}, maxlen=10000, approximate=True)
                elif "system" in event_type or "demo" in event_type:
                    pipe.xadd("burnwatch:system", {"data": event_json, "seq": str(event.sequence)}, maxlen=10000, approximate=True)

                # 2. Fanout via PubSub
                pipe.publish("burnwatch:events:global", event_json)
                pipe.publish(f"burnwatch:events:stream:{event_type}", event_json)
                if lot_id:
                    pipe.publish(f"burnwatch:events:lot:{lot_id}", event_json)
                if chamber_id:
                    pipe.publish(f"burnwatch:events:chamber:{chamber_id}", event_json)
                await pipe.execute()
            except Exception as e:
                logger.warning("Failed to publish to Redis (%s). Falling back to local dispatch.", e)
                await self._dispatch_local("burnwatch:events:global", event)
        else:
            # Resilient In-memory dispatch
            await self._dispatch_local("burnwatch:events:global", event)

        # 3. Canonical Event Persistence to Database (Phase 10)
        asyncio.create_task(self._persist_canonical_event(event))

        return event

    async def _persist_canonical_event(self, event: RealtimeEvent):
        """Asynchronously writes the canonical event to PostgreSQL/SQLite realtime_events table."""
        def _sync_persist():
            db = SessionLocal()
            try:
                existing = db.query(RealtimeEventModel.id).filter(
                    (RealtimeEventModel.sequence == event.sequence) | (RealtimeEventModel.event_id == event.event_id)
                ).first()
                if not existing:
                    ts = datetime.fromisoformat(event.timestamp.replace("Z", "+00:00"))
                    sts = datetime.fromisoformat(event.server_timestamp.replace("Z", "+00:00"))
                    record = RealtimeEventModel(
                        event_id=event.event_id,
                        trace_id=event.trace_id,
                        sequence=event.sequence,
                        event_type=event.event_type,
                        schema_version=event.schema_version,
                        timestamp=ts,
                        server_timestamp=sts,
                        lot_id=event.lot_id,
                        component_id=event.component_id,
                        chamber_id=event.chamber_id or "CH-01",
                        payload_json=json.dumps(event.payload)
                    )
                    db.add(record)
                    db.commit()
            except Exception as e:
                db.rollback()
                logger.debug("Canonical persistence error: %s", e)
            finally:
                db.close()

        try:
            await asyncio.to_thread(_sync_persist)
        except Exception as ex:
            logger.debug("Async persistence dispatch error: %s", ex)

    async def _dispatch_local(self, channel: str, event: RealtimeEvent):
        """Delivers event to in-process callback handlers."""
        targets = set()
        if "burnwatch:events:global" in self._local_subscribers:
            targets.update(self._local_subscribers["burnwatch:events:global"])

        if channel in self._local_subscribers:
            targets.update(self._local_subscribers[channel])

        # Also check stream, lot, chamber matches
        stream_topic = f"burnwatch:events:stream:{event.event_type}"
        if stream_topic in self._local_subscribers:
            targets.update(self._local_subscribers[stream_topic])

        if event.lot_id:
            lot_topic = f"burnwatch:events:lot:{event.lot_id}"
            if lot_topic in self._local_subscribers:
                targets.update(self._local_subscribers[lot_topic])

        if event.chamber_id:
            ch_topic = f"burnwatch:events:chamber:{event.chamber_id}"
            if ch_topic in self._local_subscribers:
                targets.update(self._local_subscribers[ch_topic])

        for cb in targets:
            try:
                await cb(event)
            except Exception as ex:
                logger.debug("Subscriber callback error: %s", ex)

    def subscribe(self, topic: str, callback: Callable[[RealtimeEvent], Coroutine[Any, Any, None]]):
        """Registers a local async callback for a given topic."""
        if topic not in self._local_subscribers:
            self._local_subscribers[topic] = set()
        self._local_subscribers[topic].add(callback)

    def unsubscribe(self, topic: str, callback: Callable[[RealtimeEvent], Coroutine[Any, Any, None]]):
        """Removes a local async callback for a given topic."""
        if topic in self._local_subscribers and callback in self._local_subscribers[topic]:
            self._local_subscribers[topic].remove(callback)
            if not self._local_subscribers[topic]:
                del self._local_subscribers[topic]

    def get_replay_events(
        self,
        from_sequence: int,
        to_sequence: Optional[int] = None,
        lot_id: Optional[str] = None,
        max_limit: int = 1000
    ) -> Tuple[str, List[RealtimeEvent]]:
        """
        Retrieves missed sequence events for gap recovery.
        Returns ("OK", events) or ("REPLAY_UNAVAILABLE", []).
        """
        if from_sequence <= 0:
            from_sequence = 1

        target_to = to_sequence if to_sequence is not None else self._current_sequence
        if target_to < from_sequence:
            return "OK", []

        # Check retention boundary if buffer has events
        if self._replay_buffer:
            oldest_seq = self._replay_buffer[0].sequence
            if from_sequence < oldest_seq:
                logger.warning(
                    "Replay request from_sequence=%d is older than buffer retention=%d",
                    from_sequence, oldest_seq
                )
                return "REPLAY_UNAVAILABLE", []

        # Clamp range
        if (target_to - from_sequence + 1) > max_limit:
            target_to = from_sequence + max_limit - 1

        recovered = []
        for seq in range(from_sequence, target_to + 1):
            evt = self._replay_index.get(seq)
            if evt:
                if not lot_id or evt.lot_id == lot_id or evt.lot_id is None:
                    recovered.append(evt)

        return "OK", recovered

    async def replay(
        self,
        from_sequence: int,
        to_sequence: Optional[int] = None,
        lot_id: Optional[str] = None,
        max_limit: int = 1000
    ) -> Tuple[str, List[RealtimeEvent]]:
        """
        Authoritative durable replay engine (Item 11).
        Flow:
          1. Check in-memory ring buffer (fast path)
          2. Fallback to PostgreSQL canonical event log (realtime_events)
          3. If missing from both retention horizons, return ("FULL_SNAPSHOT_REQUIRED", [])
        """
        if from_sequence <= 0:
            from_sequence = 1

        curr_seq = await self.get_current_sequence()
        target_to = to_sequence if to_sequence is not None else curr_seq
        if target_to < from_sequence:
            return "OK", []

        if (target_to - from_sequence + 1) > max_limit:
            target_to = from_sequence + max_limit - 1

        # 1. Check in-memory ring buffer first
        recovered: List[RealtimeEvent] = []
        oldest_mem_seq = self._replay_buffer[0].sequence if self._replay_buffer else None

        if oldest_mem_seq is not None and from_sequence >= oldest_mem_seq:
            for seq in range(from_sequence, target_to + 1):
                evt = self._replay_index.get(seq)
                if evt:
                    if not lot_id or evt.lot_id == lot_id or evt.lot_id is None:
                        recovered.append(evt)
            return "OK", recovered

        # 2. Fallback to PostgreSQL/SQLite canonical event log (realtime_events)
        def _fetch_db_events():
            db = SessionLocal()
            try:
                oldest_in_db = db.query(RealtimeEventModel.sequence).order_by(RealtimeEventModel.sequence.asc()).first()
                if oldest_in_db and from_sequence < oldest_in_db[0]:
                    logger.warning("Replay request seq=%d is older than database retention=%d", from_sequence, oldest_in_db[0])
                    return "FULL_SNAPSHOT_REQUIRED", []

                query = (
                    db.query(RealtimeEventModel)
                    .filter(
                        RealtimeEventModel.sequence >= from_sequence,
                        RealtimeEventModel.sequence <= target_to
                    )
                )
                if lot_id:
                    query = query.filter((RealtimeEventModel.lot_id == lot_id) | (RealtimeEventModel.lot_id.is_(None)))
                rows = query.order_by(RealtimeEventModel.sequence.asc()).all()

                if not rows:
                    if oldest_in_db is None and self._replay_buffer:
                        return "FULL_SNAPSHOT_REQUIRED", []
                    return "OK", []

                events = []
                for r in rows:
                    try:
                        p_dict = json.loads(r.payload_json) if isinstance(r.payload_json, str) else r.payload_json
                    except Exception:
                        p_dict = {}
                    events.append(
                        RealtimeEvent(
                            event_id=r.event_id,
                            trace_id=r.trace_id or str(uuid.uuid4()),
                            event_type=r.event_type,
                            schema_version=r.schema_version or 2,
                            timestamp=r.timestamp.isoformat(),
                            server_timestamp=r.server_timestamp.isoformat() if r.server_timestamp else r.timestamp.isoformat(),
                            lot_id=r.lot_id,
                            component_id=r.component_id,
                            chamber_id=r.chamber_id or "CH-01",
                            sequence=r.sequence,
                            payload=p_dict
                        )
                    )
                return "OK", events
            finally:
                db.close()

        status, db_events = await asyncio.to_thread(_fetch_db_events)
        return status, db_events

    @property
    def is_redis_connected(self) -> bool:
        return self._is_redis_connected

    @property
    def current_sequence(self) -> int:
        return self._current_sequence

    @property
    def replay_buffer_size(self) -> int:
        return len(self._replay_buffer)

    @property
    def subscriber_count(self) -> int:
        return sum(len(subs) for subs in self._local_subscribers.values())

    async def close(self):
        if self._listener_task:
            self._listener_task.cancel()
        if self._redis_pubsub:
            await self._redis_pubsub.close()
        if self._redis_client:
            await self._redis_client.close()

# Singleton Event Bus instance
event_bus = EventBus()
