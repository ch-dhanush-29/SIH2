import pytest
import asyncio
from datetime import datetime, timezone, timedelta
import uuid

from backend.app.schemas.events import TelemetryIngestPayload, RealtimeEvent
from backend.app.services.event_bus import EventBus
from backend.app.services.telemetry_service import TelemetryService
from backend.app.core.database import SessionLocal

@pytest.mark.asyncio
async def test_redis_disconnect_resilience():
    """
    Simulates Redis disconnection: EventBus must smoothly fall back
    to in-memory ring buffer without throwing unhandled exceptions.
    """
    bus = EventBus()
    bus._is_redis_connected = False
    bus._redis_client = None

    received_events = []
    async def sample_handler(evt):
        received_events.append(evt)

    bus.subscribe("burnwatch:events:global", sample_handler)

    # Publish an event
    evt = await bus.publish(
        event_type="telemetry",
        payload={"param": "iddq", "value": 21.5},
        lot_id="LOT-CHAOS-01",
        component_id="CHIP-01"
    )

    assert evt.sequence > 0
    assert evt.event_id is not None
    assert len(received_events) == 1
    assert received_events[0].sequence == evt.sequence
    assert bus.replay_buffer_size == 1

@pytest.mark.asyncio
async def test_idempotent_duplicate_telemetry_rejection():
    """
    Ingesting the same event_id twice must be recognized as duplicate
    and not re-persisted or double-processed.
    """
    db = SessionLocal()
    try:
        service = TelemetryService()
        event_id = f"test-dup-{uuid.uuid4()}"
        ts = datetime.now(timezone.utc)

        payload1 = TelemetryIngestPayload(
            event_id=event_id,
            chamber_id="CH-01",
            lot_id="LOT-DUP-01",
            component_id="COMP-DUP-01",
            parameters={"iddq": 20.5, "v_0h": 20.0},
            timestamp=ts.isoformat()
        )

        # Ingest 1
        res1 = await service.process_single_telemetry(payload1, db)
        assert res1["status"] == "INGESTED"

        # Ingest 2 with same event_id
        res2 = await service.process_single_telemetry(payload1, db)
        assert res2["status"] in ("DUPLICATE", "DUPLICATE_IGNORED")
        assert res2.get("event_id") == event_id

    finally:
        db.close()

@pytest.mark.asyncio
async def test_clock_skew_detection():
    """
    Telemetry timestamp far in the future (> 10s skew tolerance)
    must be flagged with quality_status = 'CLOCK_SKEW'.
    """
    db = SessionLocal()
    try:
        service = TelemetryService()
        event_id = f"test-skew-{uuid.uuid4()}"
        skewed_ts = datetime.now(timezone.utc) + timedelta(minutes=5)

        payload = TelemetryIngestPayload(
            event_id=event_id,
            chamber_id="CH-01",
            lot_id="LOT-SKEW-01",
            component_id="COMP-SKEW-01",
            parameters={"iddq": 20.5},
            timestamp=skewed_ts.isoformat()
        )

        res = await service.process_single_telemetry(payload, db)
        assert res["status"] == "INGESTED"
        assert res.get("quality_status") == "CLOCK_SKEW"
    finally:
        db.close()

@pytest.mark.asyncio
async def test_out_of_range_detection():
    """
    Physical impossibility (e.g. negative supply current)
    must be flagged with quality_status = 'OUT_OF_RANGE'.
    """
    db = SessionLocal()
    try:
        service = TelemetryService()
        event_id = f"test-oor-{uuid.uuid4()}"
        ts = datetime.now(timezone.utc)

        payload = TelemetryIngestPayload(
            event_id=event_id,
            chamber_id="CH-01",
            lot_id="LOT-OOR-01",
            component_id="COMP-OOR-01",
            parameters={"iddq": -99.9},
            timestamp=ts.isoformat()
        )

        res = await service.process_single_telemetry(payload, db)
        assert res["status"] == "INGESTED"
        assert res.get("quality_status") == "OUT_OF_RANGE"
    finally:
        db.close()

@pytest.mark.asyncio
async def test_replay_retention_boundary():
    """
    When client requests a sequence that fell outside the ring buffer,
    get_replay_events must return 'REPLAY_UNAVAILABLE' to trigger full snapshot resync.
    """
    bus = EventBus()
    bus._is_redis_connected = False
    bus._redis_client = None

    # Artificially set current sequence and fill buffer
    for i in range(1, 15):
        await bus.publish(
            event_type="telemetry",
            payload={"reading": i},
            lot_id="LOT-BUF"
        )

    # Request sequence inside buffer
    status_ok, events = bus.get_replay_events(from_sequence=1, to_sequence=5)
    assert status_ok == "OK"
    assert len(events) == 5

    # Simulate buffer purge by setting oldest sequence higher
    bus._replay_buffer.popleft() # remove seq 1
    # Now requesting seq 1 is older than buffer's oldest event (seq 2)
    status_purged, _ = bus.get_replay_events(from_sequence=1)
    assert status_purged == "REPLAY_UNAVAILABLE"
