#!/usr/bin/env python3
"""
TikToken development CLI
Usage: t <command> [options]
"""
import os
import subprocess
import sys
from pathlib import Path

import click
from dotenv import load_dotenv

# Ensure we're in the project root
PROJECT_ROOT = Path(__file__).parent.parent
os.chdir(PROJECT_ROOT)

# Load environment variables
load_dotenv()

def run_cmd(cmd: str, echo: bool = True) -> int:
    """Run a shell command and optionally echo output"""
    if echo:
        click.echo(f"$ {cmd}")
    return subprocess.call(cmd, shell=True)

@click.group()
def cli():
    """TikToken development CLI"""
    pass

@cli.command()
@click.option('--detach', '-d', is_flag=True, help='Run in background')
def dev(detach):
    """Start development environment"""
    click.echo("Starting development environment...")
    cmd = "docker compose up"
    if detach:
        cmd += " -d"
    return run_cmd(cmd)

@cli.command()
def setup():
    """Configure development environment"""
    click.echo("Setting up development environment...")
    
    # Check if .env exists, create from example if not
    if not Path(".env").exists() and Path(".env.example").exists():
        click.echo("Creating .env from .env.example...")
        run_cmd("cp .env.example .env")
    
    # Install backend dependencies
    click.echo("\nInstalling backend dependencies...")
    with Path("backend").as_cwd():
        run_cmd("pipenv install --dev")
    
    # Install pre-commit hooks
    click.echo("\nSetting up pre-commit hooks...")
    run_cmd("pipenv run pre-commit install")
    
    click.echo("\n✨ Development environment ready!")
    click.echo("\nNext steps:")
    click.echo("1. Edit .env with your configuration")
    click.echo("2. Run 't dev' to start the environment")

@cli.command()
@click.option('--watch', '-w', is_flag=True, help='Watch for changes')
@click.option('--coverage', '-c', is_flag=True, help='Show coverage report')
def test(watch, coverage):
    """Run tests"""
    click.echo("Running tests...")
    cmd = "docker compose run --rm backend pytest"
    
    if watch:
        cmd += " --watch"
    if coverage:
        cmd += " --cov=. --cov-report=term-missing"
    
    return run_cmd(cmd)

@cli.command()
def status():
    """Check service status"""
    click.echo("Checking service status...")
    
    # Check Docker services
    click.echo("\n🐳 Docker Services:")
    run_cmd("docker compose ps")
    
    # Check environment
    click.echo("\n🔧 Environment:")
    env_vars = [
        "API_HOST",
        "API_PORT",
        "ALCHEMY_NETWORK",
        "SUPABASE_URL"
    ]
    
    for var in env_vars:
        value = os.getenv(var, "not set")
        # Mask sensitive values
        if "KEY" in var or "SECRET" in var:
            value = "****" if value != "not set" else "not set"
        click.echo(f"{var}: {value}")

@cli.command()
def logs():
    """View service logs"""
    click.echo("Showing logs (Ctrl+C to exit)...")
    return run_cmd("docker compose logs -f")

@cli.command()
def clean():
    """Clean up development environment"""
    click.echo("Cleaning up...")
    cmds = [
        "docker compose down",
        "find . -type d -name __pycache__ -exec rm -rf {} +",
        "find . -type f -name '*.pyc' -delete",
        "find . -type f -name '.coverage' -delete",
        "find . -type d -name '.pytest_cache' -exec rm -rf {} +",
    ]
    for cmd in cmds:
        run_cmd(cmd)
    click.echo("✨ Cleanup complete!")

if __name__ == "__main__":
    sys.exit(cli()) 