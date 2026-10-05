from fastapi import APIRouter, HTTPException
from backend.app.services.demo_engine import golden_demo_engine
from backend.app.services.simulator.telemetry_simulator import telemetry_simulator

router = APIRouter(prefix="", tags=["Golden Real-Time Demo & Simulator"])

@router.post("/demo/start")
async def start_golden_demo():
    """
    Triggers the backend-driven Golden Real-Time Demo sequence.
    Emits authentic WebSocket events through the digital twin pipeline:
    Chamber Telemetry -> IC-40005 Drift -> AI Gate @ 24h -> Early Reject -> 144 Hours Saved.
    """
    result = await golden_demo_engine.start()
    return result

@router.post("/demo/stop")
async def stop_golden_demo():
    """
    Stops the currently running Golden Real-Time Demo.
    """
    result = await golden_demo_engine.stop()
    return result

@router.get("/demo/status")
def get_golden_demo_status():
    """
    Returns the current execution step, phase, and metrics of the Golden Demo.
    """
    return golden_demo_engine.get_status()

@router.post("/simulator/start")
def start_simulator(interval_seconds: float = 2.0):
    """
    Starts the background deterministic telemetry simulator.
    """
    telemetry_simulator.start(interval_seconds=interval_seconds)
    return {"status": "SIMULATOR_STARTED", "interval_seconds": interval_seconds}

@router.post("/simulator/stop")
def stop_simulator():
    """
    Stops the background telemetry simulator.
    """
    telemetry_simulator.stop()
    return {"status": "SIMULATOR_STOPPED"}

@router.get("/simulator/status")
def get_simulator_status():
    """
    Returns running status of the telemetry simulator.
    """
    return {
        "is_running": telemetry_simulator.is_running,
        "mode": "SIMULATION" if telemetry_simulator.is_running else "IDLE"
    }
