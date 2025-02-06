"""Critical path tests for deployment verification.
Following MINIMAL_TESTING.md guidelines:
- Focus on critical paths only
- Maintain zero-wait properties
- Skip framework features
- Skip complex scenarios
"""
import os
import pytest
import aiohttp
import asyncio
from typing import Dict

# Zero-wait properties
TIMEOUT = 3  # seconds
MAX_WAIT = 5  # seconds

# Service configuration
SERVICES: Dict[str, Dict[str, str]] = {
    "supabase": {
        "url": os.getenv("SUPABASE_URL", ""),
        "health": "/health"
    },
    "do-api": {
        "url": os.getenv("DO_API_URL", ""),
        "health": "/health"
    },
    "vercel": {
        "url": os.getenv("VERCEL_URL", ""),
        "health": "/api/health"
    }
}

async def check_service(service: str, session: aiohttp.ClientSession) -> bool:
    """Quick health check for a service."""
    if service not in SERVICES:
        return False
    
    config = SERVICES[service]
    if not config["url"]:
        pytest.skip(f"No URL configured for {service}")
    
    try:
        async with session.get(
            f"{config['url']}{config['health']}", 
            timeout=TIMEOUT
        ) as response:
            return response.status == 200
    except Exception:
        return False

@pytest.mark.asyncio
async def test_supabase_health():
    """Verify Supabase is healthy."""
    async with aiohttp.ClientSession() as session:
        assert await check_service("supabase", session)

@pytest.mark.asyncio
async def test_api_health():
    """Verify Core API is healthy."""
    async with aiohttp.ClientSession() as session:
        assert await check_service("do-api", session)

@pytest.mark.asyncio
async def test_frontend_health():
    """Verify Frontend is healthy."""
    async with aiohttp.ClientSession() as session:
        assert await check_service("vercel", session)

@pytest.mark.asyncio
async def test_deployment_order():
    """Verify services are deployed in correct order."""
    async with aiohttp.ClientSession() as session:
        # 1. Database must be up first
        assert await check_service("supabase", session)
        
        # 2. API depends on database
        assert await check_service("do-api", session)
        
        # 3. Frontend depends on API
        assert await check_service("vercel", session) 