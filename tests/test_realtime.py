import pytest
import json
import asyncio
from fastapi.testclient import TestClient
from backend.main import app
from backend.app.core.security import create_access_token

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

    # Invalid negative parameter rejected
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


def test_websocket_connection_and_subscription():
    token = create_access_token(subject="qa_inspector", role="QA_INSPECTOR")
    with client.websocket_connect(f"/api/v1/ws/live?token={token}") as ws:
        # First message is connection_ack
        init_data = json.loads(ws.receive_text())
        assert init_data["type"] == "connection_ack"
        assert init_data["status"] == "CONNECTED"

        # Send ping
        ws.send_text(json.dumps({"action": "ping"}))
        pong_data = json.loads(ws.receive_text())
        assert pong_data["type"] == "pong"
        assert pong_data["status"] == "OK"

        # Subscribe to lot LOT-04
        ws.send_text(json.dumps({
            "action": "subscribe",
            "lot_ids": ["LOT-04"],
            "streams": ["telemetry", "anomalies"]
        }))
        sub_ack = json.loads(ws.receive_text())
        assert sub_ack["type"] == "subscription_ack"
        assert sub_ack["status"] == "SUBSCRIBED"
