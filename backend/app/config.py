import os
import logging
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # API key for Gemini models
    gemini_api_key: Optional[str] = None
    
    # Path to service account JSON (optional)
    firebase_service_account_json_path: Optional[str] = None
    
    # Firebase storage bucket name (optional)
    firebase_storage_bucket: Optional[str] = None
    
    # Server configuration
    port: int = 8000
    host: str = "0.0.0.0"
    
    # Load settings from .env file or parent directory .env.local
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env.local"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

# Initialize settings
settings = Settings()

# Setup Logging format and levels
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("ai_resume_analyzer")
logger.info("FastAPI Configuration loaded successfully.")
if not settings.gemini_api_key:
    logger.warning("GEMINI_API_KEY is not configured in environment or env files!")
if not settings.firebase_service_account_json_path:
    logger.info("Firebase Service Account JSON not provided. Operating in Local Storage Fallback Mode.")
