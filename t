#!/usr/bin/env python3
"""Fast CLI wrapper that auto-activates virtualenv."""
import os
import sys
from pathlib import Path

def find_venv():
    """Find virtualenv in standard locations."""
    project_root = Path(__file__).parent.parent
    candidates = [
        project_root / ".venv",
        project_root / "venv",
        Path.home() / ".***REMOVED***",
    ]
    for venv in candidates:
        if (venv / "bin" / "python").exists():
            return venv
    return None

def ensure_venv():
    """Ensure we're running in the correct virtualenv."""
    if "VIRTUAL_ENV" in os.environ:
        return True
        
    venv = find_venv()
    if not venv:
        print("Error: Could not find virtualenv", file=sys.stderr)
        sys.exit(1)
        
    # Activate virtualenv
    activate_script = venv / "bin" / "activate_this.py"
    if activate_script.exists():
        with open(activate_script) as f:
            exec(f.read(), {'__file__': str(activate_script)})
        return True
    return False

if __name__ == "__main__":
    ensure_venv()
    
    # Add project root to Python path
    project_root = Path(__file__).parent.parent
    sys.path.insert(0, str(project_root))
    
    from cli.cli.cli import app
    sys.exit(app()) 