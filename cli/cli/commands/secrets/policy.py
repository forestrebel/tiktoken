"""Print the required AWS IAM policy."""
import json
import sys
import typer
from cli.secrets_manager import SecretsManager

def manage_policy():
    """Print the required AWS IAM policy."""
    try:
        policy = SecretsManager.get_required_iam_policy()
        print(json.dumps(policy, indent=2))
    except Exception as e:
        print(f"Error getting IAM policy: {e}", file=sys.stderr)
        sys.exit(1)
 