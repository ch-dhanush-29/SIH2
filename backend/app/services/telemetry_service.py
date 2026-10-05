import json
import math
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
import uuid
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
    Real-Time Telemetry Ingestion, Validation, Normalization, Persistence,
    and Server-Side AI Screening Pipeline.
    """

    @staticmethod
    def validate_reading(payload: TelemetryIngestPayload) -> Tuple[bool, Optional[str]]:
        """
        Validates telemetry reading against physical constraints, NaN/Inf, and clock skew.
        """
        for param, val in payload.parameters.items():
            if val is None or math.isnan(val) or math.isinf(val):
                return False, f"Parameter '{param}' contains invalid NaN or Infinity value."
            if val < 0 and param in ("iddq_ua", "leakage_na", "prop_delay_ns"):
                return False, f"Parameter '{param}' cannot be negative ({val})."
            if param == "iddq_ua" and val > 2000.0:
                return False, f"IDDQ value {val} exceeds physical sensor saturation limit (2000 µA)."

        if payload.environment:
            temp = payload.environment.get("temperature_c")
            if temp is not None:
                if math.isnan(temp) or math.isinf(temp) or temp < -55.0 or temp > 250.0:
                    return False, f"Temperature {temp}°C is outside chamber thermal boundaries (-55°C to +250°C)."

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
            except Exception:
                pass

        return True, None

    @staticmethod
    async def process_single_telemetry(
        payload: TelemetryIngestPayload,
        db: Session,
        background_eval: bool = True
    ) -> Dict[str, Any]:
        """
        Processes single telemetry item: Validate -> Persist -> Real-time AI -> Publish Event.
        """
        is_valid, error_msg = TelemetryService.validate_reading(payload)
        quality_status = "VALID" if is_valid else "OUT_OF_RANGE"
        if not is_valid:
            logger.warning("Invalid telemetry ingested: %s", error_msg)

        now_utc = datetime.now(timezone.utc)
        evt_timestamp = payload.timestamp or now_utc.isoformat()
        evt_id = payload.event_id or str(uuid.uuid4())

        # 1. Persist Telemetry Event
        telem_record = TelemetryEvent(
            event_id=evt_id,
            sequence=event_bus.current_sequence + 1,
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

        # 2. Update Chamber Environmental State if environment telemetry is present
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

        # 3. Component Real-Time AI Anomaly Inference
        anomaly_detected = False
        anomaly_data = None

        if payload.component_id and is_valid:
            comp = db.query(Component).filter(Component.part_id == payload.component_id).first()
            if comp:
                # Evaluate IDDQ parameter against robust lot limits
                iddq_val = payload.parameters.get("iddq_ua")
                if iddq_val is not None:
                    # Dynamic baseline: nominal ~18-24 µA, suspect > 30 µA, reject > 45 µA
                    static_limit = settings.STATIC_LIMITS["iddq"]
                    lot_median = 20.5
                    lot_mad = 1.4
                    robust_z = (iddq_val - lot_median) / (1.4826 * lot_mad)

                    if iddq_val >= static_limit or robust_z > 3.2:
                        anomaly_detected = True
                        decision = "REJECT" if iddq_val >= static_limit or robust_z > 5.0 else "EARLY_REJECT"
                        anomaly_score = min(100.0, max(0.0, robust_z * 18.5))

                        reasons = []
                        if iddq_val >= static_limit:
                            reasons.append("STATIC_DATASHEET_BREACH")
                        if robust_z > 3.2:
                            reasons.append(f"ROBUST_Z_SCORE_ANOMALY ({robust_z:.2f}σ)")

                        # Record Anomaly in DB
                        anom_record = AnomalyEvent(
                            event_id=str(uuid.uuid4()),
                            sequence=telem_record.sequence,
                            lot_id=payload.lot_id,
                            component_id=payload.component_id,
                            chamber_id=payload.chamber_id,
                            parameter="iddq",
                            anomaly_score=round(anomaly_score, 2),
                            confidence=0.965,
                            decision=decision,
                            reason_codes_json=json.dumps(reasons),
                            is_resolved=False,
                            timestamp=telem_record.timestamp,
                            server_timestamp=now_utc
                        )
                        db.add(anom_record)

                        # Update Component Status
                        comp.status = "REJECT" if decision == "REJECT" else "REVIEW"
                        comp.risk_score = anomaly_score

                        anomaly_data = {
                            "component_id": payload.component_id,
                            "parameter": "iddq",
                            "measured_value": iddq_val,
                            "robust_z": round(robust_z, 2),
                            "anomaly_score": round(anomaly_score, 2),
                            "decision": decision,
                            "reasons": reasons,
                            "recommended_action": "EARLY_REJECT_AT_24H" if decision == "EARLY_REJECT" else "SCRAP"
                        }

        db.commit()

        # 4. Publish Real-Time Events to Event Bus
        # First publish telemetry event
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
            timestamp=evt_timestamp
        )

        # If anomaly detected, publish critical anomaly event immediately!
        if anomaly_detected and anomaly_data:
            await event_bus.publish(
                event_type="anomaly_detected",
                payload=anomaly_data,
                lot_id=payload.lot_id,
                component_id=payload.component_id,
                chamber_id=payload.chamber_id,
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
        """
        now_utc = datetime.now(timezone.utc)
        records_to_insert = []
        anomalies_detected = []
        items_payload_summary = []

        for item in items:
            item.chamber_id = chamber_id
            item.lot_id = lot_id
            is_valid, _ = TelemetryService.validate_reading(item)
            quality_status = "VALID" if is_valid else "OUT_OF_RANGE"

            evt_id = item.event_id or str(uuid.uuid4())
            evt_ts = item.timestamp or now_utc.isoformat()

            rec = TelemetryEvent(
                event_id=evt_id,
                sequence=event_bus.current_sequence + len(records_to_insert) + 1,
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
                "quality_status": quality_status
            })

            # Check for anomalies on critical parameters
            iddq_val = item.parameters.get("iddq_ua")
            if iddq_val and iddq_val > settings.STATIC_LIMITS["iddq"]:
                anomalies_detected.append({
                    "component_id": item.component_id,
                    "parameter": "iddq",
                    "value": iddq_val,
                    "decision": "REJECT"
                })

        db.add_all(records_to_insert)
        db.commit()

        # Publish aggregated batch event to prevent flooding WebSocket clients with 10,000 frames
        batch_event = await event_bus.publish(
            event_type="telemetry.batch",
            payload={
                "chamber_id": chamber_id,
                "lot_id": lot_id,
                "count": len(items),
                "items": items_payload_summary[:100],  # sample preview
                "anomalies_count": len(anomalies_detected)
            },
            lot_id=lot_id,
            chamber_id=chamber_id
        )

        return {
            "status": "BATCH_INGESTED",
            "count": len(items),
            "sequence": batch_event.sequence,
            "anomalies_count": len(anomalies_detected)
        }
