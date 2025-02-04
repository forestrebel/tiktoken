"""Pytest configuration for integration tests."""
import os
import pytest
import docker
from typing import Generator

@pytest.fixture(scope="session")
def docker_client() -> Generator[docker.DockerClient, None, None]:
    """Create a Docker client."""
    client = docker.from_env()
    yield client
    client.close()

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
    """Setup test environment before each test."""
    # Set test environment variables
    os.environ["NODE_ENV"] = "test"
    os.environ["TESTING"] = "true"
    os.environ["DEPLOYMENT_ENV"] = os.getenv("DEPLOYMENT_ENV", "local")
    
    yield
    
    # Cleanup after tests
    os.environ.pop("TESTING", None) 