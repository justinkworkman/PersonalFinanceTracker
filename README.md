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

2. Access the application at http://localhost:5000

3. To stop the application:

```bash
docker-compose down
```

4. To see logs:

```bash
docker-compose logs -f
```

## Database Schema

The application uses the following main tables:

- **categories**: Expense and income categories
- **transactions**: Financial transactions (both recurring and one-time)
- **monthly_transaction_status**: Tracks paid/cleared status per month for recurring transactions

## Project Structure

- `/client`: React frontend application
- `/server`: Express backend API
- `/shared`: Shared types and schemas used by both frontend and backend
- `/docker-compose.yml`: Docker Compose configuration for easy deployment
- `/Dockerfile`: Docker configuration for containerization

## License

MIT