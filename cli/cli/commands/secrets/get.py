"""Get secrets for an environment."""
import json
import sys
import typer
from cli.secrets_manager import SecretsManager

def get_secret(
    env: str = typer.Option(..., '--env', '-e', help='Environment (dev/staging/prod)', prompt=True),
    force: bool = typer.Option(False, '--force', '-f', help='Force refresh from AWS')
):
    """Get secrets for an environment."""
    try:
        manager = SecretsManager(env)
        secrets = manager.get_secrets(force_refresh=force)
        print(json.dumps(secrets, indent=2))
    except Exception as e:
        print(f"Error getting secrets: {e}", file=sys.stderr)
        sys.exit(1)
 