"""AWS Secrets Manager integration with local caching and environment support."""
import json
import os
import time
from pathlib import Path
from typing import Dict, Optional, Any
import boto3
import boto3.session
from botocore.exceptions import ClientError, ProfileNotFound
import click
from functools import lru_cache
import hashlib

class SecretsManager:
    """Manages secrets across environments with local caching."""
    
    def __init__(self, environment: str = "dev"):
        """Initialize the secrets manager for a specific environment."""
        self.environment = environment
        self.cache_dir = Path.home() / ".cache" / "t-cli" / "secrets"
        self.cache_file = self.cache_dir / f"{environment}.json"
        self.cache_hash_file = self.cache_dir / f"{environment}.hash"
        self.secret_name = f"t-cli/{environment}/secrets"
        self.cache_ttl = 3600  # 1 hour cache TTL
        
        # Ensure cache directory exists
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
    @lru_cache(maxsize=1)
    def _get_aws_client(self):
        """Get AWS Secrets Manager client with automatic credential discovery."""
        try:
            # First try default credentials (AWS CLI/IAM Role)
            session = boto3.Session()
            if session.get_credentials() is not None:
                return session.client('secretsmanager')
                
            # Try AWS SSO session if available
            profiles = boto3.Session().available_profiles
            if 'default' in profiles:
                try:
                    sso_session = boto3.Session(profile_name='default')
                    return sso_session.client('secretsmanager')
                except ProfileNotFound:
                    pass
                    
            # If we get here, no valid credentials were found
            click.echo("[red]Error: No AWS credentials found.[/]", err=True)
            click.echo("Please either:")
            click.echo("1. Configure AWS CLI credentials (aws configure)")
            click.echo("2. Set up AWS SSO (aws sso configure)")
            click.echo("3. Run on an EC2 instance with an IAM role")
            raise click.Abort()
            
        except Exception as e:
            click.echo(f"[red]Error getting AWS credentials: {str(e)}[/]", err=True)
            raise click.Abort()
    
    def _get_cache_hash(self) -> Optional[str]:
        """Get the cached secrets hash if it exists."""
        if self.cache_hash_file.exists():
            return self.cache_hash_file.read_text().strip()
        return None
        
    def _save_cache_hash(self, secrets: Dict[str, Any]):
        """Save hash of secrets to detect changes."""
        secrets_hash = hashlib.sha256(
            json.dumps(secrets, sort_keys=True).encode()
        ).hexdigest()
        self.cache_hash_file.write_text(secrets_hash)
        
    def _load_cache(self) -> Optional[Dict[str, Any]]:
        """Load secrets from local cache if valid."""
        if not self.cache_file.exists():
            return None
            
        cache_age = time.time() - self.cache_file.stat().st_mtime
        if cache_age > self.cache_ttl:
            return None
            
        try:
            return json.loads(self.cache_file.read_text())
        except (json.JSONDecodeError, OSError):
            return None
            
    def _save_cache(self, secrets: Dict[str, Any]):
        """Save secrets to local cache."""
        try:
            self.cache_file.write_text(json.dumps(secrets, indent=2))
            self._save_cache_hash(secrets)
        except OSError as e:
            click.echo(f"Warning: Failed to cache secrets: {e}", err=True)
            
    def get_secrets(self, force_refresh: bool = False) -> Dict[str, Any]:
        """Get secrets, using cache unless forced refresh."""
        if not force_refresh:
            cached = self._load_cache()
            if cached:
                return cached
                
        try:
            client = self._get_aws_client()
            response = client.get_secret_value(SecretId=self.secret_name)
            secrets = json.loads(response['SecretString'])
            self._save_cache(secrets)
            return secrets
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceNotFoundException':
                click.echo(f"No secrets found for environment: {self.environment}")
                return {}
            raise
            
    def update_secrets(self, secrets: Dict[str, Any]):
        """Update secrets in AWS and local cache."""
        client = self._get_aws_client()
        
        try:
            client.get_secret_value(SecretId=self.secret_name)
            # Secret exists, update it
            client.update_secret(
                SecretId=self.secret_name,
                SecretString=json.dumps(secrets)
            )
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceNotFoundException':
                # Create new secret
                client.create_secret(
                    Name=self.secret_name,
                    SecretString=json.dumps(secrets),
                    Tags=[
                        {'Key': 'Environment', 'Value': self.environment},
                        {'Key': 'ManagedBy', 'Value': 't-cli'}
                    ]
                )
            else:
                raise
                
        self._save_cache(secrets)
        
    def delete_secrets(self):
        """Delete secrets from AWS and local cache."""
        try:
            client = self._get_aws_client()
            client.delete_secret(
                SecretId=self.secret_name,
                ForceDeleteWithoutRecovery=True
            )
        except ClientError as e:
            if e.response['Error']['Code'] != 'ResourceNotFoundException':
                raise
                
        # Clean up local cache
        if self.cache_file.exists():
            self.cache_file.unlink()
        if self.cache_hash_file.exists():
            self.cache_hash_file.unlink()
            
    def sync_env_file(self, env_file: Path):
        """Sync secrets with a .env file."""
        secrets = self.get_secrets()
        
        # Create or update .env file
        env_content = "\n".join(f"{k}={v}" for k, v in secrets.items())
        env_file.write_text(env_content + "\n")
        
    @staticmethod
    def get_required_iam_policy() -> Dict[str, Any]:
        """Get the required IAM policy for secrets management."""
        return {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "secretsmanager:GetSecretValue",
                        "secretsmanager:CreateSecret",
                        "secretsmanager:UpdateSecret",
                        "secretsmanager:DeleteSecret",
                        "secretsmanager:TagResource"
                    ],
                    "Resource": [
                        "arn:aws:secretsmanager:*:*:secret:t-cli/*"
                    ]
                }
            ]
        } 