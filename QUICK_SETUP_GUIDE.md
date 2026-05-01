# 🚀 Sri Vinayaka Tenders v2 - Quick Setup Guide

## ⚡ Immediate Next Steps (Priority Order)

### **Step 1: Install Node Dependencies** ✅
```bash
cd backend
npm install
```
This installs `node-schedule` required for daily backup emails.

---

### **Step 2: Verify Environment Configuration** ✅
The `.env` file has been created with all production settings.
```bash
cat backend/.env | head -50
```

**Key values already configured:**
- ✅ PostgreSQL (localhost:5432)
- ✅ MongoDB Atlas connection string
- ✅ JWT secrets
- ✅ Gmail SMTP configuration
- ✅ Port 3001 for production

**⚠️ Values that NEED your input:**
- `GOOGLE_DRIVE_FOLDER_ID` - Replace placeholder
- `GOOGLE_DRIVE_API_KEY` - Replace placeholder

---

### **Step 3: Get Google Drive Credentials** ⚠️ MANDATORY

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or use existing project
3. Enable **Google Drive API**
4. Create a **Service Account**:
   - Go to Credentials → Create Credentials → Service Account
   - Copy the API key (long string)
   - Generate a new key (JSON format)
5. Create a **Google Drive Folder**:
   - Go to https://drive.google.com/
   - Create new folder for backups
   - Get folder ID from URL: `https://drive.google.com/drive/folders/{FOLDER_ID}`

6. Update `.env` file:
```bash
# Edit backend/.env
nano backend/.env
# Find and replace:
# GOOGLE_DRIVE_FOLDER_ID=YOUR_FOLDER_ID_HERE
# GOOGLE_DRIVE_API_KEY=YOUR_API_KEY_HERE
```

---

### **Step 4: Verify PostgreSQL Connection** ✅
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U postgres -d sri_vinayaka -c "SELECT COUNT(*) as admin_count FROM users WHERE role = 'admin';"
```

Expected output:
```
 admin_count
─────────────
           2
(1 row)
```

---

### **Step 5: Create High-Payment Alert Log Table** ✅
```bash
psql -U postgres -d sri_vinayaka << 'EOF'
CREATE TABLE IF NOT EXISTS high_payment_alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  admin_email VARCHAR(255),
  performed_by VARCHAR(255),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  recipients TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_high_payment_alert_timestamp ON high_payment_alert_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_high_payment_alert_amount ON high_payment_alert_log(amount);
EOF
```

---

### **Step 6: Start the Backend** 🚀
```bash
# Development (with auto-reload)
cd backend
npm run dev

# Or Production (with PM2)
pm2 start src/server.js --name "sri-vinayaka-backend"
pm2 save
```

**Expected startup output:**
```
Sri Vinayaka backend running on http://localhost:3001
Health check: http://localhost:3001/api/health
Environment: production

✅ Daily backup job scheduled for 8:00 PM IST
✅ Scheduled backups: MongoDB (3h), Google Drive (6h)
```

---

### **Step 7: Verify Startup** ✅
```bash
# Check health endpoint
curl http://localhost:3001/api/health

# Should return:
# {"status":"ok","timestamp":"2025-01-01T12:00:00.000Z"}
```

---

## 📋 What Was Implemented

### ✅ Complete Features Delivered:

1. **Daily Backup Email System**
   - Runs every day at 8:00 PM IST
   - Sends to ALL admin email addresses
   - Includes: backup timestamp, loans count, investors count, transaction count, payment count
   - Professional HTML email template

2. **High-Payment Alert System**
   - Triggers when repayment >= ₹30,000
   - Triggers for both: Loan repayments AND Investor payments
   - Sends to ALL admin email addresses immediately
   - Includes: transaction details, amount, timestamp, admin name
   - Professional HTML email template

3. **Google Drive Mandatory Backup**
   - Google Drive is now PRIMARY backup (not optional)
   - System will fail-fast if credentials missing
   - Prevents accidental data loss scenarios

4. **Production Configuration**
   - Complete `.env` file with all settings
   - Ready to deploy to http://13.61.5.220:3001
   - All credentials configured

---

## 📧 Email System Summary

### **Daily Backup Email** 📦
- **Time**: 8:00 PM IST (20:00)
- **Frequency**: Daily
- **Recipients**: All users with role = 'admin'
- **Content**: 
  - Backup timestamp
  - Data summary (counts)
  - All backup destinations status

### **High-Payment Alert** 🚨
- **Trigger**: Amount >= ₹30,000
- **Frequency**: Immediate (when triggered)
- **Recipients**: All users with role = 'admin'
- **Locations**: Loan repayments AND Investor payments
- **Content**:
  - Amount (formatted currency)
  - Customer/Investor name
  - Admin who performed transaction
  - Exact timestamp
  - Complete transaction details

---

## 🔄 Backup System Architecture

```
┌──────────────────────────────────────────────┐
│    PostgreSQL (Primary Data Source)          │
│    • Loans + Transactions                    │
│    • Investors + Payments                    │
└──────────────────────────────────────────────┘
                     ↓
        ┌────────────┼────────────┐
        ↓            ↓            ↓
    ┌────────┐  ┌────────┐  ┌─────────────┐
    │ Local  │  │MongoDB │  │Google Drive │ ← PRIMARY (MANDATORY)
    │ ./bkp/ │  │ Cloud  │  │   Folder    │
    └────────┘  └────────┘  └─────────────┘
        ↓            ↓            ↓
   Triggers:
   • Every 3h (MongoDB)
   • Every 6h (Google Drive)
   • Every 3 transactions (all)
   • Daily 8 PM (email report)
   • Manual API endpoints
