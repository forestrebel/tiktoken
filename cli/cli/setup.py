"""Zero-config deployment with automatic setup for TikToken architecture."""
import os
import secrets
import subprocess
import shutil
from pathlib import Path
from typing import Optional, Dict
import typer
from rich.console import Console
from rich.prompt import Prompt, Confirm
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.markdown import Markdown

setup_app = typer.Typer(help="Zero-config deployment setup")
console = Console()

def run_cmd(cmd: str, check: bool = True, shell: bool = False, silent: bool = False) -> subprocess.CompletedProcess:
    """Run a command with proper error handling."""
    try:
        return subprocess.run(
            cmd if shell else cmd.split(),
            check=check,
            capture_output=True,
            text=True,
            shell=shell
        )
    except subprocess.CalledProcessError as e:
        if not silent:
            console.print(f"[red]Error:[/] Command failed: {e.stderr}")
        raise
    except Exception as e:
        if not silent:
            console.print(f"[red]Error:[/] {str(e)}")
        raise

def check_command(cmd: str) -> bool:
    """Check if a command is available."""
    return shutil.which(cmd) is not None

def install_tool(name: str, install_cmd: str) -> bool:
    """Install a CLI tool."""
    try:
        console.print(f"Installing {name}...")
        run_cmd(install_cmd, shell=True)
        return True
    except Exception as e:
        console.print(f"[red]Failed to install {name}:[/] {str(e)}")
        return False

def setup_github(force: bool = False) -> Optional[str]:
    """Set up GitHub access with minimal interaction."""
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}")) as progress:
        task = progress.add_task("Setting up GitHub...", total=None)
        
        # Install gh CLI if needed
        if not check_command("gh"):
            if not install_tool(
                "GitHub CLI",
                """
                curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg &&
                echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null &&
                sudo apt update && sudo apt install gh -y
                """
            ):
                return None

        # Check existing auth
        if not force:
            try:
                token = run_cmd("gh auth token", silent=True).stdout.strip()
                if token:
                    progress.update(task, description="[green]✓[/] GitHub already authenticated")
                    return token
            except:
                pass

        # Perform auth
        try:
            progress.update(task, description="Authenticating with GitHub...")
            run_cmd("gh auth login --git-protocol https --web")
            token = run_cmd("gh auth token").stdout.strip()
            
            # Enable packages
            progress.update(task, description="Enabling GitHub Container Registry...")
            run_cmd("gh repo edit --enable-packages")
            
            progress.update(task, description="[green]✓[/] GitHub setup complete")
            return token
        except Exception as e:
            progress.update(task, description=f"[red]✗[/] GitHub setup failed: {str(e)}")
            return None

def setup_digitalocean():
    """Set up Digital Ocean App Platform deployment."""
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}")) as progress:
        task = progress.add_task("Setting up Digital Ocean...", total=None)
        
        # Create DO app spec
        app_spec = """name: tiktoken-api
region: sfo
services:
- name: api
  github:
    repo: ${{ github.repository }}
    branch: main
    deploy_on_push: true
  source_dir: backend
  dockerfile_path: Dockerfile
  http_port: 8000
  instance_count: 1
  instance_size_slug: basic-xxs
  routes:
  - path: /
  envs:
  - key: SUPABASE_URL
    scope: RUN_TIME
    value: ${SUPABASE_URL}
  - key: SUPABASE_KEY  
    scope: RUN_TIME
    value: ${SUPABASE_KEY}
  - key: JWT_SECRET
    scope: RUN_TIME
    value: ${JWT_SECRET}
  health_check:
    http_path: /health
"""
        
        try:
            do_dir = Path(".do")
            do_dir.mkdir(exist_ok=True)
            (do_dir / "app.yaml").write_text(app_spec)
            
            # Install doctl if needed
            if not check_command("doctl"):
                if not install_tool(
                    "doctl",
                    "curl -sL https://github.com/digitalocean/doctl/releases/latest/download/doctl-1.101.0-linux-amd64.tar.gz | tar xz && sudo mv doctl /usr/local/bin"
                ):
                    return None

            # Get DO token
            progress.update(task, description="Configuring Digital Ocean access...")
            token = Prompt.ask(
                "Enter Digital Ocean API token\nCreate one at https://cloud.digitalocean.com/account/api/tokens"
            )
            run_cmd(f"doctl auth init -t {token}")
            
            progress.update(task, description="[green]✓[/] Digital Ocean configured")
            return token
        except Exception as e:
            progress.update(task, description=f"[red]✗[/] Digital Ocean setup failed: {str(e)}")
            return None

