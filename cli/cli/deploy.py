"""Deploy minimal working infrastructure."""
import os
import json
import asyncio
import aiohttp
from pathlib import Path
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.live import Live
from rich.panel import Panel

console = Console()

# Constants
REGISTRY = "registry.digitalocean.com/tiktoken-registry"
TIMEOUT = 30  # seconds

async def run_cmd(cmd: str, cwd: str = None, timeout: int = TIMEOUT) -> bool:
    """Run a command with timeout and show output in real-time."""
    console.print(f"[bold blue]Running:[/] {cmd}")
    
    try:
        process = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=cwd
        )
        
        try:
            # Stream output in real-time
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                console.print(line.decode().strip())
                
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout
            )
            
            if process.returncode != 0:
                console.print(Panel(f"[red]Error:[/] {cmd} failed:\n{stderr.decode()}", title="Error"))
                return False
                
            console.print(f"[green]✓[/] Command completed successfully")
            return True
            
        except asyncio.TimeoutError:
            try:
                process.terminate()
                await process.wait()
            except:
                pass
            console.print(Panel(f"[red]Error:[/] Command timed out after {timeout}s:\n{cmd}", title="Timeout"))
            return False
            
    except Exception as e:
        console.print(Panel(f"[red]Error:[/] Failed to run command:\n{str(e)}", title="Exception"))
        return False

async def deploy_minimal():
    """Deploy minimal working stack."""
    console.print("\n[bold]Starting deployment...[/]")
    
    try:
        # 1. Deploy Core API to DO
        console.print("\n[bold]1. Deploying Core API[/]")
        
        # Build container
        console.print("\nBuilding container...")
        if not await run_cmd("docker build -t tiktoken-core ./backend", timeout=120):
            return False
            
        # Login and push
        console.print("\nPushing to registry...")
        if not await run_cmd("doctl registry login"):
            return False
            
        if not await run_cmd(f"docker tag tiktoken-core {REGISTRY}/core"):
            return False
            
        if not await run_cmd(f"docker push {REGISTRY}/core", timeout=120):
            return False
        
        # Deploy to DO
        console.print("\nDeploying to Digital Ocean...")
        app_id = os.getenv("DO_APP_ID")
        if not app_id:
            console.print(Panel("[red]Error:[/] DO_APP_ID not set", title="Missing Environment Variable"))
            return False
            
        if not await run_cmd(f"doctl apps create-deployment {app_id}", timeout=60):
            return False
        
        # 2. Deploy Frontend to Vercel
        console.print("\n[bold]2. Deploying Frontend[/]")
        frontend_dir = Path("frontend")
        if not frontend_dir.exists():
            console.print(Panel("[red]Error:[/] Frontend directory not found", title="Missing Directory"))
            return False
            
        if not await run_cmd("vercel --prod", cwd=frontend_dir, timeout=120):
            return False
        
        # 3. Verify Connections
        console.print("\n[bold]3. Verifying Connections[/]")
        api_url = os.getenv("DO_API_URL")
        if not api_url:
            console.print(Panel("[red]Error:[/] DO_API_URL not set", title="Missing Environment Variable"))
            return False
        
        # Wait for API to be ready (up to 2 minutes)
        console.print("\nWaiting for API to be ready...")
        async with aiohttp.ClientSession() as session:
            for i in range(12):  # 12 * 10s = 2 minutes
                if i > 0:
                    console.print(f"Attempt {i+1}/12 ({i*10}s elapsed)")
                    await asyncio.sleep(10)
                    
                try:
                    async with session.get(f"{api_url}/health", timeout=5) as resp:
                        if resp.status != 200:
                            console.print(f"[yellow]API not ready (status {resp.status})[/]")
                            continue
                            
                        data = await resp.json()
                        if data.get("db_connected"):
                            console.print(Panel("[green]✓[/] All services healthy!", title="Success"))
                            return True
                        else:
                            console.print("[yellow]Database not connected yet[/]")
                            
                except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                    console.print(f"[yellow]Connection failed: {str(e)}[/]")
                    continue
            
            console.print(Panel("[red]Error:[/] Timeout waiting for API to be ready", title="Timeout"))
            return False
            
    except Exception as e:
        console.print(Panel(f"[red]Error:[/] Deployment failed:\n{str(e)}", title="Exception"))
        return False

def setup_env() -> bool:
    """Set up environment variables."""
    console.print("\n[bold]Checking environment...[/]")
    
    env_file = Path(".env.production")
    if not env_file.exists():
        console.print(Panel("[red]Error:[/] .env.production not found", title="Missing File"))
        return False
        
    # Check for required variables
    required = {
        "SUPABASE_URL": os.getenv("SUPABASE_URL"),
        "SUPABASE_KEY": os.getenv("SUPABASE_KEY"),
        "DO_API_URL": os.getenv("DO_API_URL"),
        "DO_API_TOKEN": os.getenv("DO_API_TOKEN"),
        "DO_APP_ID": os.getenv("DO_APP_ID")
    }
    
    missing = [k for k, v in required.items() if not v]
    if missing:
        console.print(Panel("\n".join([f"- {var}" for var in missing]), title="Missing Environment Variables"))
        return False
    
    console.print("[green]✓[/] Environment configured")
    return True

async def main():
    """Run deployment with proper error handling."""
    console.print(Panel("TikToken Deployment", title="Starting"))
    
    if not setup_env():
        return False
    
    try:
        return await asyncio.wait_for(deploy_minimal(), timeout=300)  # 5 minute total timeout
    except asyncio.TimeoutError:
        console.print(Panel("[red]Error:[/] Deployment timed out after 5 minutes", title="Timeout"))
        return False

if __name__ == "__main__":
    asyncio.run(main())