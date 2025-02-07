"""Test configuration and fixtures."""
import os
import tempfile
import asyncio
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient
from core.supabase import get_supabase_client
from api.validation import LIMITS
from main import app

# Test video data
TEST_VIDEO_DATA = {
    "valid": {
        "width": LIMITS["WIDTH"],
        "height": LIMITS["HEIGHT"],
        "fps": 30,
        "duration": 30,
        "colorSpace": "bt709"
    },
    "invalid_resolution": {
        "width": 1920,
        "height": 1080,
        "fps": 30,
        "duration": 30,
        "colorSpace": "bt709"
    }
}

@pytest.fixture
def test_video_path():
    """Create a temporary test video file."""
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as temp_file:
        # Write dummy video content
        temp_file.write(b"test video content")
        temp_path = temp_file.name
    
    yield temp_path
    
    # Cleanup
    try:
        os.unlink(temp_path)
    except:
        pass

@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)

@pytest_asyncio.fixture
async def async_client():
    """Create an async test client."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest_asyncio.fixture
async def supabase():
    """Get Supabase client."""
    async with get_supabase_client() as client:
        yield client

@pytest_asyncio.fixture(autouse=True)
async def cleanup_storage(supabase):
    """Clean up test videos after each test."""
    yield
    
    try:
        # Delete test videos from storage
        bucket = "videos"
        result = await supabase.storage.from_(bucket).list()
        for file in result:
            if file["name"].startswith("test_"):
                await supabase.storage.from_(bucket).remove([file["name"]])
    except Exception as e:
        print(f"Cleanup error: {e}")

@pytest.fixture
def mock_ffmpeg(mocker):
    """Mock FFmpeg for video validation."""
    def mock_probe(path, cmd=None):
        if "invalid" in path:
            raise Exception("Invalid video")
            
        return {
            "streams": [{
                "codec_type": "video",
                "width": LIMITS["WIDTH"],
                "height": LIMITS["HEIGHT"],
                "r_frame_rate": "30000/1001",
                "color_space": "bt709"
            }],
            "format": {
                "duration": "30.0",
                "size": "1000000"
            }
        }
    
    mocker.patch("ffmpeg.probe", side_effect=mock_probe)
    return mock_probe

@pytest.fixture
def mock_magic(mocker):
    """Mock python-magic for MIME type detection."""
    def mock_from_file(path, mime=False):
        if "invalid" in path:
            return "application/octet-stream"
        return "video/mp4"
    
    mocker.patch("magic.from_file", side_effect=mock_from_file)
    return mock_from_file 