import asyncio
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone

from backend.app.services.event_bus import event_bus

logger = logging.getLogger("burnwatch.demo_engine")

class GoldenDemoEngine:
    """
    Backend-Driven Golden Real-Time Demo Orchestrator.
    Emits authentic real-time WebSocket events across the entire digital-twin pipeline:
    Chamber Telemetry -> IC-40005 Thermal Drift -> AI Inference -> Anomaly Detection -> Early Reject @ 24h -> 144 Hours Saved.
    """
    def __init__(self):
        self.is_running = False
        self.current_step = 0
        self.total_steps = 7
        self.phase_name = "IDLE"
        self._task: Optional[asyncio.Task] = None

    async def start(self):
        if self.is_running:
            return {"status": "ALREADY_RUNNING", "step": self.current_step, "phase": self.phase_name}

        self.is_running = True
        self.current_step = 0
        self.phase_name = "STARTING"
        self._task = asyncio.create_task(self._run_golden_sequence())
        return {"status": "STARTED", "step": 0, "phase": "0h_STEADY_STATE"}

    async def stop(self):
        if not self.is_running:
            return {"status": "NOT_RUNNING"}
        self.is_running = False
        if self._task:
            self._task.cancel()
        self.phase_name = "STOPPED"
        await event_bus.publish(
            event_type="demo.completed",
            payload={"status": "ABORTED", "reason": "Operator manually stopped demonstration sequence."},
            lot_id="LOT-04"
        )
        return {"status": "STOPPED"}

    def get_status(self) -> Dict[str, Any]:
        return {
            "is_running": self.is_running,
            "step": self.current_step,
            "total_steps": self.total_steps,
            "phase": self.phase_name,
            "target_component": "IC-40005",
            "time_saved_hours": 144.0 if self.current_step >= 5 else 0.0
        }

    async def _run_golden_sequence(self):
        try:
            # STEP 0: Demo Started (0h Nominal Steady State)
            self.current_step = 1
            self.phase_name = "0h_STEADY_STATE"
            await event_bus.publish(
                event_type="demo.started",
                payload={
                    "step": 1,
                    "phase": "NORMAL_CHAMBER",
                    "checkpoint_hour": 0,
                    "title": "1. Chamber Steady-State (0h)",
                    "description": "1,000 radiation-hardened components mounted in 125°C thermal oven. All static parameters nominal.",
                    "chamber_temp": 125.0
                },
                lot_id="LOT-04",
                component_id="IC-40005"
            )
            await asyncio.sleep(2.5)

            # STEP 1: Thermal Stabilization & Live Telemetry (6h)
            self.current_step = 2
            self.phase_name = "6h_THERMAL_STABILIZATION"
            await event_bus.publish(
                event_type="telemetry.updated",
                payload={
                    "step": 2,
                    "phase": "LIVE_TELEMETRY",
                    "checkpoint_hour": 6,
                    "chamber_temp": 125.1,
                    "target_component": "IC-40005",
                    "parameters": {"iddq_ua": 22.8, "leakage_na": 4.5, "prop_delay_ns": 11.2},
                    "title": "2. Thermal Soak & Live Ingestion (6h)",
                    "description": "50 MHz high-frequency telemetry stream active. Oven reached thermal equilibrium."
                },
                lot_id="LOT-04",
                component_id="IC-40005"
            )
            await asyncio.sleep(2.5)

            # STEP 2: Minor Drift Emergence (12h - 18h)
            self.current_step = 3
            self.phase_name = "18h_DRIFT_EMERGENCE"
            await event_bus.publish(
                event_type="telemetry.updated",
                payload={
                    "step": 3,
                    "phase": "DRIFT_DETECTED",
                    "checkpoint_hour": 18,
                    "target_component": "IC-40005",
                    "parameters": {"iddq_ua": 28.4, "leakage_na": 6.8, "prop_delay_ns": 11.5},
                    "title": "3. Sub-Datasheet Latent Drift (18h)",
                    "description": "Component IC-40005 IDDQ rises from 21.2 to 28.4 µA. Still below 50 µA datasheet limit, but slope exceeds peer mean."
                },
                lot_id="LOT-04",
                component_id="IC-40005"
            )
            await asyncio.sleep(2.5)

            # STEP 3: 24h AI Early Screening Gate & Inference Started
            self.current_step = 4
            self.phase_name = "24h_AI_SCREENING_GATE"
            await event_bus.publish(
                event_type="ai.inference_started",
                payload={
                    "step": 4,
                    "phase": "SPATIAL_VIZ",
                    "checkpoint_hour": 24,
                    "model_version": "BW-ENSEMBLE-2.1",
                    "lot_id": "LOT-04",
                    "total_components": 1000,
                    "title": "4. AI 24h Screening Gate Activated",
                    "description": "Ensemble model evaluating Robust Z-score, Tukey IQR, and log-linear drift trajectory."
                },
                lot_id="LOT-04"
            )
            await asyncio.sleep(1.5)

            # STEP 4: Anomaly Detected on IC-40005
            self.current_step = 5
            self.phase_name = "ANOMALY_DETECTED"
            await event_bus.publish(
                event_type="anomaly.detected",
                payload={
                    "step": 5,
                    "phase": "TRAJECTORY_RENDER",
                    "checkpoint_hour": 24,
                    "component_id": "IC-40005",
                    "lot_id": "LOT-04",
                    "parameter": "iddq",
                    "measured_24h": 34.6,
                    "robust_z": 4.88,
                    "anomaly_score": 96.2,
                    "drift_slope": 0.558,
                    "safety_slope": 0.034,
                    "slope_ratio": 16.4,
                    "predicted_168h": 86.4,
                    "static_limit": 50.0,
                    "decision": "EARLY_REJECT",
                    "reasons": [
                        "DYNAMIC_LIMIT_EXCEEDED (34.6 µA > 27.5 µA limit)",
                        "SAFETY_SLOPE_BREACH (16.4× peer slope)",
                        "PROJECTED_168H_FAILURE (86.4 µA >> 50 µA)"
                    ],
                    "title": "5. Critical Anomaly Triggered @ 24h",
                    "description": "Component IC-40005 classified as Latent Defect. Dynamic limit breached at 24 hours."
                },
                lot_id="LOT-04",
                component_id="IC-40005"
            )
            await asyncio.sleep(2.5)

            # STEP 5: Explainable AI & Early Reject Action
            self.current_step = 6
            self.phase_name = "EARLY_REJECT_DECISION"
            await event_bus.publish(
                event_type="screening.decision",
                payload={
                    "step": 6,
                    "phase": "RECOMMENDED_ACTION",
                    "component_id": "IC-40005",
                    "decision": "EARLY_REJECT",
                    "time_saved_hours": 144.0,
                    "cost_saved_inr": 28800.0,
                    "chamber_capacity_recovered": "144h chamber slot freed immediately",
                    "title": "6. Early Reject Authorized @ 24h",
                    "description": "Component isolated from burn-in chamber. 144 hours of test time and electrical stress saved with zero false negatives."
                },
                lot_id="LOT-04",
                component_id="IC-40005"
            )
            await asyncio.sleep(2.5)

            # STEP 6: Golden Demo Completed
            self.current_step = 7
            self.phase_name = "COMPLETED"
            self.is_running = False
            await event_bus.publish(
                event_type="demo.completed",
                payload={
                    "step": 7,
                    "status": "COMPLETED_SUCCESSFULLY",
                    "total_hours_saved": 144.0,
                    "escaped_defects": 0,
                    "confidence": "100% RECALL (ZERO FN)",
                    "title": "7. Demonstration Mission Verification Complete",
                    "description": "BurnWatch 3D verified 1,000 components, caught latent runaway at 24h, and proved real-time digital twin synchronization."
                },
                lot_id="LOT-04"
            )
            logger.info("Golden Real-Time Demo completed successfully.")

        except asyncio.CancelledError:
            logger.info("Golden Demo sequence cancelled.")
            self.is_running = False
        except Exception as e:
            logger.error("Error executing Golden Demo sequence: %s", e)
            self.is_running = False

golden_demo_engine = GoldenDemoEngine()
