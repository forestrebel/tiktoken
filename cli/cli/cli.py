"""TikToken development CLI - Container-First Development Tool"""
import os
import subprocess
import time
from pathlib import Path
from typing import Dict, List, Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table
import asyncio
from cli.deploy import (
    verify_requirements,
    push_container,
    deploy_service,
    verify_deployment,
    verify_video_flow,
    DeploymentError
)

app = typer.Typer(
    help="TikToken development CLI - Container-First Development Tool",
    no_args_is_help=True,
)
verify_app = typer.Typer(help="Verify critical flows")
app.add_typer(verify_app, name="verify")
console = Console()

# Service configuration
SERVICES = {
    "core_api": {
        "health_endpoint": "http://localhost:8080/health",
        "required": True,
    },
    "ai_service": {
        "health_endpoint": "http://localhost:8081/health",
        "required": True,
    },
    "frontend": {
        "health_endpoint": "http://localhost:3000/health",
        "required": True,
    },
    "supabase": {
        "health_endpoint": "http://localhost:54323/health",
        "required": True,
    },
}

def show_header():
    """Show CLI header with usage information."""
    header = """
[bold]TikToken Development CLI[/]

Core Workflows:
1. Development Commands
   [green]t dev up[/]      # Start environment with health checks
   [green]t dev down[/]    # Clean stop of all services
   [green]t dev logs[/]    # View logs with service filtering
   [green]t dev shell[/]   # Enter container shell
   [green]t dev restart[/] # Quick restart of specific service

2. Validation Commands
   [green]t check local[/]   # Verify all services healthy
   [green]t check ports[/]   # Check for port conflicts
   [green]t check config[/]  # Validate environment variables
   [green]t status[/]        # Check container health

3. Testing Commands
   [green]t test integration[/] # Run cross-service tests
"""
    console.print(Panel(header, title="Container-First Development"))

def find_project_root():
    """Find the project root by looking for docker-compose.yml"""
    current = Path.cwd()
    while current != current.parent:
        if (current / "docker-compose.yml").exists():
            return current
        current = current.parent
    raise typer.Exit("Could not find project root (docker-compose.yml)")

def run_compose(cmd: str, capture_output: bool = False) -> subprocess.CompletedProcess:
    """Run a docker compose command."""
    full_cmd = f"docker compose {cmd}"
    return subprocess.run(
        full_cmd.split(),
        check=False,
        capture_output=capture_output,
        text=True
    )

def check_service_health(service: str, retries: int = 30, delay: int = 2) -> bool:
    """Check if a service is healthy by calling its health endpoint."""
    if service not in SERVICES:
        console.print(f"[yellow]Warning:[/] Unknown service {service}")
        return False

    health_endpoint = SERVICES[service]["health_endpoint"]
    curl_cmd = f"curl -f {health_endpoint}"

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task(f"Checking {service} health...", total=None)
        
        for _ in range(retries):
            result = subprocess.run(
                curl_cmd.split(),
                capture_output=True,
                check=False
            )
            if result.returncode == 0:
                progress.update(task, description=f"[green]✓[/] {service} is healthy")
                return True
            time.sleep(delay)
        
        progress.update(task, description=f"[red]✗[/] {service} health check failed")
        return False

def get_container_status() -> Dict[str, bool]:
    """Get the status of all containers."""
    result = run_compose("ps --format json", capture_output=True)
    if result.returncode != 0:
        return {service: False for service in SERVICES}
    
    running_services = set()
    for line in result.stdout.splitlines():
        if '"State": "running"' in line and '"Service": "' in line:
            service = line.split('"Service": "')[1].split('"')[0]
            running_services.add(service)
    
    return {service: service in running_services for service in SERVICES}

# Development commands
dev_app = typer.Typer(
    help="Development environment commands",
    short_help="Start and manage development environment",
)
app.add_typer(dev_app, name="dev")

@dev_app.command()
def up(
    detach: bool = typer.Option(True, "--detach/--no-detach", "-d/-D", help="Run in background"),
    build: bool = typer.Option(True, "--build/--no-build", "-b/-B", help="Build images before starting"),
):
    """Start development environment."""
    console.print("[bold]Starting development environment...[/]")
    
    cmd = "up"
    if detach:
        cmd += " -d"
    if build:
        cmd += " --build"
    
    result = run_compose(cmd)
    if result.returncode != 0:
        raise typer.Exit(result.returncode)
    
    if detach:
        console.print("\n[bold]Waiting for services to be healthy...[/]")
        all_healthy = True
        for service in SERVICES:
            is_healthy = check_service_health(service)
            if not is_healthy and SERVICES[service]["required"]:
                all_healthy = False
        
        if not all_healthy:
            console.print("\n[red]Error:[/] Some required services failed health checks")
            raise typer.Exit(1)
        
        console.print("\n[green]✓[/] All services are running and healthy!")

