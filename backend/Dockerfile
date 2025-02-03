FROM python:3.11-slim as base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install pipenv
RUN pip install pipenv

WORKDIR /app

# Copy dependency files
COPY Pipfile Pipfile.lock ./

# Development stage
FROM base as development
RUN pipenv install --dev --system

# Copy application code
COPY . .

# Development environment
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Development server
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Production stage
FROM base as production
RUN pipenv install --system --deploy

# Copy application code
COPY . .

# Production environment
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Production server
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"] 