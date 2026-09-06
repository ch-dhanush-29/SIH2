import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_sync_idempotency_and_batch_processing():
    idempotency_key = f"TEST_SYNC_KEY_{hash('test_1234')}"
    
    payload = {
        "device_id": "TEST_DEVICE_01",
        "items": [
            {
                "local_id": "LOCAL_LOT_01",
                "entity_type": "LOT",
                "idempotency_key": idempotency_key,
                "device_id": "TEST_DEVICE_01",
                "payload": {
                    "material_id": 2,
                    "collector_weight_kg": 15.0,
                    "condition_grade": "MIXED_GOOD",
                    "collection_city": "Mumbai"
                }
            }
        ]
    }
    
    # 1. First sync submission
    res1 = client.post("/api/v1/sync", json=payload)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["synced_count"] == 1
    assert data1["results"][0]["sync_status"] == "SYNCED"
    server_id = data1["results"][0]["server_id"]
    
    # 2. Second identical sync submission (must be idempotent, not duplicate)
    res2 = client.post("/api/v1/sync", json=payload)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["synced_count"] == 1
    assert data2["results"][0]["server_id"] == server_id
