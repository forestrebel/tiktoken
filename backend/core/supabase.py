"""
Supabase client configuration and utilities.
"""
from functools import lru_cache
from typing import AsyncContextManager

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


class SupabaseClientManager(AsyncContextManager[Client]):
    """Async context manager for Supabase client"""
    async def __aenter__(self) -> Client:
        self.client = get_supabase()
        return self.client

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        # Cleanup if needed in the future
        pass


def get_supabase_client() -> AsyncContextManager[Client]:
    """Get Supabase client as an async context manager"""
    return SupabaseClientManager() 