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

def find_project_root() -> Path:
    """Find the project root by looking for docker-compose.yml"""
    current = Path.cwd()
    while current != current.parent:
        if (current / "docker-compose.yml").exists():
            return current
        current = current.parent
    raise click.ClickException(
        "Could not find project root. Are you in the TikToken project directory?"
    )

# Ensure we're in the project root
PROJECT_ROOT = find_project_root()
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

@cli.group()
def dev():
    """Development environment commands"""
    pass

@dev.command()
@click.option('--parallel', '-p', is_flag=True, help='Build images in parallel', default=True)
@click.option('--no-cache', is_flag=True, help='Build without using cache')
def build(parallel, no_cache):
    """Build development images with caching optimizations"""
    click.echo("Building development images...")
    cmd = "docker compose build"
    
    if parallel:
        cmd += " --parallel"
    if no_cache:
        cmd += " --no-cache"
        
    return run_cmd(cmd)

@dev.command()
@click.option('--detach', '-d', is_flag=True, help='Run in background')
def up(detach):
    """Start development environment using cached images"""
    click.echo("Starting development environment...")
    cmd = "docker compose up"
    if detach:
        cmd += " -d"
    return run_cmd(cmd)

@dev.command()
def watch():
    """Start development with live reload using volume mounts"""
    click.echo("Starting development environment with live reload...")
    
    # Override the compose file to use volume mounts
    os.environ['COMPOSE_FILE'] = 'docker-compose.yml:docker-compose.dev.yml'
    
    return run_cmd("docker compose up")

@dev.command()
def clean():
    """Clean development environment"""
    click.echo("Cleaning development environment...")
    cmds = [
        "docker compose down -v",  # Remove containers and volumes
        "docker compose rm -f",    # Remove any lingering containers
        "docker system prune -f"   # Clean up unused resources
    ]
    
    for cmd in cmds:
        if run_cmd(cmd) != 0:
            return 1
    
    click.echo("\n✨ Development environment cleaned!")
    click.echo("\nNext steps:")
    click.echo("1. Run 't dev build' to rebuild images")
    click.echo("2. Run 't dev up' to start environment")

@dev.command()
def status():
    """Check development environment status"""
    click.echo("Checking development status...")
    
    # Check container status
    click.echo("\n🐳 Containers:")
    run_cmd("docker compose ps")
    
    # Check health endpoints
    click.echo("\n🏥 Health Checks:")
    services = {
        'Core API': 'http://localhost:8080/health',
        'AI Service': 'http://localhost:8081/health',
        'Frontend': 'http://localhost:3000/health'
    }
    
    for service, url in services.items():
        result = run_cmd(f'curl -s {url}', echo=False, capture_output=True)
        status = '✅ Healthy' if result.returncode == 0 else '❌ Unhealthy'
        click.echo(f"{service}: {status}")
    
    # Show resource usage
    click.echo("\n📊 Resource Usage:")
    run_cmd("docker stats --no-stream")

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

@cli.group()
def check():
    """Validation commands"""
    pass

