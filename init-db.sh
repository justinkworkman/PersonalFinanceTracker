#!/bin/bash
set -e

echo "Running database migrations..."
npm run db:push

echo "Database initialization complete!"