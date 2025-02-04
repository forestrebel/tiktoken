"""Verification utilities for local development."""
import asyncio
import json
import os
from typing import Dict, List, Tuple, Any
import httpx
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
import time
import sys
from pathlib import Path
import typer

from cli.process import ProcessManager, JobStatus

console = Console()
process_manager = ProcessManager()
app = typer.Typer()

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
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_key:
            return False, "Missing Supabase credentials"
        
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}"
        }
        
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Check Supabase REST API health
            resp = await client.get(f"{supabase_url}/rest/v1/health?select=status", headers=headers)
            resp.raise_for_status()
            health_data = resp.json()
            
            if not health_data or not health_data[0].get("status"):
                return False, "Supabase health check failed"
            
            # Update service statuses
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

async def verify_python_versions() -> Tuple[bool, str]:
    """Single check for Python version alignment."""
    try:
        # Check Pipfile version
        pipfile = Path("Pipfile")
        if not pipfile.exists():
            return False, "Pipfile not found"
            
        with open(pipfile) as f:
            for line in f:
                if "python_version" in line:
                    required_version = line.split('"')[1]
                    break
            else:
                return False, "No Python version in Pipfile"
        
        # Check actual Python version
        actual_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
        if actual_version != required_version:
            return False, f"Version mismatch: required={required_version}, actual={actual_version}"
            
        # Check workflow Python version
        workflow_file = Path(".github/workflows/deploy.yml")
        if workflow_file.exists():
            with open(workflow_file) as f:
                content = f.read()
                if required_version not in content:
                    return False, f"Workflow Python version differs from {required_version}"
        
        return True, f"Python {required_version} aligned across all configs"
        
    except Exception as e:
        return False, f"Error checking Python versions: {str(e)}"

async def verify_pipeline() -> List[Dict[str, Any]]:
    """Run all pipeline verifications."""
    results = []
    
    # Python version check
    python_ok, python_msg = await verify_python_versions()
    results.append({
        "name": "Python Version",
        "status": "✓" if python_ok else "✗",
        "message": python_msg
    })
    
    # Core API check
    core_ok = await verify_core_api()
    results.append({
        "name": "Core API",
        "status": "✓" if core_ok else "✗",
        "message": "Core API healthy" if core_ok else "Core API unhealthy"
    })
    
    # Supabase connection check
    db_ok = await verify_supabase_connection()
    results.append({
        "name": "Database",
        "status": "✓" if db_ok else "✗",
        "message": "Database connected" if db_ok else "Database connection failed"
    })
    
    # Content flow check
    flow_ok = await verify_content_flow()
    results.append({
        "name": "Content Flow",
        "status": "✓" if flow_ok else "✗",
        "message": "Content flow verified" if flow_ok else "Content flow failed"
    })
    
    return results

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

async def verify_content_flow() -> Tuple[bool, str]:
    """Verify the content creation and processing flow."""
    try:
        # First verify core API health
        core_url = os.getenv("DO_API_URL")
        if not core_url:
            return False, "Missing Core API URL"
            
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Check Core API health
            resp = await client.get(f"{core_url}/health")
            resp.raise_for_status()
            if resp.json().get("status") != "healthy":
                return False, "Core API is not healthy"
                
            # Verify Supabase connection first
            supabase_healthy, msg = await verify_supabase_connection()
            if not supabase_healthy:
                return False, f"Supabase check failed: {msg}"
            
            # Test content upload endpoint
            test_content = {"text": "Test content for verification"}
            resp = await client.post(
                f"{core_url}/api/v1/content",
                json=test_content,
                headers={"Authorization": f"Bearer {os.getenv('SUPABASE_SERVICE_ROLE_KEY')}"}
            )
            resp.raise_for_status()
            content_id = resp.json().get("id")
            
            if not content_id:
                return False, "Content creation failed"
                
            # Verify content processing
            resp = await client.get(
                f"{core_url}/api/v1/content/{content_id}",
                headers={"Authorization": f"Bearer {os.getenv('SUPABASE_SERVICE_ROLE_KEY')}"}
            )
            resp.raise_for_status()
            
            return True, "Content flow verification successful"
            
    except Exception as e:
        return False, f"Content flow verification failed: {str(e)}"

