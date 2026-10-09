FROM node:20-alpine

# Install Docker CLI and compilation tools for native modules
RUN apk add --no-cache docker-cli python3 make g++

WORKDIR /app

# Copy server package definitions and install dependencies
COPY server/package*.json ./
RUN npm install

# Copy configuration and TypeScript sources
COPY server/tsconfig*.json ./
COPY server/src ./src

# Build TypeScript to Javascript
RUN npm run build

# Copy database migrations directory
COPY database/migrations /app/database/migrations

ENV NODE_ENV=production
ENV PORT=3001
ENV MIGRATIONS_DIR=/app/database/migrations

EXPOSE 3001

CMD ["sh", "-c", "node dist/database/migrate.js && node dist/database/seed.js && node dist/index.js"]
