FROM node:20-slim

# Install PostgreSQL client for database wait script
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Make the initialization script executable
RUN chmod +x init-db.sh

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE 5000

# Set environment variables (will be overridden by docker-compose values)
ENV NODE_ENV=production
ENV DATABASE_URL=postgres://postgres:postgres@db:5432/finance

# Create an entrypoint script to handle database initialization and app startup
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]

# Command to run the app
CMD ["npm", "start"]