async def verify_dependencies() -> Tuple[bool, str]:
    """Verify service dependencies and startup order."""
    try:
        # Define dependency order
        dependency_order = [
            ("supabase-db", []),
            ("supabase-rest", ["supabase-db"]),
            ("core", ["supabase-db", "supabase-rest"])
        ]
        
        # First verify Supabase connection
        supabase_healthy, msg = await verify_supabase_connection()
        if not supabase_healthy:
            return False, f"Supabase check failed: {msg}"
            
        # Then verify Core API
        core_healthy, msg = await verify_core_api(os.getenv("DO_API_URL", ""))
        if not core_healthy:
            return False, f"Core API check failed: {msg}"
            
        return True, "All service dependencies are healthy"
        
    except Exception as e:
        return False, f"Dependency verification failed: {str(e)}"

async def verify_frontend_config() -> Tuple[bool, str]:
    """Verify frontend configuration and Vercel setup."""
    try:
        # Check vercel.json
        vercel_config = Path("vercel.json")
        if not vercel_config.exists():
            return False, "vercel.json not found"
            
        with open(vercel_config) as f:
            config = json.loads(f.read())
            
        # Verify required fields
        required_fields = ["version", "builds", "routes"]
        missing = [f for f in required_fields if f not in config]
        if missing:
            return False, f"Missing required fields in vercel.json: {', '.join(missing)}"
            
        # Verify API routes
        api_routes = [r for r in config.get("routes", []) if r.get("src", "").startswith("/api")]
        if not api_routes:
            return False, "No API routes configured in vercel.json"
            
        # Verify build settings
        builds = config.get("builds", [])
        if not any(b.get("src") == "src" for b in builds):
            return False, "Frontend build configuration missing"
            
        return True, "Frontend configuration is valid"
        
    except json.JSONDecodeError:
        return False, "Invalid JSON in vercel.json"
    except Exception as e:
        return False, f"Frontend verification failed: {str(e)}"

async def verify_notification_chain() -> Tuple[bool, str]:
    """Verify notification configuration and Discord integration."""
    try:
        # Check Discord webhook
        webhook_url = os.getenv("DISCORD_WEBHOOK_URL")
        if not webhook_url:
            return False, "Discord webhook URL not configured"
            
        # Test Discord notification
        async with httpx.AsyncClient(timeout=5.0) as client:
            test_msg = {
                "content": "🔍 Verification Test",
                "embeds": [{
                    "title": "Deployment Chain Verification",
                    "description": "Testing notification delivery",
                    "color": 3447003
                }]
            }
            resp = await client.post(webhook_url, json=test_msg)
            resp.raise_for_status()
            
        return True, "Notification chain is working"
        
    except Exception as e:
        return False, f"Notification verification failed: {str(e)}"

async def verify_integration() -> Tuple[bool, str]:
    """Verify all service integrations and connections."""
    try:
        # Test Core API -> Database connection
        core_url = os.getenv("DO_API_URL")
        if not core_url:
            return False, "Missing Core API URL"
            
        async with httpx.AsyncClient(timeout=5.0) as client:
            # 1. Core API -> Database
            resp = await client.get(f"{core_url}/health")
            resp.raise_for_status()
            if resp.json().get("status") != "healthy":
                return False, "Core API -> Database connection failed"
                
            # 2. Frontend -> Core API routing
            test_routes = ["/api/v1/meta/version", "/api/v1/health"]
            for route in test_routes:
                resp = await client.get(f"{core_url}{route}")
                resp.raise_for_status()
                
            # 3. Auth Flow
            auth_test = {
                "email": "test@example.com",
                "password": "test123"
            }
            resp = await client.post(
                f"{os.getenv('SUPABASE_URL')}/auth/v1/token?grant_type=password",
                json=auth_test,
                headers={"apikey": os.getenv("SUPABASE_SERVICE_ROLE_KEY")}
            )
            resp.raise_for_status()
            
            # 4. Content Flow
            test_content = {"text": "Integration test content"}
            resp = await client.post(
                f"{core_url}/api/v1/content",
                json=test_content,
                headers={"Authorization": f"Bearer {os.getenv('SUPABASE_SERVICE_ROLE_KEY')}"}
            )
            resp.raise_for_status()
            
            # 5. Notification Chain
            webhook_url = os.getenv("DISCORD_WEBHOOK_URL")
            if webhook_url:
                test_msg = {
                    "content": "🔄 Integration Test",
                    "embeds": [{
                        "title": "Integration Verification",
                        "description": "Testing service connections",
                        "color": 3447003
                    }]
                }
                resp = await client.post(webhook_url, json=test_msg)
                resp.raise_for_status()
            
            return True, "All service integrations verified"
            
    except Exception as e:
        return False, f"Integration verification failed: {str(e)}"

