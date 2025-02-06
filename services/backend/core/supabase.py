"""
Supabase client configuration and utilities.
"""
from functools import lru_cache
from typing import AsyncGenerator

from supabase import create_client, Client

from api.config import get_settings


@lru_cache()
def get_supabase() -> Client:
    """Get Supabase client singleton"""
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.supabase_key
    )


async def get_supabase_client() -> AsyncGenerator[Client, None]:
    """Async context manager for Supabase client"""
    client = get_supabase()
    try:
        yield client
    finally:
        # Cleanup if needed in the future
        pass 