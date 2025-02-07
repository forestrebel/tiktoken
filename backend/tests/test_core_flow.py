"""Test core video upload flow."""
import pytest
from fastapi import UploadFile
from core.video import get_video_service

pytestmark = pytest.mark.asyncio

async def test_video_upload_flow(test_video_path):
    """Test complete video upload flow.
    
    Flow:
    1. Local processing
    2. Firebase storage
    3. URL return
    """
    # Create upload file
    with open(test_video_path, "rb") as f:
        file = UploadFile(
            file=f,
            filename="test.mp4",
            content_type="video/mp4"
        )
        
        # Process video
        service = get_video_service()
        result = await service.process_and_store(file)
        
        # Verify result
        assert result.success
        assert result.url.startswith("https://")
        assert result.specs is not None
        assert result.specs.width == 720  # Our target width
        assert result.specs.height == 1280  # Our target height

async def test_invalid_video_flow(invalid_video_path):
    """Test invalid video handling.
    
    Flow:
    1. Local validation fails
    2. Clear error returned
    3. No Firebase upload
    """
    with open(invalid_video_path, "rb") as f:
        file = UploadFile(
            file=f,
            filename="invalid.mp4",
            content_type="video/mp4"
        )
        
        # Process video
        service = get_video_service()
        result = await service.process_and_store(file)
        
        # Verify result
        assert not result.success
        assert result.error is not None
        assert result.url is None  # No upload happened 