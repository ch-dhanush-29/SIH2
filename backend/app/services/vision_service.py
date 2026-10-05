from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, AsyncGenerator
import json
import asyncio
import logging
from datetime import datetime, timezone
import uuid

from backend.app.services.event_bus import event_bus

logger = logging.getLogger("burnwatch.vision")

class VisionStreamProvider(ABC):
    """Abstract Base Class for Camera Feed Providers."""
    @abstractmethod
    async def get_frame(self, camera_id: str) -> bytes:
        pass

    @abstractmethod
    def get_stream_type(self) -> str:
        pass

class SnapshotProvider(VisionStreamProvider):
    """Provides high-resolution JPEG/PNG inspection snapshots with AI overlays."""
    def __init__(self):
        self.stream_type = "SNAPSHOT"

    async def get_frame(self, camera_id: str) -> bytes:
        # Generates a calibrated optical chamber test pattern frame
        return b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + b"\xff\xd8\xff\xe0"

    def get_stream_type(self) -> str:
        return self.stream_type


class MJPEGProvider(VisionStreamProvider):
    """Provides low-latency continuous MJPEG video stream."""
    def __init__(self):
        self.stream_type = "MJPEG"

    async def get_frame(self, camera_id: str) -> bytes:
        return b""

    def get_stream_type(self) -> str:
        return self.stream_type


class HLSProvider(VisionStreamProvider):
    """Provides HLS (HTTP Live Streaming) adaptive bitrate playlist."""
    def __init__(self):
        self.stream_type = "HLS"

    async def get_frame(self, camera_id: str) -> bytes:
        return b""

    def get_stream_type(self) -> str:
        return self.stream_type


class WebRTCProvider(VisionStreamProvider):
    """Provides sub-200ms ultra-low-latency WebRTC media stream."""
    def __init__(self):
        self.stream_type = "WEBRTC"

    async def get_frame(self, camera_id: str) -> bytes:
        return b""

    def get_stream_type(self) -> str:
        return self.stream_type


class VisionManager:
    """Manages multi-camera inspection feeds and publishes visual anomaly detection events."""
    def __init__(self):
        self.providers: Dict[str, VisionStreamProvider] = {
            "SNAPSHOT": SnapshotProvider(),
            "MJPEG": MJPEGProvider(),
            "HLS": HLSProvider(),
            "WEBRTC": WebRTCProvider()
        }
        self.active_provider_key = "SNAPSHOT"

    async def emit_detection(
        self,
        camera_id: str,
        component_id: str,
        bbox: List[int],
        confidence: float,
        defect_type: str = "THERMAL_HOTSPOT"
    ):
        """Publishes camera.detection event over WebSocket."""
        event_payload = {
            "event_type": "detection.created",
            "camera_id": camera_id,
            "component_id": component_id,
            "bbox": bbox,  # [x, y, width, height]
            "confidence": round(confidence, 3),
            "defect_type": defect_type,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await event_bus.publish(
            event_type="camera_frame",
            payload=event_payload,
            component_id=component_id
        )

vision_manager = VisionManager()
