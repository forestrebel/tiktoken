"""TikToken development CLI"""
import os
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console

app = typer.Typer(
    help="TikToken development CLI",
    no_args_is_help=True,
)
console = Console()

def find_project_root():
    """Find the project root by looking for docker-compose.yml"""
    current = Path.cwd()
    while current != current.parent:
        if (current / "docker-compose.yml").exists():
            return current
        current = current.parent
    raise typer.Exit("Could not find project root (docker-compose.yml)")

def run_compose(cmd: str) -> int:
    """Run a docker-compose command."""
    full_cmd = f"docker-compose {cmd}"
    return os.system(full_cmd)

# Development commands
dev_app = typer.Typer(help="Development environment commands")
app.add_typer(dev_app, name="dev")

@dev_app.command()
def build(
    parallel: bool = typer.Option(True, "--parallel/--no-parallel", "-p", help="Build images in parallel"),
    no_cache: bool = typer.Option(False, "--no-cache", help="Build without using cache"),
):
    """Build development images with caching optimizations."""
    console.print("[bold]Building development images...[/]")
    
    cmd = "build"
    if parallel:
        cmd += " --parallel"
    if no_cache:
        cmd += " --no-cache"
    
    return run_compose(cmd)

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
def watch():
    """Start development with live reload using volume mounts."""
    console.print("[bold]Starting development environment with live reload...[/]")
    
    # Override compose file to use volume mounts
    os.environ["COMPOSE_FILE"] = "docker-compose.yml:docker-compose.dev.yml"
    
    return run_compose("up")

@dev_app.command()
def clean():
    """Clean development environment."""
    console.print("[bold]Cleaning development environment...[/]")
    
    cmds = [
        "down -v",  # Remove containers and volumes
        "rm -f",    # Remove any lingering containers
        "system prune -f"  # Clean up unused resources
    ]
    
    for cmd in cmds:
        if run_compose(cmd) != 0:
            return 1
    
    console.print("\n[green]✨ Development environment cleaned![/]")
    console.print("\nNext steps:")
    console.print("1. Run [bold]t dev build[/] to rebuild images")
    console.print("2. Run [bold]t dev up[/] to start environment")
    return 0

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
@app.command()
def check():
    """Run all checks."""
    console.print("[bold]Running checks...[/]")
    
    # Validate docker-compose configuration
    if run_compose("config --quiet") != 0:
        return 1
    
    # Add more checks here (linting, tests, etc.)
    console.print("[green]✓[/] All checks passed!")
    return 0

# Deploy command
@app.command()
def deploy():
    """Deploy the application."""
    console.print("[bold]Deploying application...[/]")
    # Add deployment logic here
    return 0

def main():
    """CLI entry point."""
    try:
        # Ensure we're in the project root
        os.chdir(find_project_root())
        
        # Run CLI
        app()
    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise typer.Exit(1)

if __name__ == "__main__":
    main() 