@check.command()
def local():
    """Quick local integration check"""
    click.echo("Running local integration check...")
    
    # 1. Check if services are running
    click.echo("\n1. Checking services...")
    services = run_cmd("docker compose ps --format json", capture_output=True)
    if services.returncode != 0:
        click.echo("Error: Could not check service status")
        return 1
    
    try:
        running_services = [
            svc for svc in json.loads(f"[{services.stdout.strip().replace('}\n{', '},{')}]")
            if svc.get("State") == "running"
        ]
        if not running_services:
            click.echo("Error: No services are running")
            click.echo("Run 't dev up' to start services")
            return 1
    except json.JSONDecodeError:
        click.echo("Error: Could not parse service status")
        return 1
    
    # 2. Health checks
    click.echo("\n2. Running health checks...")
    health_checks = {
        "Core API": "http://localhost:8080/health",
        "AI Service": "http://localhost:8081/health",
        "Frontend": "http://localhost:3000"
    }
    
    for service, url in health_checks.items():
        result = run_cmd(f"curl -s {url}", capture_output=True)
        if result.returncode == 0:
            click.echo(f"✓ {service}: Healthy")
        else:
            click.echo(f"✗ {service}: Unhealthy")
            return 1
    
    # 3. Basic data flow test
    click.echo("\n3. Testing basic data flow...")
    test_data = {"text": "Hello, world!"}
    max_retries = 3
    
    for attempt in range(max_retries):
        flow_test = run_cmd(
            f'curl -s -X POST -H "Content-Type: application/json" '
            f'-d \'{json.dumps(test_data)}\' '
            f'http://localhost:8080/api/v1/tokenize',
            capture_output=True
        )
        
        if flow_test.returncode == 0:
            try:
                response = json.loads(flow_test.stdout)
                if "tokens" in response and "token_count" in response:
                    click.echo("✓ Data flow test passed")
                    break
                else:
                    click.echo("✗ Data flow test failed: Invalid response format")
            except json.JSONDecodeError:
                click.echo("✗ Data flow test failed: Invalid JSON response")
        else:
            click.echo("✗ Data flow test failed: Could not reach API")
        
        if attempt < max_retries - 1:
            click.echo(f"Retrying... (attempt {attempt + 2}/{max_retries})")
        else:
            return 1
    
    click.echo("\n✨ Local integration check passed!")
    return 0

@check.command()
def cloud():
    """Validate cloud-specific configurations"""
    click.echo("Validating cloud configurations...")
    
    # 1. Check required environment variables
    click.echo("\n1. Checking environment variables...")
    required_vars = {
        'RENDER_API_KEY': 'Render deployment',
        'RENDER_SERVICE_ID': 'Render service',
        'SUPABASE_URL': 'Supabase connection',
        'SUPABASE_ANON_KEY': 'Supabase authentication'
    }
    
    missing_vars = []
    for var, purpose in required_vars.items():
        if not os.getenv(var):
            missing_vars.append(f"✗ {var} ({purpose})")
    
    if missing_vars:
        click.echo("Missing required environment variables:")
        for var in missing_vars:
            click.echo(var)
        return 1
    else:
        click.echo("✓ All required environment variables are set")
    
    # 2. Validate cloud service configurations
    click.echo("\n2. Validating service configurations...")
    
    # Check Supabase connection
    supabase_test = run_cmd(
        'curl -s -I -H "apikey: $SUPABASE_ANON_KEY" "$SUPABASE_URL/rest/v1/"',
        capture_output=True
    )
    if supabase_test.returncode == 0:
        click.echo("✓ Supabase connection verified")
    else:
        click.echo("✗ Could not connect to Supabase")
        return 1
    
    # Check Render API access
    render_test = run_cmd(
        'curl -s -H "Authorization: Bearer $RENDER_API_KEY" '
        'https://api.render.com/v1/services/$RENDER_SERVICE_ID',
        capture_output=True
    )
    if render_test.returncode == 0:
        click.echo("✓ Render API access verified")
    else:
        click.echo("✗ Could not access Render API")
        return 1
    
    # 3. Check deployment configurations
    click.echo("\n3. Checking deployment configurations...")
    required_files = {
        '.github/workflows/deploy.yml': 'GitHub Actions workflow',
        'render.yaml': 'Render blueprint',
        'supabase/config.toml': 'Supabase configuration'
    }
    
    for file_path, purpose in required_files.items():
        if (PROJECT_ROOT / file_path).exists():
            click.echo(f"✓ Found {purpose}")
        else:
            click.echo(f"✗ Missing {purpose} at {file_path}")
            return 1
    
    click.echo("\n✨ Cloud configuration validation passed!")
    return 0

if __name__ == "__main__":
    sys.exit(cli()) 