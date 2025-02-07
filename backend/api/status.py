"""Video status and metadata endpoints."""
from enum import Enum
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from core.supabase import get_supabase_client
from .validation import VideoSpecs

router = APIRouter()

class ProcessingState(str, Enum):
    """Video processing states."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class VideoMetadata(BaseModel):
    """Extended video metadata."""
    id: str
    filename: str
    url: str
    created_at: str
    specs: VideoSpecs
    state: ProcessingState
    error: Optional[str] = None
    progress: Optional[float] = None  # 0-100
    storage_path: Optional[str] = None

class StatusResponse(BaseModel):
    """Video status response."""
    id: str
    state: ProcessingState
    progress: Optional[float] = None
    error: Optional[str] = None
    suggestions: Optional[list[str]] = None

class MetadataResponse(BaseModel):
    """Video metadata response."""
    id: str
    filename: str
    url: str
    created_at: str
    specs: VideoSpecs
    storage_info: Dict[str, Any]

@router.get(
    "/videos/{video_id}/status",
    response_model=StatusResponse,
    responses={
        404: {"model": dict},
        500: {"model": dict}
    }
)
async def get_video_status(video_id: str):
    """
    Get video processing status.
    Returns:
    - Current state
    - Progress if processing
    - Error details if failed
    """
    try:
        async with get_supabase_client() as supabase:
            # Get video metadata
            result = await supabase.table("videos").select("*").eq("id", video_id).single()
            
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={
                        "error": "Video not found",
                        "suggestions": ["Check the video ID", "The video may have been deleted"]
                    }
                )
            
            video = VideoMetadata(**result)
            
            # Build response based on state
            response = StatusResponse(
                id=video.id,
                state=video.state,
                progress=video.progress
            )
            
            if video.state == ProcessingState.FAILED:
                response.error = video.error
                response.suggestions = [
                    "Try uploading the video again",
                    "Check if the video meets requirements",
                    "The video may be corrupted"
                ]
            
            return response
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Failed to get video status",
                "suggestions": [
                    "Try again later",
                    "The service may be experiencing issues"
                ]
            }
        )

@router.get(
    "/videos/{video_id}/metadata",
    response_model=MetadataResponse,
    responses={
        404: {"model": dict},
        500: {"model": dict}
    }
)
async def get_video_metadata(video_id: str):
    """
    Get detailed video metadata.
    Returns:
    - Basic info (filename, URL)
    - Video specs
    - Storage details
    """
    try:
        async with get_supabase_client() as supabase:
            # Get video metadata
            result = await supabase.table("videos").select("*").eq("id", video_id).single()
            
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={
                        "error": "Video not found",
                        "suggestions": ["Check the video ID", "The video may have been deleted"]
                    }
                )
            
            video = VideoMetadata(**result)
            
            # Get storage info
            storage_info = await supabase.storage.from_("videos").get_public_url(video.storage_path)
            
            return MetadataResponse(
                id=video.id,
                filename=video.filename,
                url=video.url,
                created_at=video.created_at,
                specs=video.specs,
                storage_info={
                    "bucket": "videos",
                    "path": video.storage_path,
                    "public_url": storage_info
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Failed to get video metadata",
                "suggestions": [
                    "Try again later",
                    "The service may be experiencing issues"
                ]
            }
        ) 