def setup_vercel():
    """Set up Vercel deployment for frontend."""
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}")) as progress:
        task = progress.add_task("Setting up Vercel...", total=None)
        
        try:
            # Create Vercel config
            vercel_config = """{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "build" }
    }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "/frontend/$1" }
  ],
  "env": {
    "REACT_APP_API_URL": "${DO_API_URL}",
    "REACT_APP_SUPABASE_URL": "${SUPABASE_URL}",
    "REACT_APP_SUPABASE_ANON_KEY": "${SUPABASE_KEY}"
  }
}"""
            
            Path("vercel.json").write_text(vercel_config)
            
            # Install Vercel CLI if needed
            if not check_command("vercel"):
                if not install_tool("Vercel CLI", "npm install -g vercel"):
                    return None
            
            # Get Vercel token
            token = Prompt.ask(
                "Enter Vercel deploy token\nCreate one at https://vercel.com/account/tokens"
            )
            
            progress.update(task, description="[green]✓[/] Vercel configured")
            return token
        except Exception as e:
            progress.update(task, description=f"[red]✗[/] Vercel setup failed: {str(e)}")
            return None

def setup_supabase():
    """Set up Supabase project."""
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}")) as progress:
        task = progress.add_task("Setting up Supabase...", total=None)
        
        try:
            # Create Supabase config directory
            supabase_dir = Path("supabase")
            supabase_dir.mkdir(exist_ok=True)
            
            # Create migrations directory
            migrations_dir = supabase_dir / "migrations"
            migrations_dir.mkdir(exist_ok=True)
            
            # Create initial migration
            migration = """-- Create initial schema
CREATE TABLE IF NOT EXISTS health (
    id SERIAL PRIMARY KEY,
    status TEXT NOT NULL,
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON health FOR SELECT USING (true);
"""
            
            migration_file = migrations_dir / "20240204000000_create_health_table.sql"
            migration_file.write_text(migration)
            
            # Get Supabase credentials
            progress.update(task, description="Configuring Supabase access...")
            url = Prompt.ask("Enter Supabase project URL")
            key = Prompt.ask("Enter Supabase service role key")
            
            # Test connection
            run_cmd(f"curl -s {url}/rest/v1/health?select=status", env={
                "SUPABASE_KEY": key,
                "Authorization": f"Bearer {key}"
            })
            
            progress.update(task, description="[green]✓[/] Supabase configured")
            return {"url": url, "key": key}
        except Exception as e:
            progress.update(task, description=f"[red]✗[/] Supabase setup failed: {str(e)}")
            return None

