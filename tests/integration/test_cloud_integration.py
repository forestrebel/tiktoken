"""Cloud component integration tests.

Tests integration between deployed components:
1. Frontend (Vercel) → Backend (Digital Ocean)
2. Backend → AI Service
3. Backend → Supabase Cloud
"""
import os
import asyncio
import pytest
from typing import AsyncGenerator, Dict, List
from datetime import datetime

import httpx
from .utils import (
    TestContext,
    TestError,
    verify_service_health,
    verify_auth_token,
    wait_for_video_processing,
    show_test_summary,
    log_test_step
)

# Load cloud configuration
CLOUD_CONFIG = {
    "core_api": os.getenv("CLOUD_API_URL", "https://api.tiktoken.com"),
    "frontend": os.getenv("FRONTEND_URL", "https://tiktoken.com"),
    "ai_service": os.getenv("AI_SERVICE_URL", "https://ai.tiktoken.com"),
    "supabase_url": os.getenv("SUPABASE_URL"),
    "supabase_key": os.getenv("SUPABASE_SERVICE_ROLE_KEY")
}

# Required environment variables
required_vars = [
    "CLOUD_API_URL",
    "FRONTEND_URL",
    "AI_SERVICE_URL",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "TEST_USER_EMAIL",
    "TEST_USER_PASSWORD"
]

@pytest.fixture(autouse=True)
def check_env_vars():
    """Verify all required environment variables are set."""
    missing = [var for var in required_vars if not os.getenv(var)]
    if missing:
        pytest.skip(f"Missing required environment variables: {', '.join(missing)}")

@pytest.fixture
async def cloud_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """Create a shared HTTP client for cloud tests."""
    async with httpx.AsyncClient(
        timeout=10.0,
        verify=True,  # Verify SSL certificates
        follow_redirects=True
    ) as client:
        yield client

@pytest.fixture
async def cloud_auth_headers(cloud_client: httpx.AsyncClient) -> Dict[str, str]:
    """Get cloud authentication headers."""
    async with TestContext("Setup: Cloud authentication") as ctx:
        # Login with test user
        response = await cloud_client.post(
            f"{CLOUD_CONFIG['supabase_url']}/auth/v1/token?grant_type=password",
            json={
                "email": os.getenv("TEST_USER_EMAIL"),
                "password": os.getenv("TEST_USER_PASSWORD")
            },
            headers={"apikey": CLOUD_CONFIG["supabase_key"]}
        )
        response.raise_for_status()
        token = response.json()["access_token"]
        
        # Verify token works with cloud API
        await verify_auth_token(
            cloud_client,
            CLOUD_CONFIG["core_api"],
            token
        )
        
        return {
            "Authorization": f"Bearer {token}",
            "apikey": CLOUD_CONFIG["supabase_key"]
        }

@pytest.fixture(autouse=True)
def test_results() -> List[Dict]:
    """Collect test results for summary."""
    results = []
    yield results
    show_test_summary(results)

@pytest.mark.asyncio
async def test_cloud_health(cloud_client: httpx.AsyncClient, test_results: List[Dict]):
    """Verify all cloud services are healthy."""
    async with TestContext("Health: Cloud services availability") as ctx:
        services = {
            "Core API": CLOUD_CONFIG["core_api"],
            "Frontend": CLOUD_CONFIG["frontend"],
            "AI Service": CLOUD_CONFIG["ai_service"]
        }
        
        unhealthy = []
        for name, url in services.items():
            try:
                await verify_service_health(cloud_client, url, name)
            except TestError:
                unhealthy.append(name)
        
        if unhealthy:
            raise TestError(
                "Some cloud services are unhealthy",
                {"unhealthy_services": unhealthy}
            )
        
        test_results.append(ctx.result)

@pytest.mark.asyncio
async def test_frontend_backend_integration(
    cloud_client: httpx.AsyncClient,
    cloud_auth_headers: Dict[str, str],
    test_results: List[Dict]
):
    """Test frontend to backend integration."""
    async with TestContext("Integration: Frontend to Backend") as ctx:
        # 1. Frontend can load initial data
        log_test_step("Loading frontend bootstrap data")
        response = await cloud_client.get(
            f"{CLOUD_CONFIG['frontend']}/api/bootstrap",
            headers=cloud_auth_headers
        )
        response.raise_for_status()
        bootstrap_data = response.json()
        if "config" not in bootstrap_data:
            raise TestError(
                "Frontend bootstrap data missing config",
                {"response": bootstrap_data}
            )
        
        # 2. Frontend can communicate with backend
        log_test_step("Verifying frontend to backend communication")
        response = await cloud_client.get(
            f"{CLOUD_CONFIG['core_api']}/api/v1/feed",
            headers=cloud_auth_headers
        )
        response.raise_for_status()
        
        # 3. Frontend handles backend errors gracefully
        log_test_step("Testing error handling")
        response = await cloud_client.get(
            f"{CLOUD_CONFIG['core_api']}/api/v1/invalid-endpoint",
            headers=cloud_auth_headers
        )
        assert response.status_code in (404, 400)
        
        test_results.append(ctx.result)

