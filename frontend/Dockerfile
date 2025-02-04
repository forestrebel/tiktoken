FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy application code
COPY frontend/ .

# Build the application
RUN npm run build

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["npm", "start"] 