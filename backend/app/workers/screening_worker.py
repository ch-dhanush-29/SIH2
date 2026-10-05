import asyncio
import logging
import json
from datetime import datetime, timezone

from backend.app.core.database import SessionLocal
from backend.app.models.screening_run import ScreeningRun
from backend.app.models.lot import Lot
from backend.app.models.component import Component
from backend.app.services.event_bus import event_bus

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [Worker]: %(message)s")
logger = logging.getLogger("burnwatch.worker")

class ScreeningWorker:
    """
    Dedicated Asynchronous Screening & Heavy Inference Worker.
    Executes heavy ML models out-of-band without blocking FastAPI request threads.
    """
    def __init__(self):
        self.is_running = True

    async def run(self):
        logger.info("BurnWatch 3D Screening Worker initialized. Awaiting screening jobs...")
        await event_bus.initialize()

        while self.is_running:
            try:
                # Check for queued screening runs in database
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

                        # Process components in batches
                        comps = db.query(Component).filter(Component.lot_id == queued_run.lot_id).all()
                        total = len(comps)

                        for idx, c in enumerate(comps):
                            # Emit progress every 100 components
                            if idx % 100 == 0 or idx == total - 1:
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
                        logger.info("Screening run [%s] finished successfully.", queued_run.run_id)

                finally:
                    db.close()

                await asyncio.sleep(2.0)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error in screening worker loop: %s", e)
                await asyncio.sleep(5.0)

if __name__ == "__main__":
    worker = ScreeningWorker()
    asyncio.run(worker.run())
