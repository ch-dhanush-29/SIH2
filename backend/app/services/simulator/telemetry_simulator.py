import asyncio
import logging
from typing import Optional

from backend.app.core.database import SessionLocal
from backend.app.schemas.events import TelemetryIngestPayload
from backend.app.services.sources.simulator_source import SimulatorSource
from backend.app.services.telemetry_service import TelemetryService

logger = logging.getLogger("burnwatch.simulator")

class TelemetrySimulator:
    """
    Deterministic Physics-Based Chamber & Semiconductor Telemetry Simulator.
    Simulates thermal stabilization, Arrhenius degradation, and electrical drift.
    Integrates directly into the authoritative TelemetryService pipeline — never bypassing
    validation, persistence, or server-side AI evaluation.
    """
    def __init__(self):
        self._source = SimulatorSource(source_id="src-chamber-sim-01")

    @property
    def is_running(self) -> bool:
        return self._source.is_active

    async def _pipeline_ingest(self, payload: TelemetryIngestPayload) -> None:
        """Pushes simulated telemetry through the authoritative domain pipeline."""
        db = SessionLocal()
        try:
            await TelemetryService.process_single_telemetry(payload, db)
        except Exception as e:
            logger.error("Simulator ingestion pipeline error: %s", e)
        finally:
            db.close()

    def start(self, interval_seconds: float = 2.0):
        if self._source.is_active:
            return
        asyncio.create_task(self._source.start(self._pipeline_ingest, interval_seconds=interval_seconds))
        logger.info("TelemetrySimulator started via SimulatorSource (interval: %.1fs)", interval_seconds)

    def stop(self):
        if not self._source.is_active:
            return
        asyncio.create_task(self._source.stop())
        logger.info("TelemetrySimulator stopped")

telemetry_simulator = TelemetrySimulator()
