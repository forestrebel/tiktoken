"""Minimal deployment tests for critical paths."""
import os
import pytest
import aiohttp
import asyncio
from typing import Dict

# Cloud service configuration
CLOUD_SERVICES = {
    "core": os.getenv("CLOUD_API_URL", "https://api.tiktoken.ai"),
    "frontend": os.getenv("FRONTEND_URL", "https://tiktoken.ai"),
    "ai": os.getenv("AI_SERVICE_URL", "https://ai.tiktoken.ai"),
    "supabase": os.getenv("SUPABASE_URL", "https://db.tiktoken.ai")
}

@pytest.fixture
def required_env_vars():
    """Check required environment variables."""
    required = [
        "CLOUD_API_URL",
        "FRONTEND_URL",
        "AI_SERVICE_URL",
        "SUPABASE_URL",
        "SUPABASE_KEY"
    ]
    missing = [var for var in required if not os.getenv(var)]
    if missing:
        pytest.skip(f"Missing required environment variables: {', '.join(missing)}")

@pytest.fixture
async def cloud_client():
    """Create aiohttp client session for cloud tests."""
    async with aiohttp.ClientSession() as session:
        yield session

async def test_cloud_health(cloud_client, required_env_vars):
    """Verify cloud services are healthy - CRITICAL PATH."""
    unhealthy = []
    for service, url in CLOUD_SERVICES.items():
        try:
            async with cloud_client.get(f"{url}/health", timeout=5) as response:
                if response.status != 200:
                    unhealthy.append(service)
        except Exception:
            unhealthy.append(service)
    
    assert not unhealthy, f"Cloud services unhealthy: {', '.join(unhealthy)}"

async def test_cloud_integration(cloud_client, required_env_vars):
    """Verify cloud services work together - CRITICAL PATH."""
    # 1. Frontend can reach Core API
    async with cloud_client.get(
        f"{CLOUD_SERVICES['frontend']}/api/status"
    ) as response:
        assert response.status == 200, "Frontend → Core API connection failed"
    
    # 2. Core API can reach AI Service
    async with cloud_client.post(
        f"{CLOUD_SERVICES['core']}/api/ai/test",
        headers={"X-Test-Mode": "true"}
    ) as response:
        assert response.status == 200, "Core API → AI Service connection failed"
    
    # 3. Core API can reach Supabase
    async with cloud_client.get(
        f"{CLOUD_SERVICES['core']}/api/db/test",
        headers={"X-Test-Mode": "true"}
    ) as response:
        assert response.status == 200, "Core API → Supabase connection failed"

async def test_cloud_auth_flow(cloud_client, required_env_vars):
    """Verify cloud authentication flow - CRITICAL PATH."""
    auth_key = os.getenv("SUPABASE_KEY")
    
    # 1. Get anonymous token
    async with cloud_client.post(
        f"{CLOUD_SERVICES['supabase']}/auth/v1/token?grant_type=anonymous",
        headers={"apikey": auth_key}
    ) as response:
        assert response.status == 200, "Failed to get anonymous token"
        data = await response.json()
        assert "access_token" in data, "No access token in response"
    
    # 2. Verify token works with Core API
    async with cloud_client.get(
        f"{CLOUD_SERVICES['core']}/api/auth/verify",
        headers={"Authorization": f"Bearer {data['access_token']}"}
    ) as response:
        assert response.status == 200, "Token verification failed" 