async def verify_deployment_tokens() -> Tuple[bool, str]:
    """Verify deployment tokens are properly configured."""
    try:
        # Check Digital Ocean tokens
        do_token = os.getenv("DO_API_TOKEN", "")
        if not do_token or do_token == "dop_v1_your_do_token":
            return False, "Digital Ocean API token not configured"
            
        do_app_id = os.getenv("DO_APP_ID", "")
        if not do_app_id or do_app_id == "your_app_id":
            return False, "Digital Ocean App ID not configured"
            
        # Check Vercel tokens
        vercel_token = os.getenv("VERCEL_TOKEN", "")
        if not vercel_token or vercel_token == "your_vercel_token":
            return False, "Vercel deployment token not configured"
            
        return True, "Deployment tokens properly configured"
        
    except Exception as e:
        return False, f"Token verification failed: {str(e)}"

async def verify_all() -> List[Dict[str, Any]]:
    """Run all verifications and return results."""
    verifications = [
        ("Frontend", verify_frontend_config()),
        ("Core API", verify_core_api(os.getenv("DO_API_URL", ""))),
        ("Database", verify_supabase_connection()),
        ("Notifications", verify_notification_chain()),
        ("Content Flow", verify_content_flow()),
        ("Integration", verify_integration()),
        ("Deployment Tokens", verify_deployment_tokens())
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

@app.command()
async def frontend():
    """Verify frontend configuration."""
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        transient=True,
    ) as progress:
        progress.add_task(description="Verifying frontend config...", total=None)
        success, message = await verify_frontend_config()
        
    if success:
        console.print(f"[green]✓[/green] {message}")
    else:
        console.print(f"[red]✗[/red] {message}")
        sys.exit(1)

# Update the app commands to include content flow verification
@app.command()
async def content_flow():
    """Verify the content creation flow."""
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        transient=True,
    ) as progress:
        progress.add_task(description="Verifying content flow...", total=None)
        success, message = await verify_content_flow()
        
    if success:
        console.print(f"[green]✓[/green] {message}")
    else:
        console.print(f"[red]✗[/red] {message}")
        sys.exit(1)

@app.command()
async def notify():
    """Verify notification chain."""
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        transient=True,
    ) as progress:
        progress.add_task(description="Verifying notifications...", total=None)
        success, message = await verify_notification_chain()
        
    if success:
        console.print(f"[green]✓[/green] {message}")
    else:
        console.print(f"[red]✗[/red] {message}")
        sys.exit(1)

@app.command()
async def integration():
    """Verify all service integrations."""
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        transient=True,
    ) as progress:
        task = progress.add_task(description="Verifying integrations...", total=None)
        success, message = await verify_integration()
        
    if success:
        console.print("[green]✓[/green] Integration verification passed:")
        console.print("  [green]✓[/green] Core API -> Database")
        console.print("  [green]✓[/green] Frontend -> Core API")
        console.print("  [green]✓[/green] Auth flow")
        console.print("  [green]✓[/green] Content flow")
        console.print("  [green]✓[/green] Notifications")
    else:
        console.print(f"[red]✗[/red] {message}")
        sys.exit(1)

@app.command()
async def all():
    """Run all verifications."""
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        transient=True,
    ) as progress:
        progress.add_task(description="Running all verifications...", total=None)
        results = await verify_all()
        
    # Display results
    console.print("\nVerification Results:")
    for result in results:
        status = "[green]✓[/green]" if result["status"] == "✓" else "[red]✗[/red]"
        console.print(f"{status} {result['component']}: {result['details']}")
        
    if any(r["status"] == "✗" for r in results):
        sys.exit(1) 