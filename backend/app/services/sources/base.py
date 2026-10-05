from abc import ABC, abstractmethod
from typing import Callable, Coroutine, Any, Optional, Dict
import logging
from backend.app.schemas.events import TelemetryIngestPayload

logger = logging.getLogger("burnwatch.telemetry_source")

TelemetryCallback = Callable[[TelemetryIngestPayload], Coroutine[Any, Any, None]]

class TelemetrySource(ABC):
    """
    Common Authoritative Interface for all BurnWatch Telemetry Ingestion Sources.
    Ensures hardware sensors, MQTT gateways, HTTP REST ingress, historical replays,
    and physics simulators produce identical normalized TelemetryIngestPayload streams
    without any source-specific AI logic.
    """
    def __init__(self, source_id: str, source_type: str):
        self.source_id = source_id
        self.source_type = source_type
        self.is_active = False
        self._callback: Optional[TelemetryCallback] = None

    @abstractmethod
    async def start(self, on_telemetry: TelemetryCallback) -> None:
        """Starts the source data stream and registers the pipeline callback."""
        self._callback = on_telemetry
        self.is_active = True

    @abstractmethod
    async def stop(self) -> None:
        """Stops the source stream."""
        self.is_active = False

    async def emit(self, payload: TelemetryIngestPayload) -> None:
        """Emits normalized payload into the authoritative downstream pipeline."""
        if not self.is_active or not self._callback:
            logger.warning("TelemetrySource %s emitted payload while inactive or without callback.", self.source_id)
            return
        try:
            await self._callback(payload)
        except Exception as e:
            logger.error("Error executing telemetry callback for source %s: %s", self.source_id, e)

    def get_status(self) -> Dict[str, Any]:
        return {
            "source_id": self.source_id,
            "source_type": self.source_type,
            "is_active": self.is_active
        }
