#!/usr/bin/env python3
import os
import requests
from dotenv import load_dotenv

def test_core_api_health():
    """Test Core API health endpoint"""
    response = requests.get('https://tiktoken-api-huipe.ondigitalocean.app/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'healthy'

def test_supabase_connection():
    """Test Core API can connect to Supabase"""
    load_dotenv('.env.production')
    
    headers = {
        'apikey': os.getenv('SUPABASE_KEY'),
        'Authorization': f'Bearer {os.getenv("SUPABASE_KEY")}'
    }
    
    # Test Supabase connection through Core API
    response = requests.get(
        'https://tiktoken-api-huipe.ondigitalocean.app/api/v1/tokens',
        headers=headers
    )
    assert response.status_code == 200
    
    # Direct Supabase connection test
    response = requests.get(
        f"{os.getenv('SUPABASE_URL')}/rest/v1/tokens",
        headers=headers
    )
    assert response.status_code == 200

def test_core_api_endpoints():
    """Test critical Core API endpoints"""
    load_dotenv('.env.production')
    
    headers = {
        'apikey': os.getenv('SUPABASE_KEY'),
        'Authorization': f'Bearer {os.getenv("SUPABASE_KEY")}'
    }
    
    endpoints = [
        '/api/v1/tokens',
        '/api/v1/users',
        '/api/v1/stats'
    ]
    
    for endpoint in endpoints:
        response = requests.get(
            f'https://tiktoken-api-huipe.ondigitalocean.app{endpoint}',
            headers=headers
        )
        assert response.status_code in [200, 401, 403], f"Endpoint {endpoint} failed with status {response.status_code}"

if __name__ == '__main__':
    print("Running Core API integration tests...")
    test_core_api_health()
    print("✅ Health check passed")
    test_supabase_connection()
    print("✅ Supabase connection test passed")
    test_core_api_endpoints()
    print("✅ Endpoint tests passed")
    print("All Core API integration tests passed!")
