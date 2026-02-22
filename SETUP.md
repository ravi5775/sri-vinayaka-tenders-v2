# Sri Vinayaka Tenders - Local Setup Guide

## 🖥️ Prerequisites

Install these first:

| Software | Version | Download |
|----------|---------|----------|
| Node.js | v18+ | https://nodejs.org/ |
| PostgreSQL | v15+ | https://www.postgresql.org/download/ |
| Git | Latest | https://git-scm.com/ |

---

## Architecture

```
Terminal 1 (Backend):   cd backend && npm run dev     → http://localhost:3001
Terminal 2 (Frontend):  npm run dev                   → http://localhost:8080
PostgreSQL:             Running as system service      → localhost:5432
```

```
┌─────────────────┐     REST/Proxy    ┌─────────────────┐
│   Frontend      │◄────────────────►│   Node.js       │
│   (React/Vite)  │   /api/* proxy   │   Backend       │
│   Port: 8080    │                  │   Port: 3001    │
└─────────────────┘                  └─────────────────┘
                                             │
                                     ┌───────┴───────┐
                                     ▼               ▼
                              PostgreSQL DB    MongoDB Atlas
                              Port: 5432       (Backup Only)
```

---

## Step 1: PostgreSQL Database Setup

### Windows
1. Download installer from https://www.postgresql.org/download/windows/
2. Run installer, set password for `postgres` user (remember this!)
3. Add to PATH: `C:\Program Files\PostgreSQL\16\bin`
4. Open Command Prompt and verify:
   ```bash
   psql --version
   ```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### macOS
```bash
brew install postgresql@16
brew services start postgresql@16
```

### Create Database
```bash
# Login to PostgreSQL
psql -U postgres
# Enter your postgres password when prompted

# Create the database
CREATE DATABASE sri_vinayaka;

# Verify it was created
\l

# Exit
\q
```

---

## Step 2: Backend Setup

Open a terminal and run:

```bash
# Navigate to backend folder
cd backend

# Copy environment template
cp .env.example .env
```

### Configure Environment

Open `backend/.env` in a text editor and update these values:

```env
# Server
PORT=3001
NODE_ENV=development

# PostgreSQL - UPDATE THESE
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sri_vinayaka
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD_HERE

# SECURITY: This secret is used to sign login tokens.
# We have set a default value so the app starts, but you should change this for production.
JWT_SECRET=sri_vinayaka_secure_token_secret_key_998877
JWT_EXPIRES_IN=7d

# CORS - Must match your frontend URL
FRONTEND_URL=http://localhost:8080

# MongoDB Atlas (Backup/Restore)
# Cluster: srivinayakatenders | Database: test
# Collections: investors (10), loans (69), loginhistories (45), notifications (69), users (5)
MONGO_URI=mongodb+srv://srivinayakatender_db_user:%40Ravi7pspk@srivinayakatenders.xudvbid.mongodb.net/test?retryWrites=true&w=majority&appName=srivinayakatenders
MONGO_DB_NAME=test

# CSRF - Change to any random string
CSRF_SECRET=my-csrf-secret-change-this-too

# Default Admin Credentials
# The system creates this user automatically on first run if it doesn't exist.
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=password123
```

### Install & Initialize

```bash
# Install dependencies
npm install

# Create database tables
psql -U postgres -d sri_vinayaka -f database/schema.sql

# Seed default admin user
npm run db:seed

# Start backend server
npm run dev
```

### Verify Backend

You should see in terminal:
```
✅ PostgreSQL connected: 2026-02-18T...
🚀 Sri Vinayaka Backend running on http://localhost:3001
📊 Health check: http://localhost:3001/api/health
🔧 Environment: development
```

Open http://localhost:3001/api/health in your browser. Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-18T...",
  "database": "connected"
}
```

---

## Step 3: Frontend Setup

Open a **NEW terminal** (keep backend running in the first one):

```bash
# Navigate to project root (not backend folder)
cd /path/to/sri-vinayaka-tenders

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:8080 in your browser.

---

## Step 4: Login

Use these default credentials:

| Field | Value |
|-------|-------|
| Email | `admin@example.com` |
| Password | `password123` |

> ⚠️ **IMPORTANT:** Change this password immediately after first login via **Settings → Admin Management → Change Your Password**
> You can change the default admin credentials in `backend/.env` before running the seed.

---

## Step 5: Import Existing Data (Optional)

If you have a backup JSON file from the previous system:

1. Login to the application
2. Go to **Settings** (gear icon in header)
3. Click **Restore from File**
4. Select your backup `.json` file

Or use the API directly:
```bash
# Get auth token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Use the token to restore backup
curl -X POST http://localhost:3001/api/admin/restore \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d @path/to/your-backup-file.json
```

---

## Production Deployment

### Fresh Production Install

