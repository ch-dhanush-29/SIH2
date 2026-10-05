from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from backend.app.core.config import settings
from backend.app.api.v1 import api_v1_router
from backend.app.services.seed_db import init_and_seed_db
from backend.app.services.event_bus import event_bus
from backend.app.services.websocket_manager import ws_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("burnwatch.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB, Event Bus, and WebSocket Gateway
    logger.info("Initializing BurnWatch 3D Database & Schema...")
    init_and_seed_db()

    logger.info("Initializing Real-Time Event Bus & WebSocket Manager...")
    await event_bus.initialize()
    await ws_manager.initialize()

    yield

    # Shutdown: Cleanly close Event Bus and WebSocket sessions
    logger.info("BurnWatch 3D: Shutting down Event Bus and WebSockets...")
    await event_bus.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Production-grade Real-Time Digital-Twin Platform for AI-Driven Anomaly Detection in Component Burn-In & Screening (SIH26170 - ISRO).",
    version="2.0.0",
    lifespan=lifespan
)

# Enable CORS (Strict origins configured from settings)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API V1
app.include_router(api_v1_router, prefix=settings.API_V1_STR)

from backend.app.api.v1.realtime import websocket_live_endpoint
# Direct root WebSocket alias for universal client compatibility
app.websocket("/ws/live")(websocket_live_endpoint)

# Legacy compatibility route for existing frontend apiClient
@app.get("/api/health")
def legacy_health():
    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "chamberTargetTempC": settings.CHAMBER_TARGET_TEMP_C
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
