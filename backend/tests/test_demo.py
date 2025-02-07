"""Demo scenario tests to validate key user flows."""
import os
import time
import asyncio
import pytest
from fastapi import status
from api.status import ProcessingState

pytestmark = pytest.mark.asyncio

async def test_happy_path_flow(
    async_client,
    test_video_path,
    mock_ffmpeg,
    mock_magic
):
    """Test complete happy path for demo.
    Flow: Upload -> Process -> Status -> Metadata -> Display
    """
    # 1. System health check
    response = await async_client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == "ok"
    
    # 2. Upload video
    start_time = time.time()
    with open(test_video_path, "rb") as video:
        files = {"file": ("demo.mp4", video, "video/mp4")}
        response = await async_client.post("/upload", files=files)
    
    assert response.status_code == status.HTTP_200_OK
    upload_time = time.time() - start_time
    assert upload_time < 3, "Upload took too long for demo"
    
    data = response.json()
    video_id = data["id"]
    assert "url" in data
    assert "specs" in data
    
    # 3. Check processing status
    for _ in range(5):  # Poll a few times
        response = await async_client.get(f"/videos/{video_id}/status")
        assert response.status_code == status.HTTP_200_OK
        
        status_data = response.json()
        if status_data["state"] == ProcessingState.COMPLETED:
            break
            
        assert status_data["state"] in [
            ProcessingState.PENDING,
            ProcessingState.PROCESSING
        ]
        await asyncio.sleep(0.5)
    
    # 4. Get final metadata
    response = await async_client.get(f"/videos/{video_id}/metadata")
    assert response.status_code == status.HTTP_200_OK
    
    metadata = response.json()
    assert metadata["specs"]["width"] == 720  # Our target resolution
    assert metadata["specs"]["height"] == 1280

async def test_error_recovery_flow(
    async_client,
    test_video_path,
    mock_ffmpeg,
    mock_magic
):
    """Test error handling and recovery flow for demo.
    Flow: Error -> Clear Message -> Recovery Action
    """
    # 1. Try invalid file
    with open(test_video_path, "rb") as video:
        files = {"file": ("invalid.txt", video, "text/plain")}
        response = await async_client.post("/upload", files=files)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    error_data = response.json()
    assert "error" in error_data
    assert "suggestions" in error_data
    
    # 2. Try correct file after error
    with open(test_video_path, "rb") as video:
        files = {"file": ("valid.mp4", video, "video/mp4")}
        response = await async_client.post("/upload", files=files)
    
    assert response.status_code == status.HTTP_200_OK
    assert "url" in response.json()

async def test_load_handling_flow(
    async_client,
    test_video_path,
    mock_ffmpeg,
    mock_magic
):
    """Test system stability under demo load.
    Flow: Multiple Actions -> System Stable -> Responsive
    """
    # 1. Upload multiple videos
    upload_tasks = []
    for i in range(3):
        with open(test_video_path, "rb") as video:
            files = {"file": (f"demo_{i}.mp4", video, "video/mp4")}
            task = async_client.post("/upload", files=files)
            upload_tasks.append(task)
    
    responses = await asyncio.gather(*upload_tasks)
    video_ids = [r.json()["id"] for r in responses]
    
    # 2. Poll status for all videos
    for _ in range(3):  # Check a few times
        status_tasks = [
            async_client.get(f"/videos/{vid}/status")
            for vid in video_ids
        ]
        status_responses = await asyncio.gather(*status_tasks)
        
        # Verify all responses are valid
        for response in status_responses:
            assert response.status_code == status.HTTP_200_OK
        
        await asyncio.sleep(0.5)
    
    # 3. Get metadata for all
    metadata_tasks = [
        async_client.get(f"/videos/{vid}/metadata")
        for vid in video_ids
    ]
    metadata_responses = await asyncio.gather(*metadata_tasks)
    
    for response in metadata_responses:
        assert response.status_code == status.HTTP_200_OK

async def test_system_stability_flow(
    async_client,
    test_video_path,
    mock_ffmpeg,
    mock_magic
):
    """Test system remains stable during demo actions.
    Flow: Mixed Operations -> Monitor Health -> Verify Stability
    """
    # 1. Initial health check
    response = await async_client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    initial_health = response.json()
    
    # 2. Execute mixed operations
    operations = []
    
    # Upload
    with open(test_video_path, "rb") as video:
        files = {"file": ("demo.mp4", video, "video/mp4")}
        operations.append(
            async_client.post("/upload", files=files)
        )
    
    # Health checks
    operations.extend([
        async_client.get("/health")
        for _ in range(3)
    ])
    
    # Execute all operations
    responses = await asyncio.gather(*operations)
    for response in responses:
        assert response.status_code == status.HTTP_200_OK
    
    # 3. Final health check
    response = await async_client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    final_health = response.json()
    
    # System should remain healthy
    assert final_health["status"] == "ok"
    assert final_health["status"] == initial_health["status"]

async def test_performance_metrics_flow(
    async_client,
    test_video_path,
    mock_ffmpeg,
    mock_magic
):
    """Test performance metrics for demo.
    Flow: Measure Times -> Check Memory -> Verify Targets
    """
    import psutil
    process = psutil.Process()
    
    # 1. Measure upload time
    start_time = time.time()
    with open(test_video_path, "rb") as video:
        files = {"file": ("demo.mp4", video, "video/mp4")}
        response = await async_client.post("/upload", files=files)
    upload_time = time.time() - start_time
    
    assert response.status_code == status.HTTP_200_OK
    assert upload_time < 3, "Upload too slow for demo"
    
    # 2. Measure API response times
    video_id = response.json()["id"]
    
    start_time = time.time()
    response = await async_client.get(f"/videos/{video_id}/status")
    status_time = time.time() - start_time
    
    assert response.status_code == status.HTTP_200_OK
    assert status_time < 0.1, "Status check too slow for demo"
    
    # 3. Check memory usage
    memory_used = process.memory_info().rss / (1024 * 1024)  # MB
    assert memory_used < 500, f"Memory usage too high: {memory_used:.1f}MB" 