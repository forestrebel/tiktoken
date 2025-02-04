"""TikToken development CLI - Container-First Development Tool"""
import os
import subprocess
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel

app = typer.Typer(
    help="TikToken development CLI - Container-First Development Tool",
    no_args_is_help=True,
)
console = Console()

def show_header():
    """Show CLI header with usage information."""
    header = """
[bold]TikToken Development CLI[/]

Core Workflows:
1. Local Development
   [green]t dev[/]        # Start containers
   [green]t test[/]       # Run tests
   [green]t status[/]     # Health checks

2. Pre-Deployment
   [green]t check containers[/]
   [green]t check integration[/]
   [green]t check config[/]

3. Deployment
   [green]t deploy build[/]
   [green]t deploy services[/]
   [green]t deploy verify[/]
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

def run_compose(cmd: str) -> int:
    """Run a docker compose command."""
    full_cmd = f"docker compose {cmd}"
    return subprocess.run(full_cmd.split(), check=False).returncode

# Development commands
dev_app = typer.Typer(
    help="Development environment commands",
    short_help="Start and manage development environment",
)
app.add_typer(dev_app, name="dev")

@dev_app.command()
def up(
    detach: bool = typer.Option(False, "--detach", "-d", help="Run in background"),
    build: bool = typer.Option(False, "--build", "-b", help="Build images before starting"),
):
    """Start development environment using cached images."""
    console.print("[bold]Starting development environment...[/]")
    
    cmd = "up"
    if detach:
        cmd += " -d"
    if build:
        cmd += " --build"
    
    return run_compose(cmd)

@dev_app.command()
def down():
    """Stop development environment."""
    console.print("[bold]Stopping development environment...[/]")
    return run_compose("down")

@dev_app.command()
def logs(
    service: Optional[str] = typer.Argument(None, help="Service to show logs for"),
    follow: bool = typer.Option(False, "--follow", "-f", help="Follow log output"),
    tail: Optional[int] = typer.Option(None, "--tail", "-n", help="Number of lines to show"),
):
    """View service logs."""
    console.print("[bold]Showing logs...[/]")
    
    cmd = "logs"
    if follow:
        cmd += " -f"
    if tail:
        cmd += f" --tail={tail}"
    if service:
        cmd += f" {service}"
    
    return run_compose(cmd)

@dev_app.command()
def shell(
    service: str = typer.Argument(..., help="Service to open shell in"),
    user: Optional[str] = typer.Option(None, "--user", "-u", help="User to run as"),
):
    """Open a shell in a service container."""
    cmd = f"exec"
    if user:
        cmd += f" -u {user}"
    cmd += f" {service} /bin/bash"
    
    return run_compose(cmd)

# Check commands
check_app = typer.Typer(
    help="Validation commands",
    short_help="Run validation checks",
)
app.add_typer(check_app, name="check")

@check_app.command()
def local():
    """Run local environment checks."""
    console.print("[bold]Running local checks...[/]")
    
    # Validate docker-compose configuration
    if run_compose("config --quiet") != 0:
        return 1
    
    # Check container health
    if run_compose("ps --quiet") != 0:
        console.print("[red]Error:[/] No containers running")
        return 1
    
    console.print("[green]✓[/] Local environment is healthy!")
    return 0

@check_app.command()
def cloud():
    """Check cloud configuration."""
    console.print("[bold]Checking cloud configuration...[/]")
    # TODO: Implement cloud config checks
    return 0

@check_app.command()
def security():
    """Run security validation."""
    console.print("[bold]Running security checks...[/]")
    # TODO: Implement security checks
    return 0

# Deploy commands
deploy_app = typer.Typer(
    help="Deployment commands",
    short_help="Deploy application",
)
app.add_typer(deploy_app, name="deploy")

@deploy_app.command()
def staging():
    """Deploy to staging environment."""
    console.print("[bold]Deploying to staging...[/]")
    # TODO: Implement staging deployment
    return 0

@deploy_app.command()
def prod():
    """Deploy to production environment."""
    console.print("[bold]Deploying to production...[/]")
    # TODO: Implement production deployment
    return 0

# Status command
@app.command()
def status():
    """Show environment status."""
    console.print("[bold]Environment Status[/]")
    return run_compose("ps")

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
    # TODO: Implement integration tests
    return 0

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