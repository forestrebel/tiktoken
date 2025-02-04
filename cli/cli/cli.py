"""TikToken development CLI - Container-First Development Tool"""
import os
import subprocess
import time
from pathlib import Path
from typing import Dict, List, Optional
import asyncio
import aiohttp
import typer
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from cli.deploy import (
    verify_requirements,
    push_container,
    deploy_service,
    verify_deployment,
    verify_video_flow,
    DeploymentError
)
from cli.verify import verify_local_dev_setup
from cli.process import ProcessManager, JobStatus

app = typer.Typer(
    help="TikToken development CLI - Container-First Development Tool",
    no_args_is_help=True,
)
verify_app = typer.Typer(help="Verify critical flows")
app.add_typer(verify_app, name="verify")
console = Console()
process_manager = ProcessManager()

# Service configuration
SERVICES = {
    "core": {
        "health_endpoint": "http://localhost:8000/health",
        "required": True,
        "timeout": 5,  # seconds
    },
    "supabase-db": {
        "health_endpoint": "http://localhost:54322/health",
        "required": True,
        "timeout": 5,
    },
    "supabase-rest": {
        "health_endpoint": "http://localhost:54321/health",
        "required": True,
        "timeout": 5,
    },
}

async def check_service_health_async(service: str, session: aiohttp.ClientSession) -> bool:
    """Check if a service is healthy asynchronously."""
    if service not in SERVICES:
        console.print(f"[yellow]Warning:[/] Unknown service {service}")
        return False

    config = SERVICES[service]
    health_endpoint = config["health_endpoint"]
    timeout = aiohttp.ClientTimeout(total=config["timeout"])

    try:
        async with session.get(health_endpoint, timeout=timeout) as response:
            return response.status == 200
    except (aiohttp.ClientError, asyncio.TimeoutError):
        return False

async def check_all_services_health() -> Dict[str, bool]:
    """Check health of all services concurrently."""
    async with aiohttp.ClientSession() as session:
        tasks = {
            service: check_service_health_async(service, session)
            for service in SERVICES
        }
        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        return dict(zip(tasks.keys(), [
            isinstance(r, bool) and r for r in results
        ]))

def run_compose(cmd: str, capture_output: bool = False) -> subprocess.CompletedProcess:
    """Run a docker compose command."""
    full_cmd = f"docker compose {cmd}"
    return subprocess.run(
        full_cmd.split(),
        check=False,
        capture_output=capture_output,
        text=True
    )

@app.command()
def check(ctx: typer.Context):
    """Check service health status."""
    results = asyncio.run(check_all_services_health())
    
    # Fast fail if required services are unhealthy
    unhealthy = [s for s, healthy in results.items() 
                 if SERVICES[s]["required"] and not healthy]
    
    if unhealthy:
        console.print(f"✗ Services unhealthy: {', '.join(unhealthy)}")
        raise typer.Exit(1)
    
    console.print("✓ All required services are healthy")

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
   [green]t dev doctor[/]  # Run system diagnostics

2. Validation Commands
   [green]t verify local-dev[/] # Verify local development setup
   [green]t check local[/]      # Verify all services healthy
   [green]t check ports[/]      # Check for port conflicts
   [green]t check config[/]     # Validate environment variables
   [green]t status[/]           # Check container health

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

def compose_cmd(cmd: str) -> str:
    """Generate docker compose command with proper project name."""
    return f"docker compose -p tiktoken {cmd}"

@dev_app.command()
def up(
    detach: bool = typer.Option(True, "--detach/--no-detach", "-d/-D", help="Run in background"),
    build: bool = typer.Option(True, "--build/--no-build", "-b/-B", help="Build images before starting"),
):
    """Start development environment."""
    cmd_parts = ["up"]
    if detach:
        cmd_parts.append("-d")
    if build:
        cmd_parts.append("--build")
        
    cmd = compose_cmd(" ".join(cmd_parts))
    
    # Run in background and get job ID
    job = process_manager.run_background(cmd)
    console.print(f"[green]Starting development environment in background (Job ID: {job.id})[/green]")
    console.print("Run [bold]t status[/bold] to check progress")
    
    # Update service status
    for service in SERVICES:
        process_manager.update_service_status(service, {
            "status": "starting",
            "healthy": False
        })

