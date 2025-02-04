"""Integration tests for critical user-facing paths.

Tests only the essential flows that directly impact users:
1. Video upload and storage
2. User authentication
3. Service health and connectivity
"""
import os
import pytest
import httpx
from datetime import datetime

# Test configuration
API_URL = os.getenv("API_URL", "http://localhost:8000")
STORAGE_URL = os.getenv("STORAGE_URL", "http://localhost:9000")
AUTH_URL = os.getenv("AUTH_URL", "http://localhost:8080")

# Test data
TEST_VIDEO = b"test video content"
TEST_USER = {
    "email": f"test_{datetime.now().timestamp()}@example.com",
    "password": "test123!"
}

@pytest.fixture
async def http_client():
    """Create a shared HTTP client for tests."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        yield client

@pytest.fixture
async def auth_token(http_client):
    """Get authentication token for test user."""
    # Create test user and get token
    response = await http_client.post(
        f"{AUTH_URL}/auth/signup",
        json=TEST_USER
    )
    assert response.status_code == 200
    data = response.json()
    return data["access_token"]

@pytest.mark.asyncio
async def test_service_health(http_client):
    """Verify critical services are healthy."""
    # Check API health
    response = await http_client.get(f"{API_URL}/health")
    assert response.status_code == 200
    
    # Check storage health
    response = await http_client.get(f"{STORAGE_URL}/health")
    assert response.status_code == 200
    
    # Check auth service health
    response = await http_client.get(f"{AUTH_URL}/health")
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_auth_flow(http_client):
    """Test minimal user authentication flow."""
    # 1. Sign up
    signup_response = await http_client.post(
        f"{AUTH_URL}/auth/signup",
        json=TEST_USER
    )
    assert signup_response.status_code == 200
    token = signup_response.json()["access_token"]
    
    # 2. Verify token works with API
    me_response = await http_client.get(
        f"{API_URL}/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_response.status_code == 200

@pytest.mark.asyncio
async def test_video_upload(http_client, auth_token):
    """Test minimal video upload and storage flow."""
    # 1. Get upload URL
    response = await http_client.post(
        f"{API_URL}/videos/upload/prepare",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"filename": "test.mp4", "content_type": "video/mp4"}
    )
    assert response.status_code == 200
    upload_data = response.json()
    
    # 2. Upload to storage
    upload_response = await http_client.put(
        upload_data["upload_url"],
        content=TEST_VIDEO,
        headers={"Content-Type": "video/mp4"}
    )
    assert upload_response.status_code in (200, 204)
    
    # 3. Verify metadata saved
    metadata_response = await http_client.get(
        f"{API_URL}/videos/{upload_data['video_id']}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert metadata_response.status_code == 200
    video_data = metadata_response.json()
    assert video_data["status"] in ("uploaded", "processing", "ready") 