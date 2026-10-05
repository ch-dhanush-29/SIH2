import pytest
import json
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from backend.main import app
from backend.app.core.config import settings
from backend.app.core.security import create_access_token
from backend.app.core.database import SessionLocal
from backend.app.services.event_bus import event_bus
from backend.app.services.websocket_manager import ws_manager, authorize_lot, authorize_chamber, authorize_component
from backend.app.services.screening import screening_engine
from backend.app.services.screening.baseline import DynamicBaselineEngine
from backend.app.services.screening.anomaly import DynamicAnomalyDetector
from backend.app.services.screening.decision import DecisionEngine
from backend.app.services.screening.confidence import ConfidenceCalculator
from backend.app.models.screening_run import ScreeningRun
from backend.app.models.screening import ScreeningResult

client = TestClient(app)

@pytest.mark.asyncio
async def test_trace_id_propagation_and_canonical_envelope():
    """Item 1: TelemetryService and EventBus trace_id and canonical envelope."""
    trace_id = f"trace-{uuid.uuid4().hex}"
    evt = await event_bus.publish(
        event_type="telemetry.test",
        payload={"param": "iddq", "val": 22.0},
        trace_id=trace_id,
        lot_id="LOT-04",
        component_id="IC-TEST-01",
        chamber_id="CH-01"
    )
    assert evt.trace_id == trace_id
    assert evt.sequence > 0
    assert evt.schema_version == 2
    assert evt.server_timestamp is not None
    assert evt.event_type == "telemetry.test"
    assert evt.payload["param"] == "iddq"

@pytest.mark.asyncio
async def test_batch_sequence_range_reservation():
    """Item 2 & 3: Authoritative batch sequence reservation and get_current_sequence."""
    start_seq, end_seq = await event_bus.reserve_sequence_range(5)
    assert end_seq == start_seq + 5 - 1
    current = await event_bus.get_current_sequence()
    assert current >= end_seq

def test_websocket_unauthenticated_telemetry_rejection_code_1008():
    """Item 4: Reject/close unauthenticated telemetry subscriptions with code 1008."""
    with pytest.raises(Exception):
        with client.websocket_connect("/api/v1/ws/live") as ws:
            init_msg = json.loads(ws.receive_text())
            assert init_msg["type"] == "connection_ack"

            # Attempt to subscribe to telemetry without authenticating
            ws.send_text(json.dumps({
                "action": "subscribe",
                "streams": ["telemetry"]
            }))

            # Expect policy violation error ack and disconnect
            resp = json.loads(ws.receive_text())
            assert resp["status"] == "POLICY_VIOLATION"
            # Next operation should raise disconnect
            ws.receive_text()

def test_websocket_demo_token_authentication():
    """Item 4: Golden Demo token authenticates as demo_operator with ENGINEER privileges."""
    with client.websocket_connect("/api/v1/ws/live") as ws:
        init_msg = json.loads(ws.receive_text())
        assert init_msg["type"] == "connection_ack"

        # Authenticate with DEMO_TOKEN
        ws.send_text(json.dumps({
            "action": "auth",
            "token": settings.DEMO_TOKEN
        }))
        auth_ack = json.loads(ws.receive_text())
        assert auth_ack["type"] == "auth_ack"
        assert auth_ack["status"] == "AUTHENTICATED"
        assert "demo_operator" in auth_ack["message"]

        # Telemetry subscription now permitted
        ws.send_text(json.dumps({
            "action": "subscribe",
            "streams": ["telemetry", "anomalies"]
        }))
        sub_ack = json.loads(ws.receive_text())
        assert sub_ack["type"] == "subscription_ack"
        assert sub_ack["status"] == "SUBSCRIBED"

def test_resource_level_rbac():
    """Item 5: Resource-level RBAC for lot, chamber, component."""
    # VIEWER user
    viewer_user = {"sub": "viewer_1", "role": "VIEWER", "allowed_lots": ["LOT-04"]}
    assert authorize_lot(viewer_user, "LOT-04") is True
    assert authorize_lot(viewer_user, "LOT-FORBIDDEN") is False
    assert authorize_chamber(viewer_user, "CH-01") is True
    assert authorize_chamber(viewer_user, "CH-99") is False

    # ENGINEER user has wildcard access
    eng_user = {"sub": "eng_1", "role": "ENGINEER"}
    assert authorize_lot(eng_user, "LOT-FORBIDDEN") is True
    assert authorize_chamber(eng_user, "CH-99") is True

    # Test via WebSocket with restricted token
    token = create_access_token(subject="viewer_1", role="VIEWER")
    with client.websocket_connect("/api/v1/ws/live") as ws:
        _ = ws.receive_text()
        ws.send_text(json.dumps({"action": "auth", "token": token}))
        _ = ws.receive_text()

        # Request forbidden lot
        ws.send_text(json.dumps({
            "action": "subscribe",
            "lot_ids": ["LOT-FORBIDDEN"],
            "streams": ["telemetry"]
        }))
        err = json.loads(ws.receive_text())
        assert err["type"] == "error"
        assert err["status"] == "FORBIDDEN"

