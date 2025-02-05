"""Initialize secrets for an environment."""
import json
import sys
import click
from cli.cli.secrets_manager import SecretsManager
from cli.cli.commands.secrets import (
    check_cli_tools,
    generate_default_secrets
)

@click.command()
@click.option('--env', '-e', required=True,
              help='Environment (dev/staging/prod)')
def main(env: str):
    """Initialize secrets for an environment."""
    try:
        # Check available tools
        tools = check_cli_tools()
        print("\nChecking available CLI tools:")
        for tool, available in tools.items():
            status = "✓" if available else "✗"
            print(f"{status} {tool}")
            
        if not tools["aws"]:
            print("\nError: AWS CLI is required and must be configured")
            print("Run 'aws configure' to set up your credentials")
            sys.exit(1)
            
        # Generate default secrets
        secrets_data = generate_default_secrets()
        
        # Show what we found automatically
        print("\nAuto-populated values:")
        if tools["supabase"]:
            if secrets_data["database"]["supabase_url"]:
                print("✓ Supabase configuration")
            else:
                print("✗ Supabase configuration failed")
                
        if tools["vercel"]:
            if secrets_data["frontend"]["vercel_project_id"]:
                print("✓ Vercel configuration")
            else:
                print("✗ Vercel configuration failed")
                
        if tools["sentry-cli"]:
            if secrets_data["monitoring"]["sentry_dsn"]:
                print("✓ Sentry configuration")
            else:
                print("✗ Sentry configuration failed")
                
        if tools["gh"]:
            if secrets_data["frontend"]["github_repo"]:
                print("✓ GitHub configuration")
            else:
                print("✗ GitHub configuration failed")
                
        if tools["aws"]:
            if secrets_data["deployment"]["aws_account_id"]:
                print("✓ AWS configuration")
            else:
                print("✗ AWS configuration failed")
                
        print("✓ Generated secure keys")
        
        # Show what's missing or needs verification
        print("\nVerifying values:")
        if secrets_data["frontend"]["api_url"] != "http://localhost:8000":
            print(f"API URL: {secrets_data['frontend']['api_url']}")
        if secrets_data["frontend"]["ws_url"] != "ws://localhost:8000/ws":
            print(f"WebSocket URL: {secrets_data['frontend']['ws_url']}")
        
        # Update secrets
        manager = SecretsManager(env)
        manager.update_secrets(secrets_data)
        
        print(f"\nSuccessfully initialized secrets for {env} environment")
        print("\nTo view the secrets:")
        print(f"  t secrets get -e {env}")
        print("\nTo update specific values:")
        print("1. Get current secrets: t secrets get -e dev > current-secrets.json")
        print("2. Edit the JSON file")
        print("3. Update: t secrets update -e dev -f current-secrets.json")
        
    except Exception as e:
        print(f"Error initializing secrets: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main() 