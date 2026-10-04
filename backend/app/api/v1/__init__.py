from fastapi import APIRouter
from backend.app.api.v1.auth import router as auth_router
from backend.app.api.v1.screening import router as screening_router
from backend.app.api.v1.components import router as components_router
from backend.app.api.v1.lots import router as lots_router
from backend.app.api.v1.datasets import router as datasets_router
from backend.app.api.v1.models import router as models_router
from backend.app.api.v1.audit import router as audit_router
from backend.app.api.v1.reports import router as reports_router
from backend.app.api.v1.health import router as health_router

api_v1_router = APIRouter()
api_v1_router.include_router(auth_router)
api_v1_router.include_router(screening_router)
api_v1_router.include_router(components_router)
api_v1_router.include_router(lots_router)
api_v1_router.include_router(datasets_router)
api_v1_router.include_router(models_router)
api_v1_router.include_router(audit_router)
api_v1_router.include_router(reports_router)
api_v1_router.include_router(health_router)
