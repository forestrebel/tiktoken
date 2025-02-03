FROM node:20-slim as development

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Development environment
ENV NODE_ENV=development
ENV PORT=3000

CMD ["npm", "start"] 