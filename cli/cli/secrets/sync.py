"""Sync secrets to a .env file."""
import sys
from pathlib import Path
import click
from cli.cli.secrets_manager import SecretsManager

@click.command()
@click.option('--env', '-e', required=True,
              help='Environment (dev/staging/prod)')
@click.option('--output', '-o', type=click.Path(), default='.env',
              help='Output .env file path')
def main(env: str, output: str):
    """Sync secrets to a .env file."""
    try:
        manager = SecretsManager(env)
        output_path = Path(output)
        manager.sync_env_file(output_path)
        print(f"Successfully synced secrets to {output}")
    except Exception as e:
        print(f"Error syncing secrets: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main() 