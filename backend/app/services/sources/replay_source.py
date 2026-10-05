import asyncio
import logging
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from backend.app.schemas.events import TelemetryIngestPayload
from backend.app.services.sources.base import TelemetrySource, TelemetryCallback

logger = logging.getLogger("burnwatch.sources.replay")

class ReplaySource(TelemetrySource):
    """
    Historical Telemetry Replay Source.
    Replays pre-recorded flight lots or simulated datasets at configurable playback speeds (1x, 2x, 4x)
    through the standard ingestion, validation, and AI pipeline.
    """
    def __init__(self, source_id: str = "src-replay-01", records: Optional[List[TelemetryIngestPayload]] = None):
        super().__init__(source_id=source_id, source_type="REPLAY")
        self._records: List[TelemetryIngestPayload] = records or []
        self._task: Optional[asyncio.Task] = None
        self._playback_speed: float = 1.0
        self._current_index: int = 0

    def load_records(self, records: List[TelemetryIngestPayload]) -> None:
        self._records = records
        self._current_index = 0

    async def start(
        self,
        on_telemetry: TelemetryCallback,
        playback_speed: float = 1.0,
        interval_seconds: float = 1.0
    ) -> None:
        await super().start(on_telemetry)
        self._playback_speed = max(0.1, playback_speed)
        self._task = asyncio.create_task(self._run_replay(interval_seconds))
        logger.info("ReplaySource [%s] started with %d records (speed=%.1fx)", self.source_id, len(self._records), self._playback_speed)

    async def stop(self) -> None:
        await super().stop()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("ReplaySource [%s] stopped at record %d/%d", self.source_id, self._current_index, len(self._records))

    async def _run_replay(self, interval_seconds: float) -> None:
        delay = interval_seconds / self._playback_speed
        try:
            while self.is_active and self._current_index < len(self._records):
                item = self._records[self._current_index]
                # Re-stamp with current monotonic or replayed time
                item_copy = TelemetryIngestPayload(
                    chamber_id=item.chamber_id,
                    lot_id=item.lot_id,
                    component_id=item.component_id,
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    event_id=str(uuid.uuid4()),
                    parameters=item.parameters,
                    environment=item.environment
                )
                await self.emit(item_copy)
                self._current_index += 1
                await asyncio.sleep(delay)
            self.is_active = False
            logger.info("ReplaySource [%s] finished replaying all records", self.source_id)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error("ReplaySource error: %s", e)
            self.is_active = False
