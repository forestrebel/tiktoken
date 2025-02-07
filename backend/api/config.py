"""
Application configuration management.
"""
from functools import lru_cache
from typing import Optional
import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    app_name: str = "TikToken API"
    app_version: str = "0.1.0"
    debug: bool = False
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # Supabase
    supabase_url: str
    supabase_key: str
    
    class Config:
        env_file = ".env.test" if os.getenv("TESTING") else ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings() 