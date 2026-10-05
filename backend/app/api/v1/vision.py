from fastapi import APIRouter, Query, HTTPException, Body
from typing import List, Dict, Any
from backend.app.services.vision_service import vision_manager

router = APIRouter(prefix="", tags=["Vision & Optical Stream"])

@router.get("/vision/cameras")
def get_cameras():
    """
    Lists calibrated inspection cameras inside the chamber.
    """
    return [
        {
            "camera_id": "CAM-01",
            "name": "Overhead 4K Optical Inspection Camera",
            "type": "OPTICAL",
            "resolution": "3840x2160",
            "fps": 30,
            "status": "ONLINE",
            "streaming_protocol": vision_manager.active_provider_key
        },
        {
            "camera_id": "CAM-02",
            "name": "Infrared Radiometric Thermal Imager (FLIR)",
            "type": "THERMAL",
            "resolution": "1920x1080",
            "fps": 60,
            "status": "ONLINE",
            "temperature_range": "20°C - 200°C",
            "streaming_protocol": vision_manager.active_provider_key
        }
    ]

@router.post("/vision/detection")
async def record_vision_detection(
    camera_id: str = Body("CAM-01"),
    component_id: str = Body("IC-40005"),
    bbox: List[int] = Body([120, 140, 80, 80]),
    confidence: float = Body(0.962),
    defect_type: str = Body("THERMAL_HOTSPOT")
):
    """
    Records an AI vision bounding box detection and pushes to real-time WebSocket clients.
    """
    await vision_manager.emit_detection(
        camera_id=camera_id,
        component_id=component_id,
        bbox=bbox,
        confidence=confidence,
        defect_type=defect_type
    )
    return {"status": "DETECTION_EMITTED", "component_id": component_id, "camera_id": camera_id}