def setup_github_actions():
    """Set up GitHub Actions workflows."""
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}")) as progress:
        task = progress.add_task("Setting up GitHub Actions...", total=None)
        
        workflows_dir = Path(".github/workflows")
        workflows_dir.mkdir(parents=True, exist_ok=True)
        
        # Create CI workflow with integration tests
        ci_workflow = """name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      # Local Supabase for testing
      db:
        image: supabase/postgres:15.1.0.117
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 54322:5432
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'
          
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install pipenv
          pipenv install --dev
          
      - name: Run tests
        run: pipenv run pytest
        env:
          SUPABASE_URL: http://localhost:54322
          SUPABASE_KEY: postgres
          
      - name: Run integration tests
        run: pipenv run pytest tests/integration
        env:
          SUPABASE_URL: http://localhost:54322
          SUPABASE_KEY: postgres
          DO_API_URL: ${{ secrets.DO_API_URL }}
          VERCEL_URL: ${{ secrets.VERCEL_URL }}
"""
        
        # Create deployment workflow for each component
        deploy_workflow = """name: Deploy
on:
  push:
    branches: [main]
    
jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install doctl
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DO_API_TOKEN }}
          
      - name: Build container
        run: docker build -t registry.digitalocean.com/${{ secrets.DO_REGISTRY }}/tiktoken-api:${GITHUB_SHA::7} backend/
          
      - name: Push to DO Registry
        run: |
          doctl registry login
          docker push registry.digitalocean.com/${{ secrets.DO_REGISTRY }}/tiktoken-api:${GITHUB_SHA::7}
          
      - name: Update deployment
        run: |
          doctl apps update ${{ secrets.DO_APP_ID }} --spec .do/app.yaml --access-token ${{ secrets.DO_API_TOKEN }}
          
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend
          
  verify-deployment:
    needs: [deploy-backend, deploy-frontend]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'
          
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install pipenv
          pipenv install --dev
          
      - name: Verify deployment
        run: pipenv run python -m cli.cli verify deployment
        env:
          DO_API_URL: ${{ secrets.DO_API_URL }}
          VERCEL_URL: ${{ secrets.VERCEL_URL }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
"""

        try:
            (workflows_dir / "ci.yml").write_text(ci_workflow)
            (workflows_dir / "deploy.yml").write_text(deploy_workflow)
            progress.update(task, description="[green]✓[/] GitHub Actions workflows created")
        except Exception as e:
            progress.update(task, description=f"[red]✗[/] Failed to create workflows: {str(e)}")
            raise

def verify_setup(show_values: bool = False):
    """Verify deployment configuration."""
    console.print("\n[bold]Verifying setup...[/]")
    
    # Check tools
    tools = {
        "gh": "GitHub CLI",
        "docker": "Docker",
        "doctl": "Digital Ocean CLI",
        "aws": "AWS CLI"
    }
    
    console.print("\n[bold]Required Tools:[/]")
    for cmd, name in tools.items():
        if check_command(cmd):
            console.print(f"[green]✓[/] {name} installed")
        else:
            console.print(f"[red]✗[/] {name} missing")
    
    # Check authentication
    console.print("\n[bold]Authentication Status:[/]")
    
    auth_checks = {
        "GitHub": lambda: run_cmd("gh auth status", silent=True),
        "Digital Ocean": lambda: run_cmd("doctl account get", silent=True),
        "AWS": lambda: run_cmd("aws sts get-caller-identity", silent=True)
    }
    
    for name, check in auth_checks.items():
        try:
            check()
            console.print(f"[green]✓[/] {name} authenticated")
        except:
            console.print(f"[red]✗[/] {name} not authenticated")
    
    # Check environment file
    console.print("\n[bold]Environment Configuration:[/]")
    env_file = Path(".env.production")
    
    if not env_file.exists():
        console.print("[red]✗[/] Missing .env.production")
        return
    
    # Check required variables
    required_vars = [
        "GITHUB_TOKEN",
        "GITHUB_USER",
        "DO_API_TOKEN",
        "AWS_AI_KEY",
        "JWT_SECRET"
    ]
    
    env_content = env_file.read_text()
    for var in required_vars:
        value = None
        for line in env_content.splitlines():
            if line.startswith(f"{var}="):
                value = line.split("=", 1)[1]
                break
        
        if not value or value in ["your-github-token", "your-key-here", "your-do-token"]:
            console.print(f"[red]✗[/] {var} not configured")
        else:
            if show_values:
                console.print(f"[green]✓[/] {var}={value}")
            else:
                console.print(f"[green]✓[/] {var} configured")

