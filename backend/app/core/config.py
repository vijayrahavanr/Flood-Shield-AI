import os
from pathlib import Path
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_ROOT = BASE_DIR.parent

class Settings:
    APP_NAME: str = os.getenv("APP_NAME", "FLOODSHIELD AI – Flood Prediction and Post-Flood Health Protection")
    TEAM_NAME: str = os.getenv("TEAM_NAME", "Digital Pioneer")
    VERSION: str = "1.0.0"
    APP_ENV: str = os.getenv("APP_ENV", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "floodshield-ai-super-secret-jwt-key-2026-digital-pioneer")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'floodshield.db'}")
    SQLITE_PATH: str = str(BASE_DIR / "floodshield.db")
    POSTGRES_FALLBACK_TO_SQLITE: bool = os.getenv("POSTGRES_FALLBACK_TO_SQLITE", "true").lower() == "true"

    OPENWEATHER_API_KEY: Optional[str] = os.getenv("OPENWEATHER_API_KEY", "")
    CWC_WATER_LEVEL_API_KEY: Optional[str] = os.getenv("CWC_WATER_LEVEL_API_KEY", "")
    COPERNICUS_CLIENT_ID: Optional[str] = os.getenv("COPERNICUS_CLIENT_ID", "")
    COPERNICUS_CLIENT_SECRET: Optional[str] = os.getenv("COPERNICUS_CLIENT_SECRET", "")
    NASA_EARTHDATA_TOKEN: Optional[str] = os.getenv("NASA_EARTHDATA_TOKEN", "")
    USE_MOCK_EXTERNAL_APIS: bool = os.getenv("USE_MOCK_EXTERNAL_APIS", "true").lower() == "true"

    MODELS_DIR: Path = PROJECT_ROOT / "models"
    DATA_DIR: Path = PROJECT_ROOT / "data"

settings = Settings()