```

---

## 🧪 Testing the System

### **Test 1: Health Check**
```bash
curl http://localhost:3001/api/health
```

### **Test 2: Check Backup Status**
```bash
curl http://localhost:3001/api/backup/status
```

### **Test 3: Manual Full Backup**
```bash
curl -X POST http://localhost:3001/api/backup/full
```

### **Test 4: Send Backup Email (Manual)**
```bash
curl -X POST http://localhost:3001/api/backup/email
```

### **Test 5: Trigger High-Payment Alert**
1. Create a loan repayment with amount > ₹30,000
2. Check email inbox for alert (should arrive in < 1 minute)
3. Alert email includes:
   - Amount in ₹ currency format
   - Customer name
   - Admin name who performed transaction
   - Timestamp in IST format

### **Test 6: Verify Daily Backup Scheduled**
```bash
# Check logs for the scheduled job
tail -f backend/src/config/dailyBackupScheduler.js | grep "scheduled"

# Or check when it will run next
node -e "
const schedule = require('node-schedule');
const job = schedule.scheduleJob('0 20 * * *', () => {});
console.log('Next daily backup at:', job.nextInvocation());
"
```

---

## 🔍 Monitoring Commands

### **Check Admin Users**
```bash
psql -U postgres -d sri_vinayaka -c "
SELECT id, email, display_name, role 
FROM users 
WHERE role = 'admin' 
ORDER BY created_at;
"
```

### **Check Recent High-Payment Alerts**
```bash
psql -U postgres -d sri_vinayaka -c "
SELECT amount, admin_email, performed_by, timestamp 
FROM high_payment_alert_log 
ORDER BY timestamp DESC 
LIMIT 10;
"
```

### **Check Backup Metadata**
```bash
cat backend/backups/backup-metadata.json | jq .
```

### **Check Transaction Counter**
```bash
cat backend/backups/transaction-counter.json
```

---

## ✅ Deployment Checklist

- [ ] PostgreSQL running (`sudo systemctl start postgresql`)
- [ ] MongoDB Atlas accessible from IP
- [ ] Google Drive credentials obtained and configured in `.env`
- [ ] Gmail SMTP app password verified
- [ ] `npm install` completed in backend directory
- [ ] High-payment alert log table created in database
- [ ] Backend started: `npm run dev`
- [ ] Health check passing: `curl http://localhost:3001/api/health`
- [ ] Backup API working: `curl http://localhost:3001/api/backup/status`
- [ ] First daily backup scheduled for today 8 PM
- [ ] High-payment alert tested with >₹30k transaction
- [ ] Email notifications being received

---

## 🆘 Troubleshooting

### **Problem: "Google Drive credentials not configured"**
```
Error: Google Drive credentials not configured. These are MANDATORY for backup system.
```
**Solution**: 
1. Get credentials from Google Cloud Console
2. Update `.env`: `GOOGLE_DRIVE_FOLDER_ID` and `GOOGLE_DRIVE_API_KEY`
3. Restart backend: `npm run dev`

### **Problem: "No admin emails found"**
```
High payment alert: no admin emails found — skipping email.
```
**Solution**: 
1. Verify admins exist: `SELECT * FROM users WHERE role = 'admin';`
2. Add admin user if needed
3. Restart backend

### **Problem: "SMTP error - could not connect"**
```
Error: connect ECONNREFUSED 127.0.0.1:587
```
**Solution**:
1. Verify Gmail credentials in `.env`
2. Verify Gmail app-specific password is correct
3. Check internet connectivity
4. Try manual backup email: `curl -X POST http://localhost:3001/api/backup/email`

### **Problem: Daily backup not running at 8 PM**
```
Daily backup job did not run at expected time
```
**Solution**:
1. Check server timezone: `timedatectl`
2. Verify node-schedule installed: `npm list node-schedule`
3. Check logs: `npm run dev | grep -i "backup job"`
4. Verify cron syntax: `0 20 * * *` (hour 20 = 8 PM)

---

## 📚 Documentation Files

- **`IMPLEMENTATION_COMPLETE.md`** - Comprehensive implementation guide
- **`BACKUP_SYSTEM.md`** - Complete backup system documentation
- **`API_SPEC.md`** - API endpoints documentation
- **`backend/.env`** - Production configuration

---

## 🎯 Success Indicators

When fully operational:
1. ✅ Backend running on port 3001
2. ✅ Health check returns `{"status":"ok"}`
3. ✅ Daily backup email arrives at 8:00 PM IST
4. ✅ High-payment alerts sent when amount >= ₹30,000
5. ✅ Backups visible in Google Drive folder
6. ✅ Backup metadata shows recent backups
7. ✅ All admins can see all loans and investors
8. ✅ Transaction counter tracking automatic backups

---

## 📞 Support

For issues:
1. Check log files: `npm run dev | tee backend.log`
2. Query database: `psql -U postgres -d sri_vinayaka -c "SELECT * FROM ..."`
3. Test API endpoints: `curl http://localhost:3001/api/...`
4. Verify environment: `cat backend/.env | grep -E "GOOGLE_DRIVE|SMTP|MONGODB"`

---

**Next: Provide Google Drive credentials and run `npm run dev` to start the system!**
