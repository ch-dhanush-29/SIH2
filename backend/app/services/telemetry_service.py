import json
import math
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
import uuid
import numpy as np
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.telemetry import TelemetryEvent, AnomalyEvent
from backend.app.models.measurement import Measurement
from backend.app.models.component import Component
from backend.app.models.chamber import Chamber
from backend.app.schemas.events import TelemetryIngestPayload, RealtimeEvent
from backend.app.services.event_bus import event_bus
from backend.app.services.anomaly_detector import DynamicAnomalyDetector
from backend.app.services.drift_predictor import DriftPredictor

logger = logging.getLogger("burnwatch.telemetry_service")

class TelemetryService:
    """
    Authoritative Real-Time Telemetry Ingestion, Validation, Normalization, Persistence,
    and Server-Side AI Screening Pipeline.
    Enforces atomic sequence allocation, strict data quality statuses, and dynamic model-based inference.
    """

    # In-memory streaming lot baseline cache: lot_id -> { param: { 'median': float, 'mad': float, 'dynamic_limit': float } }
    _lot_baselines: Dict[str, Dict[str, Dict[str, float]]] = {}

    @classmethod
    def get_or_compute_lot_baseline(
        cls,
        lot_id: str,
        param: str,
        db: Session,
        static_limit: float = 50.0,
        sensitivity: float = 0.75
    ) -> Dict[str, float]:
        """
        Retrieves or dynamically computes the robust baseline (median, MAD, dynamic limit)
        from historical lot measurements in the database.
        """
        if lot_id in cls._lot_baselines and param in cls._lot_baselines[lot_id]:
            return cls._lot_baselines[lot_id][param]

        # Query baseline from measurements table for this lot
        readings = []
        try:
            records = (
                db.query(Measurement.v_0h)
                .join(Component, Component.id == Measurement.component_id)
                .filter(Component.lot_id == lot_id, Measurement.parameter == param)
                .all()
            )
            readings = [r[0] for r in records if r[0] is not None and not math.isnan(r[0])]
        except Exception as e:
            logger.debug("Database query for lot baseline failed: %s", e)

        if len(readings) >= 10:
            arr = np.array(readings, dtype=float)
            stats = DynamicAnomalyDetector.compute_dynamic_limits(arr, static_limit, sensitivity)
            baseline = {
                "median": float(stats["median"]),
                "mad": float(stats["mad"]),
                "dynamic_limit": float(stats["dynamic_limit"]),
                "sample_count": float(len(readings))
            }
        else:
            # Physics-based semiconductor default for RH-FPGA-500K IDDQ
            baseline = {
                "median": 21.2,
                "mad": 1.1,
                "dynamic_limit": 28.5,
                "sample_count": 0.0
            }

        if lot_id not in cls._lot_baselines:
            cls._lot_baselines[lot_id] = {}
        cls._lot_baselines[lot_id][param] = baseline
        return baseline

    @staticmethod
    def validate_reading(payload: TelemetryIngestPayload) -> Tuple[str, Optional[str]]:
        """
        Validates telemetry reading against physical constraints, NaN/Inf, and clock skew.
        Returns (quality_status, error_message).
        Quality status: 'VALID' | 'OUT_OF_RANGE' | 'CLOCK_SKEW' | 'MISSING'
        """
        if not payload.parameters:
            return "MISSING", "Telemetry payload contains no parameters."

        for param, val in payload.parameters.items():
            if val is None or math.isnan(val) or math.isinf(val):
                return "OUT_OF_RANGE", f"Parameter '{param}' contains invalid NaN or Infinity value."
            if val < 0 and param in ("iddq_ua", "leakage_na", "prop_delay_ns"):
                return "OUT_OF_RANGE", f"Parameter '{param}' cannot be negative ({val})."
            if param == "iddq_ua" and val > 2000.0:
                return "OUT_OF_RANGE", f"IDDQ value {val} exceeds physical sensor saturation limit (2000 µA)."

        if payload.environment:
            temp = payload.environment.get("temperature_c")
            if temp is not None:
                if math.isnan(temp) or math.isinf(temp) or temp < -55.0 or temp > 250.0:
                    return "OUT_OF_RANGE", f"Temperature {temp}°C is outside chamber thermal boundaries (-55°C to +250°C)."

        # Clock skew check
        if payload.timestamp:
            try:
                event_dt = datetime.fromisoformat(payload.timestamp.replace("Z", "+00:00"))
                now_dt = datetime.now(timezone.utc)
                diff_sec = abs((now_dt - event_dt).total_seconds())
                if diff_sec > settings.CLOCK_SKEW_TOLERANCE_SECONDS:
                    logger.warning(
                        "Clock skew detected on event %s: offset is %.2fs (tolerance: %.2fs)",
                        payload.event_id, diff_sec, settings.CLOCK_SKEW_TOLERANCE_SECONDS
                    )
                    return "CLOCK_SKEW", f"Clock skew exceeds tolerance: offset is {diff_sec:.2f}s"
            except Exception:
                pass

        return "VALID", None

    @staticmethod
    async def process_single_telemetry(
        payload: TelemetryIngestPayload,
        db: Session,
        background_eval: bool = True
    ) -> Dict[str, Any]:
        """
        Processes single telemetry item:
        Validate -> Idempotency Check -> Authoritative Sequence -> Persist -> Real-time AI -> Publish Event.
        """
        quality_status, error_msg = TelemetryService.validate_reading(payload)
        now_utc = datetime.now(timezone.utc)
        evt_timestamp = payload.timestamp or now_utc.isoformat()
        evt_id = payload.event_id or str(uuid.uuid4())

        # 1. Idempotency Check
        existing = db.query(TelemetryEvent).filter(TelemetryEvent.event_id == evt_id).first()
        if existing:
            logger.debug("Idempotent hit: event_id '%s' already persisted.", evt_id)
            return {
                "status": "DUPLICATE",
                "event_id": evt_id,
                "sequence": existing.sequence,
                "quality_status": existing.quality_status
            }

        # 2. Authoritative Sequence Allocation (Allocated FIRST before DB insert)
        seq = await event_bus.next_sequence(1)

        # 3. Persist Telemetry Event
        telem_record = TelemetryEvent(
            event_id=evt_id,
            sequence=seq,
            chamber_id=payload.chamber_id,
            lot_id=payload.lot_id,
            component_id=payload.component_id,
            event_type="telemetry",
            parameters_json=json.dumps(payload.parameters),
            environment_json=json.dumps(payload.environment or {}),
            quality_status=quality_status,
            timestamp=datetime.fromisoformat(evt_timestamp.replace("Z", "+00:00")) if "T" in evt_timestamp else now_utc,
            server_timestamp=now_utc,
        )
        db.add(telem_record)

        # 4. Update Chamber Environmental State if environment telemetry is present
        if payload.environment:
            ch = db.query(Chamber).filter(Chamber.chamber_id == payload.chamber_id).first()
            if ch:
                if "temperature_c" in payload.environment:
                    ch.current_temperature_c = payload.environment["temperature_c"]
                if "humidity_percent" in payload.environment:
                    ch.humidity_percent = payload.environment["humidity_percent"]
                if "nitrogen_flow_lpm" in payload.environment:
                    ch.nitrogen_flow_lpm = payload.environment["nitrogen_flow_lpm"]
                ch.updated_at = now_utc

        # 5. Component Real-Time AI Anomaly Inference (Module A & B)
        anomaly_detected = False
        anomaly_data = None
        anom_seq = None

        if payload.component_id and quality_status == "VALID":
            comp = db.query(Component).filter(Component.part_id == payload.component_id).first()
            if comp:
                iddq_val = payload.parameters.get("iddq_ua")
                if iddq_val is not None:
                    static_limit = settings.STATIC_LIMITS.get("iddq", 50.0)
                    baseline = TelemetryService.get_or_compute_lot_baseline(
                        lot_id=payload.lot_id,
                        param="iddq",
                        db=db,
                        static_limit=static_limit
                    )
                    lot_median = baseline["median"]
                    lot_mad = baseline["mad"]
                    dynamic_limit = baseline["dynamic_limit"]

                    # Compute robust Z-score
                    denom = 1.4826 * lot_mad if lot_mad > 0.001 else 1.0
                    robust_z = (iddq_val - lot_median) / denom

                    if iddq_val >= static_limit or iddq_val >= dynamic_limit or robust_z > 3.2:
                        anomaly_detected = True
                        decision = "REJECT" if iddq_val >= static_limit or robust_z > 5.0 else "EARLY_REJECT"
                        anomaly_score = min(100.0, max(0.0, robust_z * 18.5))
                        confidence = round(min(0.99, max(0.80, 0.85 + (robust_z / 10.0) * 0.14)), 3)

                        reasons = []
                        if iddq_val >= static_limit:
                            reasons.append("STATIC_DATASHEET_BREACH")
                        if iddq_val >= dynamic_limit:
                            reasons.append(f"DYNAMIC_LIMIT_EXCEEDED ({iddq_val:.1f}µA > {dynamic_limit:.1f}µA)")
                        if robust_z > 3.2:
                            reasons.append(f"ROBUST_Z_SCORE_ANOMALY ({robust_z:.2f}σ)")

                        # Allocate sequence for anomaly event
                        anom_seq = await event_bus.next_sequence(1)
                        anom_id = str(uuid.uuid4())

                        anom_record = AnomalyEvent(
                            event_id=anom_id,
                            sequence=anom_seq,
                            lot_id=payload.lot_id,
                            component_id=payload.component_id,
                            chamber_id=payload.chamber_id,
                            parameter="iddq",
                            anomaly_score=round(anomaly_score, 2),
                            confidence=confidence,
                            decision=decision,
                            reason_codes_json=json.dumps(reasons),
                            is_resolved=False,
                            timestamp=telem_record.timestamp,
                            server_timestamp=now_utc
                        )
                        db.add(anom_record)

                        comp.status = "REJECT" if decision == "REJECT" else "REVIEW"
                        comp.risk_score = anomaly_score

                        anomaly_data = {
                            "event_id": anom_id,
                            "component_id": payload.component_id,
                            "lot_id": payload.lot_id,
                            "parameter": "iddq",
                            "measured_value": iddq_val,
                            "dynamic_limit": round(dynamic_limit, 2),
                            "static_limit": static_limit,
                            "robust_z": round(robust_z, 2),
                            "anomaly_score": round(anomaly_score, 2),
                            "confidence": confidence,
                            "decision": decision,
                            "reasons": reasons,
                            "recommended_action": "EARLY_REJECT_AT_24H" if decision == "EARLY_REJECT" else "SCRAP"
                        }

        db.commit()

        # 6. Publish Real-Time Telemetry Event to Event Bus with Authoritative Sequence
        published_event = await event_bus.publish(
            event_type="telemetry",
            payload={
                "chamber_id": payload.chamber_id,
                "lot_id": payload.lot_id,
                "component_id": payload.component_id,
                "parameters": payload.parameters,
                "environment": payload.environment or {},
                "quality_status": quality_status,
            },
            lot_id=payload.lot_id,
            component_id=payload.component_id,
            chamber_id=payload.chamber_id,
            event_id=evt_id,
            sequence=seq,
            timestamp=evt_timestamp
        )

        # 7. If anomaly detected, publish critical anomaly event immediately with its allocated sequence!
        if anomaly_detected and anomaly_data:
            await event_bus.publish(
                event_type="anomaly_detected",
                payload=anomaly_data,
                lot_id=payload.lot_id,
                component_id=payload.component_id,
                chamber_id=payload.chamber_id,
                event_id=anomaly_data["event_id"],
                sequence=anom_seq,
                timestamp=evt_timestamp
            )

        return {
            "status": "INGESTED",
            "event_id": evt_id,
            "sequence": published_event.sequence,
            "anomaly_detected": anomaly_detected,
            "quality_status": quality_status
        }

    @staticmethod
    async def process_batch_telemetry(
        chamber_id: str,
        lot_id: str,
        items: List[TelemetryIngestPayload],
        db: Session
    ) -> Dict[str, Any]:
        """
        Batch Telemetry Ingestion with bulk inserts and aggregated event publishing.
        Authoritatively allocates sequence block upfront.
        """
        now_utc = datetime.now(timezone.utc)
        count = len(items)
        if count == 0:
            return {"status": "BATCH_EMPTY", "count": 0, "sequence": event_bus.current_sequence}

        # Atomically reserve consecutive sequence numbers
        start_seq = await event_bus.next_sequence(count)

        records_to_insert = []
        anomalies_detected = []
        items_payload_summary = []

        for idx, item in enumerate(items):
            item.chamber_id = chamber_id
            item.lot_id = lot_id
            quality_status, _ = TelemetryService.validate_reading(item)

            evt_id = item.event_id or str(uuid.uuid4())
            evt_ts = item.timestamp or now_utc.isoformat()
            assigned_seq = start_seq + idx

            rec = TelemetryEvent(
                event_id=evt_id,
                sequence=assigned_seq,
                chamber_id=chamber_id,
                lot_id=lot_id,
                component_id=item.component_id,
                event_type="telemetry",
                parameters_json=json.dumps(item.parameters),
                environment_json=json.dumps(item.environment or {}),
                quality_status=quality_status,
                timestamp=datetime.fromisoformat(evt_ts.replace("Z", "+00:00")) if "T" in evt_ts else now_utc,
                server_timestamp=now_utc
            )
            records_to_insert.append(rec)
            items_payload_summary.append({
                "component_id": item.component_id,
                "parameters": item.parameters,
                "quality_status": quality_status,
                "sequence": assigned_seq
            })

            # Check for static limit breach
            iddq_val = item.parameters.get("iddq_ua")
            if iddq_val and iddq_val > settings.STATIC_LIMITS.get("iddq", 50.0):
                anomalies_detected.append({
                    "component_id": item.component_id,
                    "parameter": "iddq",
                    "value": iddq_val,
                    "decision": "REJECT"
                })

        db.add_all(records_to_insert)
        db.commit()

        # Publish aggregated batch event
        batch_seq = await event_bus.next_sequence(1)
        batch_event = await event_bus.publish(
            event_type="telemetry.batch",
            payload={
                "chamber_id": chamber_id,
                "lot_id": lot_id,
                "count": count,
                "start_sequence": start_seq,
                "end_sequence": start_seq + count - 1,
                "items": items_payload_summary[:100],  # sample preview
                "anomalies_count": len(anomalies_detected)
            },
            lot_id=lot_id,
            chamber_id=chamber_id,
            sequence=batch_seq
        )

        return {
            "status": "BATCH_INGESTED",
            "count": count,
            "start_sequence": start_seq,
            "end_sequence": start_seq + count - 1,
            "sequence": batch_event.sequence,
            "anomalies_count": len(anomalies_detected)
        }