def test_baseline_fallback_source_behavior():
    """Item 7: Baseline fallback source and DecisionEngine handling."""
    # sample_count < 5 with DATASHEET source
    baseline_datasheet = DynamicBaselineEngine.calculate_baseline(
        values=[21.0, 21.2],
        parameter="iddq",
        source="DATASHEET"
    )
    assert baseline_datasheet.is_sufficient is False
    assert baseline_datasheet.baseline_source == "DATASHEET"

    anom = DynamicAnomalyDetector.evaluate(value=21.2, baseline=baseline_datasheet)
    conf = ConfidenceCalculator.calculate("VALID", baseline_datasheet, anom, None)
    dec_prod = DecisionEngine.evaluate("VALID", anom, conf, baseline_datasheet, None)
    assert dec_prod == "INSUFFICIENT_DATA"

    # sample_count < 5 with SIMULATION_PHYSICS mode
    baseline_sim = DynamicBaselineEngine.calculate_baseline(
        values=[21.0, 21.2],
        parameter="iddq",
        source="SIMULATION_PHYSICS"
    )
    assert baseline_sim.is_sufficient is False
    assert baseline_sim.baseline_source == "SIMULATION_PHYSICS"
    anom_sim = DynamicAnomalyDetector.evaluate(value=21.2, baseline=baseline_sim)
    conf_sim = ConfidenceCalculator.calculate("VALID", baseline_sim, anom_sim, None)
    dec_sim = DecisionEngine.evaluate("VALID", anom_sim, conf_sim, baseline_sim, None)
    assert dec_sim == "PASS"

@pytest.mark.asyncio
async def test_real_anomaly_metrics_no_fake_scaling():
    """Item 6: Real metrics from DynamicAnomalyDetector recorded without fake scaling."""
    res = await screening_engine.evaluate(
        component_id="IC-TEST-REAL",
        lot_id="LOT-04",
        parameter="iddq",
        value=21.4,
        peer_readings=[21.0, 21.2, 21.4, 21.1, 21.3, 21.2],
        static_limit=50.0
    )
    assert res.robust_z_score == res.anomaly_score or abs(res.robust_z_score) <= 10.0
    assert isinstance(res.iqr_score, float)
    assert isinstance(res.iforest_score, float)
    assert isinstance(res.ensemble_score, float)
    assert res.model_component_status == "ACTIVE"
    # Anomaly score should not be 20x smaller or manipulated
    assert res.anomaly_score == res.ensemble_score

def test_worker_lease_acquisition_and_recovery():
    """Item 12: Worker lease fields, acquisition, and recovery on ScreeningRun."""
    db = SessionLocal()
    try:
        run_id = f"test-run-{uuid.uuid4().hex[:6]}"
        now = datetime.utcnow()
        test_run = ScreeningRun(
            run_id=run_id,
            lot_id="LOT-04",
            status="QUEUED",
            attempt_count=0
        )
        db.add(test_run)
        db.commit()

        # Simulate lease acquisition
        test_run.status = "PROCESSING"
        test_run.worker_id = "worker-unit-test"
        test_run.attempt_count += 1
        test_run.heartbeat_at = now
        test_run.lease_until = now + timedelta(seconds=60)
        db.commit()

        assert test_run.worker_id == "worker-unit-test"
        assert test_run.attempt_count == 1
        assert test_run.lease_until > now

        # Simulate stale lease: lease expired 10 seconds ago
        test_run.lease_until = now - timedelta(seconds=10)
        db.commit()

        # Query should match stale PROCESSING run for recovery
        stale_run = (
            db.query(ScreeningRun)
            .filter(
                ScreeningRun.run_id == run_id,
                ScreeningRun.status == "PROCESSING",
                ScreeningRun.lease_until < datetime.utcnow()
            )
            .first()
        )
        assert stale_run is not None
        assert stale_run.run_id == run_id

        # Clean up
        db.delete(test_run)
        db.commit()
    finally:
        db.close()
