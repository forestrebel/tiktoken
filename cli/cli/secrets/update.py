"""Update secrets for an environment."""
import json
import sys
import click
from cli.cli.secrets_manager import SecretsManager

@click.command()
@click.option('--env', '-e', required=True,
              help='Environment (dev/staging/prod)')
@click.option('--file', '-f', required=True,
              type=click.Path(exists=True),
              help='JSON file containing secrets')
def main(env: str, file: str):
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

if __name__ == '__main__':
    main() 