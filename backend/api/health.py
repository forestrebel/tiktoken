"""
Health check endpoints.
"""
from fastapi import APIRouter, Depends
from supabase import Client
import os
import shutil
import tempfile
from enum import Enum
from typing import Dict, Optional
from fastapi import status
from pydantic import BaseModel
import ffmpeg
import magic
from core.supabase import get_supabase_client

router = APIRouter()

class ServiceStatus(str, Enum):
    """Service status states."""
    OK = "ok"
    DEGRADED = "degraded"
    ERROR = "error"

class DependencyCheck(BaseModel):
    """Dependency check result."""
    status: ServiceStatus
    error: Optional[str] = None
    version: Optional[str] = None

class HealthResponse(BaseModel):
    """Health check response."""
    status: ServiceStatus
    message: str
    dependencies: Dict[str, DependencyCheck]
    storage: DependencyCheck

async def check_ffmpeg() -> DependencyCheck:
    """Validate ffmpeg installation and functionality."""
    try:
        # Get ffmpeg version
        probe = await ffmpeg.probe("", cmd="ffmpeg")
        version = probe.get('ffmpeg_version', 'unknown')
        
        return DependencyCheck(
            status=ServiceStatus.OK,
            version=version
        )
    except Exception as e:
        return DependencyCheck(
            status=ServiceStatus.ERROR,
            error=f"FFmpeg not available: {str(e)}"
        )

async def check_magic() -> DependencyCheck:
    """Validate python-magic installation."""
    try:
        # Create temp file to test magic
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_file.write(b"test content")
            temp_path = temp_file.name
        
        try:
            mime = magic.from_file(temp_path, mime=True)
            return DependencyCheck(
                status=ServiceStatus.OK,
                version=magic.version() if hasattr(magic, 'version') else 'installed'
            )
        finally:
            os.unlink(temp_path)
            
    except Exception as e:
        return DependencyCheck(
            status=ServiceStatus.ERROR,
            error=f"python-magic not working: {str(e)}"
        )

async def check_storage() -> DependencyCheck:
    """Validate storage access."""
    try:
        async with get_supabase_client() as supabase:
            # List buckets to verify access
            bucket = "videos"
            result = await supabase.storage.list_buckets()
            
            if not any(b.get('name') == bucket for b in result):
                return DependencyCheck(
                    status=ServiceStatus.ERROR,
                    error=f"Required bucket '{bucket}' not found"
                )
            
            return DependencyCheck(
                status=ServiceStatus.OK,
                version="supabase-storage"
            )
    except Exception as e:
        return DependencyCheck(
            status=ServiceStatus.ERROR,
            error=f"Storage not accessible: {str(e)}"
        )

@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
)
async def health_check():
    """
    Comprehensive health check.
    Validates:
    1. FFmpeg availability
    2. python-magic functionality
    3. Storage access
    """
    # Check all dependencies
    ffmpeg_status = await check_ffmpeg()
    magic_status = await check_magic()
    storage_status = await check_storage()
    
    dependencies = {
        "ffmpeg": ffmpeg_status,
        "magic": magic_status
    }
    
    # Determine overall status
    if any(d.status == ServiceStatus.ERROR for d in [*dependencies.values(), storage_status]):
        overall_status = ServiceStatus.ERROR
        message = "Critical service(s) unavailable"
    elif any(d.status == ServiceStatus.DEGRADED for d in [*dependencies.values(), storage_status]):
        overall_status = ServiceStatus.DEGRADED
        message = "Some services degraded"
    else:
        overall_status = ServiceStatus.OK
        message = "All systems operational"
    
    return HealthResponse(
        status=overall_status,
        message=message,
        dependencies=dependencies,
        storage=storage_status
    )

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