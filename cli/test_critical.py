"""Test only what protects user value."""
import pytest
import aiohttp

# Properties
TIMEOUT = 2  # Fail faster
API = "http://localhost:8000"  # Core API

@pytest.fixture
async def client():
    """Quick client setup."""
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as session:
        yield session

async def test_alive(client):
    """Are critical services responding?"""
    async with client.get(f"{API}/health") as r:
        assert r.status == 200

async def test_auth_works(client):
    """Can user log in and stay logged in?"""
    # Login with test user
    async with client.post(f"{API}/auth/login", json={
        "email": "test@example.com",
        "password": "test123"
    }) as r:
        token = (await r.json())["token"]
        assert r.status == 200 and token

    # Token works
    async with client.get(
        f"{API}/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    ) as r:
        assert r.status == 200

async def test_upload_saves(client):
    """Can user upload video and find it later?"""
    # Upload small test video
    async with client.post(
        f"{API}/videos/upload",
        data=b"test" * 256,  # 1KB test data
        headers={"Authorization": "test-token"}
    ) as r:
        data = await r.json()
        assert r.status == 200
        video_id = data["id"]

    # Video exists
    async with client.head(
        f"{API}/videos/{video_id}",
        headers={"Authorization": "test-token"}
    ) as r:
        assert r.status == 200 