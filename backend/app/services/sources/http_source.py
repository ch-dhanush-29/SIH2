import logging
from typing import Dict, Any, Optional

from backend.app.schemas.events import TelemetryIngestPayload
from backend.app.services.sources.base import TelemetrySource, TelemetryCallback

logger = logging.getLogger("burnwatch.sources.http")

class HTTPSource(TelemetrySource):
    """
    HTTP REST Ingestion Source Adapter.
    Bridges incoming synchronous or asynchronous REST POST payloads to the authoritative downstream pipeline.
    """
    def __init__(self, source_id: str = "src-http-gateway"):
        super().__init__(source_id=source_id, source_type="HTTP")

    async def start(self, on_telemetry: TelemetryCallback) -> None:
        await super().start(on_telemetry)
        logger.info("HTTPSource [%s] initialized and ready to accept payloads", self.source_id)

    async def stop(self) -> None:
        await super().stop()
        logger.info("HTTPSource [%s] stopped", self.source_id)

    async def push_telemetry(self, payload: TelemetryIngestPayload) -> None:
        """Called directly by REST route handler."""
        await self.emit(payload)
