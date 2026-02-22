# Sri Vinayaka Tenders — Complete Setup Guide

> **Author:** @ravi5775 | **Last Updated:** Feb 2026

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Local Development Setup](#local-development-setup)
3. [AWS EC2 Production Deployment](#aws-ec2-production-deployment)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Maintenance & Operations](#maintenance--operations)
6. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────┐        ┌─────────────────────┐
│   Browser Client    │◄──────►│   Nginx (Port 80)   │
│   (React SPA)       │        │   Reverse Proxy      │
└─────────────────────┘        └──────┬──────┬────────┘
                                      │      │
                              /api/*  │      │  /* (static)
                                      ▼      ▼
                              ┌──────────┐  ┌──────────┐
                              │ Node.js  │  │ /dist/   │
                              │ Express  │  │ (built   │
                              │ Port 3001│  │  React)  │
                              └────┬─────┘  └──────────┘
                                   │
                            ┌──────┴──────┐
                            ▼             ▼
                      PostgreSQL     MongoDB Atlas
                      Port 5432      (Backup Only)
```

| Component | Purpose |
|-----------|---------|
| **React + Vite** | Frontend SPA (loans, investors, dashboard) |
| **Express.js** | REST API backend with JWT auth |
| **PostgreSQL** | Primary database (all app data) |
| **MongoDB Atlas** | Optional backup/restore only |
| **Nginx** | Reverse proxy, serves static files |
| **PM2** | Process manager (auto-restart, logs) |

---

## Local Development Setup

### Prerequisites

| Software | Version | Install |
|----------|---------|---------|
| Node.js | v18+ | https://nodejs.org/ |
| PostgreSQL | v15+ | https://www.postgresql.org/download/ |
| Git | Latest | https://git-scm.com/ |

### Step 1: Install PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Windows:**
1. Download from https://www.postgresql.org/download/windows/
2. Run installer, set password for `postgres` user
3. Add `C:\Program Files\PostgreSQL\16\bin` to PATH

### Step 2: Create Database

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE sri_vinayaka;
\q
```

### Step 3: Clone & Configure

```bash
git clone https://github.com/ravi5775/sri-vinayaka-tenders.git
cd sri-vinayaka-tenders/backend
cp .env.example .env
```

Edit `backend/.env` — update at minimum:
```env
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
```

### Step 4: Install & Start

**Terminal 1 — Backend:**
```bash
cd backend
npm install
node database/seed.js          # Create default admin account
npm run dev                    # Starts on http://localhost:3001
```

You should see:
```
✅ PostgreSQL connected
✅ Auto-migration complete
🚀 Sri Vinayaka Backend running on http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd sri-vinayaka-tenders        # Project root (NOT backend/)
npm install
npm run dev                    # Starts on http://localhost:8080
```

### Step 5: Login

Open http://localhost:8080 and login:

| Field | Default Value |
|-------|---------------|
| Email | `admin@example.com` |
| Password | `password123` |

> ⚠️ Change password immediately via **Settings → Admin Management → Change Your Password**

---

## AWS EC2 Production Deployment

### Step 1: Launch EC2 Instance

1. Go to **AWS Console → EC2 → Launch Instance**
2. Choose **Amazon Linux 2023** or **Ubuntu 22.04 LTS**
3. Instance type: **t3.micro** (free tier) or **t3.small** (recommended)
4. Create or select a key pair (`.pem` file)
5. Configure **Security Group** inbound rules:

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | Your IP | SSH |
| 80 | TCP | 0.0.0.0/0 | HTTP |
| 443 | TCP | 0.0.0.0/0 | HTTPS (optional) |

> ⚠️ Do NOT open port 3001 publicly — Nginx proxies everything through port 80.

6. **Allocate Elastic IP** (EC2 → Elastic IPs → Allocate → Associate with instance)
   - This gives a static IP that survives reboots

### Step 2: Connect via SSH

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ec2-user@YOUR_ELASTIC_IP
# Ubuntu: ssh -i your-key.pem ubuntu@YOUR_ELASTIC_IP
```

### Step 3: Install System Dependencies

**Amazon Linux 2023:**
```bash
# Update system
sudo dnf update -y

# Install Node.js 20.x
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Install Git
sudo dnf install -y git

# Install Nginx
sudo dnf install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Install PM2
sudo npm install -g pm2

# Install PostgreSQL 15
sudo dnf install -y postgresql15-server postgresql15
sudo postgresql-setup --initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify all installations
echo "--- Versions ---"
node -v && npm -v && nginx -v && pm2 -v && psql --version && git --version
```

**Ubuntu 22.04:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify
node -v && npm -v && nginx -v && pm2 -v && psql --version
```

### Step 4: Configure PostgreSQL

```bash
sudo -u postgres psql
```

```sql
-- Create database and user
CREATE DATABASE sri_vinayaka;
CREATE USER svtuser WITH ENCRYPTED PASSWORD 'YOUR_STRONG_DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE sri_vinayaka TO svtuser;
ALTER DATABASE sri_vinayaka OWNER TO svtuser;

-- Grant schema permissions
\c sri_vinayaka
GRANT ALL ON SCHEMA public TO svtuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO svtuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO svtuser;

\q
```

**For Amazon Linux** — update `pg_hba.conf` to allow password auth:
```bash
sudo nano /var/lib/pgsql/data/pg_hba.conf
```
Change `ident` to `md5` for local connections:
```
local   all   all                 md5
host    all   all   127.0.0.1/32  md5
```
Then restart:
```bash
sudo systemctl restart postgresql
```

### Step 5: Clone & Configure Project

```bash
cd ~
git clone https://github.com/ravi5775/sri-vinayaka-tenders.git v2
cd v2/backend
cp .env.example .env
nano .env
```

**Set these production values** (replace placeholders):

```env
# Server
PORT=3001
NODE_ENV=production

# URLs — use your Elastic IP (or domain)
BASE_URL=http://YOUR_ELASTIC_IP
FRONTEND_URL=http://YOUR_ELASTIC_IP
APP_IP=http://YOUR_ELASTIC_IP

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sri_vinayaka
DB_USER=svtuser
DB_PASSWORD=YOUR_STRONG_DB_PASSWORD
DB_POOL_SIZE=20

# JWT — generate with: openssl rand -hex 32
JWT_SECRET=PASTE_64_CHAR_RANDOM_STRING
JWT_REFRESH_SECRET=PASTE_ANOTHER_64_CHAR_RANDOM_STRING
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=http://YOUR_ELASTIC_IP

# CSRF — generate with: openssl rand -hex 16
CSRF_SECRET=PASTE_32_CHAR_RANDOM_STRING

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_AUTH_REQUIRED=true
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
EMAIL_FROM=your_email@gmail.com
EMAIL_FROM_NAME=Sri Vinayaka Tenders
EMAIL_REPLY_TO=your_email@gmail.com
EMAIL_ENABLED=true
EMAIL_MAX_RETRIES=3
EMAIL_RETRY_DELAY_SECONDS=5

# MongoDB Atlas (backup — optional)
MONGO_URI=your_mongo_connection_string
MONGO_DB_NAME=test

# Default Admin (created on first seed)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ChangeMeImmediately!
```

> 💡 Generate random secrets:
> ```bash
> openssl rand -hex 32
> ```

### Step 6: Install Dependencies & Build

```bash
# Backend
cd ~/v2/backend
npm install

# Seed admin account
node database/seed.js

# Frontend
cd ~/v2
npm install
npm run build
```

### Step 7: Configure Nginx

```bash
sudo nano /etc/nginx/conf.d/sri-vinayaka.conf
```

> **Ubuntu users:** use `/etc/nginx/sites-available/sri-vinayaka` instead, then symlink.

Paste this:

```nginx
server {
    listen 80;
    server_name YOUR_ELASTIC_IP;
    # With domain: server_name yourdomain.com www.yourdomain.com;

    # Serve frontend static files
    root /home/ec2-user/v2/dist;
    # Ubuntu: root /home/ubuntu/v2/dist;
    index index.html;

    # Proxy API to backend
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Origin $http_origin;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }

    # SPA fallback — all routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;

    # Max upload size (for backup restore)
    client_max_body_size 10M;
}
```

Enable and test:

```bash
# Amazon Linux — remove default config if exists
sudo rm -f /etc/nginx/conf.d/default.conf

# Ubuntu — symlink and remove default
# sudo ln -sf /etc/nginx/sites-available/sri-vinayaka /etc/nginx/sites-enabled/
# sudo rm -f /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Restart
sudo systemctl restart nginx
```

### Step 8: Start Backend with PM2

```bash
cd ~/v2/backend

# Start
pm2 start src/server.js --name svt-backend

# Save process list (survives reboot)
pm2 save

# Auto-start on boot
pm2 startup
# ⬆️ Copy-paste the command it prints and run it!

# Verify
pm2 logs svt-backend --lines 10
```

You should see:
```
✅ PostgreSQL connected
✅ Auto-migration complete
🚀 Sri Vinayaka Backend running on http://localhost:3001
```

### Step 9: (Optional) Serve Frontend via PM2

If you prefer PM2 over Nginx for the frontend dev server:
```bash
cd ~/v2
pm2 start npx --name svt-frontend -- vite --host 0.0.0.0 --port 8080
pm2 save
```

> This is NOT recommended for production. Use the Nginx + `dist/` approach above.

---

## Post-Deployment Verification

Run these checks:

```bash
# 1. Backend health
curl http://localhost:3001/api/health

# 2. Nginx serving frontend
curl -s http://YOUR_ELASTIC_IP | head -5

# 3. API through Nginx
curl http://YOUR_ELASTIC_IP/api/health

# 4. PM2 status
pm2 status
```

Then open `http://YOUR_ELASTIC_IP` in your browser — you should see the login page.

---

## Maintenance & Operations

### Update Application

```bash
cd ~/v2
git pull origin main

# Rebuild frontend
npm install
npm run build

# Update backend
cd backend
npm install

# Restart (auto-migration runs on startup)
pm2 restart svt-backend

# No Nginx restart needed — it serves static files
```

### Reset Admin Password

```bash
cd ~/v2/backend
node -e "
require('dotenv').config();
const bcrypt = require('bcryptjs');
bcrypt.hash('YourNewPassword', 12).then(h => {
  const { pool } = require('./src/config/database');
  pool.query('UPDATE users SET password_hash=\$1, active_token_hash=NULL, device_id=NULL, failed_attempts=0, is_locked=false WHERE email=\$2', [h, 'your@email.com'])
    .then(() => pool.query('DELETE FROM login_attempts'))
    .then(() => { console.log('✅ Password reset'); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
});
"
```

### Clear Account Lockout

```bash
cd ~/v2/backend
node -e "
require('dotenv').config();
const { pool } = require('./src/config/database');
pool.query('UPDATE users SET is_locked=false, locked_until=NULL, failed_attempts=0 WHERE email=\$1', ['user@email.com'])
  .then(() => pool.query('DELETE FROM login_attempts'))
  .then(() => { console.log('✅ Unlocked'); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });
"
```

### PM2 Commands

```bash
pm2 status                  # List processes
pm2 logs svt-backend        # Live logs
pm2 logs svt-backend --lines 50  # Last 50 lines
pm2 restart svt-backend     # Restart
pm2 stop svt-backend        # Stop
pm2 delete svt-backend      # Remove
pm2 monit                   # Real-time dashboard
```

### View Logs

```bash
# Backend
pm2 logs svt-backend

# Nginx access
sudo tail -f /var/log/nginx/access.log

# Nginx errors
sudo tail -f /var/log/nginx/error.log

# PostgreSQL (Amazon Linux)
sudo tail -f /var/lib/pgsql/data/log/*.log

# PostgreSQL (Ubuntu)
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

### Add SSL with Let's Encrypt (Requires Domain)

```bash
# Amazon Linux
sudo dnf install -y certbot python3-certbot-nginx

# Ubuntu
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

After SSL, update `backend/.env`:
```env
FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com
BASE_URL=https://yourdomain.com
```

Then restart:
```bash
pm2 restart svt-backend
```

### Import Existing Data (Backup Restore)

1. Login to the app
2. Go to **Settings** (gear icon)
3. Click **Restore from File**
4. Select your `.json` backup file

Or via API:
```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Restore
curl -X POST http://localhost:3001/api/admin/restore \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @backup-file.json
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `502 Bad Gateway` | Backend not running → `pm2 restart svt-backend && pm2 logs` |
| `Connection refused` | Check Security Group ports (80, 443 open?) |
| `ECONNREFUSED` PostgreSQL | Service not running → `sudo systemctl start postgresql` |
| `password authentication failed` | Check `DB_PASSWORD` in `.env` or update `pg_hba.conf` to use `md5` |
| `relation "users" does not exist` | Run `node database/seed.js` — auto-migration creates tables on startup |
| `CORS error` in browser | `CORS_ORIGIN` in `.env` must match your access URL exactly |
| `SyntaxError: Identifier already declared` | Duplicate import in a route file — check with `grep -n 'require' src/routes/admin.js` |
| Reset link shows `localhost` | Set `FRONTEND_URL` in `.env` to your public IP/domain |
| Permission denied | `sudo chown -R ec2-user:ec2-user ~/v2` (or `ubuntu:ubuntu` on Ubuntu) |
| PM2 not starting on reboot | Run `pm2 startup` and execute the printed command, then `pm2 save` |
| Frontend shows blank page | Rebuild: `cd ~/v2 && npm run build` |
| `express-validator` missing | `cd ~/v2/backend && npm install` (it's in package.json) |

---

## File Structure

```
~/v2/
├── src/                          # Frontend React source
├── public/                       # Static assets
├── dist/                         # Built frontend (npm run build)
├── vite.config.ts                # Vite config (/api proxy for dev)
├── SETUP.md                      # This file
├── docs/
│   ├── API_SPEC.md               # REST API reference
│   └── investor.md               # Investor module docs
└── backend/
    ├── .env.example              # Environment template
    ├── .env                      # Your config (git-ignored)
    ├── package.json              # Backend dependencies
    ├── database/
    │   ├── schema.sql            # Complete PostgreSQL schema
    │   └── seed.js               # Admin account seeder
    └── src/
        ├── server.js             # Express entry point
        ├── config/
        │   ├── database.js       # PostgreSQL pool
        │   ├── autoMigrate.js    # Auto-migration on startup
        │   ├── email.js          # SMTP config
        │   └── mongodb.js        # MongoDB Atlas connection
        ├── middleware/
        │   ├── auth.js           # JWT authentication
        │   └── auditLogger.js    # Mutation audit logging
        ├── templates/
        │   └── emailTemplates.js # Email HTML templates
        └── routes/
            ├── auth.js           # Login, password reset
            ├── admin.js          # Admin CRUD, restore
            ├── loans.js          # Loans + transactions
            ├── investors.js      # Investors + payments
            ├── notifications.js  # Notifications
            ├── backup.js         # MongoDB backup
            └── csrf.js           # CSRF token
```

---

## Quick Reference

```bash
# === Local Development ===
cd backend && npm run dev              # Start backend (dev)
npm run dev                            # Start frontend (dev, from root)

# === Production ===
cd ~/v2 && npm run build               # Build frontend
cd ~/v2/backend && npm install         # Install backend deps
pm2 restart svt-backend                # Restart backend
pm2 logs svt-backend                   # View logs

# === Database ===
cd ~/v2/backend && node database/seed.js   # Seed admin
psql -U svtuser -d sri_vinayaka            # Connect to DB

# === Generate Secrets ===
openssl rand -hex 32                   # 64-char random string
```
