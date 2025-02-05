"""Sync secrets to a .env file."""
import sys
from pathlib import Path
import typer
from cli.secrets_manager import SecretsManager

def sync_secrets(
    env: str = typer.Option(..., '--env', '-e', help='Environment (dev/staging/prod)', prompt=True),
    output: str = typer.Option('.env', '--output', '-o', help='Output .env file path')
):
    """Sync secrets to a .env file."""
    try:
        manager = SecretsManager(env)
        output_path = Path(output)
        manager.sync_env_file(output_path)
        print(f"Successfully synced secrets to {output}")
    except Exception as e:
        print(f"Error syncing secrets: {e}", file=sys.stderr)
        sys.exit(1)
 