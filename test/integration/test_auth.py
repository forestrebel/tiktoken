"""Critical auth flow integration test."""
import os
import pytest
import httpx
from typing import AsyncGenerator
import pytest_asyncio
from datetime import datetime, timedelta

# Test credentials (for integration testing only)
TEST_EMAIL = "test@tiktoken.dev"
TEST_PASSWORD = "integration-test-2024!"

@pytest_asyncio.fixture
async def client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """Create an async HTTP client."""
    async with httpx.AsyncClient(
        base_url=os.getenv("API_URL", "http://localhost:8000"),
        timeout=30.0,
        verify=False  # Allow self-signed certs in test
    ) as client:
        yield client

@pytest.mark.asyncio
async def test_auth_flow(client: httpx.AsyncClient):
    """
    Test critical auth flow:
    1. Sign up (or sign in if exists)
    2. Get JWT token
    3. Verify token with Supabase
    4. Access protected endpoint
    """
    # Step 1: Sign up or sign in
    auth_response = await client.post(
        "/auth/signup",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
    )
    
    if auth_response.status_code == 409:  # User exists
        auth_response = await client.post(
            "/auth/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
        )
    
    assert auth_response.status_code in (200, 201), \
        f"Auth failed: {auth_response.text}"
    
    # Step 2: Extract JWT
    token = auth_response.json()["access_token"]
    assert token, "No access token in response"
    
    # Step 3: Verify with protected endpoint
    me_response = await client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_response.status_code == 200, \
        f"Token verification failed: {me_response.text}"
    
    user_data = me_response.json()
    assert user_data["email"] == TEST_EMAIL, \
        "Email mismatch in user data"
    
    # Step 4: Verify token expiry
    token_data = user_data["token"]
    expires_at = datetime.fromisoformat(token_data["expires_at"])
    assert expires_at > datetime.utcnow() + timedelta(minutes=5), \
        "Token expires too soon" 