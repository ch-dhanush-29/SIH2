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
    High-Performance Redis Pub/Sub Event Bus with In-Memory Asyncio Fallback.
    Ensures zero downtime, topic-based subscription fan-out, and bounded replay buffer.
    """
    def __init__(self):
        self._redis_client = None
        self._is_redis_connected = False
        self._sequence_lock = asyncio.Lock()
        self._current_sequence = 0
        
        # Bounded ring buffer for sequence-based replay recovery (stores last 5,000 events)
        self._replay_buffer: deque = deque(maxlen=5000)
        self._replay_index: Dict[int, RealtimeEvent] = {}

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

            # Start background Redis PubSub listener
            self._redis_pubsub = self._redis_client.pubsub()
            await self._redis_pubsub.psubscribe("burnwatch:events:*")
            self._listener_task = asyncio.create_task(self._redis_listener())

        except Exception as e:
            self._is_redis_connected = False
            logger.warning(
                "Redis unavailable (%s). Falling back to resilient In-Memory Asyncio Event Bus.",
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

    async def next_sequence(self) -> int:
        """Atomically increments and returns the next sequence number."""
        if self._is_redis_connected and self._redis_client:
            try:
                return await self._redis_client.incr("burnwatch:sequence:global")
            except Exception:
                pass
        
        async with self._sequence_lock:
            self._current_sequence += 1
            return self._current_sequence

    async def publish(
        self,
        event_type: str,
        payload: Dict[str, Any],
        lot_id: Optional[str] = None,
        component_id: Optional[str] = None,
        chamber_id: Optional[str] = "CH-01",
        event_id: Optional[str] = None,
        timestamp: Optional[str] = None
    ) -> RealtimeEvent:
        """
        Constructs and publishes a canonical RealtimeEvent across Redis and local subscribers.
        """
        seq = await self.next_sequence()
        now_utc = datetime.now(timezone.utc).isoformat()

        event = RealtimeEvent(
            event_id=event_id or str(uuid.uuid4()),
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

        # Store in replay buffer
        if len(self._replay_buffer) == self._replay_buffer.maxlen:
            oldest = self._replay_buffer[0]
            self._replay_index.pop(oldest.sequence, None)
        self._replay_buffer.append(event)
        self._replay_index[event.sequence] = event

        event_json = event.model_dump_json()

        # Publish to Redis if connected
        if self._is_redis_connected and self._redis_client:
            try:
                pipe = self._redis_client.pipeline()
                pipe.publish("burnwatch:events:global", event_json)
                pipe.publish(f"burnwatch:events:stream:{event_type}", event_json)
                if lot_id:
                    pipe.publish(f"burnwatch:events:lot:{lot_id}", event_json)
                if chamber_id:
                    pipe.publish(f"burnwatch:events:chamber:{chamber_id}", event_json)
                await pipe.execute()
            except Exception as e:
                logger.warning("Failed to publish to Redis: %s. Falling back to local dispatch.", e)
                await self._dispatch_local("burnwatch:events:global", event)
        else:
            # In-memory dispatch
            await self._dispatch_local("burnwatch:events:global", event)

        return event

    async def _dispatch_local(self, channel: str, event: RealtimeEvent):
        """Delivers event to in-process callback handlers."""
        # Deliver to global subscribers
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
        lot_id: Optional[str] = None
    ) -> List[RealtimeEvent]:
        """Retrieves missed sequence events for gap recovery."""
        target_to = to_sequence or (self._current_sequence)
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
