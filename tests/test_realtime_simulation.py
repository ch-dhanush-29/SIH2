import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.simulation_service import simulation_engine
from backend.websocket.manager import event_manager
from backend.websocket.events import EventType

client = TestClient(app)

def test_websocket_history_endpoint():
    """Verify event history buffer returns structured event log."""
    response = client.get("/api/v1/events/history?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "events" in data

def test_system_runtime_metrics():
    """Verify authentic system metrics endpoint."""
    response = client.get("/api/v1/simulation/system/metrics")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "system" in data
    assert "cpu_percent" in data["system"]
    assert "memory_usage_mb" in data["system"]

def test_simulation_status():
    """Verify live simulation status response structure."""
    response = client.get("/api/v1/simulation/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "data" in data
    assert "stats" in data["data"]

@pytest.mark.asyncio
async def test_simulation_step_execution():
    """Verify stepping through simulation lifecycle events."""
    event = await simulation_engine.step_once()
    assert "event" in event
    assert "category" in event
    assert "timestamp" in event

def test_simulation_speed_adjustment():
    """Verify speed multiplier setter endpoint."""
    response = client.post("/api/v1/simulation/speed", json={"speed": 2.0})
    assert response.status_code == 200
    data = response.json()
    assert data["speed_multiplier"] == 2.0

def test_digital_passport_verification_authentic():
    """Verify cryptographic SHA-256 verification of digital passport."""
    response = client.post("/api/v1/simulation/passport/verify", json={
        "lot_id": "LOT-2026-HYD-4192",
        "collector_name": "Ramesh Kumar",
        "weight_kg": 24.5
    })
    assert response.status_code == 200
    data = response.json()
    assert data["lot_id"] == "LOT-2026-HYD-4192"
    assert data["is_valid"] is True
    assert len(data["calculated_sha256"]) == 64
    assert len(data["blocks"]) == 5

def test_html_portal_routes():
    """Verify all web portals return 200 OK."""
    portals = [
        "/",
        "/dashboard/live",
        "/demo/live",
        "/anomalies",
        "/government",
        "/impact",
        "/passport/verify",
        "/collector",
        "/recycler",
        "/admin"
    ]
    for route in portals:
        resp = client.get(route)
        assert resp.status_code == 200, f"Route {route} failed with {resp.status_code}"
