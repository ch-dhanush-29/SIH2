from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.core.database import get_db
from backend.app.core.config import settings

router = APIRouter(prefix="/health", tags=["System Health"])

@router.get("/")
def health_check(db: Session = Depends(get_db)):
    db_status = "HEALTHY"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"UNHEALTHY: {str(e)}"

    return {
        "status": "UP",
        "service": settings.PROJECT_NAME,
        "database": db_status,
        "chamber_setpoint_c": settings.CHAMBER_TARGET_TEMP_C,
        "burn_in_total_hours": settings.BURN_IN_TOTAL_HOURS,
        "early_checkpoint_hours": settings.EARLY_CHECKPOINT_HOURS,
        "active_models": ["v1.4.2-isro-ensemble", "v1.3.0-gradient-drift"]
    }
