"""Deployment utilities for container-first workflow."""
import os
import asyncio
import json
from typing import Optional
import subprocess
from pathlib import Path

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

console = Console()

# Environment configuration
REGISTRY_URL = os.getenv("REGISTRY_URL")
DEPLOY_TOKEN = os.getenv("DEPLOY_TOKEN")
DEPLOY_ENV = os.getenv("DEPLOY_ENV", "staging")

class DeploymentError(Exception):
    """Deployment-specific error."""
    pass

async def run_cmd(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
    """Run a command asynchronously."""
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await process.communicate()
    
    if check and process.returncode != 0:
        raise DeploymentError(f"Command failed: {stderr.decode()}")
    
    return subprocess.CompletedProcess(
        cmd, process.returncode, stdout.decode(), stderr.decode()
    )

async def verify_requirements():
    """Verify all deployment requirements are met."""
    if not REGISTRY_URL:
        raise DeploymentError("REGISTRY_URL environment variable not set")
    if not DEPLOY_TOKEN:
        raise DeploymentError("DEPLOY_TOKEN environment variable not set")
    
    # Verify docker compose is available
    try:
        await run_cmd(["docker", "compose", "version"])
    except Exception as e:
        raise DeploymentError(f"Docker Compose not available: {str(e)}")

async def push_container(service: str, tag: Optional[str] = None) -> str:
    """Build and push container to registry."""
    tag = tag or f"{DEPLOY_ENV}-{int(asyncio.get_event_loop().time())}"
    image_name = f"{REGISTRY_URL}/{service}:{tag}"
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        # Build using docker compose
        task = progress.add_task("Building container...", total=None)
        await run_cmd(["docker", "compose", "build", service])
        progress.update(task, description="[green]✓[/] Container built")
        
        # Tag for registry
        task = progress.add_task("Tagging image...", total=None)
        await run_cmd(["docker", "tag", f"tiktoken-{service}", image_name])
        progress.update(task, description="[green]✓[/] Image tagged")
        
        # Push to registry
        task = progress.add_task("Pushing to registry...", total=None)
        await run_cmd(["docker", "push", image_name])
        progress.update(task, description="[green]✓[/] Image pushed")
    
    return image_name

async def verify_health(url: str, timeout: int = 300) -> bool:
    """Verify service health with timeout."""
    console = Console()
    start = asyncio.get_event_loop().time()
    
    while (asyncio.get_event_loop().time() - start) < timeout:
        try:
            # Check basic health
            console.print("[yellow]Checking service health...[/yellow]")
            process = await asyncio.create_subprocess_exec(
                "curl", "-sf", f"{url}/health",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                console.print(f"[red]✗[/red] Health check failed: {stderr.decode()}")
                await asyncio.sleep(2)
                continue
                
            # Verify response indicates healthy status and database connection
            try:
                data = json.loads(stdout)
                health_status = data.get("status") == "healthy"
                db_status = data.get("supabase") == "connected"
                
                if health_status and db_status:
                    console.print("[green]✓[/green] Service is healthy")
                    console.print("[green]✓[/green] Database is connected")
                    return True
                    
                if not health_status:
                    console.print("[red]✗[/red] Service is not healthy")
                if not db_status:
                    console.print("[red]✗[/red] Database is not connected")
                    
            except json.JSONDecodeError:
                console.print("[red]✗[/red] Invalid health check response")
                console.print(f"[yellow]Response:[/yellow] {stdout.decode()}")
                
        except Exception as e:
            console.print(f"[red]✗[/red] Health check error: {str(e)}")
            
        await asyncio.sleep(2)
        
    console.print(f"[red]✗[/red] Health check timed out after {timeout} seconds")
    return False

async def verify_video_flow(url: str) -> bool:
    """Verify video upload and processing flow."""
    console = Console()
    console.print("\n[bold]Starting video flow verification[/bold]")
    
    # Create test video
    video_data = {
        "title": "Test Video",
        "description": "Deployment verification",
        "duration": 120,
        "tags": ["test", "deploy"]
    }
    
    try:
        # Step 1: Upload video metadata
        console.print("[yellow]Step 1:[/yellow] Uploading video metadata...")
        process = await asyncio.create_subprocess_exec(
            "curl", "-v", "-X", "POST",  # Added -v for verbose output
            f"{url}/api/v1/videos",
            "-H", "Content-Type: application/json",
            "-d", json.dumps(video_data),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE  # Capture stderr for debugging
        )
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            console.print(f"[red]✗[/red] Upload failed with code {process.returncode}")
            console.print(f"[red]Error:[/red] {stderr.decode()}")
            return False
            
        console.print("[green]✓[/green] Upload successful")
        
        # Get video ID from response
        try:
            response = json.loads(stdout)
            video_id = response["id"]
            console.print(f"[blue]Video ID:[/blue] {video_id}")
        except (json.JSONDecodeError, KeyError) as e:
            console.print(f"[red]✗[/red] Failed to parse upload response: {str(e)}")
            console.print(f"[yellow]Response:[/yellow] {stdout.decode()}")
            return False
        
        # Step 2: Verify video metadata
        console.print("\n[yellow]Step 2:[/yellow] Verifying video metadata...")
        process = await asyncio.create_subprocess_exec(
            "curl", "-v", "-sf",  # Added -v for verbose output
            f"{url}/api/v1/videos/{video_id}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            console.print(f"[red]✗[/red] Metadata verification failed with code {process.returncode}")
            console.print(f"[red]Error:[/red] {stderr.decode()}")
            return False
            
        try:
            metadata = json.loads(stdout)
            # Detailed metadata verification
            verification_results = {
                "title": metadata["title"] == video_data["title"],
                "description": metadata["description"] == video_data["description"],
                "duration": metadata["duration"] == video_data["duration"],
                "tags": set(metadata["tags"]) == set(video_data["tags"])
            }
            
            for field, result in verification_results.items():
                status = "[green]✓[/green]" if result else "[red]✗[/red]"
                console.print(f"{status} {field}: {metadata.get(field)}")
                
            if not all(verification_results.values()):
                console.print("[red]✗[/red] Metadata verification failed")
                return False
                
            console.print("[green]✓[/green] All metadata verified successfully")
            return True
            
        except (json.JSONDecodeError, KeyError) as e:
            console.print(f"[red]✗[/red] Failed to parse metadata: {str(e)}")
            console.print(f"[yellow]Response:[/yellow] {stdout.decode()}")
            return False
            
    except Exception as e:
        console.print(f"[red]✗[/red] Unexpected error: {str(e)}")
        return False

async def verify_token_flow(url: str) -> bool:
    """Verify token distribution flow."""
    # Create test user with wallet
    user_data = {
        "wallet_address": "0xTestWallet",
        "engagement_score": 100
    }
    
    try:
        # Create user
        process = await asyncio.create_subprocess_exec(
            "curl", "-X", "POST",
            f"{url}/api/v1/users",
            "-H", "Content-Type: application/json",
            "-d", json.dumps(user_data),
            stdout=asyncio.subprocess.PIPE
        )
        stdout, _ = await process.communicate()
        if process.returncode != 0:
            return False
        
        # Get user ID
        response = json.loads(stdout)
        user_id = response["id"]
        
        # Trigger reward calculation
        process = await asyncio.create_subprocess_exec(
            "curl", "-X", "POST",
            f"{url}/api/v1/rewards/calculate",
            "-H", "Content-Type: application/json",
            "-d", json.dumps({"user_id": user_id}),
            stdout=asyncio.subprocess.PIPE
        )
        stdout, _ = await process.communicate()
        if process.returncode != 0:
            return False
        
        # Verify wallet balance
        process = await asyncio.create_subprocess_exec(
            "curl", "-sf",
            f"{url}/api/v1/users/{user_id}/wallet",
            stdout=asyncio.subprocess.PIPE
        )
        stdout, _ = await process.communicate()
        if process.returncode != 0:
            return False
        
        wallet = json.loads(stdout)
        return float(wallet["balance"]) > 0
    except:
        return False

async def verify_deployment(url: str) -> bool:
    """Verify critical user flows."""
    # 1. Health Check
    console.print("Checking health...")
    if not await verify_health(url):
        console.print("[red]✗[/] Health check failed")
        return False
    console.print("[green]✓[/] Health check passed")

    # 2. Content Creation Flow
    console.print("\nVerifying content flow...")
    if not await verify_video_flow(url):
        console.print("[red]✗[/] Content flow failed")
        return False
    console.print("[green]✓[/] Content flow verified")

    # 3. Token Distribution Flow  
    console.print("\nVerifying token flow...")
    if not await verify_token_flow(url):
        console.print("[red]✗[/] Token flow failed")
        return False
    console.print("[green]✓[/] Token flow verified")

    return True

async def deploy_service(service: str, image: str, url: str) -> bool:
    """Deploy service and verify critical flows."""
    # Export deployment configuration
    os.environ.update({
        "SERVICE_NAME": service,
        "IMAGE_URL": image,
        "DEPLOY_URL": url,
    })
    
    # 1. Deploy Service
    deploy_script = Path("deploy") / f"{service}.sh"
    if not deploy_script.exists():
        raise DeploymentError(f"Deployment script not found: {deploy_script}")
    
    console.print("Deploying service...")
    await run_cmd(["bash", str(deploy_script), "services"])
    console.print("[green]✓[/] Service deployed")
    
    # 2. Verify Deployment
    console.print("\nVerifying deployment...")
    return await verify_deployment(url) 