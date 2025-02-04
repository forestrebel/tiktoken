"""Minimal integration tests for critical paths only."""
import os
import pytest
import aiohttp
import asyncio
from pathlib import Path

# Zero-wait properties
TIMEOUT = 3  # Quick timeouts
MAX_WAIT = 5  # Max seconds for any operation

# Minimal service configuration
SERVICES = {
    "core": "http://localhost:8000",
    "storage": "http://localhost:54321"  # Supabase storage
}

# Test data
TEST_VIDEO = Path(__file__).parent / "test_data" / "sample.mp4"
TEST_USER = {"email": "test@example.com", "password": "test123"}

@pytest.fixture
async def client():
    """Fast client setup."""
    timeout = aiohttp.ClientTimeout(total=TIMEOUT)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        yield session

async def test_service_health(client):
    """CRITICAL: Basic connectivity test."""
    for service, url in SERVICES.items():
        async with client.get(f"{url}/health") as response:
            assert response.status == 200, f"{service} not healthy"

async def test_auth_flow(client):
    """CRITICAL: User auth → token distribution."""
    # 1. Get token (skip registration, use existing user)
    async with client.post(
        f"{SERVICES['core']}/auth/token",
        json=TEST_USER
    ) as response:
        assert response.status == 200, "Auth failed"
        token = (await response.json())["token"]
        assert token, "No token received"

    # 2. Verify token works
    async with client.get(
        f"{SERVICES['core']}/auth/verify",
        headers={"Authorization": f"Bearer {token}"}
    ) as response:
        assert response.status == 200, "Token invalid"

async def test_video_upload_flow(client):
    """CRITICAL: Video upload → storage → metadata."""
    if not TEST_VIDEO.exists():
        pytest.skip("Test video not found")

    # 1. Get upload URL
    async with client.post(
        f"{SERVICES['core']}/videos/upload",
        headers={"Authorization": "test-token"}  # Use fixed token for speed
    ) as response:
        assert response.status == 200, "Upload URL request failed"
        data = await response.json()
        assert "url" in data, "No upload URL received"

    # 2. Upload video (minimal size for speed)
    with open(TEST_VIDEO, "rb") as f:
        async with client.put(
            data["url"],
            data=f.read(1024),  # Just first 1KB
            headers={"Content-Type": "video/mp4"}
        ) as response:
            assert response.status in (200, 204), "Upload failed"

    # 3. Verify metadata exists (skip checking contents)
    async with client.head(
        f"{SERVICES['core']}/videos/{data['id']}",
        headers={"Authorization": "test-token"}
    ) as response:
        assert response.status == 200, "Metadata missing" 