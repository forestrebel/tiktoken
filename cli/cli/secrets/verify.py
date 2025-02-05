"""Verify AWS credentials and secrets manager access."""
import json
import sys
import boto3
from botocore.exceptions import ClientError
from cli.cli.secrets_manager import SecretsManager

def main():
    """Verify AWS credentials and secrets manager access."""
    try:
        # Check AWS credentials
        session = boto3.Session()
        credentials = session.get_credentials()
        
        if credentials is None:
            print("Error: No AWS credentials found")
            print("\nTo set up credentials, either:")
            print("1. Run 'aws configure'")
            print("2. Set up AWS SSO with 'aws sso configure'")
            print("3. Run on an EC2 instance with an IAM role")
            sys.exit(1)
            
        # Test Secrets Manager access
        manager = SecretsManager()
        client = manager._get_aws_client()
        
        # Try to list secrets to verify access
        try:
            client.list_secrets(MaxResults=1)
            print("✓ AWS credentials verified")
            print("✓ Secrets Manager access confirmed")
            
            # Show current credentials source
            cred_source = "Unknown"
            if credentials.method == "shared-credentials-file":
                cred_source = "AWS CLI credentials file"
            elif credentials.method == "iam-role":
                cred_source = "IAM Role"
            elif credentials.method == "sso":
                cred_source = "AWS SSO"
                
            print(f"\nUsing credentials from: {cred_source}")
            
        except ClientError as e:
            if "AccessDeniedException" in str(e):
                print("Error: Insufficient permissions")
                print("\nRequired permissions:")
                policy = SecretsManager.get_required_iam_policy()
                print(json.dumps(policy, indent=2))
            else:
                print(f"Error accessing Secrets Manager: {str(e)}")
                sys.exit(1)
                
    except Exception as e:
        print(f"Error verifying setup: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main() 