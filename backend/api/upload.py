"""
Video upload endpoint with Firebase integration.
"""
import logging
from typing import Optional
from fastapi import APIRouter, UploadFile, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from core.video import get_video_service, ProcessingResult
from core.firebase import get_firebase

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

class UploadResponse(BaseModel):
    """Upload response model."""
    url: str
    specs: dict

class ErrorResponse(BaseModel):
    """Error response model."""
    error: str
    specs: Optional[dict] = None
    suggestions: Optional[list[str]] = None

async def get_current_user(
    authorization: Optional[str] = None
) -> Optional[str]:
    """Get current user from Firebase token."""
    if not authorization:
        return None
        
    try:
        token = authorization.split("Bearer ")[1]
        firebase = get_firebase()
        decoded = await firebase.verify_token(token)
        return decoded["uid"]
    except Exception as e:
        logger.warning(f"Auth failed: {e}")
        return None

@router.post(
    "/upload",
    response_model=UploadResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    }
)
async def upload_video(
    file: UploadFile,
    user_id: Optional[str] = Depends(get_current_user)
):
    """Upload and process video.
    
    Flow:
    1. Optional user authentication
    2. Local video processing
    3. Firebase storage if valid
    4. Return URL or error details
    """
    try:
        # Basic content type check
        if not file.content_type.startswith('video/'):
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content=ErrorResponse(
                    error=f"Invalid file type: {file.content_type}",
                    suggestions=["Only video files are accepted"]
                ).dict()
            )
        
        # Process and store video
        video_service = get_video_service()
        result = await video_service.process_and_store(file, user_id)
        
        if not result.success:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content=ErrorResponse(
                    error=result.error,
                    specs=result.specs.dict() if result.specs else None,
                    suggestions=[
                        "Check video requirements",
                        "Try a different video",
                        "Ensure video is in portrait mode"
                    ]
                ).dict()
            )
        
        return UploadResponse(
            url=result.url,
            specs=result.specs.dict()
        )
        
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorResponse(
                error="Upload failed",
                suggestions=[
                    "Try uploading again",
                    "Check your network connection",
                    "Contact support if the problem persists"
                ]
            ).dict()
        ) 