@dev_app.command()
def down():
    """Stop development environment."""
    cmd = compose_cmd("down")
    job = process_manager.run_background(cmd)
    console.print(f"[yellow]Stopping development environment (Job ID: {job.id})[/yellow]")
    
    # Update service status
    for service in SERVICES:
        process_manager.update_service_status(service, {
            "status": "stopped",
            "healthy": False
        })

@dev_app.command()
def logs(
    service: Optional[str] = typer.Argument(None, help="Service to show logs for"),
    follow: bool = typer.Option(False, "--follow", "-f", help="Follow log output"),
    tail: Optional[int] = typer.Option(None, "--tail", "-n", help="Number of lines to show"),
):
    """Show logs from services."""
    cmd_parts = ["logs"]
    if follow:
        cmd_parts.append("-f")
    if tail:
        cmd_parts.extend(["--tail", str(tail)])
    if service:
        cmd_parts.append(service)
        
    cmd = compose_cmd(" ".join(cmd_parts))
    
    if follow:
        # Run in background for following logs
        job = process_manager.run_background(cmd)
        console.print(f"[green]Following logs in background (Job ID: {job.id})[/green]")
        console.print("Press Ctrl+C to stop following")
    else:
        # Run directly for one-time log view
        subprocess.run(cmd, shell=True)

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
    if check_service_health_async(service):
        console.print(f"\n[green]✓[/] {service} restarted and healthy!")
    else:
        console.print(f"\n[red]Error:[/] {service} failed health check after restart")
        raise typer.Exit(1)

@dev_app.command()
def clean():
    """Clean up development environment."""
    # Stop all services
    cmd = compose_cmd("down -v --remove-orphans")
    job = process_manager.run_background(cmd)
    console.print(f"[yellow]Cleaning up development environment (Job ID: {job.id})[/yellow]")
    
    # Clean up job cache
    process_manager.cleanup_jobs()
    console.print("[green]Cleaned up job cache[/green]")
    
    # Reset service status
    for service in SERVICES:
        process_manager.update_service_status(service, {
            "status": "not initialized",
            "healthy": False
        })

@dev_app.command()
def doctor():
    """Run diagnostics on development environment."""
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        # Check Docker
        task = progress.add_task("Checking Docker...", total=None)
        try:
            subprocess.run(["docker", "info"], capture_output=True, check=True)
            progress.update(task, description="[green]Docker is running[/green]")
        except subprocess.CalledProcessError:
            progress.update(task, description="[red]Docker is not running[/red]")
            return
            
        # Check services
        for service, config in SERVICES.items():
            task = progress.add_task(f"Checking {service}...", total=None)
            status = process_manager.get_service_status(service)
            
            if status.get("healthy", False):
                progress.update(task, description=f"[green]{service} is healthy[/green]")
            else:
                progress.update(task, description=f"[red]{service} is not healthy[/red]")
                
        # Check background jobs
        task = progress.add_task("Checking background jobs...", total=None)
        active_jobs = [job for job in process_manager.list_jobs() if job.status == JobStatus.RUNNING]
        if active_jobs:
            progress.update(task, description=f"[yellow]{len(active_jobs)} active background jobs[/yellow]")
        else:
            progress.update(task, description="[green]No active background jobs[/green]")

# Check commands
check_app = typer.Typer(
    help="Validation commands",
    short_help="Run validation checks",
)
app.add_typer(check_app, name="check")

def verify_containers():
    """Verify all containers are healthy."""
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Checking containers...", total=None)
        unhealthy = []
        
        for service, config in SERVICES.items():
            if not config["required"]:
                continue
            
            try:
                result = subprocess.run(
                    ["curl", "-s", "-f", config["health_endpoint"]],
                    capture_output=True
                )
                if result.returncode != 0:
                    unhealthy.append(service)
            except Exception:
                unhealthy.append(service)
        
        if unhealthy:
            progress.update(task, description=f"[red]✗[/] Services unhealthy: {', '.join(unhealthy)}")
            raise typer.Exit(1)
        else:
            progress.update(task, description="[green]✓[/] All services are healthy")

@check_app.command()
def local():
    """Verify all services are healthy."""
    verify_containers()

