FROM node:20-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json ./
RUN npm install --production

# Copy source code
COPY src ./src

EXPOSE 8000
CMD ["npm", "start"] 