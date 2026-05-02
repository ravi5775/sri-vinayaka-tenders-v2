# Sri Vinayaka Tenders v2 - Complete Technical Documentation

**Version:** 2.0  
**Last Updated:** May 2, 2026  
**Environment:** Production (PostgreSQL + MongoDB + Google Drive)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [Authentication & Security](#authentication--security)
6. [Transaction & Payment System](#transaction--payment-system)
7. [Interest Calculation Formulas](#interest-calculation-formulas)
8. [Backup System](#backup-system)
9. [Email & Notifications](#email--notifications)
10. [API Endpoints](#api-endpoints)
11. [Workflows & Data Flows](#workflows--data-flows)
12. [Deployment & Operations](#deployment--operations)

---

## Project Overview

**Sri Vinayaka Tenders v2** is a comprehensive financial management system for tracking loans, investor portfolios, and tender-based lending with automated backup, email reporting, and real-time interest calculations.

### Key Features

- **Loan Management**: Finance loans, tender-based loans, and interest-rate loans with flexible durations
- **Investor Portfolio**: Track investments, profit rates, and payments with real-time calculations
- **Interest Calculations**: Advanced simple-interest system with period-based accrual
- **Backup System**: Multi-destination backups (Local, MongoDB Atlas, Google Drive via Apps Script)
- **Single-Session Auth**: One active session per user enforced across devices
- **Daily Email Reports**: Automated backups sent to all admin emails at configurable times
- **High-Payment Alerts**: Real-time notifications when repayments exceed ₹30,000
- **Transaction Tracking**: Automatic backup triggers after every 3 transactions

---

## Architecture

### High-Level System Architecture

```mermaid
graph TB
    Client["Frontend<br/>(React + TypeScript)<br/>Vite"]
    
    Backend["Backend<br/>(Node.js + Express)<br/>Port 3001"]
    
    PG["PostgreSQL<br/>(Local)<br/>Port 5432"]
    
    Mongo["MongoDB Atlas<br/>(Cloud Backup)<br/>"]
    
    GDrive["Google Drive<br/>(via Apps Script)"]
    
    Email["Gmail SMTP<br/>(srivinayakatender@gmail.com)"]
    
    Scheduler["Node-Schedule<br/>(Daily @ 8 PM IST)"]
    
    Client -->|HTTP/REST| Backend
    
    Backend -->|SQL| PG
    Backend -->|Backup| Mongo
    Backend -->|Backup via Apps Script| GDrive
    Backend -->|Send Emails| Email
    
    Scheduler -->|Trigger Daily Job| Backend
    
    style Client fill:#6366f1
    style Backend fill:#7c3aed
    style PG fill:#0891b2
    style Mongo fill:#10b981
    style GDrive fill:#f59e0b
    style Email fill:#ec4899
    style Scheduler fill:#06b6d4
```

### Application Layers

```mermaid
graph LR
    UI["UI Layer<br/>(React Components)"]
    Context["State Management<br/>(Contexts)"]
    API["API Service<br/>(authFetch)"]
    Routes["API Routes<br/>(Express)"]
    Middleware["Auth Middleware<br/>(JWT Verification)"]
    Services["Business Logic<br/>(Services)"]
    DB["Database Layer<br/>(PostgreSQL)"]
    
    UI -->|useState/useContext| Context
    Context -->|apiService calls| API
    API -->|HTTP Requests| Routes
    Routes -->|Verification| Middleware
    Middleware -->|Valid Token| Services
    Services -->|SQL Queries| DB
    
    style UI fill:#ec4899
    style Context fill:#f59e0b
    style API fill:#6366f1
    style Routes fill:#7c3aed
    style Middleware fill:#8b5cf6
    style Services fill:#0891b2
    style DB fill:#10b981
```

---

## Technology Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + PostCSS
- **State Management**: React Context API
- **HTTP Client**: Fetch API with custom `authFetch` wrapper
- **Validation**: Zod schema validation
- **Security**: Content Security Policy, CSRF protection

### Backend
- **Runtime**: Node.js 24.x
- **Framework**: Express.js
- **Database**: PostgreSQL (primary), MongoDB Atlas (backup)
- **Task Scheduling**: node-schedule
- **Email**: Nodemailer with Gmail SMTP
- **Authentication**: JWT (24h expiry)
- **Security**: bcrypt, helmet, express-validator
- **Process Manager**: PM2

### Infrastructure
- **Server**: AWS EC2 (http://13.61.5.220)
- **Database**: PostgreSQL local, MongoDB Atlas cloud
- **Backup**: Google Drive via personal account + Apps Script
- **Email**: Gmail SMTP (app-specific password)

---

## Database Schema

### Core Tables

#### `users` Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  display_name TEXT,
  
  -- Single-session enforcement
  active_token_hash TEXT,
  device_id TEXT,
  
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `profiles` Table
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `loans` Table
```sql
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  customer_name TEXT NOT NULL,
  phone TEXT,
  loan_type TEXT NOT NULL,  -- 'Finance', 'Tender', 'InterestRate'
  loan_amount NUMERIC(15, 2) NOT NULL,
  given_amount NUMERIC(15, 2),
  interest_rate NUMERIC(5, 2),  -- ₹X per ₹100 per month
  duration_value INT,
  duration_unit TEXT,  -- 'Days', 'Weeks', 'Months'
  start_date TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'Active',  -- 'Active', 'Completed', 'Overdue'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `transactions` Table
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(15, 2) NOT NULL,
  payment_type TEXT,  -- 'principal', 'interest', or NULL (legacy = interest)
  payment_date TIMESTAMP NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `investors` Table
```sql
CREATE TABLE investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  investment_amount NUMERIC(15, 2) NOT NULL,
  investment_type TEXT,
  profit_rate NUMERIC(5, 2),  -- Interest/profit rate
  start_date TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'On Track',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `investor_payments` Table
```sql
CREATE TABLE investor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(15, 2) NOT NULL,
  payment_type TEXT,  -- e.g., 'interest', 'principal'
  payment_date TIMESTAMP NOT NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `login_history` Table
```sql
CREATE TABLE login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `app_settings` Table
```sql
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `password_reset_tokens` Table
```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `notifications` Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT,  -- 'high_payment_alert', 'backup_report', etc.
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `high_payment_alert_log` Table
```sql
CREATE TABLE high_payment_alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  transaction_id UUID,
  amount NUMERIC(15, 2) NOT NULL,
  admin_name TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);
```

---

## Authentication & Security

### Login Flow

```mermaid
sequenceDiagram
    participant Browser
    participant LoginPage as LoginPage<br/>(React)
    participant Backend as Backend<br/>(auth.js)
    participant DB as PostgreSQL
    
    Browser->>LoginPage: Enter email + password
    LoginPage->>Backend: POST /api/auth/login<br/>{email, password, forceLogin}
    Backend->>DB: SELECT user by email
    Backend->>Backend: bcrypt.compare(password)
    
    alt Password invalid
        Backend-->>LoginPage: 401 Invalid credentials
    else Password valid
        Backend->>Backend: getDeviceId() from UA + IP
        alt Different device + no forceLogin
            Backend-->>LoginPage: 409 SESSION_CONFLICT
            LoginPage-->>Browser: Show "Continue?" modal
            Browser->>LoginPage: Click "Continue Login"
            LoginPage->>Backend: POST /api/auth/login<br/>{forceLogin: true}
            Backend->>DB: UPDATE active_token_hash, device_id
        else Same device or forceLogin approved
            Backend->>DB: UPDATE active_token_hash, device_id
            Backend->>DB: INSERT INTO login_history
            Backend-->>LoginPage: {token, user}
            LoginPage->>Browser: Store token in localStorage
            Browser->>LoginPage: Redirect to dashboard
        end
    end
```

### Single-Session Enforcement

```mermaid
graph TD
    A["Login Request"] -->|Device A| B{Check active_token_hash}
    B -->|Exists, different device| C["Return 409<br/>SESSION_CONFLICT"]
    B -->|No existing session| D["Create new token"]
    B -->|Same device| D
    
    C -->|User clicks 'Continue'| E["forceLogin = true"]
    E -->|Invalidates previous session| F["Store new token"]
    F -->|Previous device tries API call| G["Token hash mismatch"]
    G -->|Fails validation| H["Return 401<br/>SESSION_REPLACED"]
    H -->|Frontend| I["Clear localStorage<br/>Redirect to login"]
    
    D -->|Successful| J["Store in users table<br/>active_token_hash,<br/>device_id"]
    J -->|Other device logs in| K["Previous token becomes invalid"]
    
    style A fill:#ec4899
    style C fill:#f59e0b
    style D fill:#10b981
    style H fill:#ef4444
    style K fill:#f59e0b
```

### Token Validation Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Backend as Backend<br/>(auth.js middleware)
    participant DB as PostgreSQL
    
    Browser->>Backend: Request with Authorization: Bearer {token}
    Backend->>Backend: jwt.verify(token)<br/>Get decoded user ID
    Backend->>Backend: hashToken(token)
    Backend->>DB: SELECT active_token_hash FROM users
    DB-->>Backend: active_token_hash
    
    alt Token hash matches
        Backend->>Backend: Set req.user
        Backend-->>Browser: ✅ Proceed to route
    else Token hash mismatch
        Backend-->>Browser: 401 SESSION_REPLACED
        Browser->>Browser: Clear localStorage
        Browser-->>Browser: Redirect /login
    else User not found
        Backend-->>Browser: 401 User not found
    else JWT expired
        Backend-->>Browser: 401 TOKEN_EXPIRED
    end
```

---

## Transaction & Payment System

### Transaction Structure

```mermaid
graph TD
    Txn["Transaction"]
    Txn --> A["id: UUID"]
    Txn --> B["loan_id: UUID"]
    Txn --> C["amount: NUMERIC<br/>₹X.XX"]
    Txn --> D["payment_type:<br/>principal | interest | NULL"]
    Txn --> E["payment_date:<br/>TIMESTAMP"]
    
    style Txn fill:#6366f1
    style D fill:#f59e0b
```

### Payment Recording Flow

```mermaid
sequenceDiagram
    participant Frontend
    participant Backend as Backend<br/>(routes/loans.js)
    participant BackupService
    participant EmailService
    participant DB as PostgreSQL
    
    Frontend->>Backend: POST /api/loans/{loanId}/transactions<br/>{amount, payment_type, payment_date}
    Backend->>DB: INSERT INTO transactions
    Backend->>BackupService: recordTransaction()
    
    BackupService->>BackupService: updateTransactionCounter(+1)
    BackupService->>BackupService: Check if counter >= 3
    
    alt Counter reached 3
        BackupService->>BackupService: Backup to all destinations
        BackupService->>BackupService: resetTransactionCounter()
        BackupService-->>Backend: ✅ Backup triggered
    end
    
    Backend->>DB: Calculate interest & balance
    Backend->>DB: Check if amount >= 30000
    
    alt High-payment alert triggered
        Backend->>EmailService: sendHighPaymentAlert()
        EmailService-->>DB: Insert into notifications
        EmailService-->>EmailService: Send email to all admins
    end
    
    Backend-->>Frontend: {transaction, loan}
```

### Transaction Types

| Type | Purpose | Impact on Principal | Impact on Interest |
|------|---------|---------------------|-------------------|
| `principal` | Reduce loan principal | Reduces immediately | No direct impact |
| `interest` | Pay accrued interest | No impact | Reduces pending interest |
| `NULL` (legacy) | Historical payments | Treated as interest | Reduces pending interest |

---

## Interest Calculation Formulas

### Core Interest Model: Simple Interest with Period-Based Accrual

#### Basic Formula

```
Monthly Rate: R (₹X per ₹100 per month)
Rate per Period: r = R / periodsPerMonth

For each period:
  Interest for period = Principal × (r / 100)
  
Total Interest Accrued: Sum of all period interests
Pending Interest: Total Accrued - Total Paid
Balance: Remaining Principal + Pending Interest
```

#### Rate Adjustment by Duration Unit

| Duration Unit | Periods Per Month | Rate Per Period Calculation |
|---------------|-------------------|-----------------------------|
| **Months** | 1 | `r = R / 1` |
| **Weeks** | 4 | `r = R / 4` |
| **Days** | 30 | `r = R / 30` |

#### Example: Finance Loan with Weekly Collection

**Setup:**
- Loan Amount: ₹10,000
- Monthly Interest Rate: 5% (₹5 per ₹100 per month)
- Duration Unit: Weeks (4 periods per month)
- Start Date: 2024-01-01

**Calculation:**
```
Weekly Rate = 5% / 4 = 1.25% per week

Week 1 (Jan 1-7):
  Principal at start: ₹10,000
  Interest accrued: ₹10,000 × (1.25 / 100) = ₹125
  Total Accrued: ₹125

Week 2 (Jan 8-14):
  Principal still ₹10,000 (no principal payments)
  Interest accrued: ₹10,000 × (1.25 / 100) = ₹125
  Total Accrued: ₹250

If principal payment of ₹5,000 made on Jan 10:
  New principal: ₹5,000
  
Week 3 (Jan 15-21):
  Principal after payment: ₹5,000
  Interest accrued: ₹5,000 × (1.25 / 100) = ₹62.50
  Total Accrued: ₹312.50

If interest payment of ₹250 made on Jan 15:
  Pending Interest: ₹312.50 - ₹250 = ₹62.50
  Balance: ₹5,000 + ₹62.50 = ₹5,062.50
```

### Calculation Algorithm (Detailed)

```mermaid
graph TD
    A["Start: Get Loan<br/>transactions, rate,<br/>start date"] --> B["Initialize<br/>periodsElapsed = 0<br/>totalInterestAccrued = 0<br/>runningPrincipal = loanAmount"]
    
    B --> C["Set periodStart = startDate<br/>periodEnd = startDate + 1 period"]
    
    C --> D{periodStart<br/>< today?}
    
    D -->|No| E["Done:<br/>Calculate balance,<br/>pending interest"]
    
    D -->|Yes| F["Step 1: Apply principal<br/>payments in this period"]
    F --> G["runningPrincipal -= principal<br/>payments in this period"]
    
    G --> H{periodEnd<br/><= today?}
    
    H -->|Yes| I["Step 2: Calculate interest<br/>for this period"]
    I --> J["interestForPeriod = runningPrincipal<br/>× (ratePerPeriod / 100)<br/>totalInterestAccrued += interestForPeriod<br/>periodsElapsed++"]
    
    H -->|No| K["Partial period<br/>Not fully elapsed yet"]
    
    J --> L["Step 3: Advance to next period<br/>periodStart = periodEnd<br/>periodEnd += 1 period"]
    K --> L
    
    L --> C
    
    E --> M["totalInterestPaid = sum<br/>of interest payments"]
    M --> N["pendingInterest = max<br/>totalInterestAccrued<br/>- totalInterestPaid"]
    N --> O["balance = runningPrincipal<br/>+ pendingInterest"]
    O --> P["Return balance,<br/>pendingInterest,<br/>status"]
    
    style A fill:#6366f1
    style D fill:#f59e0b
    style F fill:#10b981
    style I fill:#0891b2
    style E fill:#10b981
    style P fill:#10b981
```

### Key Rules (CRITICAL)

1. **totalInterestAccrued is MONOTONICALLY INCREASING** — only incremented (+=), never reset or decremented
2. **Principal reductions ONLY via principal payments** — interest accrual does not reduce principal
3. **Period-based accrual** — interest is added at the END of each full period
4. **No mid-period interest** — partial elapsed periods do not accrue interest until complete
5. **Rate is always monthly** — entered as "₹X per ₹100 per month"; prorated for other units

### Interest Calculation Cache

To avoid redundant recalculations on every page render:

```javascript
const getCachedInterestDetails = (loan: Loan) => {
  const hash = getLoanHash(loan);  // Hash of loan + transactions
  const cached = interestCache.get(loan);
  if (cached && cached.hash === hash) {
    return cached.result;  // Return cached if hash matches
  }
  const result = getInterestRateCalculationDetails(loan);
  interestCache.set(loan, { result, hash });
  return result;
};
```

---

## Backup System

### Multi-Destination Backup Architecture

```mermaid
graph TB
    Trigger["Backup Trigger"]
    BackupService["Backup Service<br/>(backupService.js)"]
    
    Trigger -->|Manual| FrontendButton["Settings:<br/>Backup to Drive"]
    Trigger -->|Scheduled Daily| DailyScheduler["Daily Job<br/>8 PM IST"]
    Trigger -->|Transaction| TxnCounter["Every 3<br/>Transactions"]
    
    FrontendButton -->|API: POST /backup/google-drive| BackupService
    DailyScheduler -->|runDailyBackupReport| BackupService
    TxnCounter -->|recordTransaction| BackupService
    
    BackupService --> LocalBackup["Local Backup<br/>./backups/"]
    BackupService --> MongoBackup["MongoDB Atlas<br/>Cloud Backup"]
    BackupService --> GDriveBackup["Google Drive<br/>Apps Script"]
    
    LocalBackup -->|JSON file<br/>BACKUP_DIR| LBStore["Local Filesystem"]
    MongoBackup -->|insertOne<br/>backups collection| MStore["MongoDB<br/>sri_vinayaka_backup"]
    GDriveBackup -->|POST to Apps Script| GSStore["Google Drive<br/>sri-vinayaka-backups"]
    
    style Trigger fill:#6366f1
    style BackupService fill:#7c3aed
    style LocalBackup fill:#0891b2
    style MongoBackup fill:#10b981
    style GDriveBackup fill:#f59e0b
```

### Backup Endpoints

#### POST /api/backup/google-drive (Manual Backup)
- **Authentication:** Required (admin)
- **Purpose:** Immediately backup to Google Drive
- **Response:** `{timestamp, fileName, fileId, webViewLink, status}`
- **CSP Handling:** Backend makes external call (Apps Script) to avoid CSP blocking frontend

#### POST /api/backup/full
- **Backups to:** Local, MongoDB, Google Drive
- **Trigger:** Manual or transaction counter

#### GET /api/backup/status
- **Returns:** Status of all backup destinations

### Data Flow: Backup Process

```mermaid
sequenceDiagram
    participant Frontend
    participant Backend as backupService.js
    participant PG as PostgreSQL
    participant Local as Local FS
    participant Mongo as MongoDB
    participant AppsScript as Apps Script
    
    Frontend->>Backend: GET fetchBackupData()
    Backend->>PG: SELECT loans with transactions
    Backend->>PG: SELECT investors with payments
    Backend->>Backend: Format data<br/>{loans, investors, summary}
    Backend-->>Frontend: backupData
    
    par Backup Parallel
        Backend->>Local: backupToLocal()
        Backend->>Mongo: backupToMongoDB()
        Backend->>AppsScript: backupToGoogleDrive()
    and
        Local->>Local: fs.writeFileSync<br/>backup-{timestamp}.json
        Mongo->>Mongo: insertOne(backupDoc)
        AppsScript->>AppsScript: Parse JSON<br/>Create file in Drive
        AppsScript-->>Backend: {fileId, webViewLink}
    end
    
    Backend-->>Frontend: ✅ All backups completed
```

### Backup Data Structure

```json
{
  "timestamp": "2026-05-02T20:00:00.000Z",
  "loans": [
    {
      "id": "uuid",
      "customer_name": "Name",
      "loan_amount": 10000,
      "given_amount": 10000,
      "interest_rate": 5,
      "start_date": "2024-01-01",
      "status": "Active",
      "transactions": [
        {
          "id": "uuid",
          "amount": 500,
          "payment_type": "principal",
          "payment_date": "2024-01-15"
        }
      ]
    }
  ],
  "investors": [...],
  "summary": {
    "totalLoans": 42,
    "totalInvestors": 15,
    "totalTransactions": 203,
    "totalPayments": 87
  }
}
```

### Transaction Counter & Auto-Backup Trigger

```mermaid
graph LR
    A["New Payment<br/>Recorded"] --> B["recordTransaction()"]
    B --> C["Read counter<br/>from file"]
    C --> D["Increment<br/>counter++"]
    D --> E{counter >= 3?}
    
    E -->|No| F["Save counter<br/>Continue"]
    E -->|Yes| G["Trigger Backup<br/>to all destinations"]
    G --> H["Reset counter to 0"]
    H --> F
    
    style A fill:#6366f1
    style E fill:#f59e0b
    style G fill:#10b981
```

### Daily Backup Schedule

```mermaid
graph TD
    A["Server Startup"] --> B["startDailyBackupJob()"]
    B --> C["Read schedule from app_settings<br/>Default: 20:00 8 PM IST"]
    C --> D["Create node-schedule job<br/>Timezone: Asia/Kolkata"]
    
    D --> E{Cron match?<br/>Daily @ time}
    E -->|Time reached| F["runDailyBackupReport()"]
    F --> G["fetchBackupData()"]
    G --> H["Backup to all<br/>3 destinations"]
    H --> I["Query admin users<br/>WHERE role='admin'"]
    I --> J["sendEmail() to each<br/>admin recipient"]
    J --> K["Attach backup JSON<br/>Include summary HTML"]
    K --> L["✅ Daily job<br/>complete"]
    E -->|Waiting| M["Loop back<br/>Check next period"]
    
    style B fill:#6366f1
    style F fill:#f59e0b
    style J fill:#ec4899
    style L fill:#10b981
```

---

## Email & Notifications

### High-Payment Alert Flow

```mermaid
sequenceDiagram
    participant Frontend
    participant Backend as Backend<br/>(routes/loans.js)
    participant Check as HIGH_PAYMENT<br/>THRESHOLD Check
    participant EmailService
    participant DB as PostgreSQL
    participant SMTP as Gmail SMTP
    
    Frontend->>Backend: POST add transaction<br/>amount: 35000
    Backend->>DB: INSERT transaction
    Backend->>Check: Is amount >= 30000?
    Check->>Check: Yes! Alert triggered
    Backend->>EmailService: sendHighPaymentAlert()
    
    EmailService->>DB: SELECT * FROM users<br/>WHERE role='admin'
    DB-->>EmailService: [admin1@..., admin2@...]
    
    par Send to each admin
        EmailService->>SMTP: Send email to admin1@
        EmailService->>SMTP: Send email to admin2@
    end
    
    SMTP-->>EmailService: ✅ Messages queued
    EmailService->>DB: INSERT notification<br/>type='high_payment_alert'
    EmailService-->>Backend: Alert logged
```

### Daily Backup Email Template

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: 'Segoe UI'; line-height: 1.6; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; padding: 20px; text-align: center; }
      .stat { display: inline-block; width: 48%; margin: 10px 1%; 
              padding: 15px; background: #f0f4ff; border-radius: 8px; text-align: center; }
      .stat-value { font-size: 24px; font-weight: bold; color: #667eea; }
      .alert { background: #d4edda; border-left: 4px solid #28a745; 
               padding: 15px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>📦 Daily Backup Report</h1>
      <p>Sri Vinayaka Tenders System</p>
    </div>
    
    <div class="content">
      <p>Hello <strong>{{adminName}}</strong>,</p>
      <p>Your automated daily backup has been completed successfully at 
         <strong>{{timestamp}}</strong>.</p>
      
      <div class="alert">
        ✅ <strong>Backup Status: SUCCESS</strong>
      </div>
      
      <h3>📊 Backup Summary</h3>
      <div>
        <div class="stat">
          <div class="stat-value">{{totalLoans}}</div>
          <div>Loans Backed Up</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{totalInvestors}}</div>
          <div>Investors Backed Up</div>
        </div>
      </div>
      
      <h3>☁️ Backup Destinations</h3>
      <ul>
        <li>✅ <strong>Local Device:</strong> ./backups/ (JSON)</li>
        <li>✅ <strong>MongoDB Atlas:</strong> Full history retained</li>
        <li>✅ <strong>Google Drive:</strong> sri-vinayaka-backups folder</li>
      </ul>
      
      <h3>⏰ Schedule Information</h3>
      <ul>
        <li><strong>Daily Email Report:</strong> {{backupTime}} IST</li>
        <li><strong>MongoDB Backup:</strong> Every 3 hours</li>
        <li><strong>Google Drive Backup:</strong> Every 6 hours</li>
        <li><strong>Transaction-Triggered:</strong> Every 3 transactions</li>
      </ul>
    </div>
  </body>
</html>
```

### Email Service Configuration

| Setting | Value | Note |
|---------|-------|------|
| SMTP Host | smtp.gmail.com | Gmail SMTP server |
| SMTP Port | 587 | TLS connection |
| Auth Method | Basic (username + app password) | App-specific password required |
| From Email | srivinayakatender@gmail.com | Configured in SMTP_FROM_EMAIL |
| Daily Schedule | 8:00 PM IST | Configurable via settings UI |
| Recipients | All users with role='admin' | From users table |

---

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/login
```json
{
  "method": "POST",
  "path": "/api/auth/login",
  "auth": "None",
  "body": {
    "email": "admin@example.com",
    "password": "password123",
    "forceLogin": false
  },
  "response": {
    "token": "jwt_token_24h_expiry",
    "user": { "id": "uuid", "username": "admin@example.com" }
  },
  "errors": {
    "401": "Invalid email or password",
    "409": {
      "code": "SESSION_CONFLICT",
      "message": "Active session on another device"
    }
  }
}
```

#### POST /api/auth/logout
- **Auth:** Required
- **Purpose:** Invalidate current session
- **Response:** `{message: "Logged out successfully"}`

#### GET /api/auth/me
- **Auth:** Required
- **Purpose:** Get current user info
- **Response:** `{user: {id, username, email}}`

#### POST /api/auth/forgot-password
- **Body:** `{email}`
- **Response:** Generic success message (prevents email enumeration)
- **Action:** Sends reset link to email

#### POST /api/auth/reset-password
- **Body:** `{token, newPassword}`
- **Response:** `{message: "Password reset successfully"}`

### Loan Endpoints

#### GET /api/loans
- **Auth:** Required
- **Returns:** All loans for current user
- **Response:** `[{id, customer_name, loan_amount, ...}]`

#### POST /api/loans
- **Body:** `{customerName, phone, loanType, loanAmount, givenAmount, interestRate, durationValue, durationUnit, startDate}`
- **Returns:** Created loan with ID

#### PUT /api/loans/:id
- **Body:** `{field: newValue}`
- **Updates:** Specified loan

#### DELETE /api/loans/:id
- **Deletes:** Loan and all related transactions

#### POST /api/loans/:loanId/transactions
- **Body:** `{amount, payment_type: 'principal'|'interest', payment_date}`
- **Action:** Adds transaction and checks for high-payment alert
- **Trigger:** Auto-backup after every 3 transactions

#### PUT /api/loans/:loanId/transactions/:txnId
- **Updates:** Specific transaction

#### DELETE /api/loans/:loanId/transactions/:txnId
- **Deletes:** Transaction

### Investor Endpoints

#### GET /api/investors
- **Returns:** All investors

#### POST /api/investors
- **Body:** `{name, investmentAmount, investmentType, profitRate, startDate}`

#### PUT /api/investors/:id
- **Updates:** Investor

#### DELETE /api/investors/:id
- **Deletes:** Investor and payments

#### POST /api/investors/:investorId/payments
- **Body:** `{amount, payment_type, payment_date, remarks}`

### Backup Endpoints

#### POST /api/backup/google-drive
- **Auth:** Required (admin)
- **Purpose:** Manual backup to Google Drive
- **Response:** `{timestamp, fileName, fileId, webViewLink, status}`

#### GET /api/admin/backup-schedule
- **Returns:** `{schedule: {time24h, label, cron}, senderEmail}`

#### PUT /api/admin/backup-schedule
- **Body:** `{time24h: "HH:MM"}`
- **Updates:** Daily backup time

### Admin Endpoints

#### POST /api/admin/create
- **Body:** `{email, password}`
- **Auth:** Required (admin)
- **Action:** Creates new admin account, sends welcome email

#### GET /api/admin/users
- **Returns:** List of all admin accounts

#### PUT /api/admin/users/:id/email
- **Body:** `{email}`
- **Updates:** Admin email address

#### DELETE /api/admin/users/:id
- **Auth:** Required, can't delete own account

#### POST /api/admin/reset-password/:id
- **Action:** Generates temp password, sends via email

---

## Workflows & Data Flows

### Complete Loan Lifecycle

```mermaid
graph TD
    A["Create Loan"] -->|POST /api/loans| B["Loan in<br/>Active status"]
    B --> C["Record Transactions<br/>POST /api/loans/{id}/transactions"]
    C --> D["Calculate Interest<br/>(Period-based)"]
    C --> E["Check if 3 txns<br/>reached"]
    E -->|Yes| F["Trigger Backup<br/>Local + Mongo + Drive"]
    F --> G["Reset counter"]
    E -->|No| H["Continue recording<br/>payments"]
    
    D --> I{Txn amount<br/>>= ₹30k?}
    I -->|Yes| J["Send High-Payment<br/>Alert Email"]
    J --> K["Create Notification"]
    I -->|No| L["Continue"]
    
    H --> M["Admin checks<br/>Loan Details"]
    M --> N["View:<br/>- Balance<br/>- Pending Interest<br/>- Principal Remaining<br/>- Next Due Date"]
    N --> O{Loan Complete?}
    O -->|Yes| P["Update Status<br/>to Completed"]
    O -->|No| Q["Continue collecting"]
    
    Q --> R["Daily 8 PM:<br/>Backup + Email"]
    P --> S["Archive Loan<br/>Data in backups"]
    
    style A fill:#6366f1
    style B fill:#10b981
    style F fill:#f59e0b
    style J fill:#ec4899
    style N fill:#0891b2
    style P fill:#10b981
```

### Investor Payment Processing

```mermaid
sequenceDiagram
    participant Admin
    participant Frontend
    participant Backend as Backend<br/>(routes/investors.js)
    participant InterestCalc as Calculate Profit
    participant DB as PostgreSQL
    participant Email
    
    Admin->>Frontend: Click add investor payment
    Frontend->>Backend: POST /api/investors/{id}/payments<br/>{amount, payment_date, payment_type}
    Backend->>DB: INSERT investor_payment
    Backend->>InterestCalc: Calculate updated balance
    
    InterestCalc->>InterestCalc: Apply payment<br/>Reduce pending profit<br/>Update status
    InterestCalc-->>Backend: {balance, pendingProfit, status}
    
    Backend->>DB: UPDATE investor profit balance
    Backend->>DB: SELECT payment count
    
    alt Payment count % 3 == 0
        Backend->>Backend: Backup triggered
        Backend-->>Backend: Local + Mongo + Drive
    end
    
    Backend-->>Frontend: ✅ Payment recorded
    Frontend-->>Admin: Payment added<br/>Balance updated
```

### Daily Backup & Email Report

```mermaid
graph TD
    Start["8:00 PM IST"] -->|node-schedule<br/>cron trigger| Job["startDailyBackupJob()"]
    
    Job --> A["fetchBackupData()<br/>SELECT loans, investors"]
    A --> B["Backup to 3 destinations"]
    B --> C["Local<br/>JSON file"]
    B --> D["MongoDB<br/>insertOne"]
    B --> E["Google Drive<br/>Apps Script"]
    
    C --> Ready["✅ Backups complete<br/>Build email"]
    D --> Ready
    E --> Ready
    
    Ready --> F["Query admin users<br/>WHERE role='admin'"]
    F --> G["For each admin email"]
    G --> H["Generate HTML template<br/>- Include summary stats<br/>- Timestamp<br/>- Backup status<br/>- Next schedule"]
    H --> I["sendEmail()<br/>with attachment"]
    I --> J["Nodemailer<br/>Gmail SMTP"]
    J --> K["✅ Email sent"]
    K --> L["INSERT notification<br/>type='backup_report'"]
    L --> End["Daily job complete"]
    
    style Start fill:#f59e0b
    style Job fill:#6366f1
    style B fill:#0891b2
    style K fill:#10b981
    style End fill:#10b981
```

---

## Deployment & Operations

### Local Development Setup

```bash
# Clone repository
git clone https://github.com/ravi5775/sri-vinayaka-tenders-v2.git
cd sri-vinayaka-tenders-v2

# Install dependencies
npm install
cd backend && npm install && cd ..

# Create .env file (copy from .env.example)
cp backend/.env.example backend/.env

# Run database migrations
cd backend
node -e "require('dotenv').config(); require('./src/config/autoMigrate').autoMigrate();"
cd ..

# Start development servers
npm run dev        # Frontend: http://localhost:5173
npm run dev:backend # Backend: http://localhost:3001
```

### Production Deployment (EC2)

```bash
# SSH to EC2
ssh ubuntu@13.61.5.220

# Clone latest branch
git clone -b vercel-psql-migration https://github.com/ravi5775/sri-vinayaka-tenders-v2.git
cd sri-vinayaka-tenders-v2

# Frontend build & start
npm install
npm run build
pm2 start "npm run preview" --name svt-frontend

# Backend start
cd backend
npm install
pm2 start "node src/server.js" --name svt-backend
pm2 save
pm2 startup

# Verify
pm2 status
curl http://localhost:3001/api/health
curl http://localhost:4173
```

### Environment Variables

```env
# Server
NODE_ENV=production
PORT=3001
BASE_URL=http://13.61.5.220
FRONTEND_URL=http://13.61.5.220

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=***
DB_NAME=sri_vinayaka

# MongoDB
MONGODB_URI=mongodb+srv://user:password@...

# JWT
JWT_SECRET=***
JWT_REFRESH_SECRET=***
JWT_EXPIRE=24h

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=srivinayakatender@gmail.com
SMTP_PASSWORD=*** (app-specific)
SMTP_FROM_EMAIL=srivinayakatender@gmail.com

# Backup
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/...
GOOGLE_APPS_SCRIPT_SECRET=***

# Settings
DAILY_BACKUP_EMAIL_ENABLED=true
DAILY_BACKUP_EMAIL_TIME=0 20 * * *  # 8 PM IST
HIGH_PAYMENT_THRESHOLD=30000
```

### Monitoring & Logging

#### PM2 Status Check
```bash
pm2 status
pm2 logs svt-backend --lines 200
pm2 logs svt-backend --lines 500 | grep -i "daily backup\|backup email"
```

#### Database Health
```bash
# Connect to PostgreSQL
psql postgresql://postgres:@Ravi7pspk@localhost:5432/sri_vinayaka

# Check backup schedule
SELECT * FROM app_settings WHERE key = 'daily_backup_time';

# Check admin users
SELECT id, email, role FROM users WHERE role = 'admin';

# Check transaction counter
SELECT COUNT(*) FROM transactions 
WHERE created_at > NOW() - INTERVAL '1 hour';
```

#### Backup Verification
```bash
# Local backups
ls -lah ./backups/

# MongoDB (from local, if access configured)
# Connect to MongoDB Atlas UI to verify backups collection

# Google Drive
# Check sri-vinayaka-backups folder in Google Drive UI
```

### Common Troubleshooting

#### Backups Not Sending
1. Check backend logs: `pm2 logs svt-backend | grep backup`
2. Verify Gmail credentials and app-specific password
3. Check `EMAIL_ENABLED=true` in .env
4. Verify admin users exist: `SELECT * FROM users WHERE role='admin'`

#### High-Payment Alerts Not Received
1. Check threshold: `SELECT value FROM app_settings WHERE key LIKE 'payment_threshold'`
2. Verify recipient emails: `SELECT email FROM users WHERE role='admin'`
3. Check SMTP: `pm2 logs svt-backend | grep "Failed to send"`

#### Single-Session Not Enforcing
1. Check: `SELECT active_token_hash, device_id FROM users WHERE id = 'user_id'`
2. Verify middleware: `backend/src/middleware/auth.js` - token hash validation
3. Browser: Check localStorage for `authToken`

#### Transaction Backup Not Triggering
1. Check counter: `cat ./backups/transaction-counter.json`
2. Verify: Counter should reset after every 3 transactions
3. Check logs: `pm2 logs | grep "transaction count"`

---

## Quick Reference

### Formulas Summary

| Calculation | Formula |
|-------------|---------|
| **Weekly Interest** | `Principal × (Monthly Rate / 400)` |
| **Daily Interest** | `Principal × (Monthly Rate / 3000)` |
| **Pending Interest** | `Total Accrued - Total Paid` |
| **Balance** | `Remaining Principal + Pending Interest` |
| **High-Payment Alert** | Trigger if `amount >= ₹30,000` |

### Default Values

| Setting | Default | Configurable |
|---------|---------|--------------|
| Daily Backup Time | 8:00 PM IST (20:00) | ✅ Yes (via Settings UI) |
| Session Expiry | 24 hours | ❌ No (hardcoded) |
| Transaction Backup Trigger | Every 3 txns | ❌ No |
| High-Payment Threshold | ₹30,000 | ⚙️ Env var only |
| Backup Retention | 90 days | ⚙️ Env var only |

---

## Support & Documentation

- **GitHub**: https://github.com/ravi5775/sri-vinayaka-tenders-v2
- **Issues**: Report via GitHub Issues
- **Deployment**: See `DEPLOYMENT_CSP_FIX.md`, `QUICK_SETUP_GUIDE.md`
- **Backup Setup**: See `GOOGLE_DRIVE_SETUP.md`

---

**Document Version:** 2.0  
**Last Updated:** May 2, 2026  
**Author:** Development Team  
**Status:** ✅ Production Ready
