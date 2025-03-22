FROM node:20-slim

# Install PostgreSQL client for wait script
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Make wait-for script executable
RUN chmod +x wait-for-db.sh

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE 5000

# Set environment variables (will be overridden by docker-compose values)
ENV NODE_ENV=production
ENV DATABASE_URL=postgres://postgres:postgres@db:5432/finance

# Default command if not overridden in docker-compose
CMD ["sh", "-c", "npm run db:push && npm start"]