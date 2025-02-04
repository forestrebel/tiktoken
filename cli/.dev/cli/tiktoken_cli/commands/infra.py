"""Infrastructure validation commands."""
import os
import subprocess
from typing import Dict, List, Optional

import click
from rich.console import Console
from rich.table import Table

# Create the command group
app = click.Group(name="infra", help="Infrastructure validation commands")

def check_docker_compose() -> Dict[str, bool]:
    """Check Docker Compose configuration."""
    checks = {
        "docker-compose.yml": os.path.exists("docker-compose.yml"),
        "docker-compose.dev.yml": os.path.exists("docker-compose.dev.yml"),
        "docker-compose.prod.yml": os.path.exists("docker-compose.prod.yml")
    }
    return checks

def check_github_actions() -> Dict[str, bool]:
    """Check GitHub Actions configuration."""
    workflow_dir = ".github/workflows"
    checks = {
        "workflows_dir": os.path.exists(workflow_dir),
        "deploy.yml": os.path.exists(f"{workflow_dir}/deploy.yml"),
        "test.yml": os.path.exists(f"{workflow_dir}/test.yml")
    }
    return checks

def check_cloud_services() -> Dict[str, bool]:
    """Check cloud service configurations."""
    checks = {
        "supabase": os.path.exists("supabase/config.toml"),
        "render": os.path.exists("render.yaml")
    }
    return checks

def check_dependencies() -> Dict[str, bool]:
    """Check project dependencies."""
    checks = {
        "Pipfile": os.path.exists("Pipfile"),
        "Pipfile.lock": os.path.exists("Pipfile.lock"),
        "requirements.txt": os.path.exists("requirements.txt")
    }
    return checks

@app.command()
def validate():
    """Validate infrastructure configuration."""
    console = Console()
    
    table = Table(title="Infrastructure Validation")
    table.add_column("Component", style="cyan")
    table.add_column("Check", style="blue")
    table.add_column("Status", style="green")
    
    # Docker Compose
    docker_checks = check_docker_compose()
    for check, status in docker_checks.items():
        table.add_row("Docker Compose", check, "✓" if status else "✗")
    
    # GitHub Actions
    github_checks = check_github_actions()
    for check, status in github_checks.items():
        table.add_row("GitHub Actions", check, "✓" if status else "✗")
    
    # Cloud Services
    cloud_checks = check_cloud_services()
    for check, status in cloud_checks.items():
        table.add_row("Cloud Services", check, "✓" if status else "✗")
    
    # Dependencies
    dep_checks = check_dependencies()
    for check, status in dep_checks.items():
        table.add_row("Dependencies", check, "✓" if status else "✗")
    
    console.print(table)

@app.command()
def init():
    """Initialize infrastructure configuration."""
    console = Console()
    
    # Create directories
    os.makedirs(".github/workflows", exist_ok=True)
    os.makedirs("supabase", exist_ok=True)
    
    # Create basic configuration files
    if not os.path.exists("docker-compose.yml"):
        with open("docker-compose.yml", "w") as f:
            f.write("""version: '3.8'
services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - SUPABASE_URL
      - SUPABASE_ANON_KEY
""")
    
    if not os.path.exists(".github/workflows/deploy.yml"):
        with open(".github/workflows/deploy.yml", "w") as f:
            f.write("""name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Render
        env:
          RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}
        run: |
          curl -X POST "https://api.render.com/v1/services/${{ secrets.RENDER_SERVICE_ID }}/deploys"
""")
    
    if not os.path.exists("supabase/config.toml"):
        with open("supabase/config.toml", "w") as f:
            f.write("""# Supabase configuration
project_id = ""
endpoint = ""
""")
    
    console.print("✨ Infrastructure initialized!")
    console.print("\nNext steps:")
    console.print("1. Update Supabase configuration in supabase/config.toml")
    console.print("2. Set up GitHub Actions secrets (RENDER_API_KEY, RENDER_SERVICE_ID)")
    console.print("3. Run 't infra validate' to check the setup")
