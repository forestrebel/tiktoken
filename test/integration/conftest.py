"""Test configuration and fixtures."""
import os
import pytest
import docker

@pytest.fixture(scope="session")
def docker_client():
    """Create a Docker client."""
    return docker.from_env()

@pytest.fixture(scope="session")
def check_containers(docker_client: docker.DockerClient):
    """Check if core services are running."""
    containers = docker_client.containers.list()
    running_services = {
        container.labels.get("com.docker.compose.service")
        for container in containers
    }
    
    # Only check core services
    required_services = {
        "core_api",
        "supabase"
    }
    
    missing_services = required_services - running_services
    if missing_services:
        pytest.fail(
            f"Required core services not running: {missing_services}. "
            "Please run 't dev up' first."
        )

@pytest.fixture(autouse=True)
def setup_test_env(check_containers):
    """Set up test environment."""
    # Set environment variables for tests
    os.environ.update({
        "API_URL": "http://localhost:8000",
        "STORAGE_URL": "http://localhost:9000",
        "AUTH_URL": "http://localhost:8080"
    }) 