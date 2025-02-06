FROM node:18-slim

# Install ffmpeg with minimal dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create app directories
WORKDIR /app
RUN mkdir -p /app/state /app/tmp

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy source files
COPY src ./src
COPY tests ./tests
COPY scripts ./scripts

# Set environment variables
ENV NODE_ENV=test
ENV STATE_DIR=/app/state
ENV TEMP_DIR=/app/tmp

# Run tests
CMD ["npm", "test"]
