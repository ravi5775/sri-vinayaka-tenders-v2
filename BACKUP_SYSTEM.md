# 🔐 Comprehensive Backup System - Sri Vinayaka Tenders

## Overview

The system implements a **multi-destination backup strategy** with automatic and manual triggers:

| Destination | Frequency | Trigger | Data Loss Protection |
|------------|-----------|---------|------------------|
| **MongoDB Atlas** | Every 3 hours | Automatic schedule | ✅ Full history |
| **Google Drive** | Every 6 hours | Automatic schedule | ✅ Full history |
| **Local Device** | Per 3 transactions | Transaction counter | ✅ On-device backup |
| **Manual** | Anytime | API endpoint | ✅ On-demand |
| **Email** | On-demand | Manual trigger | ✅ Copy sent to admin |

---

## 🚀 Automatic Backup Features

### 1. **MongoDB Atlas (Every 3 hours)**
- Scheduled job runs automatically
- No data loss: Full backup of all loans, investors, transactions, and payments
- Backup metadata stored in MongoDB
- Query historical backups via `/api/backup/metadata`

**Configuration:**
```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/sri_vinayaka_backups
```

### 2. **Google Drive (Every 6 hours)**
- Scheduled automatic backup
- Timestamped filenames for easy retrieval
- Organized in separate folders:
  - `sri-vinayaka-auto-backups/` - Automatic 6-hour backups
  - `sri-vinayaka-transaction-backups/` - Transaction-triggered backups
  - `sri-vinayaka-manual-backups/` - Manual backups

**Configuration:**
```env
GOOGLE_DRIVE_FOLDER_ID=your-folder-id
GOOGLE_DRIVE_API_KEY=your-api-key
GOOGLE_DRIVE_CLIENT_ID=your-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret
GOOGLE_DRIVE_REFRESH_TOKEN=your-refresh-token
```

### 3. **Transaction-Triggered Backup (Every 3 transactions)**
- Automatically triggers after every 3 transactions or investor payments
- Backs up to ALL destinations simultaneously:
  - Local device
  - MongoDB Atlas
  - Google Drive (`sri-vinayaka-transaction-backups/`)
- Counter resets after backup
- Zero data loss guarantee

**How it works:**
1. Admin creates a transaction (loan payment or investor payment)
2. System increments internal counter
3. After 3 transactions/payments, automatic backup triggers
4. All three destinations updated in parallel
5. Counter resets to 0

---

## 📁 Local Device Backup

### Location
```
project-root/
  backups/
    backup-2025-05-01T14-30-45-123Z.json
    backup-2025-05-01T18-00-00-456Z.json
    transaction-counter.json
    backup-metadata.json
```

### File Format
Each backup file contains:
```json
{
  "timestamp": "2025-05-01T14:30:45Z",
  "loans": [...],
  "investors": [...],
  "summary": {
    "totalLoans": 5,
    "totalInvestors": 3,
    "totalTransactions": 12,
    "totalPayments": 8
  }
}
```

---

## 🔌 API Endpoints

### Manual Backups

#### 1. **Full Backup (All Destinations)**
```bash
POST /api/backup/full
Authorization: Bearer <token>
```
**Response:**
```json
{
  "timestamp": "2025-05-01T14:30:45Z",
  "triggeredBy": "admin@example.com",
  "backups": {
    "local": {
      "status": "success",
      "fileName": "backup-2025-05-01T14-30-45Z.json",
      "size": 524288
    },
    "mongodb": {
      "status": "success",
      "mongoId": "507f1f77bcf86cd799439011",
      "size": 524288
    },
    "googleDrive": {
      "status": "success",
      "fileName": "backup-2025-05-01T14-30-45Z.json"
    }
  },
  "allSuccessful": true
}
```

#### 2. **Local Device Backup Only**
```bash
POST /api/backup/local
Authorization: Bearer <token>
```

#### 3. **MongoDB Atlas Backup Only**
```bash
POST /api/backup/mongodb
Authorization: Bearer <token>
```

#### 4. **Google Drive Backup Only**
```bash
POST /api/backup/google-drive
Authorization: Bearer <token>
Content-Type: application/json

{
  "folderName": "sri-vinayaka-manual-backups"
}
```

#### 5. **Email Backup**
```bash
POST /api/backup/email
Authorization: Bearer <token>
```
Sends backup summary to admin's registered email

### Backup Status & Metadata

#### 6. **Check Backup Status**
```bash
GET /api/backup/status
Authorization: Bearer <token>
```
**Response:**
```json
{
  "status": "ok",
  "transactionCounter": 2,
  "transactionsUntilBackup": 1,
  "nextBackupTrigger": "waiting",
  "schedules": {
    "mongodbAtlas": "Every 3 hours (automatic)",
    "googleDrive": "Every 6 hours (automatic)",
    "local": "Per 3 transactions (automatic) + Manual anytime"
  }
}
```

#### 7. **List All Backups**
```bash
GET /api/backup/metadata
Authorization: Bearer <token>
```
Lists last 50 backups from MongoDB

#### 8. **Reset Transaction Counter** (Admin only)
```bash
POST /api/backup/reset-counter
Authorization: Bearer <token>
```

---

## ⚙️ Configuration

### Enable/Disable Automatic Backups
```env
# .env file
ENABLE_SCHEDULED_BACKUPS=true    # true = enabled, false = disabled
```

