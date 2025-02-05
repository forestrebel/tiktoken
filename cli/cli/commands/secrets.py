"""Secrets management commands."""
import typer
from .secrets.init import init
from .secrets.get import get
from .secrets.update import update
from .secrets.delete import delete
from .secrets.sync import sync
from .secrets.verify import verify
from .secrets.policy import policy

secrets_app = typer.Typer(help="Secrets management commands")
secrets_app.command()(init)
secrets_app.command()(get)
secrets_app.command()(update)
secrets_app.command()(delete)
secrets_app.command()(sync)
secrets_app.command()(verify)
secrets_app.command()(policy)
