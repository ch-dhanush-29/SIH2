import pytest
import json
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from backend.main import app
from backend.app.core.security import create_access_token
from backend.app.services.sources.simulator_source import SimulatorSource
from backend.app.services.sources.replay_source import ReplaySource
from backend.app.services.sources.http_source import HTTPSource
from backend.app.schemas.events import TelemetryIngestPayload

client = TestClient(app)

def test_health_and_metrics_endpoints():
    res = client.get("/api/v1/health/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "UP"
    assert "current_sequence" in data

    res_live = client.get("/api/v1/health/live")
    assert res_live.status_code == 200
    assert res_live.json() == {"status": "ALIVE"}

    res_ready = client.get("/api/v1/health/ready")
    assert res_ready.status_code == 200

    res_metrics = client.get("/api/v1/metrics")
    assert res_metrics.status_code == 200
    assert "burnwatch_telemetry_sequence_total" in res_metrics.text


def test_telemetry_ingestion_and_validation():
    # Valid telemetry ingestion
    payload = {
        "chamber_id": "CH-01",
        "lot_id": "LOT-04",
        "component_id": "IC-RH-00042",
        "parameters": {
            "iddq_ua": 22.4,
            "leakage_na": 5.1,
            "prop_delay_ns": 11.8
        },
        "environment": {
            "temperature_c": 125.0,
            "humidity_percent": 8.0,
            "nitrogen_flow_lpm": 15.0
        }
    }
    res = client.post("/api/v1/telemetry/ingest", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "INGESTED"
    assert "sequence" in data
    assert data["quality_status"] == "VALID"

    # Invalid negative parameter rejected as OUT_OF_RANGE
    invalid_payload = {
        "chamber_id": "CH-01",
        "lot_id": "LOT-04",
        "component_id": "IC-RH-00042",
        "parameters": {
            "iddq_ua": -10.5
        }
    }
    res_bad = client.post("/api/v1/telemetry/ingest", json=invalid_payload)
    assert res_bad.status_code == 200
    assert res_bad.json()["quality_status"] == "OUT_OF_RANGE"


def test_telemetry_idempotency_and_monotonic_sequence():
    evt_id = str(uuid.uuid4())
    payload = {
        "event_id": evt_id,
        "chamber_id": "CH-01",
        "lot_id": "LOT-04",
        "component_id": "IC-RH-00099",
        "parameters": {
            "iddq_ua": 21.0,
            "leakage_na": 4.0,
            "prop_delay_ns": 11.0
        }
    }
    # First post: INGESTED
    res1 = client.post("/api/v1/telemetry/ingest", json=payload)
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["status"] == "INGESTED"
    seq1 = d1["sequence"]

    # Second post with identical event_id: DUPLICATE with same sequence
    res2 = client.post("/api/v1/telemetry/ingest", json=payload)
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["status"] == "DUPLICATE"
    assert d2["sequence"] == seq1

    # Third post with fresh event_id: monotonic increment
    payload3 = dict(payload)
    payload3["event_id"] = str(uuid.uuid4())
    res3 = client.post("/api/v1/telemetry/ingest", json=payload3)
    assert res3.status_code == 200
    d3 = res3.json()
    assert d3["sequence"] > seq1


def test_realtime_snapshot_endpoint():
    res = client.get("/api/v1/realtime/snapshot?lot_id=LOT-04&chamber_id=CH-01")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SNAPSHOT_LOADED"
    assert "sequence" in data
    assert "chamber" in data
    assert data["chamber"]["chamber_id"] == "CH-01"
    assert "lot" in data
    assert data["lot"]["lot_id"] == "LOT-04"
    assert "components" in data
    assert isinstance(data["components"], list)


def test_batch_telemetry_ingestion():
    batch = {
        "chamber_id": "CH-01",
        "lot_id": "LOT-04",
        "items": [
            {
                "component_id": f"IC-BATCH-{i:03d}",
                "parameters": {"iddq_ua": 20.0 + i * 0.1, "leakage_na": 4.0, "prop_delay_ns": 11.0}
            }
            for i in range(10)
        ]
    }
    res = client.post("/api/v1/telemetry/batch", json=batch)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "BATCH_INGESTED"
    assert data["count"] == 10
    assert "start_sequence" in data
    assert "end_sequence" in data
    assert data["end_sequence"] >= data["start_sequence"]


def test_golden_demo_and_simulator_endpoints():
    res_status = client.get("/api/v1/demo/status")
    assert res_status.status_code == 200
    assert "is_running" in res_status.json()

    res_sim = client.get("/api/v1/simulator/status")
    assert res_sim.status_code == 200
    assert "is_running" in res_sim.json()


def test_event_replay_gap_recovery():
    res = client.get("/api/v1/events/replay?from_sequence=1&to_sequence=5")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_websocket_post_connect_auth_and_subscription():
    token = create_access_token(subject="qa_inspector", role="QA_INSPECTOR")
    with client.websocket_connect("/api/v1/ws/live") as ws:
        # 1. Connection ack
        init_data = json.loads(ws.receive_text())
        assert init_data["type"] == "connection_ack"
        assert init_data["status"] == "CONNECTED"

        # 2. Post-connect auth handshake
        ws.send_text(json.dumps({"action": "auth", "token": token}))
        auth_ack = json.loads(ws.receive_text())
        assert auth_ack["type"] == "auth_ack"
        assert auth_ack["status"] == "AUTHENTICATED"

        # 3. Ping / Pong
        ws.send_text(json.dumps({"action": "ping"}))
        pong_data = json.loads(ws.receive_text())
        assert pong_data["type"] == "pong"
        assert pong_data["status"] == "OK"

        # 4. Topic Subscription
        ws.send_text(json.dumps({
            "action": "subscribe",
            "lot_ids": ["LOT-04"],
            "streams": ["telemetry", "anomalies"]
        }))
        sub_ack = json.loads(ws.receive_text())
        assert sub_ack["type"] == "subscription_ack"
        assert sub_ack["status"] == "SUBSCRIBED"


@pytest.mark.asyncio
async def test_telemetry_sources_common_interface():
    # Test SimulatorSource
    sim = SimulatorSource(source_id="test-sim")
    received = []
    async def on_telem(payload: TelemetryIngestPayload):
        received.append(payload)

    await sim.start(on_telem, interval_seconds=0.05)
    assert sim.is_active is True
    # Emit test payload directly
    test_p = TelemetryIngestPayload(
        chamber_id="CH-01",
        lot_id="LOT-04",
        component_id="IC-TEST-01",
        parameters={"iddq_ua": 21.0}
    )
    await sim.emit(test_p)
    assert len(received) >= 1
    assert received[0].component_id == "IC-TEST-01"
    await sim.stop()
    assert sim.is_active is False

    # Test HTTPSource
    http_src = HTTPSource(source_id="test-http")
    http_received = []
    async def on_http(payload: TelemetryIngestPayload):
        http_received.append(payload)
    await http_src.start(on_http)
    await http_src.push_telemetry(test_p)
    assert len(http_received) == 1
    await http_src.stop()
