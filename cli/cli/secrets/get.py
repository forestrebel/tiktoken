"""Get secrets for an environment."""
import json
import sys
import click
from cli.cli.secrets_manager import SecretsManager

@click.command()
@click.option('--env', '-e', required=True,
              help='Environment (dev/staging/prod)')
@click.option('--force', '-f', is_flag=True,
              help='Force refresh from AWS')
def main(env: str, force: bool):
    """Get secrets for an environment."""
    try:
        manager = SecretsManager(env)
        secrets = manager.get_secrets(force_refresh=force)
        print(json.dumps(secrets, indent=2))
    except Exception as e:
        print(f"Error getting secrets: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main() 