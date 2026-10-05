import asyncio
import random
import math
import logging
from typing import Optional
from datetime import datetime, timezone
import uuid

from backend.app.schemas.events import TelemetryIngestPayload
from backend.app.services.sources.base import TelemetrySource, TelemetryCallback

logger = logging.getLogger("burnwatch.sources.simulator")

class SimulatorSource(TelemetrySource):
    """
    Deterministic Physics-Based Chamber & Semiconductor Telemetry Source.
    Emits continuous, normalized TelemetryIngestPayload objects into the authoritative pipeline.
    Does NOT publish directly to the event bus or bypass validation/persistence/AI.
    """
    def __init__(self, source_id: str = "src-sim-01", seed: int = 26170):
        super().__init__(source_id=source_id, source_type="SIMULATOR")
        self._seed = seed
        self._rng = random.Random(seed)
        self._task: Optional[asyncio.Task] = None
        self._chamber_temp = 125.0
        self._nitrogen_flow = 15.0
        self._humidity = 8.0
        self._tick = 0
        self.interval_seconds = 2.0

    async def start(self, on_telemetry: TelemetryCallback, interval_seconds: float = 2.0) -> None:
        await super().start(on_telemetry)
        self.interval_seconds = interval_seconds
        self._task = asyncio.create_task(self._run_loop())
        logger.info("SimulatorSource [%s] started (interval=%.2fs)", self.source_id, self.interval_seconds)

    async def stop(self) -> None:
        await super().stop()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("SimulatorSource [%s] stopped", self.source_id)

    async def _run_loop(self) -> None:
        try:
            while self.is_active:
                self._tick += 1
                # Chamber thermal dynamics (125°C ± oscillations + noise)
                temp_drift = math.sin(self._tick * 0.15) * 0.35 + self._rng.gauss(0, 0.08)
                self._chamber_temp = 125.0 + temp_drift
                self._humidity = max(4.0, min(12.0, 8.0 + math.cos(self._tick * 0.1) * 0.4))
                self._nitrogen_flow = 15.0 + self._rng.gauss(0, 0.15)

                sample_chip_idx = self._rng.randint(1, 1000)
                part_id = f"IC-RH-{sample_chip_idx:05d}"

                # Baseline electrical parameters
                iddq_val = round(21.2 + self._rng.gauss(0, 1.1), 3)
                leakage_val = round(4.2 + self._rng.gauss(0, 0.4), 3)
                prop_delay_val = round(11.4 + self._rng.gauss(0, 0.12), 3)

                now_iso = datetime.now(timezone.utc).isoformat()
                payload = TelemetryIngestPayload(
                    chamber_id="CH-01",
                    lot_id="LOT-04",
                    component_id=part_id,
                    timestamp=now_iso,
                    event_id=str(uuid.uuid4()),
                    parameters={
                        "iddq_ua": iddq_val,
                        "leakage_na": leakage_val,
                        "prop_delay_ns": prop_delay_val
                    },
                    environment={
                        "temperature_c": round(self._chamber_temp, 2),
                        "humidity_percent": round(self._humidity, 2),
                        "nitrogen_flow_lpm": round(self._nitrogen_flow, 2)
                    }
                )

                await self.emit(payload)
                await asyncio.sleep(self.interval_seconds)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error("SimulatorSource error: %s", e)
            self.is_active = False
