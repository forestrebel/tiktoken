"""CLI entry point."""
import sys
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from cli.cli.cli import app

if __name__ == "__main__":
    app() 