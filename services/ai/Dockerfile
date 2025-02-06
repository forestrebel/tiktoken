FROM python:3.12-slim

WORKDIR /app

# Install pipenv
RUN pip install --no-cache-dir pipenv

# Copy dependency files
COPY Pipfile* ./

# Install dependencies
RUN pipenv install --deploy --system

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 