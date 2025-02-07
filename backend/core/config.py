"""Firebase configuration."""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings

class FirebaseSettings(BaseSettings):
    """Firebase configuration settings."""
    credentials_path: str = "firebase-credentials.json"
    storage_bucket: str = "tiktoken-videos"
    
    # Optional settings
    region: str = "us-central1"
    max_retry_attempts: int = 3
    timeout_seconds: int = 30
    
    class Config:
        env_prefix = "FIREBASE_"
        env_file = ".env"

@lru_cache()
def get_firebase_settings() -> FirebaseSettings:
    """Get cached Firebase settings."""
    return FirebaseSettings() 