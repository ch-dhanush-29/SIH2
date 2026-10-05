import os
import secrets
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "BurnWatch 3D - ISRO Component Screening Platform"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = Field(default="development", description="development | production | test")

    # Security: In production, SECRET_KEY must be provided via environment variable.
    # In development, generate an ephemeral cryptographically secure 256-bit key if not provided.
    SECRET_KEY: str = Field(
        default_factory=lambda: os.getenv("SECRET_KEY") or secrets.token_urlsafe(32)
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    DEMO_TOKEN: str = Field(
        default=os.getenv("DEMO_TOKEN", "burnwatch_demo_token_sih2026"),
        description="Shared token for Golden Demo and offline verification mode"
    )

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        env = os.getenv("ENVIRONMENT", "development").lower()
        if env == "production":
            insecure_markers = ["change_this", "changeme", "insecure_default"]
            if not v or len(v) < 32 or any(marker in v.lower() for marker in insecure_markers):
                raise ValueError(
                    "CRITICAL SECURITY ERROR: In production environment, SECRET_KEY must be a cryptographically "
                    "secure string of at least 32 characters, and cannot contain default placeholders."
                )
        return v

    # Database configuration: Default SQLite for dev/test, PostgreSQL for production
    DATABASE_URL: str = Field(
        default=os.getenv("DATABASE_URL", "sqlite:///./burnwatch.db")
    )

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        env = os.getenv("ENVIRONMENT", "development").lower()
        if env == "production":
            if "sqlite" in v.lower():
                raise ValueError("CRITICAL SECURITY ERROR: SQLite is prohibited in production! PostgreSQL 16+ is required.")
            if "secure_production_password" in v.lower():
                raise ValueError("CRITICAL SECURITY ERROR: Default placeholder 'secure_production_password' detected in DATABASE_URL! Provide real external secrets.")
        return v

    # AI Execution Mode: sync (demo/low-frequency) or async (worker queue for high-scale production)
    SCREENING_MODE: str = Field(
        default=os.getenv("SCREENING_MODE", "sync"),
        description="sync | async"
    )

    # Redis Event Bus: Redis URL with graceful in-memory pubsub fallback if absent
    REDIS_URL: str = Field(
        default=os.getenv("REDIS_URL", "redis://localhost:6379/0")
    )
    USE_REDIS_FALLBACK: bool = True  # If true, falls back to in-memory event bus when Redis is unreachable

    # Real-Time Telemetry & Rate Limiting
    TELEMETRY_BATCH_SIZE: int = 500
    TELEMETRY_RATE_LIMIT_PER_MINUTE: int = 6000
    MAX_PAYLOAD_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB
    CLOCK_SKEW_TOLERANCE_SECONDS: float = 10.0

    # Environmental Stress Screening defaults (MIL-STD-883H Class-S)
    CHAMBER_TARGET_TEMP_C: float = 125.0
    BURN_IN_TOTAL_HOURS: int = 168
    EARLY_CHECKPOINT_HOURS: int = 24

    # Static Datasheet Limits (Radiation-Hardened Microsemi/ISRO FPGA/ASIC Specs)
    STATIC_LIMITS: dict = {
        "iddq": 50.0,       # µA (Quiescent Supply Current)
        "leakage": 100.0,   # nA (Input/Output Pad Leakage)
        "propDelay": 12.0   # ns (Critical Path Propagation Delay)
    }

    # Production CORS: Configurable list of allowed origins. No wildcard '*' allowed in production!
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        return []

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
