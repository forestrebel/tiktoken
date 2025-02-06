"""
Health check endpoint tests.
"""
import pytest
from httpx import AsyncClient

from api.config import Settings, get_settings
from api.main import app


def get_test_settings():
    """Override settings for testing"""
    return Settings(
        supabase_url="https://test.supabase.co",
        supabase_key="test-key"
    )


# Override settings for testing
app.dependency_overrides[get_settings] = get_test_settings


@pytest.mark.asyncio
async def test_health_check():
    """Test basic health check endpoint"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert "name" in data


@pytest.mark.asyncio
async def test_supabase_health():
    """Test Supabase health check endpoint"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health/supabase")
        assert response.status_code == 200
        data = response.json()
        # Since we're using test credentials, we expect an unhealthy status
        assert data["status"] == "unhealthy"
        assert data["service"] == "supabase" 