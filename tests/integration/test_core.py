"""Core integration tests focusing on critical user functionality."""
import os
import json
import uuid
import aiohttp
import pytest
from typing import Dict, Optional

# Test configuration
API_URL = os.getenv("CORE_API_URL", "http://localhost:8080")
TEST_VIDEO_METADATA = {
    "title": "Test Video",
    "description": "Integration test video",
    "duration": 120,
    "tags": ["test", "integration"]
}

TEST_USER = {
    "id": str(uuid.uuid4()),
    "wallet_address": "0xTestWalletAddress",
    "engagement_score": 100
}

@pytest.fixture
async def http_client():
    """Create aiohttp client session."""
    async with aiohttp.ClientSession() as session:
        yield session

@pytest.fixture
async def test_video(http_client):
    """Create a test video and clean it up after."""
    video_id = str(uuid.uuid4())
    metadata = {**TEST_VIDEO_METADATA, "id": video_id}
    
    # Create video metadata
    async with http_client.post(
        f"{API_URL}/api/v1/videos",
        json=metadata
    ) as response:
        assert response.status == 201
        yield video_id
    
    # Cleanup
    async with http_client.delete(
        f"{API_URL}/api/v1/videos/{video_id}"
    ) as response:
        assert response.status in (200, 404)

@pytest.fixture
async def test_user(http_client):
    """Create a test user with wallet."""
    # Create user with wallet
    async with http_client.post(
        f"{API_URL}/api/v1/users",
        json=TEST_USER
    ) as response:
        assert response.status == 201
        yield TEST_USER["id"]
    
    # Cleanup
    async with http_client.delete(
        f"{API_URL}/api/v1/users/{TEST_USER['id']}"
    ) as response:
        assert response.status in (200, 404)

async def test_basic_health(http_client):
    """Verify core service health and database connectivity."""
    async with http_client.get(f"{API_URL}/health") as response:
        assert response.status == 200
        data = await response.json()
        assert data["status"] == "healthy"
        assert data["supabase"] == "connected"
        
        # Verify response time is reasonable
        assert "response_time_ms" in data
        assert float(data["response_time_ms"]) < 1000  # Max 1 second

@pytest.mark.asyncio
async def test_video_metadata_persistence(http_client, test_video):
    """Verify critical data operations for video metadata."""
    video_id = test_video
    
    # Test: Retrieve saved metadata
    async with http_client.get(
        f"{API_URL}/api/v1/videos/{video_id}"
    ) as response:
        assert response.status == 200
        data = await response.json()
        
        # Verify all critical fields are present and correct
        assert data["id"] == video_id
        assert data["title"] == TEST_VIDEO_METADATA["title"]
        assert data["description"] == TEST_VIDEO_METADATA["description"]
        assert data["duration"] == TEST_VIDEO_METADATA["duration"]
        assert set(data["tags"]) == set(TEST_VIDEO_METADATA["tags"])
        
        # Verify timestamps are present
        assert "created_at" in data
        assert "updated_at" in data
    
    # Test: Update metadata
    updated_metadata = {
        **TEST_VIDEO_METADATA,
        "title": "Updated Test Video"
    }
    
    async with http_client.put(
        f"{API_URL}/api/v1/videos/{video_id}",
        json=updated_metadata
    ) as response:
        assert response.status == 200
    
    # Test: Verify update persistence
    async with http_client.get(
        f"{API_URL}/api/v1/videos/{video_id}"
    ) as response:
        assert response.status == 200
        data = await response.json()
        assert data["title"] == "Updated Test Video"
        
        # Verify update didn't corrupt other fields
        assert data["description"] == TEST_VIDEO_METADATA["description"]
        assert data["duration"] == TEST_VIDEO_METADATA["duration"]

@pytest.mark.asyncio
async def test_token_distribution(http_client, test_user):
    """Verify token distribution for user engagement."""
    user_id = test_user
    
    # Given: User engagement data
    engagement_data = {
        "user_id": user_id,
        "engagement_type": "content_creation",
        "score": 100
    }
    
    # When: Trigger reward calculation
    async with http_client.post(
        f"{API_URL}/api/v1/rewards/calculate",
        json=engagement_data
    ) as response:
        assert response.status == 200
        data = await response.json()
        assert "transaction_id" in data
        transaction_id = data["transaction_id"]
    
    # Then: Verify transaction success
    async with http_client.get(
        f"{API_URL}/api/v1/transactions/{transaction_id}"
    ) as response:
        assert response.status == 200
        transaction = await response.json()
        assert transaction["status"] == "completed"
        assert transaction["user_id"] == user_id
        assert float(transaction["amount"]) > 0
    
    # And: Check wallet balance
    async with http_client.get(
        f"{API_URL}/api/v1/users/{user_id}/wallet"
    ) as response:
        assert response.status == 200
        wallet = await response.json()
        assert float(wallet["balance"]) >= float(transaction["amount"])
        assert wallet["last_transaction_id"] == transaction_id

@pytest.mark.asyncio
async def test_error_handling(http_client):
    """Verify error handling for critical operations."""
    # Test: Invalid video ID
    async with http_client.get(
        f"{API_URL}/api/v1/videos/invalid-id"
    ) as response:
        assert response.status == 404
        data = await response.json()
        assert "error" in data
    
    # Test: Invalid metadata
    async with http_client.post(
        f"{API_URL}/api/v1/videos",
        json={"title": ""}  # Missing required fields
    ) as response:
        assert response.status == 400
        data = await response.json()
        assert "error" in data 