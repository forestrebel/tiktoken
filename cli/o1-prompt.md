# TikToken CLI: Package Structure Fix and Secrets Integration

## Context

### Current State
- The CLI tool (invoked via `t`) is a critical development tool for TikToken
- Base functionality (verify, deploy, setup) works in commit `965216fc7caad0c6f357035571f587f127fd8292`
- Current attempts to integrate secrets management have broken the package structure
- Main issue: Nested `cli` directories (cli/cli/cli.py) causing Python import conflicts

## Requirements

### 1. Package Structure

Current:
```
cli/
├── cli/
│   ├── cli.py
│   ├── commands/
│   │   └── secrets/
│   ├── deploy.py
│   └── ...
```

Desired:
```
cli/
├── cli.py
├── commands/
│   └── secrets/
│       ├── init.py
│       ├── get.py
│       └── ...
├── deploy.py
└── ...
```

### 2. Secrets Integration

Subcommand Structure:
```
t secrets [command]
Commands:
  init    Initialize secrets configuration
  get     Retrieve secrets
  update  Update existing secrets
  delete  Remove secrets
  sync    Synchronize secrets
  verify  Verify secrets configuration
  policy  Manage secrets policies
```

Requirements:
- Each command must maintain its current functionality
- All commands must support --help flag with proper documentation

### 3. Package Configuration

Current pyproject.toml entry point:
```toml
[project.scripts]
t = "cli.cli:app"
```

Requirements:
- Verify this remains correct after restructuring
- Ensure all dependencies are properly specified
- Package must be installable via `pipenv install -e .`

### 4. Testing Requirements

Verify the following commands work:
```bash
# Basic CLI functionality
t --help                  # Should show all commands including secrets
t verify --help          # Existing command
t deploy --help          # Existing command
t setup --help           # Existing command

# New secrets functionality
t secrets --help         # Should show all secrets subcommands
t secrets init --help    # Each subcommand should show help
t secrets get --help
t secrets update --help
t secrets delete --help
t secrets sync --help
t secrets verify --help
t secrets policy --help
```

## Expected Outcomes

### 1. Package Structure
- Single, flat cli package with no nested directories
- Clear separation between core CLI and command modules
- Consistent import paths (e.g., `from cli.commands.secrets import ...`)

### 2. Command Behavior
- All existing commands maintain current behavior
- `t --help` output includes:
  ```
  Commands:
    verify   Verify critical flows
    deploy   Deployment commands
    setup    Setup commands
    secrets  Secrets management commands
  ```
- Error messages remain descriptive and helpful
- Rich console formatting preserved for all commands

### 3. Code Quality
- PEP 8 compliant imports
- No circular dependencies
- Clear module boundaries between commands
- Proper error handling maintained

## Starting Point

### 1. Reset to Known Good State
```bash
git checkout 965216fc7caad0c6f357035571f587f127fd8292 cli/
```

### 2. Key Files to Modify
- cli/cli.py (main entry point)
- cli/commands/secrets/*.py (secrets implementation)
- cli/pyproject.toml (package configuration)
- cli/__init__.py (package initialization)

## Deliverables

Please provide:
1. Git commands to restructure the package
2. Updated file contents with proper imports
3. Steps to verify the changes
4. Any necessary modifications to configuration files

## Success Criteria

1. `pipenv install -e .` completes without errors
2. `t --help` shows all commands including secrets
3. All existing and new commands work without import errors
4. Package structure is clean with no nested cli directories
5. All tests pass (if any exist)
