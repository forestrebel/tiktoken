# Python Package Restructure: Fix CLI Imports and Add Secrets Command

## Task
Refactor TikToken CLI package structure to:
1. Remove nested `cli` directories
2. Fix import paths
3. Integrate secrets subcommand

## Current State
```bash
# Working foundation commit
git checkout 965216fc7caad0c6f357035571f587f127fd8292

# Current broken structure
cli/
├── cli/
│   ├── cli.py          # Main entry point with broken imports
│   ├── commands/
│   │   └── secrets/    # New functionality to integrate
│   ├── deploy.py
│   └── ...
```

## Required Changes

### 1. Fix Directory Structure
```bash
# Target structure
cli/
├── cli.py              # Main entry point
├── commands/
│   └── secrets/        # Secrets subcommand
│       ├── init.py
│       ├── get.py
│       └── ...
├── deploy.py
└── ...
```

### 2. Fix Import Statements
Current broken imports in cli.py:
```python
from cli.cli.deploy import deploy_service
from cli.cli.verify import verify_local_dev_setup
from cli.cli.commands.secrets import secrets_app
```

Required working imports:
```python
from cli.deploy import deploy_service
from cli.verify import verify_local_dev_setup
from cli.commands.secrets import secrets_app
```

### 3. Entry Point Configuration
Verify pyproject.toml remains correct:
```toml
[project.scripts]
t = "cli.cli:app"
```

## Verification Steps
```bash
# 1. Install package
cd cli && pipenv install -e .

# 2. Verify commands work
t --help
t verify --help
t deploy --help
t secrets --help

# 3. Verify secrets subcommands
t secrets init --help
t secrets get --help
t secrets update --help
t secrets delete --help
t secrets sync --help
t secrets verify --help
t secrets policy --help
```

## Success Criteria
1. Package installs without errors
2. All commands work without import errors
3. Help text shows all commands including secrets
4. No nested cli directories in final structure

## Notes
- Base functionality exists in commit 965216fc7caad0c6f357035571f587f127fd8292
- Focus on fixing imports and package structure
- No changes needed to command functionality
- Keep all existing error handling and console output
