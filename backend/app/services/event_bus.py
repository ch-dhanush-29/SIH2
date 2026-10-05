import asyncio
import json
import logging
from typing import Dict, Any, List, Optional, Callable, Set, Coroutine
from collections import deque
from datetime import datetime, timezone
import uuid

from backend.app.core.config import settings
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

    async def next_sequence(self, count: int = 1) -> int:
        """
        Authoritatively increments and returns the sequence number.
        If count > 1 (for batch operations), atomically reserves a range
        and returns the FIRST sequence in the reserved block.
        """
        if count <= 0:
            count = 1

        if self._is_redis_connected and self._redis_client:
            try:
                # Redis INCRBY returns the new sequence after addition
                new_seq = await self._redis_client.incrby("burnwatch:sequence:global", count)
                self._current_sequence = new_seq
                # Return the starting sequence of the reserved block
                return new_seq - count + 1
            except Exception as e:
                logger.warning("Redis sequence increment failed: %s. Using local sequence lock.", e)

        async with self._sequence_lock:
            start_seq = self._current_sequence + 1
            self._current_sequence += count
            return start_seq

    async def publish(
        self,
        event_type: str,
        payload: Dict[str, Any],
        lot_id: Optional[str] = None,
        component_id: Optional[str] = None,
        chamber_id: Optional[str] = "CH-01",
        event_id: Optional[str] = None,
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

        # Use pre-allocated sequence if passed from TelemetryService, or allocate new one
        if sequence is not None:
            seq = sequence
            if seq > self._current_sequence:
                self._current_sequence = seq
        else:
            seq = await self.next_sequence(1)

        now_utc = datetime.now(timezone.utc).isoformat()

        event = RealtimeEvent(
            event_id=evt_id,
            event_type=event_type,
            schema_version=1,
            timestamp=timestamp or now_utc,
            server_timestamp=now_utc,
            lot_id=lot_id,
            component_id=component_id,
            chamber_id=chamber_id or "CH-01",
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
                # 1. Append to durable Redis Stream
                await self._redis_client.xadd(
                    "burnwatch:stream:events",
                    {"data": event_json, "seq": str(event.sequence)},
                    maxlen=10000,
                    approximate=True
                )
                # 2. Fanout via PubSub
                pipe = self._redis_client.pipeline()
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

        return event

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
    ) -> List[RealtimeEvent]:
        """
        Retrieves missed sequence events for gap recovery.
        Clamped to max_limit (default 1000) to protect against memory exhaustion.
        """
        if from_sequence <= 0:
            from_sequence = 1
        target_to = to_sequence if to_sequence is not None else self._current_sequence
        if target_to < from_sequence:
            return []

        # Clamp range
        if (target_to - from_sequence + 1) > max_limit:
            target_to = from_sequence + max_limit - 1

        recovered = []
        for seq in range(from_sequence, target_to + 1):
            evt = self._replay_index.get(seq)
            if evt:
                if not lot_id or evt.lot_id == lot_id or evt.lot_id is None:
                    recovered.append(evt)
        return recovered

    @property
    def is_redis_connected(self) -> bool:
        return self._is_redis_connected

    @property
    def current_sequence(self) -> int:
        return self._current_sequence

    async def close(self):
        if self._listener_task:
            self._listener_task.cancel()
        if self._redis_pubsub:
            await self._redis_pubsub.close()
        if self._redis_client:
            await self._redis_client.close()

# Singleton Event Bus instance
event_bus = EventBus()
