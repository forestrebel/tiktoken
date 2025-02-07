"""Video processing service."""
import os
import tempfile
from typing import Optional
from fastapi import UploadFile
from pydantic import BaseModel
import ffmpeg

from .firebase import ProcessedVideo, get_firebase
from api.validation import validate_video, VideoSpecs

class ProcessingResult(BaseModel):
    """Result of video processing."""
    success: bool
    url: Optional[str] = None
    error: Optional[str] = None
    specs: Optional[VideoSpecs] = None

class VideoService:
    """Video processing service."""
    
    async def process_and_store(
        self,
        file: UploadFile,
        user_id: Optional[str] = None
    ) -> ProcessingResult:
        """Process video locally and store in Firebase.
        
        Flow:
        1. Save upload to temp file
        2. Validate video
        3. If valid, store in Firebase
        4. Return result with URL or error
        """
        temp_path = None
        try:
            # Save to temp file
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                content = await file.read()
                temp_file.write(content)
                temp_path = temp_file.name
            
            # Validate video
            validation = validate_video(temp_path)
            if not validation.valid:
                return ProcessingResult(
                    success=False,
                    error=validation.error,
                    specs=validation.specs
                )
            
            # Store in Firebase if valid
            firebase = get_firebase()
            processed = ProcessedVideo(
                file_path=file.filename,
                content_type=file.content_type,
                metadata={
                    "user_id": user_id,
                    "specs": validation.specs.dict()
                },
                user_id=user_id
            )
            
            url = await firebase.store_video(processed)
            
            return ProcessingResult(
                success=True,
                url=url,
                specs=validation.specs
            )
            
        except Exception as e:
            return ProcessingResult(
                success=False,
                error=f"Processing failed: {str(e)}"
            )
        finally:
            # Clean up temp file
            if temp_path and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except:
                    pass

# Global instance
_video_service = None

def get_video_service() -> VideoService:
    """Get video service singleton."""
    global _video_service
    if _video_service is None:
        _video_service = VideoService()
    return _video_service 