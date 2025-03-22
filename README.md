# Personal Finance Web Application

A comprehensive expense tracking, visualization, and personal finance management application with an intuitive user interface.

## Features

- Track monthly expenses and income
- Support for recurring transactions with relative dates
- Mark expenses as paid/pending and cleared/uncleared
- Calendar view with transaction details
- Monthly summary with income, expenses, and remaining balance
- Category-based expense analysis
- Payment status tracking
- Mobile-responsive design

## Technology Stack

- **Frontend**: React.js with TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **State Management**: React Query for data fetching and caching
- **Containerization**: Docker and Docker Compose

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Local Development

To start the development server:

```bash
npm install
npm run dev
```

This will start both the React frontend and Node.js backend in development mode.

### Deployment with Docker

To deploy the application using Docker:

1. Build and start the containers:

```bash
docker-compose up -d
```

2. Access the application at:
   - Frontend: http://localhost:80
   - Backend API: http://localhost:5000/api

3. To stop the application:

```bash
docker-compose down
```

4. To see logs for all services:

```bash
docker-compose logs -f
```

5. To see logs for a specific service:

```bash
docker-compose logs -f [service_name]
```

Where `[service_name]` can be `client`, `server`, or `db`.

### Docker Architecture

The application is containerized using a microservices approach:

- **client**: NGINX container serving the React frontend
- **server**: Node.js container running the Express API
- **db**: PostgreSQL database container

Each service has its own Dockerfile and is configured in the docker-compose.yml file. The services have the following dependencies:

```
client → server → db
```

Health checks are implemented to ensure services start in the correct order and are ready before dependent services attempt to connect.

## Database Schema

The application uses the following main tables:

- **categories**: Expense and income categories
- **transactions**: Financial transactions (both recurring and one-time)
- **monthly_transaction_status**: Tracks paid/cleared status per month for recurring transactions

## Project Structure

- `/client`: React frontend application
  - `/src`: Source code for the React application
  - `/Dockerfile`: Docker configuration for the client container
- `/server`: Express backend API
  - `/routes.ts`: API endpoints
  - `/storage.ts`: Storage interface implementation
  - `/pgStorage.ts`: PostgreSQL storage implementation
  - `/db.ts`: Database connection and initialization
  - `/init-data.js`: Script to initialize default data
  - `/Dockerfile`: Docker configuration for the server container
- `/shared`: Shared types and schemas used by both frontend and backend
  - `/schema.ts`: Database schema definitions and type definitions
- `/docker-compose.yml`: Docker Compose configuration for orchestrating all services
- `/docker-entrypoint.sh`: Entry point script for the container
- `/wait-for-db.sh`: Script to wait for the database to be ready
- `/Dockerfile`: Monolithic Docker configuration (deprecated in favor of service-specific Dockerfiles)

## License

MIT