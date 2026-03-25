# Sri Vinayaka Tenders - Setup Guide

## Architecture Overview

```
┌─────────────────┐     REST      ┌─────────────────┐
│   Frontend      │◄────────────►│   Node.js       │
│   (React/Vite)  │              │   Backend       │
│   Port: 5173    │              │   Port: 5000    │
└─────────────────┘              └─────────────────┘
                                         │
                                         ▼
                          ┌──────────────────────────┐
                          │     PostgreSQL DB         │
                          │     Port: 5432            │
                          └──────────────────────────┘
                                         │
                          ┌──────────────────────────┐
                          │   MongoDB Atlas (Backup)  │
                          │   Cloud Storage           │
                          └──────────────────────────┘
```

## 1. PostgreSQL Setup

### Windows
1. Download: https://www.postgresql.org/download/windows/
2. Run installer, set password for `postgres` user
3. Add to PATH: `C:\Program Files\PostgreSQL\16\bin`

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Create Database
```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE sri_vinayaka;
\q

# Import schema
psql -U postgres -d sri_vinayaka -f backend/database/schema.sql
```

## 2. Backend Setup

```bash
cd backend

# Copy and configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials and MongoDB Atlas URI

# Install dependencies
npm install

# Initialize database schema
npm run db:init

# Seed default admin user
npm run db:seed

# Start development server
npm run dev
```

Verify: http://localhost:5000/api/health

## 3. Frontend Setup

```bash
# From project root
npm install
npm run dev
```

Access: http://localhost:5173

## 4. Vite Proxy (Development)

The frontend's `vite.config.ts` should proxy `/api` requests to the backend:

```ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
})
```

## Default Login
- Email: `admin@svt.com`
- Password: `password123`
- ⚠️ **Change this password immediately after first login!**

## Production Deployment

### Build Frontend
```bash
npm run build
```

### Start Backend (serves built frontend)
```bash
cd backend
NODE_ENV=production node src/server.js
```

The backend serves the built React app from `/dist` in production mode.

## MongoDB Atlas Backup

The system supports backing up loan and investor data to MongoDB Atlas:
1. Configure `MONGO_URI` in `backend/.env`
2. Use the "Backup to MongoDB" button in Settings
3. Backups are stored in the `backups` collection

## API Endpoints

See `docs/API_SPEC.md` for the complete REST API reference.

### Quick Reference
| Category | Endpoints |
|----------|-----------|
| Auth | `POST /api/auth/login`, `POST /api/auth/signup`, `GET /api/auth/me` |
| Admin | `POST /api/admin/create`, `PUT /api/admin/change-password`, `GET /api/admin/login-history` |
| Loans | `GET /api/loans`, `POST /api/loans`, `PUT /api/loans/:id`, `POST /api/loans/delete-multiple` |
| Transactions | `POST /api/loans/:id/transactions`, `PUT .../:txnId`, `DELETE .../:txnId` |
| Investors | `GET /api/investors`, `POST`, `PUT /:id`, `DELETE /:id` |
| Investor Payments | `POST /api/investors/:id/payments`, `PUT .../:payId`, `DELETE .../:payId` |
| Notifications | `GET /api/notifications`, `POST`, `PUT /:id/read`, `PUT /read-all` |
| Backup | `POST /api/backup/mongodb` |
| Health | `GET /api/health` |

## File Structure

```
backend/
├── .env.example          # Environment template
├── package.json          # Dependencies
├── database/
│   ├── schema.sql        # PostgreSQL schema
│   └── seed.js           # Default admin seeder
├── src/
│   ├── server.js         # Express app entry point
│   ├── config/
│   │   ├── database.js   # PostgreSQL connection pool
│   │   └── mongodb.js    # MongoDB Atlas connection
│   ├── middleware/
│   │   └── auth.js       # JWT authentication
│   └── routes/
│       ├── auth.js       # Login, signup, verify
│       ├── admin.js      # Admin CRUD, password, history, restore
│       ├── loans.js      # Loans + transactions CRUD
│       ├── investors.js  # Investors + payments CRUD
│       ├── notifications.js
│       └── backup.js     # MongoDB Atlas backup
```
