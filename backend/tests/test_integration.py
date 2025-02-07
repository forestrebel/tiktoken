"""Integration tests for video processing flow."""
import os
import pytest
from fastapi import status
from api.status import ProcessingState

pytestmark = pytest.mark.asyncio

async def test_health_check(async_client, mock_ffmpeg, mock_magic):
    """Test complete health check flow."""
    response = await async_client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert data["status"] == "ok"
    assert "ffmpeg" in data["dependencies"]
    assert "magic" in data["dependencies"]
    assert data["storage"] is not None

async def test_upload_and_status_flow(
    async_client, 
    test_video_path, 
    mock_ffmpeg, 
    mock_magic
):
    """Test complete upload -> status -> metadata flow."""
    # 1. Upload video
    with open(test_video_path, "rb") as video:
        files = {"file": ("test.mp4", video, "video/mp4")}
        response = await async_client.post("/upload", files=files)
    
    assert response.status_code == status.HTTP_200_OK
    upload_data = response.json()
    video_id = upload_data["id"]
    
    # 2. Check initial status
    response = await async_client.get(f"/videos/{video_id}/status")
    assert response.status_code == status.HTTP_200_OK
    
    status_data = response.json()
    assert status_data["state"] in [
        ProcessingState.PENDING,
        ProcessingState.PROCESSING
    ]
    
    # 3. Get metadata
    response = await async_client.get(f"/videos/{video_id}/metadata")
    assert response.status_code == status.HTTP_200_OK
    
    metadata = response.json()
    assert metadata["id"] == video_id
    assert metadata["specs"] is not None
    assert metadata["storage_info"] is not None

async def test_invalid_video_upload(
    async_client, 
    test_video_path, 
    mock_ffmpeg, 
    mock_magic
):
    """Test upload validation failure cases."""
    # 1. Invalid MIME type
    with open(test_video_path, "rb") as video:
        files = {"file": ("test.txt", video, "text/plain")}
        response = await async_client.post("/upload", files=files)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "error" in response.json()
    
    # 2. Missing file
    response = await async_client.post("/upload")
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    # 3. Invalid video format
    invalid_path = test_video_path.replace(".mp4", "_invalid.mp4")
    with open(test_video_path, "rb") as src:
        with open(invalid_path, "wb") as dst:
            dst.write(src.read())
    
    try:
        with open(invalid_path, "rb") as video:
            files = {"file": ("invalid.mp4", video, "video/mp4")}
            response = await async_client.post("/upload", files=files)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        error_data = response.json()
        assert "error" in error_data
        assert "suggestions" in error_data
    finally:
        os.unlink(invalid_path)

async def test_status_error_cases(async_client):
    """Test status endpoint error handling."""
    # 1. Non-existent video
    response = await async_client.get("/videos/nonexistent/status")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    
    error_data = response.json()
    assert "error" in error_data
    assert "suggestions" in error_data
    
    # 2. Invalid video ID format
    response = await async_client.get("/videos/../status")
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

async def test_metadata_error_cases(async_client):
    """Test metadata endpoint error handling."""
    # 1. Non-existent video
    response = await async_client.get("/videos/nonexistent/metadata")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    
    error_data = response.json()
    assert "error" in error_data
    assert "suggestions" in error_data
    
    # 2. Invalid video ID format
    response = await async_client.get("/videos/../metadata")
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

async def test_concurrent_uploads(
    async_client, 
    test_video_path, 
    mock_ffmpeg, 
    mock_magic
):
    """Test handling multiple concurrent uploads."""
    async def upload_video():
        with open(test_video_path, "rb") as video:
            files = {"file": ("test.mp4", video, "video/mp4")}
            return await async_client.post("/upload", files=files)
    
    # Upload 3 videos concurrently
    responses = await asyncio.gather(*[
        upload_video() for _ in range(3)
    ])
    
    # Check all uploads succeeded
    for response in responses:
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "id" in data
        assert "url" in data
        assert "specs" in data

async def test_storage_recovery(
    async_client, 
    test_video_path, 
    mock_ffmpeg, 
    mock_magic,
    mocker
):
    """Test system recovery from storage failures."""
    # 1. Upload with storage failure
    mocker.patch(
        "core.supabase.get_supabase_client",
        side_effect=Exception("Storage error")
    )
    
    with open(test_video_path, "rb") as video:
        files = {"file": ("test.mp4", video, "video/mp4")}
        response = await async_client.post("/upload", files=files)
    
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    error_data = response.json()
    assert "error" in error_data
    assert "suggestions" in error_data
    
    # 2. Check health reflects storage issue
    response = await async_client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    health_data = response.json()
    assert health_data["status"] == "error"
    assert health_data["storage"]["status"] == "error" 