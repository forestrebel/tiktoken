"""
Video upload endpoint.
"""
import logging
from fastapi import APIRouter, UploadFile, HTTPException, Depends
from core.supabase import get_supabase_client

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

async def get_current_user():
    """Temporary user auth stub"""
    return "test-user"  # We'll implement proper auth later

@router.post("/upload")
async def upload_video(
    file: UploadFile,
    user_id: str = Depends(get_current_user)
):
    """
    Upload video to Supabase storage.
    Only handle critical path:
    1. Validate file
    2. Upload to storage
    3. Return URL
    """
    try:
        # Basic validation
        if not file.content_type.startswith('video/'):
            raise HTTPException(
                status_code=400, 
                detail="Not a video file"
            )
            
        # Upload to Supabase
        bucket = "videos"
        path = f"{user_id}/{file.filename}"
        
        async with get_supabase_client() as supabase:
            result = await supabase.storage.from_(bucket).upload(
                path,
                await file.read()
            )
            
            if not result or 'Key' not in result:
                raise HTTPException(
                    status_code=500,
                    detail="Upload failed: No storage key returned"
                )
            
            # Get public URL
            url = supabase.storage.from_(bucket).get_public_url(path)
            return {"url": url}
        
    except Exception as e:
        # Log error details but don't expose them
        logger.error(f"Upload failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Upload failed. Please try again."
        ) 