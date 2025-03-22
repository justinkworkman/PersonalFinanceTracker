#!/bin/bash
set -e

# Function to wait for PostgreSQL to be ready
wait_for_postgres() {
  echo "Waiting for PostgreSQL to be ready..."
  until PGPASSWORD=$PGPASSWORD psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c '\q'; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 2
  done
  echo "PostgreSQL is up - executing command"
}

# Wait for PostgreSQL to be ready
wait_for_postgres

# Run database initialization
echo "Initializing database..."
./init-db.sh

# Execute the main command (npm start)
exec "$@"