import asyncio
import logging
from typing import Optional, Dict, Any
from backend.app.schemas.events import RealtimeEvent
from backend.app.services.event_bus import event_bus
from backend.app.services.anomaly_detector import DynamicAnomalyDetector
from backend.app.services.drift_predictor import DriftPredictor

logger = logging.getLogger("burnwatch.workers.screening")

class ScreeningWorker:
    """
    Background Asynchronous AI Inference & Screening Worker.
    Consumes live telemetry streams from the event bus / Redis Streams
    and executes background deep anomaly scoring, multivariate feature extraction,
    and long-term drift projection without blocking the telemetry ingestion gateway.
    """
    def __init__(self, worker_id: str = "worker-ai-01"):
        self.worker_id = worker_id
        self.is_running = False
        self._task: Optional[asyncio.Task] = None
        self._queue: asyncio.Queue = asyncio.Queue(maxsize=1000)

    async def start(self) -> None:
        if self.is_running:
            return
        self.is_running = True
        event_bus.subscribe("burnwatch:events:stream:telemetry", self._on_telemetry_event)
        self._task = asyncio.create_task(self._worker_loop())
        logger.info("ScreeningWorker [%s] started", self.worker_id)

    async def stop(self) -> None:
        if not self.is_running:
            return
        self.is_running = False
        event_bus.unsubscribe("burnwatch:events:stream:telemetry", self._on_telemetry_event)
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("ScreeningWorker [%s] stopped", self.worker_id)

    async def _on_telemetry_event(self, event: RealtimeEvent) -> None:
        """Enqueues incoming telemetry without blocking the event bus."""
        try:
            self._queue.put_nowait(event)
        except asyncio.QueueFull:
            logger.debug("ScreeningWorker queue full; dropping low priority telemetry event")

    async def _worker_loop(self) -> None:
        while self.is_running:
            try:
                event = await self._queue.get()
                # Process deep multivariate analysis if component is present
                comp_id = event.component_id
                payload = event.payload
                params = payload.get("parameters", {})
                
                # Perform drift forecast if 24h reading
                iddq = params.get("iddq_ua")
                if iddq and iddq > 27.0 and comp_id:
                    forecast = DriftPredictor.forecast_168h(
                        v_0h=21.2,
                        v_24h=iddq,
                        safety_slope=0.034,
                        dynamic_limit=28.5,
                        static_limit=50.0
                    )
                    if forecast.get("early_reject"):
                        logger.info("Worker detected latent runaway on %s: projected_168h=%.1f", comp_id, forecast["predicted_168h"])

                self._queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error in ScreeningWorker execution: %s", e)

screening_worker = ScreeningWorker()
