import os
from typing import List
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "BurnWatch 3D - ISRO Component Screening Platform"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "isro-sih26170-burnwatch-supersecret-jwt-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database config: SQLite out of the box, or PostgreSQL via env var
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./burnwatch.db")
    
    # Environmental Stress Screening defaults
    CHAMBER_TARGET_TEMP_C: float = 125.0
    BURN_IN_TOTAL_HOURS: int = 168
    EARLY_CHECKPOINT_HOURS: int = 24
    
    # Static Datasheet Limits (Default Microsemi/ISRO Radiation-Hardened FPGA/ASIC Specs)
    STATIC_LIMITS: dict = {
        "iddq": 50.0,       # µA (Quiescent Supply Current)
        "leakage": 100.0,   # nA (Input/Output Pad Leakage)
        "propDelay": 12.0   # ns (Critical Path Propagation Delay)
    }
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*"
    ]

settings = Settings()
