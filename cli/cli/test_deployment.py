"""Minimal deployment tests for critical paths only."""
import os
import pytest
import aiohttp

# Zero-wait properties
TIMEOUT = 3  # Quick timeouts
MAX_WAIT = 5  # Max seconds for any operation

# Minimal cloud configuration
CLOUD_API = os.getenv("CLOUD_API_URL", "https://api.tiktoken.ai")

@pytest.fixture
async def client():
    """Fast client setup."""
    timeout = aiohttp.ClientTimeout(total=TIMEOUT)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        yield session

async def test_cloud_health(client):
    """CRITICAL: Cloud API health check."""
    async with client.get(f"{CLOUD_API}/health") as response:
        assert response.status == 200, "Cloud API not healthy"

async def test_cloud_auth(client):
    """CRITICAL: Cloud auth flow."""
    # 1. Get test token
    async with client.post(
        f"{CLOUD_API}/auth/test-token",
        headers={"X-Test-Mode": "true"}
    ) as response:
        assert response.status == 200, "Test token failed"
        token = (await response.json())["token"]

    # 2. Verify token
    async with client.get(
        f"{CLOUD_API}/auth/verify",
        headers={"Authorization": f"Bearer {token}"}
    ) as response:
        assert response.status == 200, "Token verification failed"

async def test_cloud_storage(client):
    """CRITICAL: Cloud storage access."""
    # 1. Get upload URL
    async with client.post(
        f"{CLOUD_API}/storage/test-url",
        headers={"X-Test-Mode": "true"}
    ) as response:
        assert response.status == 200, "Storage URL request failed"
        assert "url" in await response.json(), "No storage URL received" 