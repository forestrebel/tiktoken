#!/usr/bin/env python3
"""
TikToken development CLI
Usage: t <command> [options]
"""
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional, Union

import click
from dotenv import load_dotenv

# Ensure we're in the project root
PROJECT_ROOT = Path(__file__).parent.parent
os.chdir(PROJECT_ROOT)

# Load environment variables
load_dotenv()

class CommandResult:
    """Command execution result"""
    def __init__(self, returncode: int, stdout: str = "", stderr: str = ""):
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr

def run_cmd(cmd: str, echo: bool = True, capture_output: bool = False) -> Union[int, CommandResult]:
    """Run a shell command and optionally capture output"""
    if echo:
        click.echo(f"$ {cmd}")
    
    if capture_output:
        result = subprocess.run(cmd, shell=True, text=True, capture_output=True)
        return CommandResult(result.returncode, result.stdout, result.stderr)
    else:
        return subprocess.call(cmd, shell=True)

@click.group()
def cli():
    """TikToken development CLI"""
    pass

@cli.group()
def deploy():
    """Deployment commands"""
    pass

@deploy.command()
def init():
    """Initialize deployment infrastructure"""
    click.echo("Initializing deployment infrastructure...")
    
    # Check required CLIs
    for cmd in ['gh', 'supabase']:
        if run_cmd(f'which {cmd}', echo=False, capture_output=True).returncode != 0:
            click.echo(f"Error: {cmd} CLI not found")
            click.echo(f"Please install {cmd} CLI first")
            return 1
    
    # Initialize Supabase
    click.echo("\n1. Setting up Supabase...")
    if run_cmd('supabase init', capture_output=True).returncode != 0:
        click.echo("Error initializing Supabase")
        return 1
    
    # Verify GitHub repo
    click.echo("\n2. Verifying GitHub repository...")
    repo_info = run_cmd('gh repo view --json nameWithOwner', capture_output=True)
    if repo_info.returncode != 0:
        click.echo("Error: Not a GitHub repository or gh not authenticated")
        click.echo("Please run 'gh auth login' first")
        return 1
    
    click.echo("\n✨ Infrastructure initialized!")
    click.echo("\nNext steps:")
    click.echo("1. Set RENDER_API_KEY and RENDER_SERVICE_ID in .env")
    click.echo("2. Run 't deploy setup' to configure services")

@deploy.command()
def setup():
    """Configure services and secrets"""
    click.echo("Configuring deployment services...")
    
    # 1. Verify environment variables
    required_vars = ['RENDER_API_KEY', 'RENDER_SERVICE_ID']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        click.echo("Error: Missing required environment variables:")
        for var in missing_vars:
            click.echo(f"- {var}")
        return 1
    
    # 2. Get Supabase configuration
    click.echo("\n1. Configuring Supabase...")
    project = run_cmd('supabase status --output json', capture_output=True)
    if project.returncode != 0:
        click.echo("Error: Could not get Supabase project info")
        return 1
    
    try:
        project_info = json.loads(project.stdout)
        supabase_url = project_info.get('api', {}).get('url')
        anon_key = project_info.get('api', {}).get('anon_key')
        
        if not supabase_url or not anon_key:
            click.echo("Error: Could not get Supabase URL or anon key")
            return 1
    except json.JSONDecodeError:
        click.echo("Error: Invalid Supabase project info")
        return 1
    
    # 3. Set up GitHub secrets
    click.echo("\n2. Setting up GitHub secrets...")
    secrets = {
        'SUPABASE_URL': supabase_url,
        'SUPABASE_ANON_KEY': anon_key,
        'RENDER_API_KEY': os.getenv('RENDER_API_KEY'),
        'RENDER_SERVICE_ID': os.getenv('RENDER_SERVICE_ID')
    }
    
    for key, value in secrets.items():
        result = run_cmd(f'gh secret set {key} -b"{value}"', echo=False, capture_output=True)
        if result.returncode != 0:
            click.echo(f"Error setting {key}: {result.stderr}")
            return 1
        click.echo(f"✓ Set {key}")
    
    click.echo("\n✨ Services configured!")
    click.echo("\nNext: Run 't deploy verify' to test the setup")

@deploy.command()
def verify():
    """Verify deployment setup"""
    click.echo("Verifying deployment setup...")
    
    # 1. Check Supabase
    click.echo("\n1. Supabase Status:")
    if run_cmd('supabase status', capture_output=True).returncode != 0:
        click.echo("Error: Supabase status check failed")
        return 1
    
    # 2. Check GitHub Actions
    click.echo("\n2. GitHub Actions Status:")
    if run_cmd('gh run list --limit 1', capture_output=True).returncode != 0:
        click.echo("Error: GitHub Actions check failed")
        return 1
    
    # 3. Check Health Endpoints
    click.echo("\n3. Health Checks:")
    
    # Backend health
    backend_health = run_cmd(
        'curl -s https://tiktoken-api.onrender.com/health',
        echo=False,
        capture_output=True
    )
    if backend_health.returncode == 0:
        click.echo("Backend: ✓ Healthy")
    else:
        click.echo("Backend: ✗ Unhealthy")
    
    # Frontend health
    frontend_health = run_cmd(
        'curl -s -I https://tiktoken-web.onrender.com',
        echo=False,
        capture_output=True
    )
    if frontend_health.returncode == 0:
        click.echo("Frontend: ✓ Accessible")
    else:
        click.echo("Frontend: ✗ Inaccessible")

@deploy.command()
def logs():
    """View deployment logs"""
    click.echo("Fetching logs...")
    
    # 1. Supabase Logs
    click.echo("\n1. Supabase Logs:")
    run_cmd('supabase logs')
    
    # 2. GitHub Actions Logs
    click.echo("\n2. GitHub Actions Logs:")
    run_cmd('gh run view $(gh run list -L 1 --json databaseId --jq ".[0].databaseId")')
    
    # 3. Health Status
    click.echo("\n3. Current Health Status:")
    run_cmd('curl -s https://tiktoken-api.onrender.com/health | jq .')

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