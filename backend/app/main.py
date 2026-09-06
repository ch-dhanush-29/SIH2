import os
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from backend.app.config import settings
from backend.app.database import engine, Base
from backend.app.seeds.seed_data import seed_database
from backend.app.routers import (
    auth, materials, prices, lots, recyclers, handover,
    ledger, sync, anomalies, field_research, admin, voice_intent, websocket
)

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="E-Waste Saathi API",
    description="Real-World E-Waste Formalization Platform (SIH26229 - Ministry of Mines)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")
STATIC_DIR = os.path.join(FRONTEND_DIR, "static")
TEMPLATES_DIR = os.path.join(FRONTEND_DIR, "templates")

if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR, exist_ok=True)
if not os.path.exists(TEMPLATES_DIR):
    os.makedirs(TEMPLATES_DIR, exist_ok=True)

# Mount Static Files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

templates = Jinja2Templates(directory=TEMPLATES_DIR)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(materials.router, prefix=settings.API_V1_STR)
app.include_router(prices.router, prefix=settings.API_V1_STR)
app.include_router(lots.router, prefix=settings.API_V1_STR)
app.include_router(recyclers.router, prefix=settings.API_V1_STR)
app.include_router(handover.router, prefix=settings.API_V1_STR)
app.include_router(ledger.router, prefix=settings.API_V1_STR)
app.include_router(sync.router, prefix=settings.API_V1_STR)
app.include_router(anomalies.router, prefix=settings.API_V1_STR)
app.include_router(field_research.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(voice_intent.router, prefix=settings.API_V1_STR)
app.include_router(websocket.router)

@app.on_event("startup")
def on_startup():
    # Automatically seed the database on initial start
    try:
        seed_database()
    except Exception as e:
        print(f"Seed startup warning: {e}")

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "tagline": settings.PROJECT_TAGLINE,
        "environment": settings.ENVIRONMENT,
        "demo_data_active": True
    }

@app.get("/ready")
def readiness_check():
    return {
        "status": "ready",
        "database": "connected",
        "cv_classifier": "loaded",
        "price_engine": "ready",
        "matching_engine": "ready"
    }

# Web Interface Endpoints
@app.get("/", response_class=HTMLResponse)
def root_portal(request: Request):
    return templates.TemplateResponse(request=request, name="index.html", context={"project_name": settings.PROJECT_NAME})

@app.get("/collector", response_class=HTMLResponse)
def collector_interface(request: Request):
    return templates.TemplateResponse(request=request, name="collector.html", context={"project_name": settings.PROJECT_NAME})

@app.get("/recycler", response_class=HTMLResponse)
def recycler_interface(request: Request):
    return templates.TemplateResponse(request=request, name="recycler.html", context={"project_name": settings.PROJECT_NAME})

@app.get("/admin", response_class=HTMLResponse)
def admin_interface(request: Request):
    return templates.TemplateResponse(request=request, name="admin.html", context={"project_name": settings.PROJECT_NAME})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