```bash
# 1. Clone the repo
git clone https://github.com/ravi5775/sri-vinayaka-tenders.git ~/v2
cd ~/v2

# 2. Create database and load complete schema
createdb -U postgres sri_vinayaka
psql -U postgres -d sri_vinayaka -f backend/database/schema.sql

# 3. Setup backend
cd backend
cp .env.example .env
# Edit .env with your production values (DB_PASSWORD, JWT_SECRET, etc.)
npm install

# 4. Seed default admin account
node database/seed.js

# 5. Build frontend
cd ~/v2
npm install
npm run build

# 6. Start with PM2
cd backend
pm2 start src/server.js --name svt-backend
pm2 save
```

### Existing Production Update

```bash
cd ~/v2/backend && git pull origin main
npm install
pm2 restart svt-backend
```

> The `autoMigrate` runs on every startup and applies any new schema changes automatically. No manual SQL needed.

### Build Frontend

```bash
# From project root
npm run build
```

This creates a `dist/` folder with optimized static files.

### Run in Production (without PM2)

```bash
cd backend
NODE_ENV=production node src/server.js
```

The backend automatically serves the built frontend from `dist/` in production mode. Access everything at http://localhost:3001.

### Reset Admin Password

If you forget your admin password, run on the server:

```bash
cd ~/v2/backend
node -e "
const bcrypt = require('bcryptjs');
bcrypt.hash('YourNewPassword', 12).then(h => {
  const { pool } = require('./src/config/database');
  pool.query('UPDATE users SET password_hash = \$1 WHERE email = \$2', [h, 'your@email.com'])
    .then(() => { console.log('✅ Password updated'); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
});
"
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| `psql: command not found` | Add PostgreSQL bin to your PATH. Windows: `C:\Program Files\PostgreSQL\16\bin`. Linux: usually auto-added. |
| `ECONNREFUSED` on PostgreSQL | PostgreSQL service isn't running. **Windows:** Open Services → PostgreSQL → Start. **Linux:** `sudo systemctl start postgresql` |
| `password authentication failed` | Double-check `DB_PASSWORD` in `backend/.env` matches your postgres password |
| `relation "users" does not exist` | Schema not loaded. Run: `psql -U postgres -d sri_vinayaka -f backend/database/schema.sql` |
| `database "sri_vinayaka" does not exist` | Create it: `psql -U postgres` then `CREATE DATABASE sri_vinayaka;` |
| Seed command fails | Make sure `.env` is configured and database schema is loaded first |
| Frontend shows blank page | Make sure backend is running on port 3001 first, then start frontend |
| `CORS error` in browser console | Check `FRONTEND_URL` in `backend/.env` matches exactly: `http://localhost:8080` |
| `Cannot find module` errors | Run `npm install` in the correct folder (backend/ or project root) |
| MongoDB backup fails | Check `MONGO_URI` in `.env`. Database should be `test` with collections: investors, loans, loginhistories, notifications, users |
| Port already in use | Kill the process: `lsof -ti:3001 \| xargs kill` (Linux/Mac) or change `PORT` in `.env` |

---

## File Structure Reference

```
project-root/
├── src/                      # Frontend React source
├── public/                   # Static assets
├── dist/                     # Built frontend (after npm run build)
├── vite.config.ts            # Vite config with /api proxy
├── docs/
│   └── API_SPEC.md           # Complete REST API reference
├── backend/
│   ├── .env.example          # Environment template
│   ├── .env                  # Your local config (git-ignored)
│   ├── package.json          # Backend dependencies
│   ├── README.md             # Backend-specific docs
│   ├── database/
│   │   ├── schema.sql        # Complete PostgreSQL schema (all tables + functions)
│   │   ├── full_migration_for_psql.sql  # Legacy full migration (reference)
│   │   ├── migration_single_session.sql # Single session migration
│   │   ├── migration_high_payment_alerts.sql # Alert tables migration
│   │   └── seed.js           # Admin account seeder
│   └── src/
│       ├── server.js         # Express app entry point
│       ├── config/
│       │   ├── database.js   # PostgreSQL pool (with retry & timeout)
│       │   ├── autoMigrate.js # Auto-migration on startup
│       │   ├── email.js      # SMTP email config
│       │   └── mongodb.js    # MongoDB Atlas connection
│       ├── middleware/
│       │   ├── auth.js       # JWT authentication
│       │   └── auditLogger.js # Server-side mutation audit logging
│       ├── templates/
│       │   └── emailTemplates.js # Email HTML templates
│       └── routes/
│           ├── auth.js       # Login, signup, verify
│           ├── admin.js      # Admin CRUD, password, history, restore
│           ├── loans.js      # Loans + transactions CRUD (paginated)
│           ├── investors.js  # Investors + payments CRUD (paginated)
│           ├── notifications.js
│           ├── backup.js     # MongoDB Atlas backup (with validation)
│           └── csrf.js       # CSRF token
└── SETUP.md                  # This file
```

---

## Quick Commands Reference

```bash
# Backend
cd backend && npm run dev          # Start dev server
cd backend && npm run db:init      # Load schema
cd backend && npm run db:seed      # Create default admin

# Frontend
npm run dev                        # Start dev server
npm run build                      # Build for production

# Database
psql -U postgres -d sri_vinayaka   # Connect to database
psql -U postgres -d sri_vinayaka -f backend/database/schema.sql  # Load schema
```
