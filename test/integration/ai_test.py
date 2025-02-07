#!/usr/bin/env python3
import os
import requests
from dotenv import load_dotenv

def test_ai_service_health():
    """Test AI Service health endpoint"""
    response = requests.get('https://tiktoken-ai.ondigitalocean.app/ai/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'healthy'

def test_ai_core_connection():
    """Test AI Service can connect to Core API"""
    load_dotenv('.env.production')
    
    # Test basic inference endpoint
    data = {
        "prompt": "test prompt",
        "max_tokens": 10
    }
    
    response = requests.post(
        'https://tiktoken-ai.ondigitalocean.app/ai/inference',
        json=data
    )
    assert response.status_code == 200
    
    # Test token counting endpoint
    response = requests.post(
        'https://tiktoken-ai.ondigitalocean.app/ai/tokens/count',
        json={"text": "test text"}
    )
    assert response.status_code == 200
    assert 'token_count' in response.json()

def test_ai_service_endpoints():
    """Test critical AI Service endpoints"""
    endpoints = [
        '/ai/models',
        '/ai/status',
        '/ai/tokens/encode'
    ]
    
    for endpoint in endpoints:
        response = requests.get(f'https://tiktoken-ai.ondigitalocean.app{endpoint}')
        assert response.status_code in [200, 401, 403], f"Endpoint {endpoint} failed with status {response.status_code}"

if __name__ == '__main__':
    print("Running AI Service integration tests...")
    test_ai_service_health()
    print("✅ Health check passed")
    test_ai_core_connection()
    print("✅ Core API connection test passed")
    test_ai_service_endpoints()
    print("✅ Endpoint tests passed")
    print("All AI Service integration tests passed!")
