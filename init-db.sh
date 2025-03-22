#!/bin/sh
set -e

# Run database migrations
echo "Running database migrations..."
npm run db:push

echo "Database initialization completed."