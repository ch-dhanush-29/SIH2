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
from backend.app.services.screening import screening_engine, ScreeningEvaluationResult

logger = logging.getLogger("burnwatch.telemetry_service")

class TelemetryService:
    """
    Authoritative Real-Time Telemetry Ingestion, Validation, Normalization, Persistence,
    and Server-Side AI Screening Pipeline.
    Enforces atomic sequence allocation, strict data quality statuses, and dynamic model-based inference.
    """

    @classmethod
    def get_peer_readings(cls, lot_id: str, param: str, db: Session) -> List[float]:
        """Queries historical peer lot measurements from the database."""
        try:
            records = (
                db.query(Measurement.v_0h)
                .join(Component, Component.id == Measurement.component_id)
                .filter(Component.lot_id == lot_id, Measurement.parameter == param)
                .limit(500)
                .all()
            )
            return [float(r[0]) for r in records if r[0] is not None and not math.isnan(r[0])]
        except Exception as e:
            logger.debug("Database query for peer readings failed: %s", e)
            return []

    @classmethod
    def get_component_checkpoints(cls, part_id: str, db: Session) -> Tuple[Optional[float], Optional[float]]:
        """Queries 0h and 24h baseline readings for a specific component."""
        try:
            meas = (
                db.query(Measurement)
                .join(Component, Component.id == Measurement.component_id)
                .filter(Component.part_id == part_id, Measurement.parameter == "iddq")
                .first()
            )
            if meas:
                return meas.v_0h, meas.v_24h
        except Exception as e:
            logger.debug("Failed querying component checkpoints: %s", e)
        return None, None

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
            if val < 0 and param in ("iddq", "iddq_ua", "leakage", "leakage_na", "propDelay", "prop_delay_ns"):
                return "OUT_OF_RANGE", f"Parameter '{param}' cannot be negative ({val})."
            if param in ("iddq", "iddq_ua") and val > 2000.0:
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
        Authoritative single telemetry processing:
        1. Validate reading
        2. Idempotency check
        3. Real-time AI Screening via unified ScreeningEngine
        4. Publish to EventBus / Redis Streams (Authoritative Sequence assigned)
        5. Persist to PostgreSQL / SQLite (stamped with event.sequence)
        """
        quality_status, error_msg = TelemetryService.validate_reading(payload)
        now_utc = datetime.now(timezone.utc)
        evt_timestamp = payload.timestamp or now_utc.isoformat()
        evt_id = payload.event_id or str(uuid.uuid4())
        trace_id = payload.trace_id or str(uuid.uuid4())

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

        # 2. Update Chamber Environmental State in DB
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

        # 3. Component Real-Time AI Screening via Unified ScreeningEngine
        eval_res: Optional[ScreeningEvaluationResult] = None
        anomaly_detected = False

        if payload.component_id and quality_status in ("VALID", "CLOCK_SKEW"):
            peer_vals = TelemetryService.get_peer_readings(payload.lot_id, "iddq", db)
            v_0h, v_24h = TelemetryService.get_component_checkpoints(payload.component_id, db)
            iddq_val = payload.parameters.get("iddq_ua", 21.2)

            eval_res = await screening_engine.evaluate(
                component_id=payload.component_id,
                lot_id=payload.lot_id or "LOT-04",
                parameter="iddq",
                value=iddq_val,
                quality_status=quality_status,
                v_0h=v_0h or 21.2,
                v_24h=v_24h or iddq_val,
                peer_readings=peer_vals,
                static_limit=settings.STATIC_LIMITS.get("iddq", 50.0)
            )

            if eval_res.decision in ("EARLY_REJECT", "REJECT", "REVIEW"):
                anomaly_detected = True

                # Update Component entity status
                comp = db.query(Component).filter(Component.part_id == payload.component_id).first()
                if comp:
                    comp.status = "REJECT" if eval_res.decision in ("REJECT", "EARLY_REJECT") else "REVIEW"
                    comp.risk_score = eval_res.anomaly_score

        # 4. Publish Telemetry Event FIRST to EventBus (Authoritative Sequence Source of Truth!)
        published_event = await event_bus.publish(
            event_type="telemetry",
            payload={
                "chamber_id": payload.chamber_id,
                "lot_id": payload.lot_id,
                "component_id": payload.component_id,
                "parameters": payload.parameters,
                "environment": payload.environment or {},
                "quality_status": quality_status,
                "anomaly_score": eval_res.anomaly_score if eval_res else 0.0,
                "decision": eval_res.decision if eval_res else "PASS"
            },
            lot_id=payload.lot_id,
            component_id=payload.component_id,
            chamber_id=payload.chamber_id,
            event_id=evt_id,
            trace_id=trace_id,
            timestamp=evt_timestamp
        )

        # 5. Persist Telemetry Event to Database STAMPED WITH event.sequence
        telem_record = TelemetryEvent(
            event_id=evt_id,
            trace_id=trace_id,
            sequence=published_event.sequence,
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

        # 6. If Anomaly Detected, publish anomaly event to EventBus and persist
        if anomaly_detected and eval_res:
            anom_id = str(uuid.uuid4())
            anom_event = await event_bus.publish(
                event_type="component.anomaly_detected",
                payload={
                    "inference_id": eval_res.inference_id,
                    "component_id": payload.component_id,
                    "lot_id": payload.lot_id,
                    "parameter": "iddq",
                    "measured_value": eval_res.measured_value,
                    "dynamic_limit": eval_res.baseline.dynamic_upper_limit,
                    "static_limit": eval_res.baseline.static_limit,
                    "anomaly_score": eval_res.anomaly_score,
                    "risk_level": eval_res.risk_level,
                    "decision": eval_res.decision,
                    "confidence": eval_res.confidence,
                    "reasons": eval_res.reasons,
                    "forecast": eval_res.forecast.model_dump() if eval_res.forecast else None,
                    "model_version": eval_res.model_version
                },
                lot_id=payload.lot_id,
                component_id=payload.component_id,
                chamber_id=payload.chamber_id,
                event_id=anom_id,
                trace_id=trace_id,
                timestamp=evt_timestamp
            )

            anom_record = AnomalyEvent(
                event_id=anom_id,
                trace_id=trace_id,
                sequence=anom_event.sequence,
                lot_id=payload.lot_id,
                component_id=payload.component_id,
                chamber_id=payload.chamber_id,
                parameter="iddq",
                anomaly_score=eval_res.anomaly_score,
                confidence=eval_res.confidence,
                decision=eval_res.decision,
                reason_codes_json=json.dumps(eval_res.reasons),
                is_resolved=False,
                timestamp=telem_record.timestamp,
                server_timestamp=now_utc
            )
            db.add(anom_record)

        db.commit()

        return {
            "status": "INGESTED",
            "event_id": evt_id,
            "sequence": published_event.sequence,
            "anomaly_detected": anomaly_detected,
            "quality_status": quality_status,
            "decision": eval_res.decision if eval_res else "PASS",
            "confidence": eval_res.confidence if eval_res else 1.0
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
            trace_id = item.trace_id or str(uuid.uuid4())
            evt_ts = item.timestamp or now_utc.isoformat()
            assigned_seq = start_seq + idx

            rec = TelemetryEvent(
                event_id=evt_id,
                trace_id=trace_id,
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

            # Check static datasheet limit breach
            iddq_val = item.parameters.get("iddq_ua")
            if iddq_val and iddq_val >= settings.STATIC_LIMITS.get("iddq", 50.0):
                anomalies_detected.append({
                    "component_id": item.component_id,
                    "parameter": "iddq",
                    "value": iddq_val,
                    "decision": "REJECT"
                })

        db.add_all(records_to_insert)
        db.commit()

        # Publish aggregated batch event
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
            chamber_id=chamber_id
        )

        return {
            "status": "BATCH_INGESTED",
            "count": count,
            "start_sequence": start_seq,
            "end_sequence": start_seq + count - 1,
            "sequence": batch_event.sequence,
            "anomalies_count": len(anomalies_detected)
        }
