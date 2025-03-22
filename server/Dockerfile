FROM node:20-slim

# Install PostgreSQL client and curl for health checks
RUN apt-get update && apt-get install -y postgresql-client curl && rm -rf /var/lib/apt/lists/*

# Accept build arguments
ARG NODE_ENV=production

# Set environment variables
ENV NODE_ENV=${NODE_ENV}

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

# Create a custom build script for the server with debugging
RUN echo '#!/bin/bash\necho "Current directory: $(pwd)"\nls -la\necho "Server directory contents:"\nls -la server/\necho "Building server..."\nNODE_ENV=production npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist\necho "Build complete, checking output:"\nls -la dist' > build-server.sh
RUN chmod +x build-server.sh

# Build the server using our custom script
RUN ./build-server.sh

# Add a step to check what's in the dist directory
RUN ls -la /app/dist || echo "dist not found"

# Expose the port the API runs on
EXPOSE 5000

# Set environment variables (will be overridden by docker-compose values)
ENV NODE_ENV=production
ENV DATABASE_URL=postgres://postgres:postgres@db:5432/finance

# Set up entrypoint
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Default command
CMD ["npm", "start"]