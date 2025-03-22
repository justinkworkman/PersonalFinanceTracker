#!/bin/sh
set -e

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until PGPASSWORD=$PGPASSWORD psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c '\q'; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "PostgreSQL is up"

# Initialize the database
echo "Initializing database..."
npm run db:push

# Set up the default categories if needed
echo "Setting up default data..."
if [ "$INITIALIZE_DEFAULT_DATA" = "true" ]; then
  node server/init-data.js
fi

# Start the application
echo "Starting application..."
exec "$@"