@pytest.mark.asyncio
async def test_backend_ai_integration(
    cloud_client: httpx.AsyncClient,
    cloud_auth_headers: Dict[str, str],
    test_results: List[Dict]
):
    """Test backend to AI service integration."""
    async with TestContext("Integration: Backend to AI Service") as ctx:
        # 1. Submit content for analysis
        log_test_step("Submitting content for AI analysis")
        analysis_response = await cloud_client.post(
            f"{CLOUD_CONFIG['core_api']}/api/v1/content/analyze",
            json={"text": "Test content for AI analysis"},
            headers=cloud_auth_headers
        )
        analysis_response.raise_for_status()
        result = analysis_response.json()
        
        # 2. Verify AI processing
        if not all(key in result.get("analysis", {}) for key in ["sentiment", "topics"]):
            raise TestError(
                "AI analysis missing required fields",
                {"result": result}
            )
        
        # 3. Test AI service error handling
        log_test_step("Testing AI service error handling")
        error_response = await cloud_client.post(
            f"{CLOUD_CONFIG['core_api']}/api/v1/content/analyze",
            json={"text": "error"},  # Trigger error case
            headers=cloud_auth_headers
        )
        assert error_response.status_code in (400, 422, 500)
        error_data = error_response.json()
        assert "error" in error_data
        
        test_results.append(ctx.result)

@pytest.mark.asyncio
async def test_end_to_end_flow(
    cloud_client: httpx.AsyncClient,
    cloud_auth_headers: Dict[str, str],
    test_results: List[Dict]
):
    """Test complete end-to-end flow through all cloud services."""
    async with TestContext("Flow: End-to-end video processing") as ctx:
        # 1. Frontend initiates video upload
        log_test_step("Preparing video upload")
        prepare_response = await cloud_client.post(
            f"{CLOUD_CONFIG['frontend']}/api/videos/prepare",
            json={"filename": "test.mp4", "type": "video/mp4"},
            headers=cloud_auth_headers
        )
        prepare_response.raise_for_status()
        upload_data = prepare_response.json()
        
        # 2. Upload to storage
        log_test_step("Uploading video content")
        test_content = b"test video content"
        upload_response = await cloud_client.put(
            upload_data["upload_url"],
            content=test_content,
            headers={"Content-Type": "video/mp4"}
        )
        assert upload_response.status_code in (200, 204)
        
        # 3. Start and wait for processing
        log_test_step("Processing video")
        process_response = await cloud_client.post(
            f"{CLOUD_CONFIG['core_api']}/api/v1/videos/{upload_data['video_id']}/process",
            headers=cloud_auth_headers
        )
        assert process_response.status_code == 202
        
        # 4. Wait for processing
        success, video_data = await wait_for_video_processing(
            cloud_client,
            CLOUD_CONFIG["core_api"],
            upload_data["video_id"],
            cloud_auth_headers,
            timeout=60  # Longer timeout for cloud processing
        )
        
        # 5. Verify AI analysis
        log_test_step("Verifying AI analysis")
        ai_response = await cloud_client.get(
            f"{CLOUD_CONFIG['ai_service']}/videos/{upload_data['video_id']}/analysis",
            headers=cloud_auth_headers
        )
        ai_response.raise_for_status()
        analysis = ai_response.json()
        if "analysis" not in analysis:
            raise TestError(
                "AI analysis missing from response",
                {"video_id": upload_data["video_id"], "response": analysis}
            )
        
        # 6. Verify frontend display
        log_test_step("Verifying frontend display")
        view_response = await cloud_client.get(
            f"{CLOUD_CONFIG['frontend']}/api/videos/{upload_data['video_id']}",
            headers=cloud_auth_headers
        )
        view_response.raise_for_status()
        video_data = view_response.json()
        
        required_fields = ["id", "status", "ai_analysis"]
        missing_fields = [f for f in required_fields if f not in video_data]
        if missing_fields:
            raise TestError(
                "Frontend video data missing required fields",
                {
                    "video_id": upload_data["video_id"],
                    "missing_fields": missing_fields,
                    "data": video_data
                }
            )
        
        test_results.append(ctx.result) 