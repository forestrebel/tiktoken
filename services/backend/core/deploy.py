"""Digital Ocean App Platform deployment verification."""
import os
import asyncio
import logging
from enum import Enum
from typing import Optional, Tuple
from pathlib import Path
import aiohttp
from dotenv import load_dotenv

# Load environment variables from .env.production
env_file = Path(__file__).parents[2] / ".env.production"
load_dotenv(env_file)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DeploymentPhase(Enum):
    """DO App Platform deployment phases we care about."""
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
    """Custom exception for deployment failures."""
    def __init__(self, message: str, details: Optional[dict] = None):
        self.message = message
        self.details = details or {}
        super().__init__(message)

async def get_deployment_status(session: aiohttp.ClientSession, deployment_id: str) -> Tuple[DeploymentPhase, Optional[dict]]:
    """Get current deployment phase and details."""
    token = os.getenv("DO_API_TOKEN")
    app_id = os.getenv("DO_APP_ID")
    
    if not token or not app_id:
        raise DeploymentError("DO_API_TOKEN or DO_APP_ID not set")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    url = f"https://api.digitalocean.com/v2/apps/{app_id}/deployments/{deployment_id}"
    
    try:
        async with session.get(url, headers=headers) as resp:
            if resp.status != 200:
                raise DeploymentError(
                    f"Failed to fetch deployment status: HTTP {resp.status}",
                    {"status_code": resp.status}
                )

            data = await resp.json()
            deployment = data.get("deployment", {})
            phase = DeploymentPhase.from_str(deployment.get("phase", "UNKNOWN"))
            
            return phase, deployment

    except aiohttp.ClientError as e:
        raise DeploymentError(f"API connection error: {str(e)}")

async def get_app_url(session: aiohttp.ClientSession) -> str:
    """Get the app's live URL from DO API."""
    token = os.getenv("DO_API_TOKEN")
    app_id = os.getenv("DO_APP_ID")
    
    if not token or not app_id:
        raise DeploymentError("DO_API_TOKEN or DO_APP_ID not set")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    url = f"https://api.digitalocean.com/v2/apps/{app_id}"
    
    try:
        async with session.get(url, headers=headers) as resp:
            if resp.status != 200:
                raise DeploymentError(
                    f"Failed to fetch app details: HTTP {resp.status}",
                    {"status_code": resp.status}
                )

            data = await resp.json()
            live_url = data.get("app", {}).get("live_url")
            if not live_url:
                raise DeploymentError("Could not determine app URL")

            return live_url

    except aiohttp.ClientError as e:
        raise DeploymentError(f"Failed to get app URL: {str(e)}")

async def verify_health(session: aiohttp.ClientSession, app_url: str, max_retries: int = 5) -> bool:
    """Verify service health with exponential backoff."""
    for attempt in range(max_retries):
        try:
            # Exponential backoff with max of 32 seconds
            if attempt > 0:
                delay = min(2 ** attempt, 32)
                logger.info(f"Health check attempt {attempt + 1}/{max_retries}, waiting {delay}s...")
                await asyncio.sleep(delay)

            health_url = f"{app_url}/health"
            async with session.get(health_url, timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    logger.info(f"Health check response: {data}")
                    if data.get("status") in ["ok", "healthy"]:
                        logger.info("Health check succeeded")
                        return True
                
                logger.warning(f"Health check failed: HTTP {resp.status}")

        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            logger.warning(f"Health check error: {str(e)}")
            if attempt == max_retries - 1:
                raise DeploymentError(
                    f"Health check failed after {max_retries} attempts",
                    {"error": str(e)}
                )

    return False

async def verify_deployment(deployment_id: str, timeout: int = 600) -> bool:
    """
    Verify DO App Platform deployment is successful and service is healthy.
    
    Args:
        deployment_id: The DO deployment ID to verify
        timeout: Maximum time to wait for deployment in seconds (default: 10 minutes)
    
    Returns:
        bool: True if deployment is successful and service is healthy
    """
    start_time = asyncio.get_event_loop().time()
    
    async with aiohttp.ClientSession() as session:
        try:
            # 1. Wait for deployment to be active
            while True:
                if asyncio.get_event_loop().time() - start_time > timeout:
                    raise DeploymentError(f"Deployment timeout after {timeout}s")

                phase, deployment = await get_deployment_status(session, deployment_id)
                
                if phase == DeploymentPhase.ERROR:
                    error_msg = deployment.get("error", {}).get("message", "Unknown error")
                    raise DeploymentError(f"Deployment failed: {error_msg}", deployment.get("error"))

                if phase == DeploymentPhase.ACTIVE:
                    logger.info("Deployment is active")
                    break

                logger.info(f"Deployment status: {phase.value}")
                await asyncio.sleep(5)

            # 2. Get app URL
            app_url = await get_app_url(session)
            logger.info(f"App URL: {app_url}")

            # 3. Verify service health
            return await verify_health(session, app_url)

        except DeploymentError as e:
            logger.error(f"Deployment verification failed: {e.message}")
            if e.details:
                logger.error(f"Details: {e.details}")
            return False

        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return False

async def main():
    """CLI entrypoint for deployment verification."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Verify DO App Platform deployment")
    parser.add_argument("deployment_id", help="Deployment ID to verify")
    parser.add_argument("--timeout", type=int, default=600, help="Maximum time to wait (seconds)")
    args = parser.parse_args()

    success = await verify_deployment(args.deployment_id, args.timeout)
    if not success:
        logger.error("Deployment verification failed")
        exit(1)
    
    logger.info("Deployment verification successful")

if __name__ == "__main__":
    asyncio.run(main()) 