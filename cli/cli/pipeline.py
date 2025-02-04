"""Pipeline verification and validation functionality."""
import os
import sys
import json
import asyncio
from pathlib import Path
from typing import Dict, List, Optional
import aiohttp
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn

console = Console()

async def verify_python_version() -> Dict[str, str]:
    """Verify Python version alignment across configs."""
    result = {"name": "Python Version", "status": "✓", "message": "Versions aligned"}
    
    try:
        # Check Pipfile
        pipfile = Path("Pipfile")
        if not pipfile.exists():
            result.update({"status": "✗", "message": "Pipfile not found"})
            return result
            
        with open(pipfile) as f:
            for line in f:
                if "python_version" in line:
                    required_version = line.split('"')[1]
                    break
            else:
                result.update({"status": "✗", "message": "No Python version in Pipfile"})
                return result
        
        # Check actual Python version
        actual_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
        if actual_version != required_version:
            result.update({
                "status": "✗", 
                "message": f"Version mismatch: required={required_version}, actual={actual_version}"
            })
            
        # Check workflow Python version
        workflow_file = Path(".github/workflows/deploy.yml")
        if workflow_file.exists():
            with open(workflow_file) as f:
                content = f.read()
                if required_version not in content:
                    result.update({
                        "status": "✗",
                        "message": f"Workflow Python version differs from {required_version}"
                    })
    except Exception as e:
        result.update({"status": "✗", "message": f"Error: {str(e)}"})
    
    return result

async def verify_dependencies() -> Dict[str, str]:
    """Verify dependency health and alignment."""
    result = {"name": "Dependencies", "status": "✓", "message": "All dependencies healthy"}
    
    try:
        # Check Pipfile.lock exists and is up to date
        if not Path("Pipfile.lock").exists():
            result.update({"status": "✗", "message": "Pipfile.lock not found"})
            return result
            
        # Check for any known problematic dependency combinations
        with open("Pipfile.lock") as f:
            lock_data = json.load(f)
            deps = {**lock_data.get("default", {}), **lock_data.get("develop", {})}
            
            # Example check: pytest and pytest-asyncio compatibility
            if "pytest" in deps and "pytest-asyncio" in deps:
                pytest_version = deps["pytest"].get("version", "")
                asyncio_version = deps["pytest-asyncio"].get("version", "")
                if pytest_version.startswith("==7") and asyncio_version.startswith("==0."):
                    result.update({
                        "status": "!",
                        "message": "Warning: pytest 7.x may have issues with older pytest-asyncio"
                    })
    except Exception as e:
        result.update({"status": "✗", "message": f"Error: {str(e)}"})
    
    return result

async def verify_ci_environment() -> Dict[str, str]:
    """Verify CI environment configuration."""
    result = {"name": "CI Environment", "status": "✓", "message": "CI properly configured"}
    
    try:
        required_files = [
            ".github/workflows/deploy.yml",
            "Pipfile",
            "Pipfile.lock",
            "pyproject.toml"
        ]
        
        missing = [f for f in required_files if not Path(f).exists()]
        if missing:
            result.update({
                "status": "✗",
                "message": f"Missing files: {', '.join(missing)}"
            })
            return result
            
        # Check GitHub workflow configuration
        workflow_file = Path(".github/workflows/deploy.yml")
        if workflow_file.exists():
            with open(workflow_file) as f:
                content = f.read()
                required_steps = [
                    "actions/checkout@",
                    "actions/setup-python@",
                    "pipenv install"
                ]
                missing_steps = [s for s in required_steps if s not in content]
                if missing_steps:
                    result.update({
                        "status": "✗",
                        "message": f"Workflow missing steps: {', '.join(missing_steps)}"
                    })
    except Exception as e:
        result.update({"status": "✗", "message": f"Error: {str(e)}"})
    
    return result

async def verify_deployment_readiness() -> Dict[str, str]:
    """Verify deployment configuration and readiness."""
    result = {"name": "Deployment", "status": "✓", "message": "Ready for deployment"}
    
    try:
        # Check for required environment variables
        required_vars = [
            "GITHUB_TOKEN",
            "DO_API_TOKEN",
            "VERCEL_TOKEN",
            "SUPABASE_URL",
            "SUPABASE_KEY"
        ]
        
        missing = [var for var in required_vars if not os.getenv(var)]
        if missing:
            result.update({
                "status": "✗",
                "message": f"Missing environment variables: {', '.join(missing)}"
            })
            return result
            
        # Check deployment configuration
        config_files = [
            ".env.production",
            "vercel.json",
            ".do/app.yaml"
        ]
        
        missing = [f for f in config_files if not Path(f).exists()]
        if missing:
            result.update({
                "status": "!", 
                "message": f"Missing optional configs: {', '.join(missing)}"
            })
    except Exception as e:
        result.update({"status": "✗", "message": f"Error: {str(e)}"})
    
    return result

async def run_pipeline_verification() -> List[Dict[str, str]]:
    """Run all pipeline verifications."""
    verifications = [
        verify_python_version(),
        verify_dependencies(),
        verify_ci_environment(),
        verify_deployment_readiness()
    ]
    
    return await asyncio.gather(*verifications)

async def run_deployment_verification() -> List[Dict[str, str]]:
    """Run pre-deployment verifications."""
    # Add deployment-specific checks
    verifications = [
        verify_deployment_readiness()
    ]
    
    # Add service health checks if URLs configured
    if os.getenv("DO_API_URL"):
        verifications.append(verify_service_health("backend", os.getenv("DO_API_URL")))
    if os.getenv("VERCEL_URL"):    
        verifications.append(verify_service_health("frontend", os.getenv("VERCEL_URL")))
    if os.getenv("SUPABASE_URL"):
        verifications.append(verify_service_health("database", os.getenv("SUPABASE_URL")))
    
    return await asyncio.gather(*verifications)

async def verify_service_health(name: str, url: str) -> Dict[str, str]:
    """Verify health of a deployed service."""
    result = {"name": f"{name.title()} Health", "status": "✓", "message": "Service healthy"}
    
    try:
        async with aiohttp.ClientSession() as session:
            if name == "database":
                # Special handling for Supabase database health check
                supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
                headers = {
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}"
                }
                health_url = f"{url}/rest/v1/health?select=status"
                async with session.get(health_url, headers=headers, timeout=10) as response:
                    if response.status != 200:
                        result.update({
                            "status": "✗",
                            "message": f"Unhealthy: HTTP {response.status}"
                        })
                        return result
            else:
                # Standard health check for other services
                async with session.get(f"{url}/health", timeout=10) as response:
                    if response.status != 200:
                        result.update({
                            "status": "✗",
                            "message": f"Unhealthy: HTTP {response.status}"
                        })
                        return result
                    
                    data = await response.json()
                    if data.get("status") not in ["ok", "healthy"]:
                        result.update({
                            "status": "✗",
                            "message": f"Unhealthy: {data.get('status')}"
                        })
    except Exception as e:
        result.update({"status": "✗", "message": f"Error: {str(e)}"})
    
    return result

def display_verification_results(results: List[Dict[str, str]], title: str):
    """Display verification results in a table."""
    table = Table(title=title)
    table.add_column("Component", style="cyan")
    table.add_column("Status", style="magenta")
    table.add_column("Details", style="yellow")
    
    all_good = True
    for result in results:
        table.add_row(
            result["name"],
            result["status"],
            result["message"]
        )
        if result["status"] == "✗":
            all_good = False
    
    console.print(table)
    return all_good 