@check_app.command()
def ports():
    """Check for port conflicts."""
    required_ports = {
        8000: "Core API",
        54321: "Supabase REST",
        54322: "Supabase DB"
    }
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Checking ports...", total=None)
        conflicts = []
        
        for port, service in required_ports.items():
            result = subprocess.run(
                ["lsof", "-i", f":{port}"],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                conflicts.append((port, service))
        
        if conflicts:
            progress.update(task, description="[red]✗[/] Port conflicts found")
            table = Table(title="Port Conflicts")
            table.add_column("Port", style="cyan")
            table.add_column("Service", style="magenta")
            table.add_column("Current Usage", style="red")
            
            for port, service in conflicts:
                result = subprocess.run(
                    ["lsof", "-i", f":{port}"],
                    capture_output=True,
                    text=True
                )
                usage = result.stdout.split("\n")[1].split()[0]
                table.add_row(str(port), service, usage)
            
            console.print(table)
            raise typer.Exit(1)
        else:
            progress.update(task, description="[green]✓[/] All required ports are available")

@check_app.command()
def config():
    """Validate environment configuration."""
    required_vars = {
        "SUPABASE_KEY": "Database access key",
        "NODE_ENV": "Node environment (development/production)"
    }
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Checking environment...", total=None)
        missing = []
        
        for var, description in required_vars.items():
            if var not in os.environ:
                missing.append((var, description))
        
        if missing:
            progress.update(task, description="[red]✗[/] Missing environment variables")
            table = Table(title="Missing Environment Variables")
            table.add_column("Variable", style="cyan")
            table.add_column("Description", style="magenta")
            
            for var, description in missing:
                table.add_row(var, description)
            
            console.print(table)
            console.print("\nTip: Create a .env file in the project root with these variables.")
            raise typer.Exit(1)
        else:
            progress.update(task, description="[green]✓[/] All required environment variables are set")

# Status command
@app.command()
def status():
    """Show status of all services and background jobs."""
    process_manager.show_status()

# Test commands
test_app = typer.Typer(
    help="Testing commands",
    short_help="Run tests",
)
app.add_typer(test_app, name="test")

@test_app.command()
def integration(
    cloud: bool = typer.Option(False, "--cloud", "-c", help="Run cloud integration tests"),
    local: bool = typer.Option(True, "--local/--no-local", "-l/-L", help="Run local integration tests"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show detailed output"),
    failfast: bool = typer.Option(True, "--failfast/--no-failfast", "-f/-F", help="Stop on first failure"),
):
    """Run integration tests for critical paths."""
    console.print("[bold]Running integration tests...[/]")
    
    if local:
        # First check if all containers are healthy
        try:
            verify_containers()
        except typer.Exit as e:
            if e.exit_code != 0:
                console.print("[red]Error:[/] Cannot run local integration tests - containers not healthy")
                raise
        
        # Run local integration tests
        console.print("\n[bold]Running local integration tests...[/]")
        local_cmd = [
            "pytest",
            "cli/test_integration.py",
            "-v",
            "--asyncio-mode=auto",
        ]
        if verbose:
            local_cmd.append("-s")
        if failfast:
            local_cmd.append("-x")
        
        result = subprocess.run(local_cmd)
        if result.returncode != 0:
            console.print("\n[red]Error:[/] Local integration tests failed")
            if not cloud:
                raise typer.Exit(result.returncode)
    
    if cloud:
        # Check required environment variables
        required_vars = [
            "CLOUD_API_URL",
            "FRONTEND_URL",
            "AI_SERVICE_URL",
            "SUPABASE_URL",
            "SUPABASE_KEY"
        ]
        
        missing = [var for var in required_vars if not os.getenv(var)]
        if missing:
            console.print(f"[red]Error:[/] Missing required environment variables: {', '.join(missing)}")
            raise typer.Exit(1)
        
        # Run cloud integration tests
        console.print("\n[bold]Running cloud integration tests...[/]")
        cloud_cmd = [
            "pytest",
            "cli/test_deployment.py",
            "-v",
            "--asyncio-mode=auto",
        ]
        if verbose:
            cloud_cmd.append("-s")
        if failfast:
            cloud_cmd.append("-x")
        
        result = subprocess.run(cloud_cmd)
        if result.returncode != 0:
            console.print("\n[red]Error:[/] Cloud integration tests failed")
            raise typer.Exit(result.returncode)
    
    console.print("\n[green]✓[/] All integration tests passed!")
    return 0

@test_app.command()
def watch():
    """Watch for changes and run tests automatically."""
    try:
        from watchfiles import run_process
    except ImportError:
        console.print("[red]Error:[/] watchfiles package not found")
        console.print("Install with: pipenv install watchfiles")
        raise typer.Exit(1)
    
    def run_tests():
        """Run tests when files change."""
        subprocess.run([
            "pytest",
            "tests/integration",
            "-v",
            "--asyncio-mode=auto",
            "--no-cov"
        ])
    
    console.print("[bold]Watching for changes...[/]")
    console.print("Press Ctrl+C to stop")
    
    run_process(
        ".",
        target=run_tests,
        watch_filter=lambda change, path: (
            path.endswith(".py") and
            "tests" in path or
            "cli" in path
        )
    )

# Deploy commands
deploy_app = typer.Typer(
    help="Deployment commands",
    short_help="Deploy services",
)
app.add_typer(deploy_app, name="deploy")

@deploy_app.command()
def check(
    service: str = typer.Argument(..., help="Service to check"),
):
    """Check service deployment status."""
    async def _check():
        async with aiohttp.ClientSession() as session:
            result = await check_service_health_async(service, session)
            if result:
                console.print(f"[green]✓[/] {service} is healthy")
            else:
                console.print(f"[red]✗[/] {service} is not healthy")
                raise typer.Exit(1)
    
    asyncio.run(_check())

@deploy_app.command()
def run(
    service: str = typer.Argument(..., help="Service to deploy"),
):
    """Deploy a single service."""
    async def _deploy():
        async with aiohttp.ClientSession() as session:
            result = await deploy_service(service, session)
            if result:
                console.print(f"[green]✓[/] {service} deployed successfully")
            else:
                console.print(f"[red]✗[/] {service} deployment failed")
                raise typer.Exit(1)
    
    asyncio.run(_deploy())

@deploy_app.command()
def all():
    """Deploy all services in order."""
    async def _deploy_all():
        results = await deploy_all()
        if not results:
            console.print("[red]✗[/] Deployment failed")
            raise typer.Exit(1)
        
        # Show results
        console.print("\n[bold]Deployment Results:[/]")
        for service, success in results.items():
            status = "[green]✓[/]" if success else "[red]✗[/]"
            console.print(f"{status} {service}")
    
    asyncio.run(_deploy_all())

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

@verify_app.command()
def dependencies():
    """Verify service dependencies and startup order."""
    console.print("[bold]Verifying service dependencies...[/]")
    
    # Get container status
    status = get_container_status()
    
    # Define dependency order
    dependency_order = [
        ("supabase-db", []),
        ("supabase-rest", ["supabase-db"]),
        ("core", ["supabase-db", "supabase-rest"])
    ]
    
    table = Table(title="Service Dependencies")
    table.add_column("Service", style="cyan")
    table.add_column("Dependencies", style="magenta")
    table.add_column("Status", style="yellow")
    
    all_good = True
    for service, deps in dependency_order:
        service_status = status.get(service, False)
        deps_status = all(status.get(dep, False) for dep in deps)
        
        status_text = "[green]✓[/]" if service_status and deps_status else "[red]✗[/]"
        if not (service_status and deps_status):
            all_good = False
        
        table.add_row(
            service,
            ", ".join(deps) if deps else "None",
            status_text
        )
    
    console.print(table)
    
    if not all_good:
        console.print("\n[red]Error:[/] Some service dependencies are not satisfied")
        console.print("Try running: t dev restart <service>")
        raise typer.Exit(1)

@verify_app.command()
def local_dev():
    """Verify local development environment."""
    console.print("[bold]Verifying local development setup...[/]")
    
    try:
        # Run all verifications
        results = asyncio.run(verify_local_dev_setup())
        
        # Display results
        table = Table(title="Local Development Verification")
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
        
        if not all_good:
            console.print("\n[red]Error:[/] Some verifications failed")
            console.print("Run 't dev doctor' for more detailed diagnostics")
            raise typer.Exit(1)
        
        console.print("\n[green]✓[/] Local development environment is properly configured!")
        return 0
        
    except Exception as e:
        console.print(f"\n[red]Error:[/] Verification failed: {str(e)}")
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