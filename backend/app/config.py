import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "E-Waste Saathi"
    PROJECT_TAGLINE: str = "Collect Better. Earn Fairly. Recycle Safely."
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "ewaste-saathi-sih2026-supersecret-jwt-key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # SQLite default for local plug-and-play, PostgreSQL for production
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./ewaste_saathi.db")
    
    # AI thresholds
    CV_CONFIDENCE_THRESHOLD: float = 0.65
    ANOMALY_PRICE_DEVIATION_THRESHOLD: float = 0.25  # 25% price deviation flags anomaly
    DUPLICATE_HASH_HAMMING_THRESHOLD: int = 6       # perceptual hash distance <= 6 is duplicate
    
    # Storage
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    IS_DEMO_DATA_VISIBLE: bool = True

settings = Settings()
