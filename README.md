# Personal Finance Web Application

A comprehensive personal finance management web application for tracking expenses, income, and visualizing financial data.

## Features

- Expense and income tracking
- Recurring and one-time transaction support
- Multiple transaction statuses (pending, paid, cleared)
- Monthly financial summary
- Calendar view of transactions
- Category-based expense analysis
- Mobile-responsive design

## Deploying with Docker

This application can be easily deployed using Docker and Docker Compose.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Running the Application

1. Clone the repository to your local machine
2. Navigate to the project directory
3. Build and start the containers:

```bash
docker-compose up -d
```

4. Access the application at `http://localhost:5000`

The application will automatically connect to a PostgreSQL database container.

### Stopping the Application

To stop the containers:

```bash
docker-compose down
```

To stop the containers and remove the volumes (will delete all data):

```bash
docker-compose down -v
```

### Viewing Logs

To view the logs of the running containers:

```bash
docker-compose logs -f
```

## Development

For local development without Docker:

1. Install Node.js (v18 or higher)
2. Install PostgreSQL
3. Set up environment variables as shown in the docker-compose.yml file
4. Install dependencies:

```bash
npm install
```

5. Run database migrations:

```bash
npm run db:push
```

6. Start the development server:

```bash
npm run dev
```

## Environment Variables

The following environment variables can be configured:

- `DATABASE_URL`: PostgreSQL connection string
- `PGHOST`: PostgreSQL host
- `PGUSER`: PostgreSQL user
- `PGPASSWORD`: PostgreSQL password
- `PGDATABASE`: PostgreSQL database name
- `PGPORT`: PostgreSQL port
- `NODE_ENV`: Set to 'production' for production mode