"""Update secrets for an environment."""
import json
import sys
import typer
from cli.secrets_manager import SecretsManager

def update_secret(
    env: str = typer.Option(..., '--env', '-e', help='Environment (dev/staging/prod)', prompt=True),
    file: str = typer.Option(..., '--file', '-f', help='JSON file containing secrets', exists=True)
):
    """Update secrets from a JSON file."""
    try:
        with open(file) as f:
            new_secrets = json.load(f)
            
        manager = SecretsManager(env)
        manager.update_secrets(new_secrets)
        print(f"Successfully updated secrets for {env} environment")
    except Exception as e:
        print(f"Error updating secrets: {e}", file=sys.stderr)
        sys.exit(1)
 