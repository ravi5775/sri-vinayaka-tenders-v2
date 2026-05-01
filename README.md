# Sri Vinayaka Tenders

A full-stack loan management application for tracking loans, investors, and repayments.

## Features

- Loan management and tracking
- Investor management with payment history
- Repayment schedules and tracking
- Admin dashboard with analytics
- Real-time notifications
- Multi-language support
- CSV export functionality

## Technologies

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn-ui
- **Backend**: Node.js, Express
- **Database**: PostgreSQL + MongoDB Atlas (backup/restore)
- **Authentication**: JWT-based auth

## Vercel Deployment (Frontend + API)

This repository now supports Vercel deployment with:

- Vite frontend served from `dist`
- Backend Express API via Vercel Function at `/api/index.js`
- PostgreSQL via `DATABASE_URL`

### Required environment variables

Set these in Vercel Project Settings:

- `DATABASE_URL`
- `DIRECT_URL` (for Prisma migrations)
- `JWT_SECRET`
- `CORS_ORIGIN`
- `FRONTEND_URL`
- `NODE_ENV=production`

Optional:

- `VITE_API_URL=/api`
- `VITE_ENABLE_WEBSOCKET=false`
- `MONGODB_URI` or `MONGO_URI`

### Build behavior on Vercel

- `vercel.json` uses `npm run vercel-build`
- `vercel-build` installs backend deps, generates Prisma client, and builds frontend

### PostgreSQL migration command

```sh
cd backend
npm run prisma:migrate
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL
- npm or yarn

### Installation

1. Clone the repository:
```sh
git clone https://github.com/ravi5775/sri-vinayaka-tenders-v2.git
cd sri-vinayaka-tenders-v2
```

2. Install frontend dependencies:
```sh
npm install
```

3. Install backend dependencies:
```sh
cd backend
npm install
```

4. Set up the database:
   - Create a PostgreSQL database
   - Run the schema and migration files from `backend/database/`

5. Configure environment variables:
   - Create `.env` file in the backend directory with your database credentials

### Running the Application

1. Start the backend server:
```sh
cd backend
npm run dev
```

2. Start the frontend development server:
```sh
npm run dev
```

The application will be available at `http://localhost:8080`

## Project Structure

- `/src` - Frontend React application
- `/backend` - Node.js backend server
- `/docs` - API documentation
- `/backend/database` - PostgreSQL schema and migrations

For more details, see [SETUP.md](SETUP.md), [backend/README.md](backend/README.md), and [docs/API_SPEC.md](docs/API_SPEC.md).
