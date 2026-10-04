from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.app.core.config import settings
from backend.app.api.v1 import api_v1_router
from backend.app.services.seed_db import init_and_seed_db
from backend.app.api.v1.screening import router as legacy_screen_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and seed database
    print("BurnWatch 3D: Initializing database and ensuring tables exist...")
    init_and_seed_db()
    yield
    print("BurnWatch 3D: Shutting down...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Production-grade AI-Driven Anomaly Detection and Time-Series Drift Screening Backend for ISRO High-Reliability Electronics.",
    version="2.0.0",
    lifespan=lifespan
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API V1
app.include_router(api_v1_router, prefix=settings.API_V1_STR)

# Legacy compatibility shortcuts for existing frontend apiClient
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
