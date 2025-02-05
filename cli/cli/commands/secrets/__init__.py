"""Secrets management commands package."""

import typer
from cli.commands.secrets.init import init_secrets
from cli.commands.secrets.get import get_secret
from cli.commands.secrets.update import update_secret
from cli.commands.secrets.delete import delete_secret
from cli.commands.secrets.sync import sync_secrets
from cli.commands.secrets.verify import verify_secrets
from cli.commands.secrets.policy import manage_policy

secrets_app = typer.Typer(
    help="Manage secrets and credentials",
    no_args_is_help=True,
)

secrets_app.command()(init_secrets)
secrets_app.command()(get_secret)
secrets_app.command()(update_secret)
secrets_app.command()(delete_secret)
secrets_app.command()(sync_secrets)
secrets_app.command()(verify_secrets)
secrets_app.command()(manage_policy)
