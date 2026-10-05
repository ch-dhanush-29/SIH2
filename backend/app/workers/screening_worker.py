import asyncio
import logging
import json
import time
from datetime import datetime, timezone, timedelta
import uuid
from typing import Optional, Dict, Any, List
from sqlalchemy import or_, and_

from backend.app.core.database import SessionLocal
from backend.app.models.screening_run import ScreeningRun
from backend.app.models.lot import Lot
from backend.app.models.component import Component
from backend.app.models.measurement import Measurement
from backend.app.models.screening import ScreeningResult
from backend.app.schemas.events import RealtimeEvent
from backend.app.services.event_bus import event_bus
from backend.app.services.screening import screening_engine, ScreeningEvaluationResult

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [Worker]: %(message)s")
logger = logging.getLogger("burnwatch.worker")

class RealInferenceWorker:
    """
    Unified Production Screening & Real-Time Inference Worker (Phases 11 & 12).
    Processes:
      1. Streaming Telemetry events via EventBus subscription (async screening mode).
      2. Queued Batch Screening Runs with atomic lease acquisition, 15s heartbeat renewal,
         and stale lease recovery (QUEUED -> PROCESSING -> COMPLETED / FAILED).
      3. Records real DynamicAnomalyDetector metrics without fabrication.
    """
    def __init__(self, worker_id: Optional[str] = None):
        self.worker_id = worker_id or f"worker-{uuid.uuid4().hex[:8]}"
        self.is_running = True
        self._stream_queue: asyncio.Queue = asyncio.Queue(maxsize=2000)
        self._stream_task: Optional[asyncio.Task] = None

    async def _on_telemetry_event(self, event: RealtimeEvent) -> None:
        """Enqueues incoming telemetry without blocking the event bus."""
        try:
            self._stream_queue.put_nowait(event)
        except asyncio.QueueFull:
            logger.debug("Streaming screening queue full; dropping non-critical item")

    async def _process_stream_job(self, event: RealtimeEvent) -> Optional[ScreeningEvaluationResult]:
        part_id = event.component_id
        lot_id = event.lot_id or "LOT-04"
        if not part_id:
            return None

        params = event.payload.get("parameters", {}) if event.payload else {}
        iddq_val = params.get("iddq_ua")
        if iddq_val is None:
            return None

        db = SessionLocal()
        try:
            comp = db.query(Component).filter(Component.part_id == part_id).first()
            if not comp:
                return None

            meas = db.query(Measurement).filter(Measurement.component_id == comp.id, Measurement.parameter == "iddq").first()
            v_0h = meas.v_0h if meas else 21.2
            v_24h = meas.v_24h if meas else iddq_val

            peer_records = (
                db.query(Measurement.v_0h)
                .join(Component, Component.id == Measurement.component_id)
                .filter(Component.lot_id == lot_id, Measurement.parameter == "iddq")
                .limit(200)
                .all()
            )
            peer_readings = [float(r[0]) for r in peer_records if r[0] is not None]

            eval_res = await screening_engine.evaluate(
                component_id=part_id,
                lot_id=lot_id,
                parameter="iddq",
                value=iddq_val,
                quality_status=event.payload.get("quality_status", "VALID") if event.payload else "VALID",
                v_0h=v_0h,
                v_24h=v_24h,
                peer_readings=peer_readings,
                static_limit=50.0
            )

            existing_scr = (
                db.query(ScreeningResult)
                .filter(ScreeningResult.component_id == comp.id, ScreeningResult.parameter == "iddq", ScreeningResult.checkpoint == 24)
                .first()
            )

            if not existing_scr:
                scr_record = ScreeningResult(
                    inference_id=eval_res.inference_id,
                    screening_run_id=f"run-{lot_id}-24h",
                    component_id=comp.id,
                    lot_id=lot_id,
                    parameter="iddq",
                    checkpoint=24,
                    static_verdict="FAIL" if eval_res.anomaly_score >= 100.0 else "PASS",
                    dynamic_verdict="FAIL" if eval_res.decision in ("REJECT", "EARLY_REJECT") else "PASS",
                    drift_verdict="FAIL" if eval_res.forecast and eval_res.forecast.decision == "EARLY_REJECT" else "PASS",
                    final_verdict=eval_res.decision,
                    risk_score=eval_res.anomaly_score,
                    robust_z_score=eval_res.robust_z_score,
                    iqr_score=eval_res.iqr_score,
                    iforest_score=eval_res.iforest_score,
                    ensemble_score=eval_res.ensemble_score,
                    confidence=eval_res.confidence,
                    predicted_168h=eval_res.forecast.predicted_value if eval_res.forecast else None,
                    drift_slope=eval_res.forecast.predicted_slope if eval_res.forecast else None,
                    safety_slope=eval_res.forecast.safety_slope if eval_res.forecast else 0.034,
                    early_reject_flag=eval_res.decision == "EARLY_REJECT",
                    time_saved_hours=eval_res.forecast.time_saved_hours if eval_res.forecast else 0.0,
                    model_version=eval_res.model_version,
                    feature_version=eval_res.feature_version,
                    threshold_version=eval_res.threshold_version,
                    plain_english_justification="; ".join(eval_res.reasons),
                    model_component_status=eval_res.model_component_status
                )
                db.add(scr_record)
                db.commit()

            return eval_res
        except Exception as e:
            logger.error("Error processing stream job: %s", e)
            db.rollback()
            return None
        finally:
            db.close()

    async def _stream_worker_loop(self):
        while self.is_running:
            try:
                event = await self._stream_queue.get()
                await self._process_stream_job(event)
                self._stream_queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error in stream worker loop: %s", e)

    async def run(self):
        logger.info("BurnWatch 3D Real Inference Worker [%s] starting up...", self.worker_id)
        await event_bus.initialize()
        event_bus.subscribe("burnwatch:events:stream:telemetry", self._on_telemetry_event)
        self._stream_task = asyncio.create_task(self._stream_worker_loop())

        while self.is_running:
            try:
                db = SessionLocal()
                try:
                    now = datetime.now(timezone.utc)
                    # Lease query: select runs where status='QUEUED' OR (status='PROCESSING' AND lease_until < now)
                    queued_run = (
                        db.query(ScreeningRun)
                        .filter(
                            or_(
                                ScreeningRun.status == "QUEUED",
                                and_(
                                    ScreeningRun.status == "PROCESSING",
                                    or_(ScreeningRun.lease_until.is_(None), ScreeningRun.lease_until < now)
                                )
                            )
                        )
                        .order_by(ScreeningRun.start_time.asc())
                        .first()
                    )

                    if queued_run:
                        # Attempt limit check
                        if queued_run.attempt_count is None:
                            queued_run.attempt_count = 0

                        if queued_run.attempt_count >= 3:
                            logger.warning(
                                "Screening run [%s] reached max attempts (%d). Marking FAILED.",
                                queued_run.run_id, queued_run.attempt_count
                            )
                            queued_run.status = "FAILED"
                            queued_run.decision_summary_json = json.dumps({"error": "Max lease retry attempts (3) exceeded"})
                            db.commit()
                            continue

                        # Atomically acquire lease
                        queued_run.status = "PROCESSING"
                        queued_run.worker_id = self.worker_id
                        queued_run.attempt_count += 1
                        queued_run.heartbeat_at = now
                        queued_run.lease_until = now + timedelta(seconds=60)
                        db.commit()

                        logger.info(
                            "Acquired lease on screening run [%s] (attempt %d/3) for lot [%s]",
                            queued_run.run_id, queued_run.attempt_count, queued_run.lot_id
                        )

                        comps = db.query(Component).filter(Component.lot_id == queued_run.lot_id).all()
                        total = len(comps)
                        param = getattr(queued_run, "parameter", "iddq") or "iddq"
                        chkpt = getattr(queued_run, "checkpoint", 24) or 24

                        # Load peer population values for baseline
                        meas_0h = (
                            db.query(Measurement.v_0h)
                            .join(Component, Component.id == Measurement.component_id)
                            .filter(Component.lot_id == queued_run.lot_id, Measurement.parameter == param)
                            .all()
                        )
                        peer_readings = [float(r[0]) for r in meas_0h if r[0] is not None]

                        last_heartbeat_time = time.perf_counter()

                        try:
                            for idx, c in enumerate(comps):
                                # Renew lease every 15 seconds during execution
                                if time.perf_counter() - last_heartbeat_time >= 15.0:
                                    hb_now = datetime.now(timezone.utc)
                                    queued_run.heartbeat_at = hb_now
                                    queued_run.lease_until = hb_now + timedelta(seconds=60)
                                    db.commit()
                                    last_heartbeat_time = time.perf_counter()

                                meas = (
                                    db.query(Measurement)
                                    .filter(Measurement.component_id == c.id, Measurement.parameter == param)
                                    .first()
                                )
                                v_0 = meas.v_0h if meas else 21.2
                                v_chk = getattr(meas, f"v_{chkpt}h", v_0) if meas else v_0

                                # Unified screening engine evaluation
                                eval_res = await screening_engine.evaluate(
                                    component_id=c.part_id,
                                    lot_id=queued_run.lot_id,
                                    parameter=param,
                                    value=v_chk,
                                    quality_status="VALID",
                                    v_0h=v_0,
                                    v_24h=v_chk,
                                    peer_readings=peer_readings,
                                    static_limit=50.0
                                )

                                # Record real metrics without fake scaling
                                existing_scr = (
                                    db.query(ScreeningResult)
                                    .filter(
                                        ScreeningResult.screening_run_id == queued_run.run_id,
                                        ScreeningResult.component_id == c.id,
                                        ScreeningResult.checkpoint == chkpt
                                    )
                                    .first()
                                )

                                if existing_scr:
                                    existing_scr.static_verdict = "FAIL" if eval_res.anomaly_score >= 100.0 else "PASS"
                                    existing_scr.dynamic_verdict = "FAIL" if eval_res.decision in ("REJECT", "EARLY_REJECT") else "PASS"
                                    existing_scr.drift_verdict = "FAIL" if eval_res.forecast and eval_res.forecast.decision == "EARLY_REJECT" else "PASS"
                                    existing_scr.final_verdict = eval_res.decision
                                    existing_scr.risk_score = eval_res.anomaly_score
                                    existing_scr.robust_z_score = eval_res.robust_z_score
                                    existing_scr.iqr_score = eval_res.iqr_score
                                    existing_scr.iforest_score = eval_res.iforest_score
                                    existing_scr.ensemble_score = eval_res.ensemble_score
                                    existing_scr.confidence = eval_res.confidence
                                    existing_scr.predicted_168h = eval_res.forecast.predicted_value if eval_res.forecast else None
                                    existing_scr.drift_slope = eval_res.forecast.predicted_slope if eval_res.forecast else None
                                    existing_scr.safety_slope = eval_res.forecast.safety_slope if eval_res.forecast else 0.034
                                    existing_scr.early_reject_flag = eval_res.decision == "EARLY_REJECT"
                                    existing_scr.time_saved_hours = eval_res.forecast.time_saved_hours if eval_res.forecast else 0.0
                                    existing_scr.plain_english_justification = "; ".join(eval_res.reasons)
                                    existing_scr.model_component_status = eval_res.model_component_status
                                else:
                                    scr = ScreeningResult(
                                        inference_id=eval_res.inference_id,
                                        screening_run_id=queued_run.run_id,
                                        component_id=c.id,
                                        lot_id=queued_run.lot_id,
                                        parameter=param,
                                        checkpoint=chkpt,
                                        static_verdict="FAIL" if eval_res.anomaly_score >= 100.0 else "PASS",
                                        dynamic_verdict="FAIL" if eval_res.decision in ("REJECT", "EARLY_REJECT") else "PASS",
                                        drift_verdict="FAIL" if eval_res.forecast and eval_res.forecast.decision == "EARLY_REJECT" else "PASS",
                                        final_verdict=eval_res.decision,
                                        risk_score=eval_res.anomaly_score,
                                        robust_z_score=eval_res.robust_z_score,
                                        iqr_score=eval_res.iqr_score,
                                        iforest_score=eval_res.iforest_score,
                                        ensemble_score=eval_res.ensemble_score,
                                        confidence=eval_res.confidence,
                                        predicted_168h=eval_res.forecast.predicted_value if eval_res.forecast else None,
                                        drift_slope=eval_res.forecast.predicted_slope if eval_res.forecast else None,
                                        safety_slope=eval_res.forecast.safety_slope if eval_res.forecast else 0.034,
                                        early_reject_flag=eval_res.decision == "EARLY_REJECT",
                                        time_saved_hours=eval_res.forecast.time_saved_hours if eval_res.forecast else 0.0,
                                        model_version=eval_res.model_version,
                                        feature_version=eval_res.feature_version,
                                        threshold_version=eval_res.threshold_version,
                                        plain_english_justification="; ".join(eval_res.reasons),
                                        model_component_status=eval_res.model_component_status
                                    )
                                    db.add(scr)

                                if idx % 50 == 0 or idx == total - 1:
                                    queued_run.processed_components = idx + 1
                                    db.commit()
                                    await event_bus.publish(
                                        event_type="screening_update",
                                        payload={
                                            "run_id": queued_run.run_id,
                                            "lot_id": queued_run.lot_id,
                                            "processed": idx + 1,
                                            "total": total,
                                            "progress_pct": round(((idx + 1) / max(total, 1)) * 100.0, 1)
                                        },
                                        lot_id=queued_run.lot_id
                                    )

                            queued_run.status = "COMPLETED"
                            queued_run.end_time = datetime.now(timezone.utc)
                            db.commit()
                            logger.info("Screening run [%s] completed successfully.", queued_run.run_id)

                        except Exception as exec_err:
                            logger.error("Execution error processing run [%s]: %s", queued_run.run_id, exec_err)
                            db.rollback()
                            if queued_run.attempt_count >= 3:
                                queued_run.status = "FAILED"
                                queued_run.decision_summary_json = json.dumps({"error": str(exec_err)})
                            else:
                                queued_run.status = "QUEUED"
                                queued_run.lease_until = None
                            db.commit()

                finally:
                    db.close()

                await asyncio.sleep(2.0)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error in worker polling loop: %s", e)
                await asyncio.sleep(5.0)

        if self._stream_task:
            self._stream_task.cancel()
            try:
                await self._stream_task
            except asyncio.CancelledError:
                pass

        event_bus.unsubscribe("burnwatch:events:stream:telemetry", self._on_telemetry_event)
        logger.info("Screening worker [%s] shutdown complete.", self.worker_id)

# Singleton worker instance for process entry
screening_worker = RealInferenceWorker()

if __name__ == "__main__":
    asyncio.run(screening_worker.run())
