# =====================================================================
# DEPRECATED: This Dockerfile is kept for reference but is no longer used.
# Please use the separate client/Dockerfile and server/Dockerfile instead.
# =====================================================================

FROM node:20-slim

# Install PostgreSQL client for database connection
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Make scripts executable
RUN chmod +x docker-entrypoint.sh wait-for-db.sh init-db.sh

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE 5000

# Set environment variables (will be overridden by docker-compose values)
ENV NODE_ENV=production
ENV DATABASE_URL=postgres://postgres:postgres@db:5432/finance

# Set up entrypoint
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Default command
CMD ["npm", "start"]