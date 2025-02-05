"""Delete secrets for an environment."""
import sys
import click
from cli.cli.secrets_manager import SecretsManager

@click.command()
@click.option('--env', '-e', required=True,
              help='Environment (dev/staging/prod)')
@click.option('--force', '-f', is_flag=True,
              help='Skip confirmation')
def main(env: str, force: bool):
    """Delete all secrets for an environment."""
    try:
        manager = SecretsManager(env)
        manager.delete_secrets()
        print(f"Successfully deleted secrets for {env} environment")
    except Exception as e:
        print(f"Error deleting secrets: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main() 