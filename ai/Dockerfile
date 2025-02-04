FROM python:3.12.4-slim

WORKDIR /app

# Install pipenv and curl for health checks
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    pip install --no-cache-dir pipenv && \
    rm -rf /var/lib/apt/lists/*

# Copy dependency files first for better caching
COPY Pipfile Pipfile.lock ./

# Install dependencies in the virtualenv
RUN pipenv install --deploy

# Copy application code
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8081}/health || exit 1

# Environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8081

# Production server
CMD ["pipenv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8081"] 