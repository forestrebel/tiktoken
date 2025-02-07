"""Performance tests for video processing system."""
import os
import time
import asyncio
import pytest
from fastapi import status
from api.status import ProcessingState

pytestmark = pytest.mark.asyncio

async def test_upload_throughput(
    async_client,
    test_video_path,
    mock_ffmpeg,
    mock_magic
):
    """Test system throughput with multiple concurrent uploads."""
    CONCURRENT_UPLOADS = 10
    MAX_UPLOAD_TIME = 5  # seconds
    
    async def timed_upload():
        start = time.time()
        with open(test_video_path, "rb") as video:
            files = {"file": ("test.mp4", video, "video/mp4")}
            response = await async_client.post("/upload", files=files)
            
        duration = time.time() - start
        return response, duration
    
    # Execute concurrent uploads
    results = await asyncio.gather(*[
        timed_upload() for _ in range(CONCURRENT_UPLOADS)
    ])
    
    # Analyze results
    successful = 0
    total_time = 0
    
    for response, duration in results:
        if response.status_code == status.HTTP_200_OK:
            successful += 1
            total_time += duration
            assert duration < MAX_UPLOAD_TIME, f"Upload took too long: {duration}s"
    
    # Assert performance metrics
    assert successful == CONCURRENT_UPLOADS, "Not all uploads succeeded"
    avg_time = total_time / successful
    assert avg_time < (MAX_UPLOAD_TIME / 2), f"Average upload time too high: {avg_time}s"

async def test_status_polling_load(
    async_client,
    test_video_path,
    mock_ffmpeg,
    mock_magic
):
    """Test status endpoint under polling load."""
    CONCURRENT_CLIENTS = 20
    POLL_DURATION = 5  # seconds
    MAX_LATENCY = 0.5  # seconds
    
    # First upload a test video
    with open(test_video_path, "rb") as video:
        files = {"file": ("test.mp4", video, "video/mp4")}
        response = await async_client.post("/upload", files=files)
    
    assert response.status_code == status.HTTP_200_OK
    video_id = response.json()["id"]
    
    async def poll_status():
        start_time = time.time()
        end_time = start_time + POLL_DURATION
        latencies = []
        
        while time.time() < end_time:
            poll_start = time.time()
            response = await async_client.get(f"/videos/{video_id}/status")
            latency = time.time() - poll_start
            
            assert response.status_code == status.HTTP_200_OK
            latencies.append(latency)
            
            # Simulate realistic polling interval
            await asyncio.sleep(0.1)
        
        return latencies
    
    # Execute concurrent polling
    all_latencies = await asyncio.gather(*[
        poll_status() for _ in range(CONCURRENT_CLIENTS)
    ])
    
    # Analyze latencies
    flat_latencies = [lat for client_lats in all_latencies for lat in client_lats]
    avg_latency = sum(flat_latencies) / len(flat_latencies)
    max_latency = max(flat_latencies)
    
    assert avg_latency < (MAX_LATENCY / 2), f"Average latency too high: {avg_latency}s"
    assert max_latency < MAX_LATENCY, f"Max latency too high: {max_latency}s"

async def test_metadata_response_time(
    async_client,
    test_video_path,
    mock_ffmpeg,
    mock_magic
):
    """Test metadata endpoint response times."""
    CONCURRENT_REQUESTS = 15
    MAX_LATENCY = 0.3  # seconds
    
    # Upload test video
    with open(test_video_path, "rb") as video:
        files = {"file": ("test.mp4", video, "video/mp4")}
        response = await async_client.post("/upload", files=files)
    
    assert response.status_code == status.HTTP_200_OK
    video_id = response.json()["id"]
    
    async def get_metadata():
        start = time.time()
        response = await async_client.get(f"/videos/{video_id}/metadata")
        latency = time.time() - start
        
        assert response.status_code == status.HTTP_200_OK
        return latency
    
    # Execute concurrent requests
    latencies = await asyncio.gather(*[
        get_metadata() for _ in range(CONCURRENT_REQUESTS)
    ])
    
    # Analyze response times
    avg_latency = sum(latencies) / len(latencies)
    max_latency = max(latencies)
    
    assert avg_latency < (MAX_LATENCY / 2), f"Average latency too high: {avg_latency}s"
    assert max_latency < MAX_LATENCY, f"Max latency too high: {max_latency}s"

async def test_system_memory_usage(
    async_client,
    test_video_path,
    mock_ffmpeg,
    mock_magic
):
    """Test memory usage under load."""
    import psutil
    import gc
    
    UPLOAD_COUNT = 5
    MAX_MEMORY_INCREASE = 100 * 1024 * 1024  # 100MB
    
    process = psutil.Process()
    
    # Force garbage collection and get baseline
    gc.collect()
    start_memory = process.memory_info().rss
    
    # Execute multiple uploads
    for _ in range(UPLOAD_COUNT):
        with open(test_video_path, "rb") as video:
            files = {"file": ("test.mp4", video, "video/mp4")}
            response = await async_client.post("/upload", files=files)
            assert response.status_code == status.HTTP_200_OK
    
    # Force GC again and check memory
    gc.collect()
    end_memory = process.memory_info().rss
    memory_increase = end_memory - start_memory
    
    assert memory_increase < MAX_MEMORY_INCREASE, \
        f"Memory usage increased too much: {memory_increase / 1024 / 1024:.1f}MB"

async def test_health_check_performance(
    async_client,
    mock_ffmpeg,
    mock_magic
):
    """Test health check endpoint performance."""
    CONCURRENT_CHECKS = 50
    MAX_LATENCY = 0.2  # seconds
    
    async def check_health():
        start = time.time()
        response = await async_client.get("/health")
        latency = time.time() - start
        
        assert response.status_code == status.HTTP_200_OK
        return latency
    
    # Execute concurrent health checks
    latencies = await asyncio.gather(*[
        check_health() for _ in range(CONCURRENT_CHECKS)
    ])
    
    # Analyze response times
    avg_latency = sum(latencies) / len(latencies)
    max_latency = max(latencies)
    
    assert avg_latency < (MAX_LATENCY / 2), f"Average latency too high: {avg_latency}s"
    assert max_latency < MAX_LATENCY, f"Max latency too high: {max_latency}s" 