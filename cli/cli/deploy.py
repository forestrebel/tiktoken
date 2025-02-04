"""Minimal deployment verification for DigitalOcean App Platform."""
import os
import time
import asyncio
from enum import Enum
from typing import Optional, Tuple, List, Dict
import aiohttp
from pathlib import Path

class DeploymentPhase(Enum):
    """Essential deployment phases."""
    UNKNOWN = "UNKNOWN"
    ACTIVE = "ACTIVE"
    ERROR = "ERROR"

    @classmethod
    def from_str(cls, phase: str) -> 'DeploymentPhase':
        try:
            return cls(phase)
        except ValueError:
            return cls.UNKNOWN

class DeploymentError(Exception):
    """Minimal deployment error."""
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)

async def track_deployment(deployment_id: str) -> Tuple[bool, str]:
    """Track DO App Platform deployment until ready."""
    token = os.getenv("DO_API_TOKEN")
    if not token:
        raise DeploymentError("DO_API_TOKEN not set")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    async with aiohttp.ClientSession() as session:
        # 1. Wait for deployment to be active
        while True:
            try:
                url = f"https://api.digitalocean.com/v2/apps/deployments/{deployment_id}"
                async with session.get(url, headers=headers) as resp:
                    if resp.status != 200:
                        raise DeploymentError(f"Failed to fetch deployment status: HTTP {resp.status}")

                    data = await resp.json()
                    deployment = data.get("deployment", {})
                    phase = DeploymentPhase.from_str(deployment.get("phase", "UNKNOWN"))

                    if phase == DeploymentPhase.ERROR:
                        error_msg = deployment.get("error", {}).get("message", "Unknown error")
                        raise DeploymentError(f"Deployment failed: {error_msg}")

                    if phase == DeploymentPhase.ACTIVE:
                        break

                    await asyncio.sleep(5)  # Poll every 5 seconds

            except aiohttp.ClientError as e:
                raise DeploymentError(f"API connection error: {str(e)}")

        # 2. Get app URL and wait for service readiness
        try:
            app_id = os.getenv("DO_APP_ID")
            app_url = f"https://api.digitalocean.com/v2/apps/{app_id}"
            
            async with session.get(app_url, headers=headers) as resp:
                if resp.status != 200:
                    raise DeploymentError(f"Failed to fetch app URL: HTTP {resp.status}")
                
                app_data = await resp.json()
                live_url = app_data.get("app", {}).get("live_url")
                if not live_url:
                    raise DeploymentError("Could not determine app URL")

                return True, live_url

        except aiohttp.ClientError as e:
            raise DeploymentError(f"Failed to verify app URL: {str(e)}")

async def verify_core(app_url: str, max_retries: int = 5) -> bool:
    """Verify service health with exponential backoff."""
    async with aiohttp.ClientSession() as session:
        for attempt in range(max_retries):
            try:
                # Exponential backoff with max of 32 seconds
                if attempt > 0:
                    delay = min(2 ** attempt, 32)
                    await asyncio.sleep(delay)

                # Check health endpoint
                health_url = f"{app_url}/health"
                async with session.get(health_url, timeout=10) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data.get("status") == "ok":
                            return True
                    
                    # On any other response, continue retrying
                    print(f"Health check attempt {attempt + 1}/{max_retries} failed: HTTP {resp.status}")

            except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                print(f"Health check attempt {attempt + 1}/{max_retries} failed: {str(e)}")
                if attempt == max_retries - 1:
                    raise DeploymentError(f"Health check failed after {max_retries} attempts: {str(e)}")

        return False

async def verify_deployment(deployment_id: str) -> bool:
    """Main verification function combining tracking and health check."""
    try:
        # Track deployment until we get the live URL
        success, live_url = await track_deployment(deployment_id)
        if not success:
            return False

        # Verify the service is healthy
        return await verify_core(live_url)

    except DeploymentError as e:
        print(f"Deployment verification failed: {str(e)}")
        return False

