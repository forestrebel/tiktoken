"""Test utilities for integration tests with enhanced observability."""
import os
import asyncio
import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import httpx
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

console = Console()

class TestError(Exception):
    """Custom error for test failures with detailed context."""
    def __init__(self, message: str, context: Dict[str, Any]):
        self.message = message
        self.context = context
        super().__init__(f"{message}\nContext: {json.dumps(context, indent=2)}")

async def wait_for_condition(
    condition_func,
    timeout: int = 30,
    interval: float = 1.0,
    description: str = "Waiting for condition",
    error_message: str = "Condition not met",
    context: Optional[Dict[str, Any]] = None
) -> Tuple[bool, Dict[str, Any]]:
    """Wait for a condition with timeout and detailed feedback.
    
    Args:
        condition_func: Async function that returns (success, details)
        timeout: Maximum time to wait in seconds
        interval: Time between checks in seconds
        description: Human-readable description of what we're waiting for
        error_message: Message to show if condition times out
        context: Additional context to include in error
    
    Returns:
        Tuple of (success, details)
    """
    start = datetime.now()
    attempts = 0
    last_error = None
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task(description, total=None)
        
        while (datetime.now() - start) < timedelta(seconds=timeout):
            try:
                success, details = await condition_func()
                if success:
                    progress.update(task, description=f"[green]✓[/] {description}")
                    return True, details
            except Exception as e:
                last_error = str(e)
            
            attempts += 1
            progress.update(task, description=f"{description} (attempt {attempts})")
            await asyncio.sleep(interval)
        
        progress.update(task, description=f"[red]✗[/] {description}")
        
        error_context = {
            "timeout": timeout,
            "attempts": attempts,
            "last_error": last_error,
            **(context or {})
        }
        raise TestError(error_message, error_context)

async def verify_service_health(
    client: httpx.AsyncClient,
    service_url: str,
    service_name: str,
    timeout: int = 30
) -> Tuple[bool, Dict[str, Any]]:
    """Verify a service is healthy with retries and detailed status."""
    async def check_health():
        try:
            response = await client.get(f"{service_url}/health")
            response.raise_for_status()
            return True, {"status": "healthy", "response": response.json()}
        except Exception as e:
            return False, {"status": "unhealthy", "error": str(e)}
    
    return await wait_for_condition(
        check_health,
        timeout=timeout,
        description=f"Checking {service_name} health",
        error_message=f"{service_name} health check failed",
        context={"service_url": service_url}
    )

async def verify_auth_token(
    client: httpx.AsyncClient,
    api_url: str,
    token: str,
    timeout: int = 10
) -> Tuple[bool, Dict[str, Any]]:
    """Verify an authentication token is valid."""
    async def check_token():
        try:
            response = await client.get(
                f"{api_url}/api/v1/auth/verify",
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            return True, {"status": "valid", "response": response.json()}
        except Exception as e:
            return False, {"status": "invalid", "error": str(e)}
    
    return await wait_for_condition(
        check_token,
        timeout=timeout,
        description="Verifying auth token",
        error_message="Token verification failed",
        context={"api_url": api_url}
    )

async def wait_for_video_processing(
    client: httpx.AsyncClient,
    api_url: str,
    video_id: str,
    auth_headers: Dict[str, str],
    timeout: int = 60
) -> Tuple[bool, Dict[str, Any]]:
    """Wait for video processing to complete."""
    async def check_processing():
        try:
            response = await client.get(
                f"{api_url}/api/v1/videos/{video_id}",
                headers=auth_headers
            )
            response.raise_for_status()
            data = response.json()
            if data["status"] == "processed":
                return True, data
            return False, data
        except Exception as e:
            return False, {"error": str(e)}
    
    return await wait_for_condition(
        check_processing,
        timeout=timeout,
        description="Waiting for video processing",
        error_message="Video processing timed out",
        context={"video_id": video_id, "api_url": api_url}
    )

def show_test_summary(results: List[Dict[str, Any]]):
    """Display a summary of test results."""
    table = Table(title="Integration Test Summary")
    table.add_column("Test", style="cyan")
    table.add_column("Status", style="bold")
    table.add_column("Duration", style="magenta")
    table.add_column("Details", style="yellow")
    
    for result in results:
        status_style = "green" if result["success"] else "red"
        status = "✓ Passed" if result["success"] else "✗ Failed"
        table.add_row(
            result["name"],
            f"[{status_style}]{status}[/{status_style}]",
            f"{result['duration']:.2f}s",
            result.get("details", "")
        )
    
    console.print(table)

def log_test_step(message: str, data: Optional[Dict[str, Any]] = None):
    """Log a test step with optional data."""
    console.print(f"[bold cyan]→[/] {message}")
    if data:
        console.print(json.dumps(data, indent=2))

class TestContext:
    """Context manager for tracking test execution and timing."""
    def __init__(self, name: str):
        self.name = name
        self.start_time = None
        self.result = {
            "name": name,
            "success": False,
            "duration": 0,
            "details": ""
        }
    
    async def __aenter__(self):
        self.start_time = datetime.now()
        log_test_step(f"Starting: {self.name}")
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        duration = (datetime.now() - self.start_time).total_seconds()
        self.result["duration"] = duration
        
        if exc_val is None:
            self.result["success"] = True
            log_test_step(f"Completed: {self.name}", {"duration": f"{duration:.2f}s"})
        else:
            if isinstance(exc_val, TestError):
                self.result["details"] = exc_val.message
                console.print(f"[red]Error:[/] {exc_val.message}")
                console.print("Context:", style="yellow")
                console.print(json.dumps(exc_val.context, indent=2))
            else:
                self.result["details"] = str(exc_val)
                console.print(f"[red]Error:[/] {str(exc_val)}")
        
        return False  # Don't suppress exceptions 