### Backup Schedules
Configured in `backend/src/config/scheduledBackups.js`:

```javascript
// MongoDB Atlas: 3 hours (10,800,000ms)
const mongodbJobId = setInterval(..., 3 * 60 * 60 * 1000);

// Google Drive: 6 hours (21,600,000ms)
const googleDriveJobId = setInterval(..., 6 * 60 * 60 * 1000);

// Transaction: After 3 transactions
// No configuration needed - automatic
```

To modify schedules, edit the millisecond values in `scheduledBackups.js` and redeploy.

---

## 📊 Data Protection Strategy

### Zero Data Loss Guarantee

**Scenario 1: System Crash**
```
PostgreSQL down
  ↓
Last backup exists on:
  ✅ MongoDB Atlas (3-hour backup)
  ✅ Google Drive (6-hour backup)
  ✅ Local device (transaction-based)
  ↓
Maximum data loss: 3 hours
Minimal if backup just ran
```

**Scenario 2: Single Backup Destination Fails**
```
Google Drive API down
  ↓
Transaction-triggered backup still runs to:
  ✅ Local device
  ✅ MongoDB Atlas
  ✓ Google Drive retry on next schedule
```

**Scenario 3: Database Corruption**
```
PostgreSQL corrupted
  ↓
Restore from MongoDB or Google Drive
  ↓
Re-import JSON backup to fresh database
```

---

## 🔧 Setup Instructions

### 1. **MongoDB Atlas Setup** (Recommended)

1. Create MongoDB Atlas account: https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string:
```
mongodb+srv://username:password@cluster.mongodb.net/sri_vinayaka_backups
```
4. Add to `.env`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sri_vinayaka_backups
```

### 2. **Google Drive Setup** (Optional)

1. Create Google Cloud Project: https://console.cloud.google.com
2. Enable Google Drive API
3. Create service account or OAuth credentials
4. Get credentials and add to `.env`:
```env
GOOGLE_DRIVE_FOLDER_ID=your-folder-id
GOOGLE_DRIVE_API_KEY=your-api-key
GOOGLE_DRIVE_CLIENT_ID=your-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret
GOOGLE_DRIVE_REFRESH_TOKEN=your-refresh-token
```

### 3. **Local Backup Setup**

No configuration needed! Automatically creates `./backups` folder

```bash
# Check backups
ls -la backend/backups/

# View a backup
cat backend/backups/backup-*.json | jq
```

---

## 📈 Monitoring Backups

### Check Backup Logs
```bash
# View server logs (when using npm run dev)
# Look for lines like:
# ✅ Local backup created: backup-2025-05-01T14-30-45Z.json
# 🔄 [MongoDB] Running scheduled backup...
# 📁 [Google Drive] Running scheduled backup...
```

### MongoDB Backup Verification
```javascript
// Query MongoDB to verify backups exist
db.backups.find({}).sort({ createdAt: -1 }).limit(5)
```

### Local Backup Verification
```bash
# Count backups
ls -1 backend/backups/backup-*.json | wc -l

# Check latest backup
ls -lt backend/backups/backup-*.json | head -1

# View backup structure
cat backend/backups/backup-*.json | jq '.summary'
```

---

## ⚠️ Important Notes

### Backup Size Estimation
- Each backup is ~50-500KB depending on data volume
- Local storage: No limit (depends on device)
- MongoDB Atlas: Check storage quota in account
- Google Drive: Check available space

### Data Retention
- **Local**: Keep indefinitely (storage permitting)
- **MongoDB**: Delete old backups manually as needed
- **Google Drive**: Manage through Drive storage limits

### Disaster Recovery

**To restore from backup:**

1. **Stop the backend:**
   ```bash
   npm run stop
   ```

2. **Restore database from backup file:**
   ```bash
   # Parse the backup JSON
   cat backup-file.json | jq '.loans' > loans.json
   
   # Restore to PostgreSQL via psql or Prisma
   ```

3. **Restart backend:**
   ```bash
   npm run dev
   ```

---

## 🎯 Best Practices

1. **Monitor transaction counter**: Keep eye on `/api/backup/status`
2. **Test restores**: Periodically verify backups can be restored
3. **Archive old backups**: Move old files to archive storage monthly
4. **Setup alerts**: Monitor MongoDB/Google Drive quota
5. **Document backups**: Keep track of important backup times
6. **Multiple regions**: Store backups in different geographic regions if possible
7. **Encrypt sensitive data**: Consider encrypting backup files before storage
8. **Regular audits**: Check backup integrity monthly

---

## 🆘 Troubleshooting

### Backups Not Running
- Check `ENABLE_SCHEDULED_BACKUPS=true` in `.env`
- Check server logs for errors
- Verify MongoDB/Google Drive credentials

### MongoDB Connection Failed
- Verify `MONGODB_URI` is correct
- Check MongoDB cluster is running
- Verify whitelist IP if using MongoDB Atlas

### Google Drive Upload Failed
- Verify credentials in `.env`
- Check folder exists in Google Drive
- Verify API quota limit not exceeded

### Local Backups Not Creating
- Check `./backups/` directory permissions
- Ensure disk space available
- Check server has write permissions

---

## 📞 Support

For issues or questions:
1. Check server logs: `npm run dev`
2. Review backup status: `GET /api/backup/status`
3. Verify destinations are configured in `.env`
4. Test manual backup: `POST /api/backup/full`