async def verify_deployment_readiness() -> Tuple[bool, List[Dict[str, str]]]:
    """Pre-flight checks before deployment."""
    results = []
    all_good = True

    # 1. Check required environment variables
    env_vars = {
        "GITHUB_TOKEN": "GitHub access token",
        "DO_API_TOKEN": "DigitalOcean API token",
        "SUPABASE_URL": "Supabase project URL",
        "SUPABASE_KEY": "Supabase project key"
    }
    
    missing = []
    for var, desc in env_vars.items():
        if not os.getenv(var):
            missing.append(var)
            all_good = False
    
    results.append({
        "name": "Environment",
        "status": "✓" if not missing else "✗",
        "message": "All variables set" if not missing else f"Missing: {', '.join(missing)}"
    })

    # 2. Check deployment configs
    config_files = [
        ".env.production",
        ".github/workflows/deploy.yml",
        "Pipfile.lock"
    ]
    
    missing = []
    for file in config_files:
        if not Path(file).exists():
            missing.append(file)
            all_good = False
    
    results.append({
        "name": "Config Files",
        "status": "✓" if not missing else "✗",
        "message": "All files present" if not missing else f"Missing: {', '.join(missing)}"
    })

    # 3. Quick health check of current deployment
    try:
        async with aiohttp.ClientSession() as session:
            health_ok = await verify_core(os.getenv("DO_API_URL", ""), session)
            results.append({
                "name": "Current Deploy",
                "status": "✓" if health_ok else "!",
                "message": "Healthy" if health_ok else "Warning: current deploy unhealthy"
            })
    except Exception as e:
        results.append({
            "name": "Current Deploy",
            "status": "!",
            "message": f"Warning: {str(e)}"
        })

    return all_good, results

async def deploy_service(service: str, env: str = "production", verify: bool = True) -> bool:
    """Deploy a single service with optional verification."""
    if verify:
        # Run pre-flight checks
        ready, results = await verify_deployment_readiness()
        if not ready:
            print("\nDeployment verification failed:")
            for result in results:
                status = "✓" if result["status"] == "✓" else "✗"
                print(f"{status} {result['name']}: {result['message']}")
            return False
    
    # Proceed with existing deployment logic
    try:
        deployment_id = await start_deployment(service, env)
        if not deployment_id:
            return False
            
        success = await track_deployment(deployment_id)
        if not success:
            return False
            
        return await verify_deployment(deployment_id)
        
    except Exception as e:
        print(f"Deployment failed: {str(e)}")
        return False

async def deploy_all(env: str = "production", verify: bool = True) -> bool:
    """Deploy all services with optional verification."""
    if verify:
        # Run pre-flight checks
        ready, results = await verify_deployment_readiness()
        if not ready:
            print("\nDeployment verification failed:")
            for result in results:
                status = "✓" if result["status"] == "✓" else "✗"
                print(f"{status} {result['name']}: {result['message']}")
            return False
    
    # Deploy core service first
    if not await deploy_service("core", env, verify=False):
        return False
        
    # Deploy remaining services in parallel
    services = ["frontend", "worker"]
    tasks = [deploy_service(service, env, verify=False) for service in services]
    results = await asyncio.gather(*tasks)
    
    return all(results)

async def check_service(service: str, session: aiohttp.ClientSession) -> bool:
    """Check if a service is healthy."""
    try:
        # Get service URL from environment
        url = os.getenv(f"{service.upper()}_URL")
        if not url:
            print(f"Warning: {service.upper()}_URL not set")
            return False
            
        # Check health endpoint
        async with session.get(f"{url}/health", timeout=5) as resp:
            if resp.status != 200:
                return False
                
            data = await resp.json()
            return data.get("status") == "ok"
            
    except Exception as e:
        print(f"Health check failed: {str(e)}")
        return False

async def start_deployment(service: str, env: str) -> Optional[str]:
    """Start a deployment for a service."""
    token = os.getenv("DO_API_TOKEN")
    if not token:
        raise DeploymentError("DO_API_TOKEN not set")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    app_id = os.getenv("DO_APP_ID")
    if not app_id:
        raise DeploymentError("DO_APP_ID not set")

    async with aiohttp.ClientSession() as session:
        try:
            # Create deployment
            url = f"https://api.digitalocean.com/v2/apps/{app_id}/deployments"
            async with session.post(url, headers=headers) as resp:
                if resp.status != 200:
                    raise DeploymentError(f"Failed to create deployment: HTTP {resp.status}")

                data = await resp.json()
                deployment_id = data.get("deployment", {}).get("id")
                if not deployment_id:
                    raise DeploymentError("No deployment ID in response")

                return deployment_id

        except aiohttp.ClientError as e:
            raise DeploymentError(f"API connection error: {str(e)}")