import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_endpoint():
    res = client.get("/api/v1/health/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "UP"
    assert data["database"] == "HEALTHY"

def test_auth_login():
    res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "isro_admin_2026"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "ADMIN"

def test_list_lots():
    res = client.get("/api/v1/lots/")
    assert res.status_code == 200
    lots = res.json()
    assert len(lots) >= 1

def test_screening_run_endpoint():
    res = client.post("/api/v1/screening/run", json={
        "lot_id": "LOT-2026-04",
        "parameter": "iddq",
        "checkpoint": 24,
        "sensitivity": 0.85,
        "method": "ensemble"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["lot_id"] == "LOT-2026-04"
    assert data["total_screened"] > 0
    # Zero escaped defects on flight lot!
    assert data["escaped_defects"] == 0
    assert data["recall"] >= 0.95
