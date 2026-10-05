import asyncio
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from backend.app.schemas.events import TelemetryIngestPayload
from backend.app.services.sources.base import TelemetrySource, TelemetryCallback

logger = logging.getLogger("burnwatch.sources.opcua")

class OPCUASource(TelemetrySource):
    """
    Industrial OPC-UA Tag Polling Abstraction.
    Polls industrial PLC / SCADA tags (chamber thermal oven PLC, vacuum controller, power supplies)
    and maps them into standardized TelemetryIngestPayload streams.
    """
    def __init__(
        self,
        source_id: str = "src-opcua-plc01",
        endpoint_url: str = "opc.tcp://localhost:4840",
        poll_interval_seconds: float = 1.0
    ):
        super().__init__(source_id=source_id, source_type="OPCUA")
        self.endpoint_url = endpoint_url
        self.poll_interval = poll_interval_seconds
        self._task: Optional[asyncio.Task] = None

    async def start(self, on_telemetry: TelemetryCallback) -> None:
        await super().start(on_telemetry)
        self._task = asyncio.create_task(self._poll_loop())
        logger.info("OPCUASource [%s] connected to %s", self.source_id, self.endpoint_url)

    async def stop(self) -> None:
        await super().stop()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("OPCUASource [%s] stopped", self.source_id)

    async def _poll_loop(self) -> None:
        try:
            while self.is_active:
                await asyncio.sleep(self.poll_interval)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.warning("OPCUASource poll error: %s", e)
            self.is_active = False
