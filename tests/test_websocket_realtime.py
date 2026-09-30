import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.websocket.manager import event_manager
from backend.websocket.events import RealtimeEvent, EventType

client = TestClient(app)

def test_websocket_history_hydration():
    """Test that event history is stored and retrieved correctly."""
    # Add a test event to event manager
    test_event = RealtimeEvent(
        event=EventType.LOT_CREATED,
        category="collection",
        summary="Test history hydration",
        severity="info",
        data={"test_key": "test_val"}
    )
    event_manager.broadcast_sync(test_event)

    response = client.get("/api/v1/events/history?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "events" in data
    assert "total_buffered" in data
    assert any(e["event"] == "LOT_CREATED" for e in data["events"])

def test_websocket_broadcast_api():
    """Test broadcasting events via REST API."""
    payload = {
        "event": "API_BROADCAST_TEST",
        "category": "collection",
        "summary": "Broadcast from REST endpoint",
        "severity": "success",
        "data": {"lot_id": "LOT-TEST-99"}
    }
    response = client.post("/api/v1/events/broadcast", json=payload)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "broadcasted"
    assert res_data["event"] == "API_BROADCAST_TEST"
    assert "event_id" in res_data

def test_anomaly_action_resolution():
    """Test the anomaly triage action endpoint."""
    action_payload = {
        "anomaly_id": "ANOM-8841",
        "action": "APPROVE",
        "notes": "Verified by automated test suite"
    }
    response = client.post("/api/v1/anomalies/action", json=action_payload)
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["status"] == "success"
    assert res_json["action_taken"] == "APPROVE"
    assert res_json["anomaly_id"] == "ANOM-8841"

def test_canonical_websocket_connection():
    """Test WebSocket connection to canonical /ws/live endpoint."""
    with client.websocket_connect("/ws/live") as websocket:
        # Initial connection receives connection ack or history
        # Send PING
        websocket.send_text("PING")
        data = websocket.receive_text()
        assert "PONG" in data or "{" in data
