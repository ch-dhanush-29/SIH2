from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from backend.app.database import get_db
from backend.app.models.lot import Lot, LotStatus, LotEvent
from backend.app.models.user import Recycler, Collector, User
from backend.app.models.transaction import HandoverRecord, Transaction, Payment, EarningsLedger, PaymentMode, PaymentStatus
from backend.app.models.intelligence import AnomalyEvent
from backend.app.schemas.lot import HandoverConfirmRequest, HandoverReceiptOut
from backend.app.services.qr_service import qr_service
from backend.app.services.environmental_calculator import environmental_calculator
from backend.app.services.anomaly_detector import anomaly_detector

router = APIRouter(prefix="/handover", tags=["Verifiable Handover & Scale Verification"])

@router.post("/confirm", response_model=HandoverReceiptOut)
def confirm_handover(req: HandoverConfirmRequest, recycler_phone: str = "9811122233", db: Session = Depends(get_db)):
    """
    Verifiable Handover & Recycler Physical Scale Measurement.
    Recycler scans QR code, weighs lot on certified electronic scale, confirms final agreed rate,
    generates SHA-256 cryptographic receipt, and automatically updates the collector's earnings ledger.
    """
    lot = db.query(Lot).filter(Lot.id == req.lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")
        
    user = db.query(User).filter(User.phone == recycler_phone).first()
    recycler = user.recycler_profile if user and user.recycler_profile else db.query(Recycler).first()
    collector = lot.collector

    # Calculate final payout
    final_payout = round(req.verified_weight_kg * req.agreed_rate_per_kg, 2)
    weight_variance = round(req.verified_weight_kg - lot.collector_weight_kg, 2)
    
    # Check for weight discrepancy anomaly (>15% difference between collector and scale)
    w_anomaly = anomaly_detector.check_weight_handover_discrepancy(
        collector_weight_kg=lot.collector_weight_kg,
        verified_weight_kg=req.verified_weight_kg,
        tolerance_pct=15.0
    )
    if w_anomaly:
        anom = AnomalyEvent(
            anomaly_code=f"ANOMALY-WEIGHT-{lot.id}",
            anomaly_type=w_anomaly["anomaly_type"],
            severity=w_anomaly["severity"],
            lot_id=lot.id,
            recycler_id=recycler.id,
            collector_id=collector.id,
            expected_benchmark_value=w_anomaly["expected_benchmark_value"],
            observed_value=w_anomaly["observed_value"],
            deviation_percentage=w_anomaly["deviation_percentage"],
            explanation=w_anomaly["explanation"]
        )
        db.add(anom)

    now = datetime.utcnow()
    handover_count = db.query(HandoverRecord).count() + 1
    handover_code = f"HANDOVER-2026-{handover_count:06d}"
    
    # Generate cryptographic SHA-256 digital receipt hash
    receipt_payload = {
        "handover_code": handover_code,
        "lot_code": lot.lot_code,
        "collector_code": collector.collector_code,
        "recycler_company": recycler.company_name,
        "verified_weight_kg": req.verified_weight_kg,
        "agreed_rate_per_kg": req.agreed_rate_per_kg,
        "final_payout_inr": final_payout,
        "timestamp": str(now)
    }
    receipt_hash = qr_service.generate_handover_hash(receipt_payload)

    # 1. Create HandoverRecord
    handover = HandoverRecord(
        lot_id=lot.id,
        recycler_id=recycler.id,
        handover_code=handover_code,
        verified_weight_kg=req.verified_weight_kg,
        weight_variance_kg=weight_variance,
        agreed_rate_per_kg=req.agreed_rate_per_kg,
        final_payout_inr=final_payout,
        handover_latitude=req.latitude or recycler.latitude,
        handover_longitude=req.longitude or recycler.longitude,
        digital_receipt_sha256=receipt_hash,
        handover_completed_at=now,
        recycler_signature_notes=req.signature_notes or "Verified on calibrated digital scale.",
        collector_confirmed=True
    )
    db.add(handover)

    # 2. Update Lot status & measurements
    lot.status = LotStatus.COMPLETED.value
    lot.verified_weight_kg = req.verified_weight_kg
    lot.final_agreed_price = final_payout
    
    # 3. Calculate Environmental Impact
    impact = environmental_calculator.calculate_lot_impact(lot.material.code, req.verified_weight_kg)

    # 4. Create Transaction & Payment
    tx_count = db.query(Transaction).count() + 1
    tx = Transaction(
        lot_id=lot.id,
        recycler_id=recycler.id,
        collector_id=collector.id,
        transaction_code=f"TXN-2026-MOM-{tx_count:06d}",
        final_amount_inr=final_payout,
        payment_mode=req.payment_mode or PaymentMode.CASH.value,
        payment_reference=req.payment_reference or "SETTLED_AT_SCALE",
        payment_status=PaymentStatus.COMPLETED.value,
        co2_reduction_kg_est=impact["co2_reduction_kg_est"],
        hazardous_waste_diverted_kg=impact["hazardous_waste_diverted_kg"],
        critical_metal_recovered_grams_est=impact["copper_recovered_kg"] * 1000.0 + impact["gold_recovered_grams"],
        is_anomaly_flagged=w_anomaly is not None,
        settled_at=now
    )
    db.add(tx)
    db.flush()

    # 5. Update Collector Earnings Ledger
    ledger = EarningsLedger(
        collector_id=collector.id,
        lot_id=lot.id,
        amount_inr=final_payout,
        payment_mode=req.payment_mode or PaymentMode.CASH.value,
        entry_date=now,
        notes=f"Handover of {req.verified_weight_kg}kg {lot.material.name_en} to {recycler.company_name}"
    )
    db.add(ledger)

    # 6. Update collector formalization & aggregate stats
    collector.total_lots_handed_over += 1
    collector.total_earnings += final_payout
    collector.formalization_score = min(100.0, collector.formalization_score + 2.5)

    # 7. Add Traceability Event
    event = LotEvent(
        lot_id=lot.id,
        event_type="COMPLETED",
        description=f"Verified handover completed: {req.verified_weight_kg}kg @ ₹{req.agreed_rate_per_kg}/kg = ₹{final_payout} paid via {req.payment_mode}. SHA-256 Receipt: {receipt_hash[:16]}...",
        actor_type="RECYCLER",
        actor_id=recycler.id
    )
    db.add(event)

    db.commit()

    return HandoverReceiptOut(
        handover_code=handover_code,
        lot_code=lot.lot_code,
        collector_name=collector.user.name,
        recycler_company_name=recycler.company_name,
        material_name=lot.material.name_en,
        collector_initial_weight_kg=lot.collector_weight_kg,
        verified_final_weight_kg=req.verified_weight_kg,
        weight_variance_kg=weight_variance,
        agreed_rate_per_kg=req.agreed_rate_per_kg,
        total_payout_inr=final_payout,
        payment_mode=req.payment_mode or "CASH",
        payment_status="COMPLETED",
        handover_timestamp=now,
        digital_receipt_sha256=receipt_hash,
        formalization_status="COMPLIANT_EPR_2022"
    )
