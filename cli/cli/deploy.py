"""Minimal deployment module for critical services."""
import os
import asyncio
import aiohttp
from typing import Dict
from rich.console import Console

console = Console()

# Properties
TIMEOUT = 5  # Quick deploy checks
MAX_RETRIES = 2  # Minimal retries

# Service configuration
SERVICES = {
    "supabase": {
        "url": os.getenv("SUPABASE_URL"),
        "key": os.getenv("SUPABASE_KEY"),
        "health": "/health"
    },
    "do-api": {
        "url": os.getenv("DO_API_URL"),
        "token": os.getenv("DO_API_TOKEN"),
        "health": "/health"
    },
    "aws-ai": {
        "url": os.getenv("AWS_AI_URL"),
        "key": os.getenv("AWS_AI_KEY"),
        "health": "/health"
    },
    "vercel": {
        "url": os.getenv("VERCEL_URL"),
        "token": os.getenv("VERCEL_TOKEN"),
        "health": "/api/health"
    }
}

async def check_service(service: str, session: aiohttp.ClientSession) -> bool:
    """Quick health check for a service."""
    if service not in SERVICES:
        console.print(f"[red]Error:[/] Unknown service {service}")
        return False

    config = SERVICES[service]
    if not config["url"]:
        console.print(f"[yellow]Warning:[/] No URL for {service}")
        return False

    try:
        async with session.get(
            f"{config['url']}{config['health']}", 
            timeout=TIMEOUT
        ) as response:
            return response.status == 200
    except Exception as e:
        console.print(f"[red]Error:[/] {service} health check failed: {e}")
        return False

async def deploy_service(service: str, session: aiohttp.ClientSession) -> bool:
    """Deploy a single service."""
    if service not in SERVICES:
        console.print(f"[red]Error:[/] Unknown service {service}")
        return False

    config = SERVICES[service]
    if not config["url"] or not config.get("token"):
        console.print(f"[yellow]Warning:[/] Missing config for {service}")
        return False

    # Service-specific deploy logic
    try:
        if service == "supabase":
            # Just verify connection for Supabase
            return await check_service(service, session)

        elif service == "do-api":
            # Deploy to Digital Ocean
            async with session.post(
                f"{config['url']}/deploy",
                headers={"Authorization": f"Bearer {config['token']}"},
                timeout=TIMEOUT
            ) as response:
                if response.status != 200:
                    return False
                
                # Wait for deploy to complete
                for _ in range(MAX_RETRIES):
                    if await check_service(service, session):
                        return True
                    await asyncio.sleep(TIMEOUT)
                return False

        elif service == "aws-ai":
            # Deploy to AWS
            async with session.post(
                f"{config['url']}/deploy",
                headers={"x-api-key": config["key"]},
                timeout=TIMEOUT
            ) as response:
                return response.status == 200

        elif service == "vercel":
            # Deploy to Vercel
            async with session.post(
                "https://api.vercel.com/v1/deployments",
                headers={"Authorization": f"Bearer {config['token']}"},
                timeout=TIMEOUT
            ) as response:
                return response.status == 200

    except Exception as e:
        console.print(f"[red]Error:[/] {service} deployment failed: {e}")
        return False

    return False

async def deploy_all() -> Dict[str, bool]:
    """Deploy all services in correct order."""
    results = {}
    async with aiohttp.ClientSession() as session:
        # 1. Database first
        if not await deploy_service("supabase", session):
            console.print("[red]Error:[/] Database deployment failed")
            return results
        results["supabase"] = True

        # 2. Core API next
        if not await deploy_service("do-api", session):
            console.print("[red]Error:[/] Core API deployment failed")
            return results
        results["do-api"] = True

        # 3. AI Service after
        if not await deploy_service("aws-ai", session):
            console.print("[red]Error:[/] AI Service deployment failed")
            return results
        results["aws-ai"] = True

        # 4. Frontend last
        if not await deploy_service("vercel", session):
            console.print("[red]Error:[/] Frontend deployment failed")
            return results
        results["vercel"] = True

    return results 