"""Minimal integration tests for critical paths only."""
import os
import pytest
import aiohttp
import asyncio
from pathlib import Path

# Test configuration
SERVICES = {
    "core": "http://localhost:8000",
    "supabase-db": "http://localhost:54322",
    "supabase-rest": "http://localhost:54321"
}

TEST_VIDEO = Path(__file__).parent / "test_data" / "sample.mp4"
TEST_USER = {
    "email": f"test_{int(asyncio.get_event_loop().time())}@example.com",
    "password": "test_password_123"
}

@pytest.fixture
async def http_client():
    """Create aiohttp client session."""
    async with aiohttp.ClientSession() as session:
        yield session

@pytest.fixture
async def auth_headers(http_client):
    """Get authentication headers for test user."""
    auth_url = f"{SERVICES['supabase-rest']}/auth/v1/token?grant_type=password"
    async with http_client.post(auth_url, json=TEST_USER) as response:
        data = await response.json()
        return {"Authorization": f"Bearer {data['access_token']}"}

async def test_service_health(http_client):
    """Test basic health checks - CRITICAL PATH."""
    unhealthy = []
    for service, url in SERVICES.items():
        try:
            async with http_client.get(f"{url}/health", timeout=5) as response:
                if response.status != 200:
                    unhealthy.append(service)
        except Exception:
            unhealthy.append(service)
    
    assert not unhealthy, f"Services unhealthy: {', '.join(unhealthy)}"

async def test_auth_flow(http_client):
    """Test user auth → token distribution - CRITICAL PATH."""
    # 1. Register test user
    register_url = f"{SERVICES['supabase-rest']}/auth/v1/signup"
    async with http_client.post(register_url, json=TEST_USER) as response:
        assert response.status == 200, "User registration failed"
        data = await response.json()
        assert "access_token" in data, "No access token in response"
    
    # 2. Verify token works with Core API
    headers = {"Authorization": f"Bearer {data['access_token']}"}
    async with http_client.get(f"{SERVICES['core']}/api/user/me", headers=headers) as response:
        assert response.status == 200, "Token verification failed"

async def test_video_upload_flow(http_client, auth_headers):
    """Test video upload → storage → metadata - CRITICAL PATH."""
    if not TEST_VIDEO.exists():
        pytest.skip("Test video file not found")
    
    # 1. Get upload URL
    async with http_client.post(
        f"{SERVICES['core']}/api/videos/upload",
        headers=auth_headers
    ) as response:
        assert response.status == 200, "Failed to get upload URL"
        data = await response.json()
        upload_url = data["upload_url"]
        video_id = data["video_id"]
    
    # 2. Upload video
    with open(TEST_VIDEO, "rb") as f:
        async with http_client.put(
            upload_url,
            data=f,
            headers={"Content-Type": "video/mp4"}
        ) as response:
            assert response.status in (200, 204), "Video upload failed"
    
    # 3. Verify metadata in database
    async with http_client.get(
        f"{SERVICES['core']}/api/videos/{video_id}",
        headers=auth_headers
    ) as response:
        assert response.status == 200, "Failed to get video metadata"
        data = await response.json()
        assert data["id"] == video_id, "Video ID mismatch"
        assert data["status"] == "processing", "Video not marked for processing" 