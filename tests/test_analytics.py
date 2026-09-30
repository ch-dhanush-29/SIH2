import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.websocket.manager import event_manager
from backend.websocket.events import RealtimeEvent, EventType

client = TestClient(app)

def test_analytics_html_view():
    """Test that the /analytics HTML page renders successfully."""
    response = client.get("/analytics")
    assert response.status_code == 200
    assert "Real-Time Analytics" in response.text
    assert "E-Waste Saathi" in response.text

def test_analytics_summary_endpoint():
    """Test summary endpoint returns actual database operational numbers."""
    response = client.get("/api/v1/analytics/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "active_lots" in data
    assert "total_weight_kg" in data
    assert "total_value_inr" in data
    assert "verified_handovers" in data
    assert "active_anomalies" in data
    assert "recovery_rate_pct" in data
    assert "recovery_metrics" in data
    assert data["data_provenance"] == "LIVE_DATABASE_AGGREGATION"

def test_analytics_collection_trend():
    """Test collection aggregation across different intervals."""
    for interval in ["15m", "1h", "6h", "24h", "7d", "30d"]:
        response = client.get(f"/api/v1/analytics/collection?interval={interval}")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["interval"] == interval
        assert "points" in data
        assert len(data["points"]) > 0

def test_analytics_materials_mix():
    """Test material categories composition."""
    response = client.get("/api/v1/analytics/materials")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "materials" in data
    assert len(data["materials"]) > 0
    total_share = sum(m["share_pct"] for m in data["materials"])
    assert total_share >= 99.0  # Approx 100%

def test_analytics_pricing_matrix():
    """Test fair price intelligence benchmarks."""
    response = client.get("/api/v1/analytics/pricing")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "pricing_matrix" in data
    for item in data["pricing_matrix"]:
        assert "collector_uplift_pct" in item
        assert "fair_price_inr" in item
        assert "benchmark_rate_inr" in item

def test_analytics_anomalies():
    """Test anomaly detection distribution endpoint."""
    response = client.get("/api/v1/analytics/anomalies")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "total_anomalies_detected" in data
    assert "distribution" in data
    assert len(data["distribution"]) > 0

def test_analytics_recyclers_and_collectors():
    """Test recycler and pseudonymized collector analytics."""
    rec_resp = client.get("/api/v1/analytics/recyclers")
    assert rec_resp.status_code == 200
    assert "recyclers" in rec_resp.json()

    col_resp = client.get("/api/v1/analytics/collectors")
    assert col_resp.status_code == 200
    assert "collectors" in col_resp.json()

def test_analytics_impact_and_ai():
    """Test environmental impact and AI CV telemetry."""
    impact_resp = client.get("/api/v1/analytics/impact")
    assert impact_resp.status_code == 200
    imp_data = impact_resp.json()
    assert "metrics" in imp_data
    assert "co2_avoided_kg" in imp_data["metrics"]

    ai_resp = client.get("/api/v1/analytics/ai")
    assert ai_resp.status_code == 200
    ai_data = ai_resp.json()
    assert ai_data["accuracy_benchmark"] == "NOT BENCHMARKED (Demo Simulation & Validation Dataset)"

def test_analytics_system_telemetry():
    """Test system telemetry and runtime stats."""
    response = client.get("/api/v1/analytics/system")
    assert response.status_code == 200
    data = response.json()
    assert "uptime_seconds" in data
    assert "websocket" in data
    assert data["websocket"]["endpoint"] == "/ws/live"
