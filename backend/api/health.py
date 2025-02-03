"""
Health check endpoints.
"""
from fastapi import APIRouter, Depends
from supabase import Client

from api.config import Settings, get_settings
from core.supabase import get_supabase_client

router = APIRouter()


@router.get("/health")
async def health_check(settings: Settings = Depends(get_settings)):
    """Basic health check"""
    return {
        "status": "healthy",
        "version": settings.app_version,
        "name": settings.app_name
    }


@router.get("/health/supabase")
async def supabase_health(
    settings: Settings = Depends(get_settings),
    supabase: Client = Depends(get_supabase_client)
):
    """Check Supabase connection"""
    try:
        # Simple query to verify connection
        await supabase.table("health").select("*").limit(1).execute()
        return {
            "status": "healthy",
            "service": "supabase",
            "url": settings.supabase_url
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "supabase",
            "error": str(e)
        } 