@dev_app.command()
def down():
    """Stop development environment."""
    console.print("[bold]Stopping development environment...[/]")
    result = run_compose("down")
    raise typer.Exit(result.returncode)

@dev_app.command()
def logs(
    service: Optional[str] = typer.Argument(None, help="Service to show logs for"),
    follow: bool = typer.Option(False, "--follow", "-f", help="Follow log output"),
    tail: Optional[int] = typer.Option(None, "--tail", "-n", help="Number of lines to show"),
):
    """View service logs."""
    if service and service not in SERVICES:
        console.print(f"[red]Error:[/] Unknown service {service}")
        raise typer.Exit(1)
    
    cmd = "logs"
    if follow:
        cmd += " -f"
    if tail:
        cmd += f" --tail={tail}"
    if service:
        cmd += f" {service}"
    
    result = run_compose(cmd)
    raise typer.Exit(result.returncode)

@dev_app.command()
def shell(
    service: str = typer.Argument(..., help="Service to open shell in"),
    user: Optional[str] = typer.Option(None, "--user", "-u", help="User to run as"),
):
    """Open a shell in a service container."""
    if service not in SERVICES:
        console.print(f"[red]Error:[/] Unknown service {service}")
        raise typer.Exit(1)
    
    cmd = f"exec"
    if user:
        cmd += f" -u {user}"
    cmd += f" {service} /bin/bash"
    
    result = run_compose(cmd)
    raise typer.Exit(result.returncode)

@dev_app.command()
def restart(
    service: str = typer.Argument(..., help="Service to restart"),
):
    """Quick restart of specific service."""
    if service not in SERVICES:
        console.print(f"[red]Error:[/] Unknown service {service}")
        raise typer.Exit(1)
    
    console.print(f"[bold]Restarting {service}...[/]")
    cmd = f"restart {service}"
    result = run_compose(cmd)
    
    if result.returncode != 0:
        raise typer.Exit(result.returncode)
    
    # Check health after restart
    if check_service_health(service):
        console.print(f"\n[green]✓[/] {service} restarted and healthy!")
    else:
        console.print(f"\n[red]Error:[/] {service} failed health check after restart")
        raise typer.Exit(1)

# Check commands
check_app = typer.Typer(
    help="Validation commands",
    short_help="Run validation checks",
)
app.add_typer(check_app, name="check")

@check_app.command()
def containers():
    """Verify container builds and health endpoints."""
    console.print("[bold]Verifying containers...[/]")
    
    # Check if containers are running
    status = get_container_status()
    all_running = True
    
    table = Table(title="Container Status")
    table.add_column("Service")
    table.add_column("Status")
    table.add_column("Health")
    
    for service, running in status.items():
        if not running:
            if SERVICES[service]["required"]:
                all_running = False
            table.add_row(
                service,
                "[red]stopped[/]",
                "[yellow]unknown[/]"
            )
            continue
        
        # Check health endpoints
        is_healthy = check_service_health(service, retries=1)
        if not is_healthy and SERVICES[service]["required"]:
            all_running = False
        
        table.add_row(
            service,
            "[green]running[/]" if running else "[red]stopped[/]",
            "[green]healthy[/]" if is_healthy else "[red]unhealthy[/]"
        )
    
    console.print(table)
    
    if not all_running:
        console.print("\n[red]Error:[/] Some required containers are not running or unhealthy")
        raise typer.Exit(1)
    
    console.print("\n[green]✓[/] All containers are running and healthy!")
    return 0

