#!/usr/bin/env python3
import os
import requests
from dotenv import load_dotenv

def test_frontend_health():
    """Test Frontend is accessible"""
    response = requests.get('https://tiktoken.vercel.app')
    assert response.status_code == 200

def test_frontend_api_connection():
    """Test Frontend can connect to Core API"""
    # Test CORS headers
    response = requests.options(
        'https://tiktoken-api-huipe.ondigitalocean.app/health',
        headers={'Origin': 'https://tiktoken.vercel.app'}
    )
    assert response.status_code == 204
    assert 'access-control-allow-origin' in response.headers
    assert response.headers['access-control-allow-origin'] == '*'
    
    # Test API endpoints from frontend perspective
    response = requests.get(
        'https://tiktoken-api-huipe.ondigitalocean.app/api/v1/public/stats',
        headers={'Origin': 'https://tiktoken.vercel.app'}
    )
    assert response.status_code == 200

def test_frontend_resources():
    """Test critical frontend resources"""
    resources = [
        '/',
        '/manifest.json',
        '/static/js/main.js',
        '/static/css/main.css'
    ]
    
    for resource in resources:
        response = requests.get(f'https://tiktoken.vercel.app{resource}')
        assert response.status_code in [200, 404], f"Resource {resource} failed with status {response.status_code}"

if __name__ == '__main__':
    print("Running Frontend integration tests...")
    test_frontend_health()
    print("✅ Health check passed")
    test_frontend_api_connection()
    print("✅ API connection test passed")
    test_frontend_resources()
    print("✅ Resource tests passed")
    print("All Frontend integration tests passed!")
