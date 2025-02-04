"""Environment validation commands."""
import os
from enum import Enum
from typing import Dict, List, Optional

import click
from rich.console import Console
from rich.table import Table

# Create the command group
app = click.Group(name="env", help="Environment validation commands")

class Environment(str, Enum):
    """Environment types."""
    DEV = "dev"
    STAGING = "staging"
    PROD = "prod"

def validate_docker_setup() -> bool:
    """Check if Docker services are running."""
    try:
        result = os.system("docker info > /dev/null 2>&1")
        return result == 0
    except Exception:
        return False

def validate_env_vars(env: Environment) -> Dict[str, bool]:
    """Validate required environment variables for each environment."""
    required_vars = {
        Environment.DEV: ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
        Environment.STAGING: ["SUPABASE_URL", "SUPABASE_ANON_KEY", "RENDER_API_KEY"],
        Environment.PROD: ["SUPABASE_URL", "SUPABASE_ANON_KEY", "RENDER_API_KEY", "RENDER_SERVICE_ID"]
    }
    
    results = {}
    for var in required_vars[env]:
        results[var] = os.getenv(var) is not None
    return results

def validate_cloud_access(env: Environment) -> bool:
    """Check access to cloud services based on environment."""
    if env == Environment.DEV:
        return True  # No cloud access needed for dev
    
    try:
        # Check Render API access
        if os.getenv("RENDER_API_KEY"):
            result = os.system("curl -s -H 'Authorization: Bearer $RENDER_API_KEY' https://api.render.com/v1/services > /dev/null")
            return result == 0
    except Exception:
        return False
    return False

def validate_infrastructure(env: Environment) -> bool:
    """Validate presence of required configuration files."""
    if env == Environment.DEV:
        return os.path.exists("docker-compose.yml")
    
    # For staging and production
    required_files = [
        "docker-compose.yml",
        "docker-compose.prod.yml",
        ".github/workflows/deploy.yml"
    ]
    return all(os.path.exists(f) for f in required_files)

@app.command()
@click.argument("environment", type=click.Choice([e.value for e in Environment]))
def check(environment: str):
    """Validate environment configuration."""
    console = Console()
    env = Environment(environment)
    
    table = Table(title=f"Environment Check: {env.value.upper()}")
    table.add_column("Check", style="cyan")
    table.add_column("Status", style="green")
    
    # Docker setup
    docker_status = validate_docker_setup()
    table.add_row("Docker Setup", "✓" if docker_status else "✗")
    
    # Environment variables
    env_vars = validate_env_vars(env)
    for var, exists in env_vars.items():
        table.add_row(f"ENV: {var}", "✓" if exists else "✗")
    
    # Cloud access
    cloud_status = validate_cloud_access(env)
    table.add_row("Cloud Access", "✓" if cloud_status else "✗")
    
    # Infrastructure
    infra_status = validate_infrastructure(env)
    table.add_row("Infrastructure", "✓" if infra_status else "✗")
    
    console.print(table)
