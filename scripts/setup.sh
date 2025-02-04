#!/usr/bin/env bash
set -euo pipefail

# Ensure we're in the project root
cd "$(dirname "$0")/.."

# Check Python version
REQUIRED_PYTHON="3.12.4"
CURRENT_PYTHON=$(python3 -V | cut -d' ' -f2)

if [[ "$CURRENT_PYTHON" != "$REQUIRED_PYTHON" ]]; then
    echo "Error: Python $REQUIRED_PYTHON is required (found $CURRENT_PYTHON)"
    exit 1
fi

# Check Pipenv installation
if ! command -v pipenv &> /dev/null; then
    echo "Installing Pipenv..."
    python3 -m pip install --user pipenv
fi

# Install development CLI
cd cli
pipenv install -e .
cd ..

# Create development environment file if it doesn't exist
if [[ ! -f .env ]]; then
    cat > .env << EOL
SUPABASE_URL=
SUPABASE_ANON_KEY=
OPENAI_API_KEY=
DO_API_TOKEN=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
VERCEL_TOKEN=
EOL
    echo "Created .env file. Please fill in the required values."
fi

# Build development containers
docker compose build

echo "✨ Development environment setup complete!"
echo "Next steps:"
echo "1. Fill in the values in .env"
echo "2. Run 't check' to validate the environment"
echo "3. Run 't dev up' to start the services" 