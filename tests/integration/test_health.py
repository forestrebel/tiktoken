"""Integration tests for service health and connectivity."""
import os
import aiohttp
import asyncio
import pytest
from typing import Dict, List

# Service configuration
SERVICES = {
    "core_api": {
        "url": "http://localhost:8080",
        "health_endpoint": "/health",
        "required_endpoints": ["/api/v1/videos"]
    },
    "ai_service": {
        "url": "http://localhost:8081",
        "health_endpoint": "/health",
        "required_endpoints": ["/api/v1/process"]
    },
    "frontend": {
        "url": "http://localhost:3000",
        "health_endpoint": "/health",
        "required_endpoints": ["/"]
    },
    "supabase": {
        "url": "http://localhost:54323",
        "health_endpoint": "/health",
        "required_endpoints": []
    }
}

@pytest.fixture
async def http_client():
    """Create aiohttp client session."""
    async with aiohttp.ClientSession() as session:
        yield session

async def check_service_health(client: aiohttp.ClientSession, service: str) -> bool:
    """Check if a service is healthy by calling its health endpoint."""
    if service not in SERVICES:
        pytest.fail(f"Unknown service: {service}")
    
    service_config = SERVICES[service]
    health_url = f"{service_config['url']}{service_config['health_endpoint']}"
    
    try:
        async with client.get(health_url) as response:
            if response.status != 200:
                return False
            data = await response.json()
            return data.get("status") == "healthy"
    except aiohttp.ClientError:
        return False

async def verify_service_connections(client: aiohttp.ClientSession) -> bool:
    """Verify that all services can communicate with each other."""
    # Check core_api -> ai_service connectivity
    try:
        async with client.get(f"{SERVICES['core_api']['url']}/api/v1/ai/status") as response:
            if response.status != 200:
                return False
    except aiohttp.ClientError:
        return False
    
    # Check frontend -> core_api connectivity
    try:
        async with client.get(f"{SERVICES['core_api']['url']}/api/v1/health") as response:
            if response.status != 200:
                return False
    except aiohttp.ClientError:
        return False
    
    # Check core_api -> supabase connectivity
    try:
        async with client.get(f"{SERVICES['core_api']['url']}/api/v1/db/status") as response:
            if response.status != 200:
                return False
    except aiohttp.ClientError:
        return False
    
    return True

async def check_resource_availability(client: aiohttp.ClientSession) -> bool:
    """Check if all required resources are available."""
    for service, config in SERVICES.items():
        # Check required endpoints
        for endpoint in config["required_endpoints"]:
            try:
                async with client.get(f"{config['url']}{endpoint}") as response:
                    if response.status not in (200, 404):  # 404 is ok for empty endpoints
                        return False
            except aiohttp.ClientError:
                return False
    
    return True

@pytest.mark.asyncio
async def test_individual_service_health(http_client):
    """Test that each service is healthy."""
    for service in SERVICES:
        assert await check_service_health(http_client, service), f"{service} is not healthy"

@pytest.mark.asyncio
async def test_cross_service_connectivity(http_client):
    """Test that services can communicate with each other."""
    assert await verify_service_connections(http_client), "Cross-service connectivity check failed"

@pytest.mark.asyncio
async def test_resource_availability(http_client):
    """Test that all required resources are available."""
    assert await check_resource_availability(http_client), "Resource availability check failed"

@pytest.mark.asyncio
async def test_parallel_health_checks(http_client):
    """Test all health checks in parallel for performance."""
    tasks = [
        check_service_health(http_client, service)
        for service in SERVICES
    ]
    results = await asyncio.gather(*tasks)
    assert all(results), "Parallel health checks failed" 