@check_app.command()
def cloud():
    """Check cloud deployment status."""
    console.print("[bold]Checking cloud deployment...[/]")
    
    try:
        # Check DO app status
        result = subprocess.run(
            ["doctl", "apps", "get", os.getenv("DO_APP_ID", ""), "--format", "json"],
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            raise Exception("Failed to get app status")
        
        # Run deployment tests
        console.print("\n[bold]Running deployment tests...[/]")
        env = {
            **os.environ,
            "DEPLOYMENT_ENV": "cloud",
            "CORE_API_URL": os.getenv("CLOUD_API_URL", ""),
        }
        
        result = subprocess.run([
            "pytest",
            "tests/integration/test_core.py",
            "-v",
            "--asyncio-mode=auto"
        ], env=env)
        
        if result.returncode != 0:
            raise Exception("Deployment tests failed")
        
        console.print("\n[green]✓[/] Cloud deployment is healthy!")
        return 0
        
    except Exception as e:
        console.print(f"\n[red]Error:[/] Cloud check failed: {str(e)}")
        raise typer.Exit(1)

@check_app.command()
def local():
    """Verify all services are healthy."""
    return check_app.commands["containers"](standalone_mode=False)

@check_app.command()
def ports():
    """Check for port conflicts."""
    console.print("[bold]Checking for port conflicts...[/]")
    
    # Get all used ports from docker-compose.yml
    result = run_compose("config", capture_output=True)
    if result.returncode != 0:
        console.print("[red]Error:[/] Failed to read docker-compose configuration")
        raise typer.Exit(1)
    
    # Check each port
    all_clear = True
    for line in result.stdout.splitlines():
        if ":" in line and "ports:" in line:
            try:
                port = line.split(":")[1].strip().split(":")[0]
                cmd = f"lsof -i :{port}"
                result = subprocess.run(cmd.split(), capture_output=True)
                
                if result.returncode == 0:
                    console.print(f"[red]✗[/] Port {port} is in use")
                    all_clear = False
                else:
                    console.print(f"[green]✓[/] Port {port} is available")
            except:
                continue
    
    if not all_clear:
        console.print("\n[red]Error:[/] Some ports are already in use")
        raise typer.Exit(1)
    
    console.print("\n[green]✓[/] All ports are available!")

@check_app.command()
def config():
    """Validate environment variables."""
    console.print("[bold]Validating environment configuration...[/]")
    
    # Required environment variables
    required_vars = {
        "NODE_ENV": "Development environment",
        "SUPABASE_KEY": "Supabase anonymous key",
    }
    
    # Check each variable
    all_set = True
    for var, description in required_vars.items():
        if var in os.environ:
            console.print(f"[green]✓[/] {description} ({var})")
        else:
            console.print(f"[red]✗[/] {description} ({var}) not set")
            all_set = False
    
    if not all_set:
        console.print("\n[red]Error:[/] Some required environment variables are not set")
        raise typer.Exit(1)
    
    console.print("\n[green]✓[/] All required environment variables are set!")

# Status command
@app.command()
def status():
    """Show environment status."""
    console.print("[bold]Environment Status[/]")
    return check_app.commands["containers"](standalone_mode=False)

# Test commands
test_app = typer.Typer(
    help="Testing commands",
    short_help="Run tests",
)
app.add_typer(test_app, name="test")

@test_app.command()
def integration():
    """Run integration tests."""
    console.print("[bold]Running integration tests...[/]")
    
    # First check if all containers are healthy
    try:
        check_app.commands["containers"](standalone_mode=False)
    except typer.Exit as e:
        if e.exit_code != 0:
            console.print("[red]Error:[/] Cannot run integration tests - containers not healthy")
            raise
    
    # Run pytest with integration tests
    cmd = [
        "pytest",
        "tests/integration",
        "-v",
        "--asyncio-mode=auto",
        "--capture=no",
    ]
    
    result = subprocess.run(cmd)
    if result.returncode != 0:
        console.print("\n[red]Error:[/] Integration tests failed")
        raise typer.Exit(result.returncode)
    
    console.print("\n[green]✓[/] All integration tests passed!")
    return 0

# Deploy commands
deploy_app = typer.Typer(
    help="Deployment commands",
    short_help="Deploy services",
)
app.add_typer(deploy_app, name="deploy")

@deploy_app.command("build")
def deploy_build():
    """Build and push container to registry."""
    asyncio.run(push_container("core"))

@deploy_app.command("services")
def deploy_services():
    """Deploy services to target environment."""
    url = os.getenv("DEPLOY_URL", "http://localhost:8000")
    asyncio.run(deploy_service("core", "latest", url))

@deploy_app.command("verify")
def deploy_verify():
    """Verify deployment and critical flows."""
    url = os.getenv("DEPLOY_URL", "http://localhost:8000")
    asyncio.run(verify_deployment(url))

@verify_app.command("content-flow")
def verify_content_flow(
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show detailed output")
):
    """Verify the content creation flow."""
    try:
        url = "http://localhost:8000"  # Core API URL
        asyncio.run(verify_video_flow(url))
    except Exception as e:
        console.print(f"[red]Error:[/red] {str(e)}")
        raise typer.Exit(1)

def main():
    """CLI entry point."""
    try:
        # Ensure we're in the project root
        os.chdir(find_project_root())
        
        # Show header on --help
        if "--help" in os.sys.argv or len(os.sys.argv) == 1:
            show_header()
        
        # Run CLI
        app()
    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise typer.Exit(1)

if __name__ == "__main__":
    main() 