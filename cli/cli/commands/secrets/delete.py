"""Delete secrets for an environment."""
import sys
import typer
from cli.secrets_manager import SecretsManager

def delete_secret(
    env: str = typer.Option(..., '--env', '-e', help='Environment (dev/staging/prod)', prompt=True),
    force: bool = typer.Option(False, '--force', '-f', help='Skip confirmation')
):
    """Delete all secrets for an environment."""
    try:
        manager = SecretsManager(env)
        manager.delete_secrets()
        print(f"Successfully deleted secrets for {env} environment")
    except Exception as e:
        print(f"Error deleting secrets: {e}", file=sys.stderr)
        sys.exit(1)
 