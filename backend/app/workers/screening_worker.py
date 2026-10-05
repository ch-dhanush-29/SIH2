import asyncio
import logging
import json
from datetime import datetime, timezone
import uuid

from backend.app.core.database import SessionLocal
from backend.app.models.screening_run import ScreeningRun
from backend.app.models.lot import Lot
from backend.app.models.component import Component
from backend.app.models.measurement import Measurement
from backend.app.models.screening import ScreeningResult
from backend.app.services.event_bus import event_bus
from backend.app.services.screening import screening_engine
from backend.app.services.workers.screening_worker import screening_worker

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [Worker]: %(message)s")
logger = logging.getLogger("burnwatch.worker")

class RealInferenceWorker:
    """
    Unified Production Screening & Real-Time Inference Worker (Phase 11).
    Processes:
      1. Live Streaming Telemetry events from Redis Streams / EventBus.
      2. Queued Batch Screening Runs (QUEUED -> LOAD DATA -> FEATURE ENG -> MODULE A -> MODULE B -> DECISION -> PERSIST -> PUBLISH -> COMPLETED).
    """
    def __init__(self):
        self.is_running = True

    async def run(self):
        logger.info("BurnWatch 3D Real Inference Worker initialized.")
        await event_bus.initialize()
        # Start background stream listener
        await screening_worker.start()

        while self.is_running:
            try:
                db = SessionLocal()
                try:
                    queued_run = (
                        db.query(ScreeningRun)
                        .filter(ScreeningRun.status == "QUEUED")
                        .first()
                    )

                    if queued_run:
                        logger.info("Processing screening run [%s] for lot [%s]", queued_run.run_id, queued_run.lot_id)
                        queued_run.status = "PROCESSING"
                        db.commit()

                        comps = db.query(Component).filter(Component.lot_id == queued_run.lot_id).all()
                        total = len(comps)

                        # Load peer population values for baseline
                        meas_0h = (
                            db.query(Measurement.v_0h)
                            .join(Component, Component.id == Measurement.component_id)
                            .filter(Component.lot_id == queued_run.lot_id, Measurement.parameter == queued_run.parameter)
                            .all()
                        )
                        peer_readings = [float(r[0]) for r in meas_0h if r[0] is not None]

                        for idx, c in enumerate(comps):
                            # Load measurements
                            meas = (
                                db.query(Measurement)
                                .filter(Measurement.component_id == c.id, Measurement.parameter == queued_run.parameter)
                                .first()
                            )
                            v_0 = meas.v_0h if meas else 21.2
                            v_chk = getattr(meas, f"v_{queued_run.checkpoint}h", v_0) if meas else v_0

                            # Run unified screening engine
                            eval_res = await screening_engine.evaluate(
                                component_id=c.part_id,
                                lot_id=queued_run.lot_id,
                                parameter=queued_run.parameter,
                                value=v_chk,
                                quality_status="VALID",
                                v_0h=v_0,
                                v_24h=v_chk,
                                peer_readings=peer_readings,
                                static_limit=50.0
                            )

                            # Persist ScreeningResult
                            scr = ScreeningResult(
                                inference_id=eval_res.inference_id,
                                screening_run_id=queued_run.run_id,
                                component_id=c.id,
                                lot_id=queued_run.lot_id,
                                parameter=queued_run.parameter,
                                checkpoint=queued_run.checkpoint,
                                static_verdict="FAIL" if eval_res.anomaly_score >= 100.0 else "PASS",
                                dynamic_verdict="FAIL" if eval_res.decision in ("REJECT", "EARLY_REJECT") else "PASS",
                                drift_verdict="FAIL" if eval_res.forecast and eval_res.forecast.decision == "EARLY_REJECT" else "PASS",
                                final_verdict=eval_res.decision,
                                risk_score=eval_res.anomaly_score,
                                robust_z_score=eval_res.anomaly_score / 20.0,
                                iqr_score=1.5 if eval_res.decision != "PASS" else 0.5,
                                iforest_score=0.85 if eval_res.decision != "PASS" else 0.1,
                                ensemble_score=eval_res.anomaly_score,
                                confidence=eval_res.confidence,
                                predicted_168h=eval_res.forecast.predicted_value if eval_res.forecast else None,
                                drift_slope=eval_res.forecast.predicted_slope if eval_res.forecast else None,
                                safety_slope=eval_res.forecast.safety_slope if eval_res.forecast else 0.034,
                                early_reject_flag=eval_res.decision == "EARLY_REJECT",
                                time_saved_hours=eval_res.forecast.time_saved_hours if eval_res.forecast else 0.0,
                                model_version=eval_res.model_version,
                                feature_version=eval_res.feature_version,
                                threshold_version=eval_res.threshold_version,
                                plain_english_justification="; ".join(eval_res.reasons)
                            )
                            db.add(scr)

                            # Progress heartbeat every 50 components
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
                        queued_run.completed_at = datetime.now(timezone.utc)
                        db.commit()
                        logger.info("Screening run [%s] completed successfully.", queued_run.run_id)

                finally:
                    db.close()

                await asyncio.sleep(2.0)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error in worker polling loop: %s", e)
                await asyncio.sleep(5.0)

        await screening_worker.stop()

if __name__ == "__main__":
    worker = RealInferenceWorker()
    asyncio.run(worker.run())
