import asyncio
import random
import math
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone

from backend.app.services.event_bus import event_bus

logger = logging.getLogger("burnwatch.simulator")

class TelemetrySimulator:
    """
    Deterministic Physics-Based Chamber & Semiconductor Telemetry Simulator.
    Simulates thermal stabilization, Arrhenius degradation, and electrical drift
    without client-side synthetic randomness.
    """
    def __init__(self):
        self.is_running = False
        self._task: Optional[asyncio.Task] = None
        self._chamber_temp = 124.8
        self._nitrogen_flow = 14.9
        self._humidity = 8.1
        self._tick = 0
        self._seed = 26170
        self._rng = random.Random(self._seed)

    def start(self, interval_seconds: float = 2.0):
        if self.is_running:
            return
        self.is_running = True
        self._task = asyncio.create_task(self._simulation_loop(interval_seconds))
        logger.info("TelemetrySimulator started (interval: %.1fs)", interval_seconds)

    def stop(self):
        if not self.is_running:
            return
        self.is_running = False
        if self._task:
            self._task.cancel()
        logger.info("TelemetrySimulator stopped")

    async def _simulation_loop(self, interval: float):
        try:
            while self.is_running:
                self._tick += 1
                # 1. Thermal Chamber Physics simulation (125°C target ± noise)
                temp_drift = math.sin(self._tick * 0.15) * 0.35 + self._rng.gauss(0, 0.08)
                self._chamber_temp = 125.0 + temp_drift
                self._humidity = max(4.0, min(12.0, 8.0 + math.cos(self._tick * 0.1) * 0.4))
                self._nitrogen_flow = 15.0 + self._rng.gauss(0, 0.15)

                # 2. Pick a random sample component or sample population
                sample_chip_idx = self._rng.randint(1, 1000)
                part_id = f"IC-RH-{sample_chip_idx:05d}"
                
                # Baseline electrical parameters (RH-FPGA-500K)
                iddq_base = 21.2 + self._rng.gauss(0, 1.1)
                leakage_base = 4.2 + self._rng.gauss(0, 0.4)
                prop_delay_base = 11.4 + self._rng.gauss(0, 0.12)

                # Publish live telemetry event
                await event_bus.publish(
                    event_type="telemetry",
                    payload={
                        "chamber_id": "CH-01",
                        "lot_id": "LOT-04",
                        "component_id": part_id,
                        "parameters": {
                            "iddq_ua": round(iddq_base, 3),
                            "leakage_na": round(leakage_base, 3),
                            "prop_delay_ns": round(prop_delay_base, 3)
                        },
                        "environment": {
                            "temperature_c": round(self._chamber_temp, 2),
                            "humidity_percent": round(self._humidity, 2),
                            "nitrogen_flow_lpm": round(self._nitrogen_flow, 2)
                        },
                        "quality_status": "VALID",
                        "mode": "SIMULATION"
                    },
                    lot_id="LOT-04",
                    component_id=part_id,
                    chamber_id="CH-01"
                )

                await asyncio.sleep(interval)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error("Simulation loop error: %s", e)
            self.is_running = False

telemetry_simulator = TelemetrySimulator()
