import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_full_collector_to_recycler_handover_workflow():
    # 1. Collector gets live price board
    board_res = client.get("/api/v1/prices/board")
    assert board_res.status_code == 200
    board = board_res.json()
    assert len(board) > 0
    mat_id = board[0]["material_id"]

    # 2. Collector calculates fair price score
    fair_res = client.post("/api/v1/prices/fair-price-score", json={
        "material_id": mat_id,
        "weight_kg": 18.0,
        "condition_grade": "MIXED_GOOD",
        "city": "Mumbai"
    })
    assert fair_res.status_code == 200
    fair_data = fair_res.json()
    assert fair_data["expected_market_price_inr"] > 0

    # 3. Collector matches authorized recyclers
    match_res = client.post("/api/v1/recyclers/match", json={
        "material_id": mat_id,
        "weight_kg": 18.0,
        "collector_city": "Mumbai",
        "requires_pickup": True
    })
    assert match_res.status_code == 200
    match_data = match_res.json()
    assert match_data["total_found"] > 0
    best_recycler = match_data["best_match"]
    assert best_recycler is not None

    # 4. Collector creates digital lot
    lot_res = client.post("/api/v1/lots", json={
        "material_id": mat_id,
        "collector_weight_kg": 18.0,
        "condition_grade": "MIXED_GOOD",
        "collection_city": "Mumbai",
        "ai_predicted_category": "PCB",
        "ai_confidence": 0.94
    })
    assert lot_res.status_code == 200
    lot = lot_res.json()
    lot_id = lot["id"]

    # 5. Retrieve digital lot passport & QR code
    pass_res = client.get(f"/api/v1/lots/{lot_id}/passport")
    assert pass_res.status_code == 200
    passport = pass_res.json()
    assert "data:image/png;base64," in passport["qr_code_svg_or_base64"]
    assert len(passport["cryptographic_hash"]) == 64

    # 6. Recycler scans QR, verifies physical scale weight, and completes handover
    handover_res = client.post("/api/v1/handover/confirm", json={
        "lot_id": lot_id,
        "verified_weight_kg": 17.6,
        "agreed_rate_per_kg": 150.0,
        "payment_mode": "CASH",
        "signature_notes": "Scale calibrated"
    })
    assert handover_res.status_code == 200
    receipt = handover_res.json()
    assert receipt["verified_final_weight_kg"] == 17.6
    assert receipt["total_payout_inr"] == round(17.6 * 150.0, 2)
    assert len(receipt["digital_receipt_sha256"]) == 64

    # 7. Check collector earnings ledger updated
    ledger_res = client.get("/api/v1/ledger/summary")
    assert ledger_res.status_code == 200
    ledger_sum = ledger_res.json()
    assert ledger_sum["all_time_earnings_inr"] > 0

    # 8. Check admin metrics updated
    admin_res = client.get("/api/v1/admin/metrics")
    assert admin_res.status_code == 200
    metrics = admin_res.json()
    assert metrics["total_lots_registered"] > 0