@setup_app.command()
def auto(
    force: bool = typer.Option(False, "--force", "-f", help="Force reinitialization")
):
    """Auto-setup everything with zero configuration needed."""
    if Path(".env.production").exists() and not force:
        if not Confirm.ask("Production environment already exists. Reinitialize?"):
            raise typer.Exit(0)
    
    # Track setup progress
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}")) as progress:
        task = progress.add_task("Setting up deployment...", total=None)
        
        try:
            # 1. Set up GitHub (required for CI/CD)
            gh_token = setup_github(force=force)
            if not gh_token:
                raise Exception("GitHub setup failed")
            
            # 2. Set up deployment infrastructure
            setup_github_actions()
            
            # 3. Set up cloud services
            do_token = setup_digitalocean()
            if not do_token:
                raise Exception("Digital Ocean setup failed")
                
            vercel_token = setup_vercel()
            if not vercel_token:
                raise Exception("Vercel setup failed")
                
            supabase_creds = setup_supabase()
            if not supabase_creds:
                raise Exception("Supabase setup failed")
            
            # 4. Generate environment file
            env_vars = {
                "GITHUB_TOKEN": gh_token,
                "DO_API_TOKEN": do_token,
                "VERCEL_TOKEN": vercel_token,
                "SUPABASE_URL": supabase_creds["url"],
                "SUPABASE_KEY": supabase_creds["key"],
                "JWT_SECRET": secrets.token_hex(32),
                "CORS_ORIGINS": f"{supabase_creds['url']},https://tiktoken.ai",
                "APP_NAME": "TikToken API",
                "APP_VERSION": "0.1.0"
            }
            
            env_content = """# Production Environment Configuration
# Auto-generated - DO NOT EDIT

# Database (Supabase)
SUPABASE_URL={SUPABASE_URL}
SUPABASE_KEY={SUPABASE_KEY}

# Core API (Digital Ocean)
DO_API_TOKEN={DO_API_TOKEN}

# Frontend (Vercel)
VERCEL_TOKEN={VERCEL_TOKEN}

# GitHub
GITHUB_TOKEN={GITHUB_TOKEN}

# Security
JWT_SECRET={JWT_SECRET}
CORS_ORIGINS={CORS_ORIGINS}

# Application
APP_NAME={APP_NAME}
APP_VERSION={APP_VERSION}
""".format(**env_vars)

            with open(".env.production", "w") as f:
                f.write(env_content)
            
            # Show success message
            progress.update(task, description="[green]✓[/] Deployment setup complete")
            
            # Show next steps
            console.print("\n[bold]Next Steps:[/]")
            console.print(Markdown("""
1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Initial setup"
   git push
   ```

2. Add secrets to GitHub:
   - Go to Settings > Secrets
   - Add all variables from .env.production

3. Verify deployment:
   ```bash
   t setup verify
   ```
"""))
            
        except Exception as e:
            progress.update(task, description=f"[red]✗[/] Setup failed: {str(e)}")
            raise

@setup_app.command()
def verify(
    show_values: bool = typer.Option(False, "--show-values", help="Show actual values instead of just status")
):
    """Verify deployment configuration."""
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}")) as progress:
        # Check each component
        components = {
            "Backend (DO)": lambda: run_cmd("curl -sf $DO_API_URL/health"),
            "Frontend (Vercel)": lambda: run_cmd("curl -sf $VERCEL_URL/health"),
            "Database (Supabase)": lambda: run_cmd("curl -sf $SUPABASE_URL/rest/v1/health?select=status", env={
                "Authorization": f"Bearer ${SUPABASE_KEY}"
            })
        }
        
        for name, check in components.items():
            task = progress.add_task(f"Checking {name}...", total=None)
            try:
                check()
                progress.update(task, description=f"[green]✓[/] {name} healthy")
            except:
                progress.update(task, description=f"[red]✗[/] {name} not healthy")
    
    # Run existing verification
    verify_setup(show_values) 