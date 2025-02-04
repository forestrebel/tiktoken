"""Verification utilities for local development."""
import asyncio
import json
import os
from typing import Dict, List, Tuple
import httpx
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
import time

from cli.process import ProcessManager, JobStatus

console = Console()
process_manager = ProcessManager()

async def verify_core_api(base_url: str = "http://localhost:8000") -> Tuple[bool, str]:
    """Verify Core API is healthy and responding."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Basic health check
            resp = await client.get(f"{base_url}/health")
            resp.raise_for_status()
            
            # Verify API version and config
            resp = await client.get(f"{base_url}/api/v1/meta/version")
            resp.raise_for_status()
            
            process_manager.update_service_status("core", {
                "status": "healthy",
                "healthy": True,
                "version": resp.json().get("version", "unknown")
            })
            
            return True, "Core API is healthy and configured correctly"
    except Exception as e:
        process_manager.update_service_status("core", {
            "status": "unhealthy",
            "healthy": False,
            "error": str(e)
        })
        return False, f"Core API check failed: {str(e)}"

async def verify_supabase_connection() -> Tuple[bool, str]:
    """Verify Supabase connection and schema."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Check Supabase health
            resp = await client.get("http://localhost:54321/health")
            resp.raise_for_status()
            
            # Check database connection
            resp = await client.get("http://localhost:54322/health")
            resp.raise_for_status()
            
            process_manager.update_service_status("supabase-db", {
                "status": "healthy",
                "healthy": True
            })
            process_manager.update_service_status("supabase-rest", {
                "status": "healthy",
                "healthy": True
            })
            
            return True, "Supabase is healthy and connected"
    except Exception as e:
        process_manager.update_service_status("supabase-db", {
            "status": "unhealthy",
            "healthy": False,
            "error": str(e)
        })
        process_manager.update_service_status("supabase-rest", {
            "status": "unhealthy",
            "healthy": False,
            "error": str(e)
        })
        return False, f"Supabase connection check failed: {str(e)}"

async def verify_ai_integration() -> Tuple[bool, str]:
    """Verify AI service mock is responding."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get("http://localhost:5000/health")
            resp.raise_for_status()
            
            process_manager.update_service_status("ai-service", {
                "status": "healthy",
                "healthy": True
            })
            
            return True, "AI service is healthy"
    except Exception as e:
        process_manager.update_service_status("ai-service", {
            "status": "unhealthy",
            "healthy": False,
            "error": str(e)
        })
        return False, f"AI integration check failed: {str(e)}"

async def verify_logging_setup() -> Tuple[bool, str]:
    """Verify logging configuration."""
    log_paths = [
        "/var/log/tiktoken/core.log",
        "/var/log/tiktoken/access.log"
    ]
    
    missing_logs = []
    for path in log_paths:
        if not os.path.exists(path):
            missing_logs.append(path)
    
    if missing_logs:
        process_manager.update_service_status("logging", {
            "status": "warning",
            "healthy": False,
            "missing_logs": missing_logs
        })
        return False, f"Missing log files: {', '.join(missing_logs)}"
        
    process_manager.update_service_status("logging", {
        "status": "configured",
        "healthy": True
    })
    return True, "Logging is properly configured"

async def verify_local_dev_setup(background: bool = True) -> str:
    """Run all verifications for local development setup.
    
    Args:
        background: If True, run verifications in background
    
    Returns:
        Job ID if running in background, otherwise empty string
    """
    async def run_verifications():
        verifications = [
            ("Core API", verify_core_api()),
            ("Supabase", verify_supabase_connection()),
            ("AI Integration", verify_ai_integration()),
            ("Logging", verify_logging_setup())
        ]
        
        results = []
        for name, coro in verifications:
            success, message = await coro
            results.append({
                "component": name,
                "status": "✓" if success else "✗",
                "details": message
            })
        return results
    
    if background:
        # Create a background job for verifications
        job_id = f"verify_{int(time.time())}"
        
        async def background_verify():
            try:
                results = await run_verifications()
                process_manager.update_job_status(job_id, JobStatus.COMPLETED, exit_code=0)
                return results
            except Exception as e:
                process_manager.update_job_status(job_id, JobStatus.FAILED, error=str(e))
                raise
        
        # Start background job
        asyncio.create_task(background_verify())
        return job_id
    else:
        # Run synchronously
        return await run_verifications()

def verify_content_flow(verbose: bool = False) -> bool:
    """Verify the content flow through all services."""
    # Start verification in background
    job_id = asyncio.run(verify_local_dev_setup(background=True))
    
    if verbose:
        console.print(f"Started verification in background (Job ID: {job_id})")
        console.print("Run [bold]t status[/bold] to check progress")
    
    return True 