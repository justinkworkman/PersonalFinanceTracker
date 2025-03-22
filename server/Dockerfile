FROM node:20-slim

# Install PostgreSQL client and curl for health checks
RUN apt-get update && apt-get install -y postgresql-client curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy server and shared folders
COPY server/ ./server/
COPY shared/ ./shared/
COPY drizzle.config.ts ./

# Copy scripts needed for database initialization
COPY wait-for-db.sh docker-entrypoint.sh ./
RUN chmod +x wait-for-db.sh docker-entrypoint.sh

# Build only the server part
RUN npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Expose the port the API runs on
EXPOSE 5000

# Set environment variables (will be overridden by docker-compose values)
ENV NODE_ENV=production
ENV DATABASE_URL=postgres://postgres:postgres@db:5432/finance

# Set up entrypoint
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Default command
CMD ["npm", "start"]